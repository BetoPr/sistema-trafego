/**
 * Worker de Follow-up (sem IA) — processa inscrições devidas.
 * Cross-tenant via service role; disparado por /api/cron/follow-up (pg_cron).
 *
 * Anti-ban embutido:
 *  - opt-out automático: cliente respondeu desde a inscrição → cancela (status 'respondido')
 *  - janela de envio (quiet hours) por sequência
 *  - delay aleatório (min..max seg) entre mensagens da mesma etapa
 *  - variação de texto opcional por mensagem
 *  - teto de envios/dia por agência
 */
import { createServiceClient } from "@/lib/supabase/service";
import { decryptToken, byteaToBuffer } from "@/lib/crypto/tokens";
import { instanceSendText, instanceSendMedia } from "@/lib/uazapi/client";
import { getSignedUrl } from "@/lib/crm/storage";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface MsgEtapa {
  tipo: "texto" | "imagem" | "documento" | "audio" | "video";
  conteudo?: string;
  midia_url?: string;   // URL externa colada
  midia_path?: string;  // path no bucket crm-media (signed na hora do envio)
  midia_mime?: string;
  midia_filename?: string;
  variacoes?: string[];
}

const TIPO_UAZAPI: Record<string, "image" | "video" | "document" | "audio"> = {
  imagem: "image",
  video: "video",
  documento: "document",
  audio: "audio",
};

function escolherTexto(m: MsgEtapa): string {
  const base = m.conteudo || "";
  if (m.variacoes && m.variacoes.length) {
    const todas = [base, ...m.variacoes].filter((s) => s && s.trim());
    if (todas.length) return todas[Math.floor(Math.random() * todas.length)];
  }
  return base;
}

/** Minutos do horário atual no fuso America/Sao_Paulo. */
function minutosAgoraSP(): number {
  const hhmm = new Date().toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour12: false, hour: "2-digit", minute: "2-digit" });
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
function timeToMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

export interface FollowUpResultado {
  processados: number;
  enviados: number;
  respondidos: number;
  concluidos: number;
  reagendados: number;
  falhas: number;
}

