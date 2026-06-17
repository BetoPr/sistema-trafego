/**
 * Parser de eventos do webhook UAZAPI.
 *
 * UAZAPI envia eventos como POST com body JSON. Exemplo (visto no Log de Auditoria):
 * {
 *   "BaseUrl": "https://infinitycomercialia.uazapi.com",
 *   "EventType": "messages",
 *   "chat": { "id": "...", "wa_chatid": "...", "lead_email": "...", ... },
 *   "message": { ... } // quando EventType=messages
 * }
 */

export type UazapiEventType =
  | "messages"
  | "messages_update"
  | "connection"
  | "presence"
  | "groups"
  | "newsletter_messages"
  | "history"
  | "unknown";

export interface UazapiWebhookPayload {
  BaseUrl?: string;
  EventType?: string;
  event?: string; // alguns envios usam minúsculo
  type?: string;
  chat?: Record<string, unknown>;
  message?: Record<string, unknown>;
  connection?: Record<string, unknown>;
  presence?: Record<string, unknown>;
  groups?: Record<string, unknown>;
  newsletter?: Record<string, unknown>;
  [k: string]: unknown;
}

export interface ParsedMessage {
  waMessageId: string;
  waChatId: string; // contato WA (5511XXX@s.whatsapp.net ou grupo)
  fromMe: boolean;
  isGroup: boolean;
  pushName: string | null;
  timestamp: number; // unix ms
  tipo:
    | "texto"
    | "audio"
    | "imagem"
    | "documento"
    | "video"
    | "sticker"
    | "localizacao"
    | "contato"
    | "interactive";
  conteudo: string | null;
  midia: {
    url?: string;
    mimeType?: string;
    filename?: string;
    caption?: string;
    durationSeconds?: number;
  } | null;
  /**
   * Referral de anúncio (Click-to-WhatsApp).
   * Vem em contextInfo.externalAdReply quando o lead clicou num anúncio
   * do Instagram/Facebook e abriu a conversa.
   */
  adReferral: {
    sourceType?: string; // "ad", "post" etc.
    sourceUrl?: string;
    sourceId?: string;
    title?: string;
    body?: string;
    mediaType?: string;
    mediaUrl?: string;
    thumbnailUrl?: string;
    ctwaClid?: string;
  } | null;
  /**
   * Reação a outra mensagem. Quando preenchida, o webhook NÃO cria nova
   * mensagem — atualiza metadata.reacoes da mensagem alvo.
   */
  reaction: {
    targetWaMessageId: string;
    emoji: string;
  } | null;
  /**
   * Evento de protocolMessage: cliente apagou ou editou uma mensagem.
   * Quando preenchido, webhook NÃO cria nova mensagem — atualiza mensagem alvo.
   */
  protocol: {
    kind: "delete" | "edit";
    targetWaMessageId: string;
    novoConteudo?: string; // só se kind=edit
  } | null;
  raw: Record<string, unknown>;
}

export interface ParsedConnection {
  status: "connected" | "disconnected" | "connecting" | "qr" | "unknown";
  number?: string;
  profileName?: string;
  profilePicUrl?: string;
  qrcode?: string;
  raw: Record<string, unknown>;
}

export function detectEventType(p: UazapiWebhookPayload): UazapiEventType {
  const ev = (p.EventType || p.event || p.type || "").toString().toLowerCase();
  if (ev === "messages") return "messages";
  if (ev === "messages_update") return "messages_update";
  if (ev === "connection") return "connection";
  if (ev === "presence") return "presence";
  if (ev === "groups") return "groups";
  if (ev === "newsletter_messages") return "newsletter_messages";
  if (ev === "history" || ev === "messages_history" || ev === "history_sync") return "history";
  return "unknown";
}

function pickString(obj: Record<string, unknown> | undefined, ...keys: string[]): string | null {
  if (!obj) return null;
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v;
  }
  return null;
}

function pickBool(obj: Record<string, unknown> | undefined, ...keys: string[]): boolean {
  if (!obj) return false;
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "boolean") return v;
    if (typeof v === "number") return v !== 0;
    if (typeof v === "string") return v.toLowerCase() === "true" || v === "1";
  }
  return false;
}

function pickNumber(obj: Record<string, unknown> | undefined, ...keys: string[]): number | null {
  if (!obj) return null;
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "number" && !Number.isNaN(v)) return v;
    if (typeof v === "string" && v && !Number.isNaN(Number(v))) return Number(v);
  }
  return null;
}

