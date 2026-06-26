/**
 * Parser de eventos do webhook WAHA.
 *
 * WAHA payload exemplo:
 * {
 *   "event": "message",
 *   "session": "ag_xxx_ch_yy",
 *   "payload": {
 *     "id": "false_5511999999999@c.us_AAAA",
 *     "timestamp": 1700000000,
 *     "from": "5511999999999@c.us",
 *     "fromMe": false,
 *     "body": "Olá!",
 *     "hasMedia": false,
 *     "chatId": "5511999999999@c.us",
 *     "type": "chat" | "image" | "audio" | "ptt" | "video" | "document" | "sticker" | ...
 *   }
 * }
 *
 * Reusa as interfaces normalizadas do parser UAZAPI (ParsedMessage,
 * ParsedConnection) — ingestMensagem trata os dois iguais.
 */
import type { ParsedConnection, ParsedMessage } from "@/lib/uazapi/webhook-parser";

export type WahaEventType =
  | "message"
  | "message.ack"
  | "message.revoked"
  | "session.status"
  | "unknown";

export interface WahaWebhookPayload {
  event?: string;
  session?: string;
  payload?: Record<string, unknown>;
  [k: string]: unknown;
}

export function detectWahaEventType(p: WahaWebhookPayload): WahaEventType {
  const ev = (p.event || "").toString().toLowerCase();
  if (ev === "message" || ev === "message.any") return "message";
  if (ev === "message.ack") return "message.ack";
  if (ev === "message.revoked") return "message.revoked";
  if (ev === "session.status") return "session.status";
  return "unknown";
}

function mapWahaTipo(t: string | undefined): ParsedMessage["tipo"] {
  const norm = (t || "chat").toLowerCase();
  if (norm === "chat" || norm === "text") return "texto";
  if (norm === "image") return "imagem";
  if (norm === "video") return "video";
  if (norm === "audio" || norm === "ptt" || norm === "voice") return "audio";
  if (norm === "document") return "documento";
  if (norm === "sticker") return "sticker";
  if (norm === "location") return "localizacao";
  if (norm === "vcard" || norm === "contact" || norm === "contact_card") return "contato";
  return "texto";
}

function isGroupChat(chatId: string): boolean {
  return chatId.endsWith("@g.us");
}

/**
 * Converte payload WAHA pra ParsedMessage normalizado.
 * Retorna null pra eventos sem mensagem (eg ack, revoked) — esses
 * são tratados separadamente.
 */
export function parseWahaMessage(p: WahaWebhookPayload): ParsedMessage | null {
  const m = p.payload as Record<string, unknown> | undefined;
  if (!m) return null;

  const id = String(m.id || m.messageId || "");
  if (!id) return null;

  const chatId = String(m.chatId || m.from || "");
  const fromMe = !!m.fromMe;
  const isGroup = isGroupChat(chatId);
  const timestampSec = Number(m.timestamp || 0);
  const timestamp = timestampSec * 1000; // WAHA usa segundos
  const tipo = mapWahaTipo(String(m.type || m.messageType || "chat"));
  const body = (m.body as string | undefined) || "";
  const caption = (m.caption as string | undefined) || undefined;

  // Reação: WAHA envia com `type: 'reaction'` ou `hasReaction`
  // Estrutura típica: { type: 'reaction', body: '👍', reaction: { messageId, emoji } }
  const reactionRaw = m.reaction as { messageId?: string; emoji?: string; targetId?: string; id?: string } | undefined;
  if (reactionRaw && (reactionRaw.messageId || reactionRaw.targetId)) {
    return {
      waMessageId: id,
      waChatId: chatId,
      fromMe,
      isGroup,
      pushName: (m.notifyName as string) || (m.pushName as string) || null,
      timestamp: timestamp || Date.now(),
      tipo: "texto",
      conteudo: null,
      midia: null,
      adReferral: null,
      reaction: {
        targetWaMessageId: String(reactionRaw.messageId || reactionRaw.targetId || ""),
        emoji: String(reactionRaw.emoji || body || ""),
      },
      protocol: null,
      raw: m,
    };
  }

  // Mídia: WAHA expõe `hasMedia: true` + `mediaUrl` (TTL 180s padrão)
  const hasMedia = !!m.hasMedia;
  let midia: ParsedMessage["midia"] = null;
  if (hasMedia) {
    midia = {
      url: (m.mediaUrl as string | undefined) || (m.url as string | undefined),
      mimeType: (m.mimetype as string | undefined) || (m.mimeType as string | undefined),
      filename: (m.filename as string | undefined),
      caption,
      durationSeconds: (m.duration as number | undefined),
    };
  }

  return {
    waMessageId: id,
    waChatId: chatId,
    fromMe,
    isGroup,
    pushName: (m.notifyName as string) || (m.pushName as string) || null,
    timestamp: timestamp || Date.now(),
    tipo,
    conteudo: body || caption || null,
    midia,
    adReferral: null, // WAHA não expõe CTWA click-id por padrão
    reaction: null,
    protocol: null,
    raw: m,
  };
}

/**
 * Converte session.status WAHA pra ParsedConnection normalizado.
 *
 * WAHA status: STOPPED, STARTING, SCAN_QR_CODE, WORKING, FAILED
 */
export function parseWahaConnection(p: WahaWebhookPayload): ParsedConnection {
  const payload = p.payload as Record<string, unknown> | undefined;
  const statusRaw = String(payload?.status || "").toUpperCase();
  let status: ParsedConnection["status"] = "unknown";
  if (statusRaw === "WORKING") status = "connected";
  else if (statusRaw === "STARTING") status = "connecting";
  else if (statusRaw === "SCAN_QR_CODE") status = "qr";
  else if (statusRaw === "STOPPED" || statusRaw === "FAILED") status = "disconnected";

  const me = payload?.me as { id?: string; pushName?: string } | undefined;
  return {
    status,
    number: me?.id?.replace(/@.*/, "") || undefined,
    profileName: me?.pushName,
    raw: payload || {},
  };
}

/**
 * Converte ack numérico WAHA pra string de status.
 * WAHA ack:
 *   -1 = ERROR, 0 = PENDING, 1 = SERVER, 2 = DEVICE, 3 = READ, 4 = PLAYED
 */
export function ackWahaToStatus(ack: number | undefined): string | null {
  if (ack == null || ack === -1) return "falha";
  if (ack === 0) return "pendente";
  if (ack === 1) return "enviada";
  if (ack === 2) return "entregue";
  if (ack === 3 || ack === 4) return "lida";
  return null;
}

/**
 * Pra deletion (message.revoked), extrai o ID da mensagem revogada.
 * WAHA envia { event: "message.revoked", payload: { before: { id }, after: { id } } }
 * — usamos `before.id` como target.
 */
export function parseWahaRevoked(p: WahaWebhookPayload): { targetWaMessageId: string } | null {
  const payload = p.payload as Record<string, unknown> | undefined;
  if (!payload) return null;
  const before = payload.before as { id?: string } | undefined;
  const id = before?.id || (payload.id as string | undefined);
  if (!id) return null;
  return { targetWaMessageId: String(id) };
}