export async function processarFollowUpsDevidos(limite = 25): Promise<FollowUpResultado> {
  const sb = createServiceClient();
  const agora = new Date();
  const res: FollowUpResultado = { processados: 0, enviados: 0, respondidos: 0, concluidos: 0, reagendados: 0, falhas: 0 };

  const { data: devidos } = await sb
    .from("follow_up_inscricoes")
    .select(`
      id, agencia_id, sequencia_id, contato_id, ticket_id, canal_id, etapa_atual, criado_em,
      sequencia:follow_up_sequencias(ativo, delay_min_seg, delay_max_seg, janela_inicio, janela_fim, teto_dia),
      contato:contatos(wa_id, whatsapp),
      canal:canais(id, status, instance_token_encrypted, servidor:super_admin_servidores(base_url))
    `)
    .eq("status", "ativo")
    .lte("proximo_envio_em", agora.toISOString())
    .order("proximo_envio_em", { ascending: true })
    .limit(limite);

  for (const insc of devidos || []) {
    res.processados++;
    const seq = (Array.isArray(insc.sequencia) ? insc.sequencia[0] : insc.sequencia) as
      | { ativo: boolean; delay_min_seg: number; delay_max_seg: number; janela_inicio: string; janela_fim: string; teto_dia: number }
      | null;
    const contato = (Array.isArray(insc.contato) ? insc.contato[0] : insc.contato) as { wa_id?: string; whatsapp?: string } | null;
    const canal = (Array.isArray(insc.canal) ? insc.canal[0] : insc.canal) as
      | { id: string; status: string; instance_token_encrypted: unknown; servidor: { base_url: string } | { base_url: string }[] }
      | null;

    const reagendar = async (mins: number) => {
      await sb.from("follow_up_inscricoes").update({ proximo_envio_em: new Date(agora.getTime() + mins * 60000).toISOString(), atualizado_em: agora.toISOString() }).eq("id", insc.id);
      res.reagendados++;
    };
    const encerrar = async (status: string, motivo: string) => {
      await sb.from("follow_up_inscricoes").update({ status, motivo_fim: motivo, atualizado_em: agora.toISOString() }).eq("id", insc.id);
    };

    try {
      if (!seq || !seq.ativo) { await encerrar("pausado", "sequência inativa"); continue; }
      if (!insc.ticket_id) { await encerrar("cancelado", "sem ticket vinculado"); continue; }

      // Janela de envio (quiet hours)
      const nowMin = minutosAgoraSP();
      const ini = timeToMin(seq.janela_inicio);
      const fim = timeToMin(seq.janela_fim);
      if (nowMin < ini) { await reagendar(ini - nowMin); continue; }
      if (nowMin >= fim) { await reagendar(24 * 60 - nowMin + ini); continue; }

      // Opt-out: cliente respondeu desde a inscrição → para tudo
      const { data: respondeu } = await sb
        .from("mensagens")
        .select("id")
        .eq("ticket_id", insc.ticket_id)
        .eq("autor", "cliente")
        .gt("created_at", insc.criado_em)
        .limit(1);
      if (respondeu && respondeu.length) { await encerrar("respondido", "cliente respondeu"); res.respondidos++; continue; }

      // Teto/dia por agência
      const inicioDia = new Date(agora); inicioDia.setHours(0, 0, 0, 0);
      const { count: enviosHoje } = await sb
        .from("follow_up_envios")
        .select("id", { count: "exact", head: true })
        .eq("agencia_id", insc.agencia_id)
        .neq("status", "pulado")
        .gte("enviado_em", inicioDia.toISOString());
      if ((enviosHoje || 0) >= seq.teto_dia) { await reagendar(60); continue; }

      // Próxima etapa
      const { data: etapa } = await sb
        .from("follow_up_etapas")
        .select("id, ordem, mensagens")
        .eq("sequencia_id", insc.sequencia_id)
        .eq("ordem", insc.etapa_atual + 1)
        .maybeSingle();
      if (!etapa) { await encerrar("concluido", "sem mais etapas"); res.concluidos++; continue; }

      // Canal conectado
      if (!canal || canal.status !== "connected" || !canal.instance_token_encrypted) { await reagendar(30); continue; }
      const waId = contato?.wa_id || contato?.whatsapp;
      if (!waId) { await encerrar("cancelado", "contato sem whatsapp"); continue; }

      const servidor = Array.isArray(canal.servidor) ? canal.servidor[0] : canal.servidor;
      const baseUrl = servidor.base_url;
      const token = decryptToken(byteaToBuffer(canal.instance_token_encrypted as Parameters<typeof byteaToBuffer>[0]));

      // Envia cada mensagem da etapa, com delay anti-robô entre elas
      const mensagens = (etapa.mensagens as MsgEtapa[]) || [];
      let nEnviadas = 0;
      for (let i = 0; i < mensagens.length; i++) {
        const m = mensagens[i];
        const texto = escolherTexto(m);
        let wamid: string | undefined;
        let tipoTabela = m.tipo;
        // Resolve URL da mídia: path no bucket → signed URL fresca; senão URL externa
        const fileUrl = m.tipo === "texto" ? null : (m.midia_path ? await getSignedUrl(m.midia_path, 600) : m.midia_url || null);

        if (m.tipo === "texto") {
          const r = await instanceSendText({ baseUrl, token }, { number: waId, text: texto });
          wamid = r.id;
        } else if (fileUrl) {
          const r = await instanceSendMedia({ baseUrl, token }, { number: waId, type: TIPO_UAZAPI[m.tipo] || "document", file: fileUrl, text: texto || undefined, docName: m.midia_filename });
          wamid = r.id;
        } else {
          continue; // mídia sem url/path — pula
        }

        await sb.from("mensagens").insert({
          ticket_id: insc.ticket_id,
          agencia_id: insc.agencia_id,
          autor: "atendente",
          tipo: tipoTabela,
          conteudo: m.tipo === "texto" ? texto : texto || `[${m.tipo}]`,
          midia_url: m.tipo === "texto" ? null : (fileUrl || m.midia_url || null),
          midia_mime: m.midia_mime || null,
          midia_filename: m.midia_filename || null,
          wa_message_id: wamid || null,
          status: "enviada",
          metadata: { follow_up: true, sequencia_id: insc.sequencia_id, etapa: etapa.ordem },
        });
        nEnviadas++;

        // delay entre mensagens (não após a última)
        if (i < mensagens.length - 1) {
          const dmin = Math.max(0, seq.delay_min_seg);
          const dmax = Math.max(dmin, seq.delay_max_seg);
          await sleep((dmin + Math.random() * (dmax - dmin)) * 1000);
        }
      }

      await sb.from("follow_up_envios").insert({ agencia_id: insc.agencia_id, inscricao_id: insc.id, etapa_id: etapa.id, mensagens_enviadas: nEnviadas, status: "enviado" });
      res.enviados++;

      // Avança pra próxima etapa, ou conclui
      const { data: prox } = await sb
        .from("follow_up_etapas")
        .select("apos_horas")
        .eq("sequencia_id", insc.sequencia_id)
        .eq("ordem", insc.etapa_atual + 2)
        .maybeSingle();
      if (prox) {
        await sb.from("follow_up_inscricoes").update({
          etapa_atual: insc.etapa_atual + 1,
          proximo_envio_em: new Date(agora.getTime() + Number(prox.apos_horas) * 3600000).toISOString(),
          atualizado_em: agora.toISOString(),
        }).eq("id", insc.id);
      } else {
        await sb.from("follow_up_inscricoes").update({ etapa_atual: insc.etapa_atual + 1, status: "concluido", motivo_fim: "cadência completa", atualizado_em: agora.toISOString() }).eq("id", insc.id);
        res.concluidos++;
      }
    } catch (e) {
      res.falhas++;
      await sb.from("follow_up_envios").insert({ agencia_id: insc.agencia_id, inscricao_id: insc.id, status: "falha", erro: e instanceof Error ? e.message : String(e) });
      // retry em 30min
      await sb.from("follow_up_inscricoes").update({ proximo_envio_em: new Date(agora.getTime() + 30 * 60000).toISOString(), atualizado_em: agora.toISOString() }).eq("id", insc.id);
    }
  }

  return res;
}
