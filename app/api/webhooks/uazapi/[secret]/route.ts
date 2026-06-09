/**
 * Webhook receiver UAZAPI.
 *
 * URL: /api/webhooks/uazapi/{secret}
 * - secret é único por canal (column canais.webhook_secret)
 * - identifica canal+agência sem precisar de auth header
 *
 * Body: ver lib/uazapi/webhook-parser.ts
 *
 * Pipeline:
 *  1. Valida secret → resolve canal
 *  2. Parser detecta tipo de evento
 *  3. Se messages: ingestMensagem (cria contato/ticket/msg)
 *  4. Se áudio: dispara transcrição em background
 *  5. Se connection: atualiza status do canal
 */
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  detectEventType,
  parseMessage,
  parseConnection,
  type UazapiWebhookPayload,
} from "@/lib/uazapi/webhook-parser";
import { ingestMensagem } from "@/lib/crm/ingest";
import { audit, getIp } from "@/lib/crm/audit";
import { transcreverMensagemAudio } from "@/lib/crm/ia";
import { downloadAndUpload, uploadMedia } from "@/lib/crm/storage";
import { instanceDownloadMessage } from "@/lib/uazapi/client";
import { decryptToken, byteaToBuffer } from "@/lib/crypto/tokens";
import { uploadImageToImgbb, uploadImageFromUrlToImgbb } from "@/lib/imgbb/upload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ secret: string }> },
) {
  const { secret } = await params;
  const sb = createServiceClient();

  const { data: canal } = await sb
    .from("canais")
    .select("id, agencia_id, fila_id, usuario_id, instance_id, instance_token_encrypted, servidor:super_admin_servidores(base_url)")
    .eq("webhook_secret", secret)
    .maybeSingle();

  if (!canal) {
    return NextResponse.json({ error: "secret_invalido" }, { status: 404 });
  }

  let payload: UazapiWebhookPayload;
  try {
    payload = (await req.json()) as UazapiWebhookPayload;
  } catch {
    return NextResponse.json({ error: "json_invalido" }, { status: 400 });
  }

  const evento = detectEventType(payload);

  // Audit log básico (não bloqueia)
  void audit({
    agenciaId: canal.agencia_id,
    acao: "uazapi_webhook",
    entidade: "uazapi-webhook",
    entidadeId: canal.instance_id || canal.id,
    metodo: "POST",
    caminho: `/api/webhooks/uazapi/${secret.slice(0, 8)}…`,
    status: 200,
    ip: getIp(req.headers) || undefined,
    userAgent: req.headers.get("user-agent") || undefined,
    payload: { evento },
  });

  try {
    if (evento === "messages") {
      const parsed = parseMessage(payload);
      if (!parsed) return NextResponse.json({ ok: true, skipped: "sem_mensagem" });
      if (parsed.isGroup) return NextResponse.json({ ok: true, skipped: "grupo" });

      const ingest = await ingestMensagem(
        {
          agenciaId: canal.agencia_id,
          canalId: canal.id,
          canalFilaPadrao: canal.fila_id,
          canalUsuarioPadrao: canal.usuario_id,
        },
        parsed,
      );

      // Mídia: baixa e sobe pro bucket em background.
      const ehMidia = ["audio", "imagem", "video", "documento", "sticker"].includes(parsed.tipo);
      if (ehMidia) {
        void (async () => {
          try {
            let sourceUrl = parsed.midia?.url;
            let mimeType = parsed.midia?.mimeType;
            let filename = parsed.midia?.filename;

            // Se URL ausente, baixa via /message/download da UAZAPI
            if (!sourceUrl) {
              const baseUrl = (canal as unknown as { servidor: { base_url: string } }).servidor.base_url;
              const token = decryptToken(byteaToBuffer(canal.instance_token_encrypted));
              const typeMap: Record<string, "image" | "audio" | "video" | "document" | "sticker"> = {
                audio: "audio", imagem: "image", video: "video", documento: "document", sticker: "sticker",
              };
              const dl = await instanceDownloadMessage(
                { baseUrl, token },
                { id: parsed.waMessageId, type: typeMap[parsed.tipo] },
              );
              sourceUrl = dl.fileURL || undefined;
              mimeType = dl.mimetype || mimeType;
              filename = dl.filename || filename;

              // Se veio base64 em vez de URL
              if (!sourceUrl && dl.base64) {
                // IMAGEM → ImgBB (não polui banco/bucket)
                if (parsed.tipo === "imagem") {
                  try {
                    const ib = await uploadImageToImgbb({ base64: dl.base64, filename });
                    await sb.from("mensagens").update({
                      midia_url: ib.url,
                      midia_mime: mimeType || "image/jpeg",
                      midia_filename: filename || null,
                    }).eq("id", ingest.mensagemId);
                  } catch (e) {
                    console.error("[webhook uazapi] imgbb base64 falhou:", e);
                  }
                  return;
                }

                // Áudio/video/documento → bucket
                const buf = Buffer.from(dl.base64.includes(",") ? dl.base64.split(",")[1] : dl.base64, "base64");
                const up = await uploadMedia({
                  agenciaId: canal.agencia_id,
                  ticketId: ingest.ticketId,
                  data: buf,
                  filename: filename || `${parsed.tipo}.bin`,
                  contentType: mimeType || "application/octet-stream",
                });
                if (up?.path) {
                  await sb.from("mensagens").update({
                    midia_url: up.path,
                    midia_mime: mimeType || null,
                    midia_filename: filename || null,
                  }).eq("id", ingest.mensagemId);
                }
                if (parsed.tipo === "audio" && up?.signedUrl) {
                  await transcreverMensagemAudio({
                    agenciaId: canal.agencia_id,
                    mensagemId: ingest.mensagemId,
                    audioUrl: up.signedUrl,
                  });
                }
                return;
              }
            }

            if (!sourceUrl) {
              console.warn("[webhook uazapi] mídia sem URL nem base64 — pulando", parsed.waMessageId);
              return;
            }

            // IMAGEM com URL → ImgBB direto (download interno + upload)
            if (parsed.tipo === "imagem") {
              try {
                const ib = await uploadImageFromUrlToImgbb({ sourceUrl, filename });
                await sb.from("mensagens").update({
                  midia_url: ib.url,
                  midia_mime: mimeType || "image/jpeg",
                  midia_filename: filename || null,
                }).eq("id", ingest.mensagemId);
              } catch (e) {
                console.error("[webhook uazapi] imgbb url falhou:", e);
              }
              return;
            }

            const up = await downloadAndUpload({
              agenciaId: canal.agencia_id,
              ticketId: ingest.ticketId,
              sourceUrl,
              filename: filename,
              contentType: mimeType,
            });
            if (up?.path) {
              await sb.from("mensagens").update({
                midia_url: up.path,
                midia_mime: mimeType || null,
                midia_filename: filename || null,
              }).eq("id", ingest.mensagemId);
            }
            // Áudio → transcreve via Groq
            if (parsed.tipo === "audio" && up?.signedUrl) {
              await transcreverMensagemAudio({
                agenciaId: canal.agencia_id,
                mensagemId: ingest.mensagemId,
                audioUrl: up.signedUrl,
              });
            }
          } catch (e) {
            console.error("[webhook uazapi] mídia/transcrição:", e);
          }
        })();
      }

      return NextResponse.json({
        ok: true,
        ticket: ingest.ticketNumero,
        novoTicket: ingest.novoTicket,
        novoContato: ingest.novoContato,
      });
    }

    if (evento === "messages_update") {
      // Update de status (enviada → entregue → lida) ou edição.
      // UAZAPI envia { message: { id, ack?, status? } }
      // ack: 0 pendente, 1 enviada, 2 entregue, 3 lida, 4 falha
      const msg = payload.message as Record<string, unknown> | undefined;
      const waId = msg?.id || msg?.messageid || msg?.key_id;
      if (!waId) return NextResponse.json({ ok: true, skipped: "sem_id" });

      const ack = Number(msg?.ack ?? msg?.status ?? -1);
      let novoStatus: string | null = null;
      if (ack === 0) novoStatus = "pendente";
      else if (ack === 1) novoStatus = "enviada";
      else if (ack === 2) novoStatus = "entregue";
      else if (ack === 3) novoStatus = "lida";
      else if (ack === 4) novoStatus = "falha";
      else {
        const s = String(msg?.status || "").toLowerCase();
        if (s.includes("read")) novoStatus = "lida";
        else if (s.includes("deliver")) novoStatus = "entregue";
        else if (s.includes("sent")) novoStatus = "enviada";
        else if (s.includes("fail") || s.includes("error")) novoStatus = "falha";
      }

      if (novoStatus) {
        await sb
          .from("mensagens")
          .update({ status: novoStatus })
          .eq("agencia_id", canal.agencia_id)
          .eq("wa_message_id", String(waId));
      }
      return NextResponse.json({ ok: true, status: novoStatus });
    }

    if (evento === "connection") {
      const conn = parseConnection(payload);
      const update: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (conn.status === "connected") {
        update.status = "connected";
        update.numero_conectado = conn.number;
        update.nome_perfil = conn.profileName;
        update.foto_perfil_url = conn.profilePicUrl;
        update.qr_code_atual = null;
      } else if (conn.status === "disconnected") {
        update.status = "disconnected";
      } else if (conn.status === "qr") {
        update.status = "pending_qr";
        if (conn.qrcode) update.qr_code_atual = conn.qrcode;
        update.qr_atualizado_em = new Date().toISOString();
      }
      await sb.from("canais").update(update).eq("id", canal.id);
      return NextResponse.json({ ok: true, status: conn.status });
    }

    // Outros eventos: log silencioso.
    return NextResponse.json({ ok: true, skipped: evento });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[webhook uazapi] erro:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, hint: "POST only" });
}
