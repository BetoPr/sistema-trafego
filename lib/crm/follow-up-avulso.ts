/**
 * Worker de Follow-up Avulso (1-3 mensagens agendadas pra um contato).
 *
 * Diferenças vs lib/crm/follow-up.ts:
 *  - Não usa sequências/etapas — cada registro tem suas próprias mensagens + intervalos.
 *  - Intervalos exatos (não-aleatórios) entre mensagens da mesma rajada.
 *  - Opt-out: se cliente enviou mensagem desde `criado_em`, cancela com status='respondido'.
 *  - Disparado por /api/cron/follow-up-avulsos (pg_cron 1/min).
 *
 * IMPORTANTE (fix incidente reenvio):
 *  Cada linha é "claimada" (agendado → enviando) num UPDATE rápido ANTES de enviar.
 *  Só processa quem conseguiu claimar (.select() retorna 1 linha). Assim, mesmo que o
 *  envio seja lento e a função serverless estoure o maxDuration (ou dois ticks do cron
 *  se sobreponham), a linha já saiu de 'agendado' e NUNCA é reprocessada/reenviada.
 *  `marcar()` nunca lança — erro só vai pro log, pra não abortar o lote inteiro.
 */
import { createServiceClient } from "@/lib/supabase/service";
import { decryptToken, byteaToBuffer } from "@/lib/crypto/tokens";
import { instanceSendText } from "@/lib/uazapi/client";
import { automacaoExcedeuTeto, clienteFoiOUltimoAResponder } from "@/lib/crm/anti-flood";
import { parseJanela, proximoEnvioValido, type JanelaComercial } from "@/lib/crm/janela-comercial";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Janela comercial da agência (cache por execução do worker). */
async function getJanela(
  sb: ReturnType<typeof createServiceClient>,
  agenciaId: string,
  cache: Map<string, JanelaComercial | null>,
): Promise<JanelaComercial | null> {
  if (cache.has(agenciaId)) return cache.get(agenciaId) ?? null;
  const { data } = await sb.from("configuracoes_agencia").select("ia").eq("agencia_id", agenciaId).maybeSingle();
  const j = parseJanela(data?.ia);
  cache.set(agenciaId, j);
  return j;
}

interface MsgAvulsa {
  texto: string;
}

export interface FollowUpAvulsoResultado {
  processados: number;
  enviados: number;
  respondidos: number;
  falhas: number;
  pulados: number;
  adiados: number;
}

