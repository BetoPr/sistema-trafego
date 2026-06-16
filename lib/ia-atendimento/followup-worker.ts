/**
 * Worker do follow-up sequencial da IA Atendimento.
 *
 * - processarFollowUpsIA() — chamado pelo cron, avança etapas devidas
 * - cancelarFollowUpsPorRespostaCliente(ticketId) — chamado pelo webhook ao receber msg do cliente
 * - inscreverFollowUpIA(...) — chamado pelo executor após primeira resposta IA bem-sucedida
 */
import { createServiceClient } from "@/lib/supabase/service";
import { decryptToken, byteaToBuffer } from "@/lib/crypto/tokens";
import { instanceSendText, instanceSendMedia, type UazapiInstance } from "@/lib/uazapi/client";

interface ProgressoRow {
  id: string;
  agencia_id: string;
  perfil_id: string;
  sequencia_id: string;
  ticket_id: string;
  contato_id: string;
  canal_id: string | null;
  etapa_atual: number;
  proxima_etapa: number;
  agendado_para: string;
  iniciado_em: string;
}

interface EtapaRow {
  id: string;
  ordem: number;
  delay_segundos_antes: number;
  midia_tipo: "texto" | "imagem" | "video" | "audio" | "documento";
  texto: string | null;
  midia_path: string | null;
  midia_url: string | null;
  midia_mime: string | null;
  midia_filename: string | null;
}

interface SequenciaRow {
  id: string;
  ativa: boolean;
  finalizar_ticket_ao_fim: boolean;
  etiqueta_em_progresso_id: string | null;
  etiqueta_encerrado_id: string | null;
  janela_inicio: string;
  janela_fim: string;
  timezone: string;
}

const TIPO_PT_TO_UAZAPI: Record<string, "image" | "video" | "audio" | "document"> = {
  imagem: "image",
  video: "video",
  audio: "audio",
  documento: "document",
};

function dentroJanela(iniHHMM: string, fimHHMM: string, tz: string): { ok: boolean; reagendarPara?: Date } {
  const agora = new Date();
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const [hStr, mStr] = fmt.format(agora).split(":");
  const agoraMin = parseInt(hStr, 10) * 60 + parseInt(mStr, 10);
  const [iH, iM] = iniHHMM.split(":").map(Number);
  const [fH, fM] = fimHHMM.split(":").map(Number);
  const iniMin = iH * 60 + iM;
  const fimMin = fH * 60 + fM;

  if (agoraMin >= iniMin && agoraMin < fimMin) return { ok: true };

  const abertura = new Date(agora);
  if (agoraMin < iniMin) {
    abertura.setMinutes(abertura.getMinutes() + (iniMin - agoraMin));
  } else {
    abertura.setDate(abertura.getDate() + 1);
    abertura.setHours(iH, iM, 0, 0);
  }
  return { ok: false, reagendarPara: abertura };
}

type SbClient = ReturnType<typeof createServiceClient>;

