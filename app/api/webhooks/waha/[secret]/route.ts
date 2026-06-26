/**
 * Webhook receiver WAHA.
 *
 * URL: /api/webhooks/waha/{secret}
 * - secret é único por canal (column canais.webhook_secret) — mesmo que UAZAPI.
 * - identifica canal+agência sem precisar de header auth.
 *
 * Body: ver lib/waha/webhook-parser.ts
 *
 * Pipeline (espelha o de UAZAPI):
 *  1. Valida secret → resolve canal
 *  2. Detecta tipo evento (message / message.ack / message.revoked / session.status)
 *  3. message → ingestMensagem (cria contato/ticket/msg)
 *  4. message.ack → atualiza status mensagem
 *  5. message.revoked → marca mensagem como deletada
 *  6. session.status → atualiza canal
 *  7. IA atendimento + cancelar follow-up — disparados em after()
 *
 * WAHA TTL mídia padrão é 180s — baixar imediatamente pro bucket.
 */
import { NextResponse, after } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  detectWahaEventType,
  parseWahaMessage,
  parseWahaConnection,
  parseWahaRevoked,
  ackWahaToStatus,
  type WahaWebhookPayload,
} from "@/lib/waha/webhook-parser";
import { ingestMensagem } from "@/lib/crm/ingest";
import { audit, getIp } from "@/lib/crm/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ secret: string }> },
) {
  const { secret } = await params;
  const sb = createServiceClient();

  const { data: canal } = await sb
    .from("canais")
    .select("id, agencia_id, status, fila_id, usuario_id, instance_id, waha_session_name")
    .eq("webhook_secret", secret)
    .eq("provider", "waha")
    .maybeSingle();

  if (!canal) {
    return NextResponse.json({ error: "secret_invalido_ou_provider" }, { status: 404 });
  }

  let payload: WahaWebhookPayload;
  try {
    payload = (await req.json()) as WahaWebhookPayload;
  } catch {
    return NextResponse.json({ error: "json_invalido" }, { status: 400 });
  }

  const evento = detectWahaEventType(payload);

  void audit({
    agenciaId: canal.agencia_id,
    acao: "waha_webhook",
    entidade: "waha-webhook",
    entidadeId: canal.instance_id || canal.id,
    metodo: "POST",
    caminho: `/api/webhooks/waha/${secret.slice(0, 8)}…`,
    status: 200,
    ip: getIp(req.headers) || undefined,
    userAgent: req.headers.get("user-agent") || undefined,
    payload: { evento },
  });

  try {
    // === MESSAGE ===
    if (evento === "message") {
      const parsed = parseWahaMessage(payload);
      if (!parsed) return NextResponse.json({ ok: true, skipped: "sem_mensagem" });
      if (parsed.isGroup) return NextResponse.json({ ok: true, skipped: "grupo" });

      // Reaction: atualiza metadata.reacoes na msg alvo, não cria nova
      if (parsed.reaction) {
        const { data: alvo } = await sb
          .from("mensagens")
          .select("id, metadata")
          .eq("agencia_id", canal.agencia_id)
          .eq("wa_message_id", parsed.reaction.targetWaMessageId)
          .maybeSingle();
        if (alvo) {
          const meta = ((alvo.metadata as Record<string, unknown> | null) || {}) as Record<string, unknown>;
          const reacoes = (meta.reacoes as Record<string, string> | undefined) || {};
          const chave = parsed.pushName || "Cliente";
          const emoji = parsed.reaction.emoji;
          if (emoji) reacoes[chave] = emoji;
          else delete reacoes[chave];
          meta.reacoes = reacoes;
          await sb.from("mensagens").update({ metadata: meta }).eq("id", alvo.id);
        }
        return NextResponse.json({ ok: true, reaction: true, targetEncontrado: !!alvo });
      }

      const ingest = await ingestMensagem(
        {
          agenciaId: canal.agencia_id,
          canalId: canal.id,
          canalFilaPadrao: canal.fila_id,
          canalUsuarioPadrao: canal.usuario_id,
        },
        parsed,
      );

      // Idempotência: mesma msg redelivery → não reprocessar mídia/IA
      if (ingest.duplicada || !ingest.mensagemId) {
        if (canal.status !== "connected") {
          await sb.from("canais").update({ status: "connected", updated_at: new Date().toISOString() }).eq("id", canal.id);
        }
        return NextResponse.json({ ok: true, duplicada: true });
      }

      // Auto-cura: msg chegou = conectado
      if (canal.status !== "connected") {
        await sb.from("canais").update({ status: "connected", updated_at: new Date().toISOString() }).eq("id", canal.id);
      }

      // Mídia: WAHA expira em 180s. Baixar pra bucket em background.
      // Reusa lib/crm/midia-download — mas WAHA não tem /message/download.
      // Estratégia: se parsed.midia.url existe (URL temporária), baixa direto
      // via fetch e sobe pro Supabase Storage.
      const ehMidia = ["audio", "imagem", "video", "documento", "sticker"].includes(parsed.tipo);
      const midiaUrl = parsed.midia?.url;
      if (ehMidia && midiaUrl) {
        const mensagemIdFinal = ingest.mensagemId;
        const mediaInfo = parsed.midia;
        void (async () => {
          try {
            await baixarMidiaWaha({
              sb,
              mensagemId: mensagemIdFinal,
              agenciaId: canal.agencia_id,
              ticketId: ingest.ticketId,
              tipo: parsed.tipo,
              waMessageId: parsed.waMessageId,
              canalId: canal.id,
              transcreverSeCliente: !parsed.fromMe,
              mediaUrl: midiaUrl,
              mimeType: mediaInfo?.mimeType,
              filename: mediaInfo?.filename,
            });
          } catch (e) {
            console.error("[webhook waha] baixar mídia:", e);
          }
        })();
      }

      // IA atendimento (msg do cliente)
      if (!parsed.fromMe && !parsed.isGroup) {
        after(async () => {
          try {
            const { adicionarAoBuffer, processarTicket } = await import("@/lib/ia-atendimento/executor");
            const r = await adicionarAoBuffer({
              ticketId: ingest.ticketId,
              agenciaId: canal.agencia_id,
              canalId: canal.id,
              contatoId: ingest.contatoId,
              conteudo: parsed.conteudo || parsed.midia?.caption || `[${parsed.tipo}]`,
              tipo: parsed.tipo,
            });
            if (r.ok && r.debounceMs !== undefined) {
              await processarTicket(ingest.ticketId, r.debounceMs);
            }
          } catch (e) {
            console.error("[webhook waha] IA after() falhou:", e);
          }
        });

        // Cancelar follow-up se cliente respondeu
        after(async () => {
          try {
            const { cancelarFollowUpsPorRespostaCliente } = await import("@/lib/ia-atendimento/followup-worker");
            await cancelarFollowUpsPorRespostaCliente(ingest.ticketId);
          } catch (e) {
            console.warn("[webhook waha] cancelar followup falhou:", e);
          }
        });
      }

      return NextResponse.json({
        ok: true,
        ticket: ingest.ticketNumero,
        novoTicket: ingest.novoTicket,
        novoContato: ingest.novoContato,
      });
    }

    // === MESSAGE ACK (status update) ===
    if (evento === "message.ack") {
      const p = payload.payload as { id?: string; ack?: number } | undefined;
      if (!p?.id) return NextResponse.json({ ok: true, skipped: "sem_id" });
      const novoStatus = ackWahaToStatus(p.ack);
      if (novoStatus) {
        await sb
          .from("mensagens")
          .update({ status: novoStatus })
          .eq("agencia_id", canal.agencia_id)
          .eq("wa_message_id", String(p.id));
      }
      return NextResponse.json({ ok: true, status: novoStatus });
    }

    // === MESSAGE REVOKED (cliente apagou) ===
    if (evento === "message.revoked") {
      const rev = parseWahaRevoked(payload);
      if (!rev) return NextResponse.json({ ok: true, skipped: "sem_target" });
      await sb
        .from("mensagens")
        .update({
          deleted_em: new Date().toISOString(),
          deleted_pra_todos: true,
        })
        .eq("agencia_id", canal.agencia_id)
        .eq("wa_message_id", rev.targetWaMessageId);
      return NextResponse.json({ ok: true, deleted: true });
    }

    // === SESSION STATUS ===
    if (evento === "session.status") {
      const conn = parseWahaConnection(payload);
      const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (conn.status === "connected") {
        update.status = "connected";
        update.qr_code_atual = null;
        if (conn.number) update.numero_conectado = conn.number;
        if (conn.profileName) update.nome_perfil = conn.profileName;
      } else if (conn.status === "disconnected") {
        update.status = "disconnected";
      } else if (conn.status === "qr") {
        update.status = "pending_qr";
        update.qr_atualizado_em = new Date().toISOString();
      } else if (conn.status === "connecting") {
        update.status = "connecting";
      }
      await sb.from("canais").update(update).eq("id", canal.id);
      return NextResponse.json({ ok: true, status: conn.status });
    }

    return NextResponse.json({ ok: true, skipped: evento });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[webhook waha] erro:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, hint: "POST only", provider: "waha" });
}