export function parseMessage(p: UazapiWebhookPayload): ParsedMessage | null {
  const msg = p.message as Record<string, unknown> | undefined;
  const chat = p.chat as Record<string, unknown> | undefined;
  if (!msg && !chat) return null;

  const waMessageId =
    pickString(msg, "id", "messageid", "message_id", "key_id") ||
    pickString(chat, "lastmessage_id") ||
    `wa_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const waChatId =
    pickString(msg, "chatid", "chat_id", "remoteJid", "wa_chatid") ||
    pickString(chat, "id", "wa_chatid", "chatid") ||
    "";

  const fromMe =
    pickBool(msg, "fromMe", "fromme", "wasSentByApi") ||
    pickBool(chat, "wasSentByApi");

  const isGroup = waChatId.includes("@g.us") || pickBool(msg, "isGroup", "isgroup");

  const pushName =
    pickString(msg, "pushName", "pushname", "senderName") ||
    pickString(chat, "name", "pushname", "wa_name");

  const ts =
    pickNumber(msg, "messageTimestamp", "timestamp", "t") ||
    pickNumber(chat, "lastmessage_t") ||
    Math.floor(Date.now() / 1000);
  const tsMs = ts > 9_999_999_999 ? ts : ts * 1000;

  // Detecta tipo + conteúdo
  const messageType = pickString(msg, "messageType", "type", "msgtype")?.toLowerCase() || "";

  // Reaction: UAZAPI manda como "reactionMessage" / "reaction". Tem campos
  // reactionMessage.text (emoji) + reactionMessage.key.id (msg alvo).
  // Em alguns shapes vem flat: text + reactedMessageId / quoteid.
  let reaction: ParsedMessage["reaction"] = null;
  if (messageType.includes("reaction")) {
    const reactObj = (msg?.reactionMessage as Record<string, unknown> | undefined) || msg;
    const emoji = pickString(reactObj, "text", "reaction", "emoji") || pickString(msg, "text", "reaction") || "";
    const keyObj = (reactObj?.key as Record<string, unknown> | undefined) || undefined;
    const targetId =
      pickString(reactObj, "reactedMessageId", "quoteid", "targetId", "messageReactedId") ||
      pickString(keyObj, "id") ||
      pickString(msg, "reactedMessageId", "quoteid", "messageReactedId") ||
      "";
    if (targetId) reaction = { targetWaMessageId: targetId, emoji };
  }

  // ProtocolMessage: cliente apagou (revoke) ou editou mensagem.
  // UAZAPI envia messageType com "protocol" / "revoke" / "edit".
  let protocol: ParsedMessage["protocol"] = null;
  if (
    messageType.includes("protocol") ||
    messageType.includes("revoke") ||
    messageType.includes("edit")
  ) {
    const protoObj = (msg?.protocolMessage as Record<string, unknown> | undefined) || msg;
    const protoType = pickString(protoObj, "type", "protocolMessageType")?.toUpperCase() || "";
    const keyObj =
      ((protoObj?.key || protoObj?.editedMessageKey || protoObj?.targetMessageKey) as Record<string, unknown> | undefined) || undefined;
    const targetId =
      pickString(protoObj, "targetMessageId", "messageId", "id") ||
      pickString(keyObj, "id") ||
      "";
    const isRevoke = messageType.includes("revoke") || protoType.includes("REVOKE");
    const isEdit = messageType.includes("edit") || protoType.includes("EDIT");
    if (targetId && (isRevoke || isEdit)) {
      const novoConteudo = isEdit
        ? (pickString(protoObj, "editedMessage", "newMessage", "newContent") ||
           pickString(msg, "newConteudo", "edited") || undefined)
        : undefined;
      protocol = { kind: isRevoke ? "delete" : "edit", targetWaMessageId: targetId, novoConteudo };
    }
  }

  let tipo: ParsedMessage["tipo"] = "texto";
  let conteudo: string | null = null;
  let midia: ParsedMessage["midia"] = null;

  if (messageType.includes("audio") || messageType.includes("ptt")) {
    tipo = "audio";
    midia = {
      url: pickString(msg, "url", "fileUrl", "mediaUrl") || undefined,
      mimeType: pickString(msg, "mimetype", "mimeType") || undefined,
      durationSeconds: pickNumber(msg, "seconds", "duration") || undefined,
    };
  } else if (messageType.includes("image")) {
    tipo = "imagem";
    midia = {
      url: pickString(msg, "url", "fileUrl", "mediaUrl") || undefined,
      mimeType: pickString(msg, "mimetype", "mimeType") || undefined,
      caption: pickString(msg, "caption", "text") || undefined,
    };
    conteudo = midia.caption ?? null;
  } else if (messageType.includes("video")) {
    tipo = "video";
    midia = {
      url: pickString(msg, "url", "fileUrl", "mediaUrl") || undefined,
      mimeType: pickString(msg, "mimetype", "mimeType") || undefined,
      caption: pickString(msg, "caption", "text") || undefined,
    };
    conteudo = midia.caption ?? null;
  } else if (messageType.includes("document")) {
    tipo = "documento";
    midia = {
      url: pickString(msg, "url", "fileUrl", "mediaUrl") || undefined,
      mimeType: pickString(msg, "mimetype", "mimeType") || undefined,
      filename: pickString(msg, "filename", "fileName") || undefined,
      caption: pickString(msg, "caption") || undefined,
    };
    conteudo = midia.caption ?? null;
  } else if (messageType.includes("sticker")) {
    tipo = "sticker";
    midia = {
      url: pickString(msg, "url", "fileUrl", "mediaUrl") || undefined,
      mimeType: pickString(msg, "mimetype", "mimeType") || undefined,
    };
  } else if (messageType.includes("location")) {
    tipo = "localizacao";
    conteudo = JSON.stringify({
      lat: pickNumber(msg, "lat", "latitude"),
      lng: pickNumber(msg, "lng", "longitude"),
      name: pickString(msg, "name"),
      address: pickString(msg, "address"),
    });
  } else if (messageType.includes("contact")) {
    tipo = "contato";
    conteudo = pickString(msg, "vcard") || pickString(msg, "displayName");
  } else if (messageType.includes("interactive") || messageType.includes("buttons") || messageType.includes("list")) {
    tipo = "interactive";
    conteudo = pickString(msg, "text", "body", "content");
  } else {
    tipo = "texto";
    conteudo = pickString(msg, "text", "body", "content", "conversation", "extendedTextMessage");
  }

  // Referral de anúncio (Click-to-WhatsApp). UAZAPI manda em vários nomes
  // dependendo da versão; tentamos os principais.
  const ctxRaw =
    (msg?.contextInfo as Record<string, unknown> | undefined) ||
    (msg?.context as Record<string, unknown> | undefined) ||
    undefined;
  const adRaw =
    (ctxRaw?.externalAdReply as Record<string, unknown> | undefined) ||
    (msg?.externalAdReply as Record<string, unknown> | undefined) ||
    (msg?.ctwaContext as Record<string, unknown> | undefined) ||
    (msg?.advertisingContext as Record<string, unknown> | undefined) ||
    (msg?.ad as Record<string, unknown> | undefined) ||
    undefined;

  let adReferral: ParsedMessage["adReferral"] = null;
  if (adRaw) {
    adReferral = {
      sourceType: pickString(adRaw, "sourceType", "source_type") || undefined,
      sourceUrl: pickString(adRaw, "sourceUrl", "source_url", "url") || undefined,
      sourceId: pickString(adRaw, "sourceId", "source_id", "ad_id") || undefined,
      title: pickString(adRaw, "title", "headline") || undefined,
      body: pickString(adRaw, "body", "description", "text") || undefined,
      mediaType: pickString(adRaw, "mediaType", "media_type") || undefined,
      mediaUrl: pickString(adRaw, "mediaUrl", "media_url") || undefined,
      thumbnailUrl: pickString(adRaw, "thumbnailUrl", "thumbnail_url", "thumbnail") || undefined,
      ctwaClid:
        pickString(adRaw, "ctwaClid", "ctwa_clid", "clickId") ||
        pickString(msg, "ctwaClid", "ctwa_clid") ||
        undefined,
    };
    // Se todos os campos estiverem vazios, descarta.
    if (!Object.values(adReferral).some((v) => v)) adReferral = null;
  }

  return {
    waMessageId,
    waChatId,
    fromMe,
    isGroup,
    pushName,
    timestamp: tsMs,
    tipo,
    conteudo,
    midia,
    adReferral,
    protocol,
    reaction,
    raw: { message: msg, chat },
  };
}

export function parseConnection(p: UazapiWebhookPayload): ParsedConnection {
  const c = (p.connection as Record<string, unknown> | undefined) || {};
  const status = (pickString(c, "status", "state") || "").toLowerCase();

  let normalized: ParsedConnection["status"] = "unknown";
  if (status.includes("connect") && !status.includes("dis")) normalized = "connected";
  else if (status.includes("disconnect") || status === "close") normalized = "disconnected";
  else if (status.includes("connecting") || status.includes("init")) normalized = "connecting";
  else if (status.includes("qr") || status === "scan") normalized = "qr";

  return {
    status: normalized,
    number: pickString(c, "number", "phone") || undefined,
    profileName: pickString(c, "profileName", "pushname", "name") || undefined,
    profilePicUrl: pickString(c, "profilePicUrl", "picture", "pic") || undefined,
    qrcode: pickString(c, "qrcode", "qr") || undefined,
    raw: c,
  };
}
