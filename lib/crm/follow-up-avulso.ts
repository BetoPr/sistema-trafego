/**
 * Worker de Follow-up Avulso (1-3 mensagens agendadas pra um contato).
 *
 * Diferenças vs lib/crm/follow-up.ts:
 *  - Não usa sequências/etapas — cada registro tem suas próprias mensagens + intervalos.
 *  - Intervalos exatos (não-aleatórios) entre mensagens da mesma rajada.
 *  - Opt-out: se cliente enviou mensagem desde `criado_em`, cancela com status='respondido'.
 *  - Disparado por /api/cron/follow-up-avulsos (pg_cron 1/min).
 */
import { createServiceClient } from "@/lib/supabase/service";
import { decryptToken, byteaToBuffer } from "@/lib/crypto/tokens";
import { instanceSendText } from "@/lib/uazapi/client";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface MsgAvulsa {
  texto: string;
}

export interface FollowUpAvulsoResultado {
  processados: number;
  enviados: number;
  respondidos: number;
  falhas: number;
}

export async function processarFollowUpsAvulsosDevidos(limite = 25): Promise<FollowUpAvulsoResultado> {
  const sb = createServiceClient();
  const agora = new Date();
  const res: FollowUpAvulsoResultado = { processados: 0, enviados: 0, respondidos: 0, falhas: 0 };

  const { data: devidos } = await sb
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

  for (const fua of devidos || []) {
    res.processados++;
    const contato = (Array.isArray(fua.contato) ? fua.contato[0] : fua.contato) as { wa_id?: string; whatsapp?: string } | null;
    const canal = (Array.isArray(fua.canal) ? fua.canal[0] : fua.canal) as
      | { id: string; status: string; instance_token_encrypted: unknown; servidor: { base_url: string } | { base_url: string }[] }
      | null;

    const encerrar = async (status: string, motivo: string, erro?: string) => {
      await sb.from("follow_up_avulsos").update({
        status,
        motivo,
        erro: erro || null,
        enviado_em: status === "enviado" ? new Date().toISOString() : null,
      }).eq("id", fua.id);
    };

    try {
      // Opt-out: cliente respondeu desde o agendamento → cancela
      if (fua.ticket_id) {
        const { data: respondeu } = await sb
          .from("mensagens")
          .select("id")
          .eq("ticket_id", fua.ticket_id)
          .eq("autor", "cliente")
          .gt("created_at", fua.criado_em)
          .limit(1);
        if (respondeu && respondeu.length) {
          await encerrar("respondido", "cliente respondeu antes do disparo");
          res.respondidos++;
          continue;
        }
      }

      if (!canal || canal.status !== "connected" || !canal.instance_token_encrypted) {
        await encerrar("falha", "canal desconectado");
        res.falhas++;
        continue;
      }
      const waId = contato?.wa_id || contato?.whatsapp;
      if (!waId) {
        await encerrar("falha", "contato sem whatsapp");
        res.falhas++;
        continue;
      }

      const servidor = Array.isArray(canal.servidor) ? canal.servidor[0] : canal.servidor;
      const baseUrl = servidor.base_url;
      const token = decryptToken(byteaToBuffer(canal.instance_token_encrypted as Parameters<typeof byteaToBuffer>[0]));

      const mensagens = (fua.mensagens as MsgAvulsa[]) || [];
      const intervalos = (fua.intervalos_seg as number[]) || [];

      for (let i = 0; i < mensagens.length; i++) {
        const m = mensagens[i];
        const texto = (m.texto || "").trim();
        if (!texto) continue;

        const r = await instanceSendText({ baseUrl, token }, { number: waId, text: texto });

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

      await encerrar("enviado", `${mensagens.length} mensagem(ns) entregue(s)`);
      res.enviados++;
    } catch (e) {
      res.falhas++;
      await encerrar("falha", "erro no envio", e instanceof Error ? e.message : String(e));
    }
  }

  return res;
}