/**
 * Download de mídia WAHA: URL pública temporária (TTL 180s) →
 * baixa via fetch + upload pro bucket `crm-media` no Supabase Storage.
 * Atualiza `mensagens.media_path` quando ok.
 *
 * Sem download endpoint, então cada mídia é uma URL one-shot.
 */
async function baixarMidiaWaha(opts: {
  sb: ReturnType<typeof createServiceClient>;
  mensagemId: string;
  agenciaId: string;
  ticketId: string;
  tipo: string;
  waMessageId: string;
  canalId: string;
  transcreverSeCliente: boolean;
  mediaUrl: string;
  mimeType?: string;
  filename?: string;
}): Promise<void> {
  const { sb, mensagemId, agenciaId, mediaUrl, mimeType, filename, tipo } = opts;
  try {
    const res = await fetch(mediaUrl, { cache: "no-store" });
    if (!res.ok) throw new Error(`download ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const ext = (filename?.match(/\.([a-z0-9]{1,5})$/i)?.[1]) || guessExt(mimeType, tipo);
    const path = `${agenciaId}/${mensagemId}.${ext}`;
    const up = await sb.storage.from("crm-media").upload(path, buf, {
      contentType: mimeType || "application/octet-stream",
      upsert: true,
    });
    if (up.error) throw up.error;
    await sb.from("mensagens").update({ media_path: path, media_mimetype: mimeType || null, media_filename: filename || null }).eq("id", mensagemId);
  } catch (e) {
    console.error("[waha media] download falhou:", e);
    await sb.from("mensagens").update({ media_status: "perdida" }).eq("id", mensagemId);
  }
  // TODO: transcrição áudio quando transcreverSeCliente=true — delega pra cron de retry
}

function guessExt(mimeType?: string, tipo?: string): string {
  const m = (mimeType || "").toLowerCase();
  if (m.includes("png")) return "png";
  if (m.includes("jpeg") || m.includes("jpg")) return "jpg";
  if (m.includes("webp")) return "webp";
  if (m.includes("mp4")) return "mp4";
  if (m.includes("ogg") || m.includes("opus")) return "ogg";
  if (m.includes("mp3") || m.includes("mpeg")) return "mp3";
  if (m.includes("pdf")) return "pdf";
  if (tipo === "imagem") return "jpg";
  if (tipo === "audio") return "ogg";
  if (tipo === "video") return "mp4";
  return "bin";
}
