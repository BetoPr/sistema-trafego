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
import { downloadAndUpload } from "@/lib/crm/storage";

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
    .select("id, agencia_id, fila_id, usuario_id, instance_id")
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
      if (parsed.midia?.url) {
        void (async () => {
          try {
            const up = await downloadAndUpload({
              agenciaId: canal.agencia_id,
              ticketId: ingest.ticketId,
              sourceUrl: parsed.midia!.url!,
              filename: parsed.midia!.filename,
              contentType: parsed.midia!.mimeType,
            });
            if (up?.path) {
              await sb
                .from("mensagens")
                .update({ midia_url: up.path })
                .eq("id", ingest.mensagemId);
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