export async function processarFollowUpsAvulsosDevidos(limite = 25): Promise<FollowUpAvulsoResultado> {
  const sb = createServiceClient();
  const agora = new Date();
  const res: FollowUpAvulsoResultado = { processados: 0, enviados: 0, respondidos: 0, falhas: 0, pulados: 0, adiados: 0 };
  const janelaCache = new Map<string, JanelaComercial | null>();

  const { data: devidos, error: selErr } = await sb
    .from("follow_up_avulsos")
    .select(`
      id, agencia_id, contato_id, ticket_id, canal_id, agenda_em, mensagens, intervalos_seg, criado_em,
      contato:contatos(wa_id, whatsapp),
      canal:canais(id, status, instance_token_encrypted, servidor:super_admin_servidores(base_url))
    `)
    .eq("status", "agendado")
    .lte("agenda_em", agora.toISOString())
    .order("agenda_em", { ascending: true })
    .limit(limite);

  if (selErr) {
    console.error("[fua] select devidos falhou:", selErr.message);
    return res;
  }

  for (const fua of devidos || []) {
    res.processados++;

    // marcar() NUNCA lança — erro só loga. Garante que o lote não aborta.
    const marcar = async (status: string, motivo: string, erro?: string) => {
      try {
        const { error } = await sb.from("follow_up_avulsos").update({
          status,
          motivo,
          erro: erro || null,
          enviado_em: status === "enviado" ? new Date().toISOString() : null,
          atualizado_em: new Date().toISOString(),
        }).eq("id", fua.id);
        if (error) console.error(`[fua] marcar '${status}' falhou (${fua.id}):`, error.message);
      } catch (e) {
        console.error(`[fua] marcar '${status}' exceção (${fua.id}):`, e instanceof Error ? e.message : String(e));
      }
    };

    // --- CLAIM ATÔMICO: só processa se conseguir mudar agendado → enviando ---
    // Move a linha pra fora de 'agendado' ANTES de qualquer envio (que pode ser lento).
    const { data: claim, error: claimErr } = await sb
      .from("follow_up_avulsos")
      .update({ status: "enviando", atualizado_em: new Date().toISOString() })
      .eq("id", fua.id)
      .eq("status", "agendado")
      .select("id");
    if (claimErr) {
      console.error(`[fua] claim falhou (${fua.id}):`, claimErr.message);
      res.falhas++;
      continue;
    }
    if (!claim || claim.length === 0) {
      // Outro worker já pegou (ou status mudou) — não reenvia.
      res.pulados++;
      continue;
    }

    const contato = (Array.isArray(fua.contato) ? fua.contato[0] : fua.contato) as { wa_id?: string; whatsapp?: string } | null;
    const canal = (Array.isArray(fua.canal) ? fua.canal[0] : fua.canal) as
      | { id: string; status: string; instance_token_encrypted: unknown; servidor: { base_url: string } | { base_url: string }[] }
      | null;

    try {
      // Janela comercial: fora do horário comercial/almoço → ADIA (reagenda, não envia)
      const janela = await getJanela(sb, fua.agencia_id, janelaCache);
      const proximo = proximoEnvioValido(janela, agora);
      if (proximo) {
        await sb.from("follow_up_avulsos").update({ status: "agendado", agenda_em: proximo.toISOString(), atualizado_em: new Date().toISOString() }).eq("id", fua.id);
        res.adiados++;
        continue;
      }

      // Opt-out: cliente respondeu desde o agendamento → cancela (não envia)
      if (fua.ticket_id) {
        const { data: respondeu } = await sb
          .from("mensagens")
          .select("id")
          .eq("ticket_id", fua.ticket_id)
          .eq("autor", "cliente")
          .gt("created_at", fua.criado_em)
          .limit(1);
        if (respondeu && respondeu.length) {
          await marcar("respondido", "cliente respondeu antes do disparo");
          res.respondidos++;
          continue;
        }
      }

      // Regra: não faz follow-up pra quem já interagiu (última msg do ticket é do cliente).
      if (await clienteFoiOUltimoAResponder(sb, fua.ticket_id)) {
        await marcar("respondido", "cliente já interagiu — follow-up dispensado");
        res.respondidos++;
        continue;
      }

      // Rede de segurança anti-flood: não envia se o ticket já recebeu msgs automáticas demais.
      if (await automacaoExcedeuTeto(sb, fua.ticket_id, fua.agencia_id)) {
        await marcar("falha", "teto anti-flood (msgs automáticas/24h) atingido");
        res.falhas++;
        continue;
      }

      if (!canal || canal.status !== "connected" || !canal.instance_token_encrypted) {
        await marcar("falha", "canal desconectado");
        res.falhas++;
        continue;
      }
      const waId = contato?.wa_id || contato?.whatsapp;
      if (!waId) {
        await marcar("falha", "contato sem whatsapp");
        res.falhas++;
        continue;
      }

      const servidor = Array.isArray(canal.servidor) ? canal.servidor[0] : canal.servidor;
      const baseUrl = servidor.base_url;
      const token = decryptToken(byteaToBuffer(canal.instance_token_encrypted as Parameters<typeof byteaToBuffer>[0]));

      const mensagens = (fua.mensagens as MsgAvulsa[]) || [];
      const intervalos = (fua.intervalos_seg as number[]) || [];

      let enviadas = 0;
      for (let i = 0; i < mensagens.length; i++) {
        const m = mensagens[i];
        const texto = (m.texto || "").trim();
        if (!texto) continue;

        const r = await instanceSendText({ baseUrl, token }, { number: waId, text: texto });
        enviadas++;

        await sb.from("mensagens").insert({
          ticket_id: fua.ticket_id,
          agencia_id: fua.agencia_id,
          autor: "atendente",
          tipo: "texto",
          conteudo: texto,
          wa_message_id: r.id || null,
          status: "enviada",
          metadata: { follow_up_avulso_id: fua.id, indice: i + 1, total: mensagens.length },
        });

        // Gap entre mensagens (não após a última); intervalos_seg[i] = gap entre msg[i] e msg[i+1]
        if (i < mensagens.length - 1) {
          const gap = Math.max(2, intervalos[i] ?? 2);
          await sleep(gap * 1000);
        }
      }

      await marcar("enviado", `${enviadas} mensagem(ns) entregue(s)`);
      res.enviados++;
    } catch (e) {
      // Já claimado (status='enviando') → não reenvia mesmo se marcar('falha') falhar.
      res.falhas++;
      await marcar("falha", "erro no envio", e instanceof Error ? e.message : String(e));
    }
  }

  return res;
}