async function finalizarProg(sb: SbClient, prog: ProgressoRow, status: string, motivo: string) {
  await sb
    .from("ia_atendimento_followup_progresso")
    .update({
      status,
      motivo_fim: motivo,
      finalizado_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", prog.id);
}

async function removerEtiquetaProgresso(sb: SbClient, prog: ProgressoRow, seq: SequenciaRow) {
  if (!seq.etiqueta_em_progresso_id) return;
  await sb
    .from("contato_etiquetas")
    .delete()
    .eq("contato_id", prog.contato_id)
    .eq("etiqueta_id", seq.etiqueta_em_progresso_id);
}

async function aplicarEtiquetaEncerrado(sb: SbClient, prog: ProgressoRow, seq: SequenciaRow) {
  await removerEtiquetaProgresso(sb, prog, seq);
  if (seq.etiqueta_encerrado_id) {
    await sb.from("contato_etiquetas").upsert(
      { contato_id: prog.contato_id, etiqueta_id: seq.etiqueta_encerrado_id },
      { onConflict: "contato_id,etiqueta_id", ignoreDuplicates: true },
    );
  }
}

/**
 * Move ticket para fila Atendimento Humano e pausa IA.
 * Usado quando cadencia de follow-up termina sem resposta do cliente.
 */
async function moverParaFilaHumana(sb: SbClient, prog: ProgressoRow) {
  const { data: filaHumano } = await sb
    .from("filas")
    .select("id")
    .eq("agencia_id", prog.agencia_id)
    .eq("tipo", "humano")
    .eq("ativa", true)
    .limit(1)
    .maybeSingle<{ id: string }>();

  const patch: Record<string, unknown> = {
    ia_pausada: true,
    usuario_id: null,
    status: "aberto",
  };
  if (filaHumano?.id) patch.fila_id = filaHumano.id;
  await sb.from("tickets").update(patch).eq("id", prog.ticket_id);

  try {
    await sb.from("notas_internas").insert({
      ticket_id: prog.ticket_id,
      agencia_id: prog.agencia_id,
      usuario_id: null,
      conteudo: "🤖 Follow-up encerrado sem resposta — ticket movido para Atendimento Humano",
    });
  } catch { /* notas_internas opcional */ }
}

export async function processarFollowUpsIA(limite = 25): Promise<{
  ok: boolean;
  processados: number;
  enviados: number;
  finalizados: number;
  reagendados: number;
  falhas: number;
  cancelados: number;
}> {
  const sb = createServiceClient();
  let processados = 0;
  let enviados = 0;
  let finalizados = 0;
  let reagendados = 0;
  let falhas = 0;
  let cancelados = 0;

  let pickList: ProgressoRow[] = [];
  const { data: lockedRows, error: lockErr } = await sb.rpc("iafp_pickup_devidos", { p_limite: limite });
  if (!lockErr && Array.isArray(lockedRows)) {
    pickList = lockedRows as unknown as ProgressoRow[];
  } else {
    const { data } = await sb
      .from("ia_atendimento_followup_progresso")
      .select("id, agencia_id, perfil_id, sequencia_id, ticket_id, contato_id, canal_id, etapa_atual, proxima_etapa, agendado_para, iniciado_em")
      .eq("status", "agendado")
      .lte("agendado_para", new Date().toISOString())
      .order("agendado_para", { ascending: true })
      .limit(limite);
    pickList = (data || []) as ProgressoRow[];
    if (pickList.length) {
      const ids = pickList.map((p) => p.id);
      await sb
        .from("ia_atendimento_followup_progresso")
        .update({ status: "executando", atualizado_em: new Date().toISOString() })
        .in("id", ids)
        .eq("status", "agendado");
    }
  }

  for (const prog of pickList) {
    processados++;
    try {
      const { data: seq } = await sb
        .from("ia_atendimento_followup_sequencias")
        .select("id, ativa, finalizar_ticket_ao_fim, etiqueta_em_progresso_id, etiqueta_encerrado_id, janela_inicio, janela_fim, timezone")
        .eq("id", prog.sequencia_id)
        .maybeSingle<SequenciaRow>();

      if (!seq || !seq.ativa) {
        await finalizarProg(sb, prog, "cancelado", "sequencia inativa");
        cancelados++;
        continue;
      }

      // Cliente respondeu desde inicio?
      const { count: respostasCliente } = await sb
        .from("mensagens")
        .select("id", { count: "exact", head: true })
        .eq("ticket_id", prog.ticket_id)
        .eq("autor", "cliente")
        .gt("created_at", prog.iniciado_em);

      if ((respostasCliente || 0) > 0) {
        await removerEtiquetaProgresso(sb, prog, seq);
        await finalizarProg(sb, prog, "respondido", "cliente respondeu");
        cancelados++;
        continue;
      }

      const janela = dentroJanela(seq.janela_inicio, seq.janela_fim, seq.timezone);
      if (!janela.ok) {
        await sb
          .from("ia_atendimento_followup_progresso")
          .update({
            status: "agendado",
            agendado_para: (janela.reagendarPara || new Date(Date.now() + 60 * 60_000)).toISOString(),
            atualizado_em: new Date().toISOString(),
          })
          .eq("id", prog.id);
        reagendados++;
        continue;
      }

      const { data: etapa } = await sb
        .from("ia_atendimento_followup_etapas")
        .select("id, ordem, delay_segundos_antes, midia_tipo, texto, midia_path, midia_url, midia_mime, midia_filename")
        .eq("sequencia_id", prog.sequencia_id)
        .eq("ordem", prog.proxima_etapa)
        .maybeSingle<EtapaRow>();

      if (!etapa) {
        await aplicarEtiquetaEncerrado(sb, prog, seq);
        if (seq.finalizar_ticket_ao_fim) {
          await sb.from("tickets").update({ status: "fechado" }).eq("id", prog.ticket_id);
        } else {
          await moverParaFilaHumana(sb, prog);
        }
        await finalizarProg(sb, prog, "finalizado", "cadencia completa");
        finalizados++;
        continue;
      }

      if (!prog.canal_id) {
        await finalizarProg(sb, prog, "cancelado", "sem canal");
        cancelados++;
        continue;
      }

      const { data: canal } = await sb
        .from("canais")
        .select("id, status, instance_token_encrypted, servidor:super_admin_servidores(base_url)")
        .eq("id", prog.canal_id)
        .maybeSingle();

      if (!canal || canal.status !== "connected" || !canal.instance_token_encrypted) {
        await sb
          .from("ia_atendimento_followup_progresso")
          .update({
            status: "agendado",
            agendado_para: new Date(Date.now() + 30 * 60_000).toISOString(),
            atualizado_em: new Date().toISOString(),
          })
          .eq("id", prog.id);
        reagendados++;
        continue;
      }

      const servidorRaw = (canal as unknown as { servidor: unknown }).servidor;
      const servidor = Array.isArray(servidorRaw)
        ? (servidorRaw[0] as { base_url: string } | undefined)
        : (servidorRaw as { base_url: string } | undefined);
      const baseUrl = servidor?.base_url;
      if (!baseUrl) {
        await finalizarProg(sb, prog, "falha", "sem base_url no servidor");
        falhas++;
        continue;
      }

      const token = decryptToken(byteaToBuffer(canal.instance_token_encrypted as Parameters<typeof byteaToBuffer>[0]));
      const inst: UazapiInstance = { baseUrl, token };

      const { data: contato } = await sb
        .from("contatos")
        .select("wa_id, whatsapp")
        .eq("id", prog.contato_id)
        .maybeSingle<{ wa_id: string | null; whatsapp: string | null }>();

      const number = contato?.wa_id || contato?.whatsapp;
      if (!number) {
        await finalizarProg(sb, prog, "falha", "contato sem numero");
        falhas++;
        continue;
      }

      let waMessageId: string | undefined;

      if (etapa.midia_tipo === "texto") {
        const r = await instanceSendText(inst, { number, text: etapa.texto || "" });
        waMessageId = r.id;
      } else {
        let fileUrl = etapa.midia_url || "";
        if (etapa.midia_path) {
          const { data: signed } = await sb.storage.from("ia-followup").createSignedUrl(etapa.midia_path, 600);
          if (signed?.signedUrl) fileUrl = signed.signedUrl;
        }
        if (!fileUrl) throw new Error("midia sem url/path");

        const uazapiType = TIPO_PT_TO_UAZAPI[etapa.midia_tipo] || "document";
        const r = await instanceSendMedia(inst, {
          number,
          type: uazapiType,
          file: fileUrl,
          text: etapa.texto || undefined,
          docName: uazapiType === "document" ? (etapa.midia_filename || "arquivo") : undefined,
        });
        waMessageId = r.id;
      }

      await sb.from("mensagens").insert({
        ticket_id: prog.ticket_id,
        agencia_id: prog.agencia_id,
        autor: "bot",
        tipo: etapa.midia_tipo === "texto" ? "texto" : etapa.midia_tipo,
        conteudo: etapa.texto || "",
        midia_url: etapa.midia_path || etapa.midia_url || null,
        midia_mime: etapa.midia_mime || null,
        status: "enviada",
        wa_message_id: waMessageId,
        metadata: {
          ia_perfil_id: prog.perfil_id,
          followup_progresso_id: prog.id,
          followup_etapa_id: etapa.id,
          followup_etapa_ordem: etapa.ordem,
        },
      });

      await sb.from("ia_atendimento_followup_envios").insert({
        agencia_id: prog.agencia_id,
        progresso_id: prog.id,
        etapa_id: etapa.id,
        status: "enviado",
        wa_message_id: waMessageId || null,
      });

      // Primeira etapa: aplica etiqueta em progresso
      if (prog.etapa_atual === 0 && seq.etiqueta_em_progresso_id) {
        await sb.from("contato_etiquetas").upsert(
          { contato_id: prog.contato_id, etiqueta_id: seq.etiqueta_em_progresso_id },
          { onConflict: "contato_id,etiqueta_id", ignoreDuplicates: true },
        );
      }

      enviados++;

      const { data: proxEtapa } = await sb
        .from("ia_atendimento_followup_etapas")
        .select("id, delay_segundos_antes")
        .eq("sequencia_id", prog.sequencia_id)
        .eq("ordem", prog.proxima_etapa + 1)
        .maybeSingle<{ id: string; delay_segundos_antes: number }>();

      if (proxEtapa) {
        const proxAgendado = new Date(Date.now() + proxEtapa.delay_segundos_antes * 1000);
        await sb
          .from("ia_atendimento_followup_progresso")
          .update({
            etapa_atual: prog.proxima_etapa,
            proxima_etapa: prog.proxima_etapa + 1,
            agendado_para: proxAgendado.toISOString(),
            status: "agendado",
            atualizado_em: new Date().toISOString(),
          })
          .eq("id", prog.id);
      } else {
        await aplicarEtiquetaEncerrado(sb, prog, seq);
        if (seq.finalizar_ticket_ao_fim) {
          await sb.from("tickets").update({ status: "fechado" }).eq("id", prog.ticket_id);
        } else {
          await moverParaFilaHumana(sb, prog);
        }
        await finalizarProg(sb, prog, "finalizado", "cadencia completa");
        finalizados++;
      }
    } catch (e) {
      const erro = e instanceof Error ? e.message : String(e);
      console.error("[followup-ia worker]", prog.id, erro);
      await sb.from("ia_atendimento_followup_envios").insert({
        agencia_id: prog.agencia_id,
        progresso_id: prog.id,
        status: "falha",
        erro: erro.slice(0, 500),
      });
      await sb
        .from("ia_atendimento_followup_progresso")
        .update({
          status: "agendado",
          agendado_para: new Date(Date.now() + 30 * 60_000).toISOString(),
          atualizado_em: new Date().toISOString(),
        })
        .eq("id", prog.id);
      falhas++;
    }
  }

  return { ok: true, processados, enviados, finalizados, reagendados, falhas, cancelados };
}

/** Cancela follow-ups ativos quando cliente responde. */
export async function cancelarFollowUpsPorRespostaCliente(ticketId: string): Promise<void> {
  const sb = createServiceClient();

  const { data: progs } = await sb
    .from("ia_atendimento_followup_progresso")
    .select("id, contato_id, sequencia_id, agencia_id")
    .eq("ticket_id", ticketId)
    .in("status", ["agendado", "executando"]);

  if (!progs?.length) return;

  for (const p of progs) {
    const { data: seq } = await sb
      .from("ia_atendimento_followup_sequencias")
      .select("etiqueta_em_progresso_id")
      .eq("id", p.sequencia_id)
      .maybeSingle<{ etiqueta_em_progresso_id: string | null }>();

    if (seq?.etiqueta_em_progresso_id) {
      await sb
        .from("contato_etiquetas")
        .delete()
        .eq("contato_id", p.contato_id)
        .eq("etiqueta_id", seq.etiqueta_em_progresso_id);
    }

    await sb
      .from("ia_atendimento_followup_progresso")
      .update({
        status: "respondido",
        motivo_fim: "cliente respondeu",
        finalizado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString(),
      })
      .eq("id", p.id);
  }
}

/** Chamado pelo executor após primeira resposta IA bem-sucedida. */
export async function inscreverFollowUpIA(args: {
  agenciaId: string;
  perfilId: string;
  ticketId: string;
  contatoId: string;
  canalId: string;
}): Promise<{ inscritas: number }> {
  const sb = createServiceClient();

  const { data: jaExiste } = await sb
    .from("ia_atendimento_followup_progresso")
    .select("id")
    .eq("ticket_id", args.ticketId)
    .in("status", ["agendado", "executando"])
    .maybeSingle();
  if (jaExiste) return { inscritas: 0 };

  const { data: seqs } = await sb
    .from("ia_atendimento_followup_sequencias")
    .select("id, ordem_no_perfil")
    .eq("perfil_id", args.perfilId)
    .eq("ativa", true)
    .order("ordem_no_perfil", { ascending: true });

  if (!seqs?.length) return { inscritas: 0 };

  const seq = seqs[0];

  const { data: etapa1 } = await sb
    .from("ia_atendimento_followup_etapas")
    .select("delay_segundos_antes")
    .eq("sequencia_id", seq.id)
    .eq("ordem", 1)
    .maybeSingle<{ delay_segundos_antes: number }>();
  if (!etapa1) return { inscritas: 0 };

  const agendadoPara = new Date(Date.now() + etapa1.delay_segundos_antes * 1000);

  await sb.from("ia_atendimento_followup_progresso").insert({
    agencia_id: args.agenciaId,
    perfil_id: args.perfilId,
    sequencia_id: seq.id,
    ticket_id: args.ticketId,
    contato_id: args.contatoId,
    canal_id: args.canalId,
    etapa_atual: 0,
    proxima_etapa: 1,
    agendado_para: agendadoPara.toISOString(),
    status: "agendado",
  });

  return { inscritas: 1 };
}
