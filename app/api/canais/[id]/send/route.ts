/**
 * POST /api/canais/[id]/send
 * Body:
 *  - texto: { ticketId, text }
 *  - mídia: { ticketId, media: { type, fileBase64, caption?, filename? } }
 */
import { NextResponse, after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { decryptToken, byteaToBuffer } from "@/lib/crypto/tokens";
import { instanceSendText, instanceSendMedia } from "@/lib/uazapi/client";
import { audit, getIp } from "@/lib/crm/audit";
import { dispatchWebhook } from "@/lib/crm/webhook-dispatcher";
import { uploadImageToImgbb } from "@/lib/imgbb/upload";
import { uploadMedia } from "@/lib/crm/storage";

export const runtime = "nodejs";

interface MediaPayload {
  type: "image" | "video" | "audio" | "document" | "ptt" | "sticker";
  fileBase64: string;
  caption?: string;
  filename?: string;
  mimetype?: string;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: canalId } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "auth" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    ticketId?: string;
    text?: string;
    media?: MediaPayload;
    replyid?: string;
    viewOnce?: boolean;
  } | null;
  if (!body?.ticketId || (!body.text && !body.media)) {
    return NextResponse.json({ error: "body_invalido" }, { status: 400 });
  }

  const sb = createServiceClient();
  const { data: u } = await sb.from("usuarios").select("agencia_id, nome").eq("id", auth.user.id).single();
  if (!u) return NextResponse.json({ error: "usuario_nao_encontrado" }, { status: 403 });

  const { data: canal } = await sb
    .from("canais")
    .select("id, agencia_id, instance_token_encrypted, status, servidor:super_admin_servidores(base_url)")
    .eq("id", canalId)
    .eq("agencia_id", u.agencia_id)
    .single();
  if (!canal) return NextResponse.json({ error: "canal_nao_encontrado" }, { status: 404 });
  if (canal.status !== "connected") return NextResponse.json({ error: "canal_desconectado" }, { status: 409 });

  const { data: ticket } = await sb
    .from("tickets")
    .select("id, agencia_id, contato:contatos(wa_id, whatsapp)")
    .eq("id", body.ticketId)
    .eq("agencia_id", u.agencia_id)
    .single();
  if (!ticket) return NextResponse.json({ error: "ticket_nao_encontrado" }, { status: 404 });

  const waId = (ticket.contato as unknown as { wa_id?: string; whatsapp?: string } | null)?.wa_id
    || (ticket.contato as unknown as { whatsapp?: string } | null)?.whatsapp;
  if (!waId) return NextResponse.json({ error: "contato_sem_whatsapp" }, { status: 400 });

  const baseUrl = (canal as unknown as { servidor: { base_url: string } }).servidor.base_url;
  const token = decryptToken(byteaToBuffer(canal.instance_token_encrypted));

  let wamid: string | undefined;
  let tipoMsg: "texto" | "imagem" | "video" | "audio" | "documento" | "sticker" = "texto";
  let conteudoMsg = body.text || "";
  let midiaUrlSalvar: string | null = null;
  let midiaMimeSalvar: string | null = null;

  try {
    if (body.media) {
      // Base64 raw (sem prefixo) pro ImgBB; data URI com mimetype pra UAZAPI
      // identificar o formato (imagem sem mimetype falha no /send/media).
      const file = body.media.fileBase64.includes(",") ? body.media.fileBase64.split(",")[1] : body.media.fileBase64;
      const fileUazapi = body.media.mimetype ? `data:${body.media.mimetype};base64,${file}` : file;
      const r = await instanceSendMedia(
        { baseUrl, token },
        {
          number: waId,
          type: body.media.type,
          file: fileUazapi,
          text: body.media.caption,
          docName: body.media.filename,
          replyid: body.replyid || undefined,
          viewOnce: body.viewOnce || undefined,
        },
      );
      wamid = r.id;
      tipoMsg =
        body.media.type === "image" ? "imagem"
        : body.media.type === "video" ? "video"
        : body.media.type === "audio" || body.media.type === "ptt" ? "audio"
        : body.media.type === "document" ? "documento"
        : body.media.type === "sticker" ? "sticker"
        : "texto";
      conteudoMsg = body.media.caption || `[${tipoMsg}]`;
    } else {
      const r = await instanceSendText({ baseUrl, token }, { number: waId, text: body.text!, replyid: body.replyid || undefined });
      wamid = r.id;
    }
  } catch (e) {
    return NextResponse.json({ error: "uazapi_send", msg: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }

  const { data: msgRow, error } = await sb
    .from("mensagens")
    .insert({
      ticket_id: ticket.id,
      agencia_id: u.agencia_id,
      autor: "atendente",
      usuario_id: auth.user.id,
      tipo: tipoMsg,
      conteudo: conteudoMsg,
      wa_message_id: wamid || null,
      status: "enviada",
      midia_url: midiaUrlSalvar,
      midia_mime: midiaMimeSalvar,
      midia_filename: body.media?.filename || null,
      metadata: body.replyid ? { reply_to: body.replyid } : undefined,
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: "db", msg: error.message }, { status: 500 });

  // Imagem → ImgBB em BACKGROUND (after responde primeiro; realtime UPDATE
  // troca o placeholder pela foto quando o link ficar pronto). Não bloqueia o envio.
  if (body.media?.type === "image") {
    const rawB64 = body.media.fileBase64.includes(",") ? body.media.fileBase64.split(",")[1] : body.media.fileBase64;
    const fname = body.media.filename;
    const mensagemId = msgRow.id;
    after(async () => {
      try {
        const ib = await uploadImageToImgbb({ base64: rawB64, filename: fname });
        await sb.from("mensagens").update({ midia_url: ib.url, midia_mime: body.media?.mimetype || "image/jpeg" }).eq("id", mensagemId);
      } catch (e) {
        console.error("[send] imgbb background falhou:", e);
      }
    });
  }

  // Áudio enviado → sobe pro bucket em background pra tocar no chat (sem ficar "baixando").
  if (body.media && (body.media.type === "ptt" || body.media.type === "audio")) {
    const rawB64 = body.media.fileBase64.includes(",") ? body.media.fileBase64.split(",")[1] : body.media.fileBase64;
    const buf = Buffer.from(rawB64, "base64");
    const mime = body.media.mimetype || "audio/ogg";
    const fname = body.media.filename || "audio.ogg";
    const mensagemId = msgRow.id;
    after(async () => {
      try {
        const up = await uploadMedia({ agenciaId: u.agencia_id, ticketId: ticket.id, data: buf, filename: fname, contentType: mime });
        if (up?.path) await sb.from("mensagens").update({ midia_url: up.path, midia_mime: mime }).eq("id", mensagemId);
      } catch (e) {
        console.error("[send] upload áudio background falhou:", e);
      }
    });
  }

  // Promove pendente → aberto na primeira resposta.
  await sb
    .from("tickets")
    .update({
      status: "aberto",
      usuario_id: auth.user.id,
      primeira_resposta_em: new Date().toISOString(),
    })
    .eq("id", ticket.id)
    .is("primeira_resposta_em", null);

  void audit({
    agenciaId: u.agencia_id,
    usuarioId: auth.user.id,
    acao: "send_message",
    entidade: "mensagem",
    entidadeId: msgRow.id,
    metodo: "POST",
    caminho: `/api/canais/${canalId}/send`,
    status: 200,
    ip: getIp(req.headers) || undefined,
  });

  void dispatchWebhook({
    agenciaId: u.agencia_id,
    evento: "mensagem.enviada",
    payload: { ticket_id: ticket.id, mensagem_id: msgRow.id, conteudo: conteudoMsg, tipo: tipoMsg },
  });

  return NextResponse.json({ ok: true, mensagemId: msgRow.id });
}
