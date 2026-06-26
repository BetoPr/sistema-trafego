/**
 * WahaProvider — implementa WhatsAppProvider sobre WAHA HTTP API.
 *
 * WAHA: https://waha.devlike.pro
 * Auth: header `X-Api-Key` (gerado no .env da VPS).
 * Engine recomendado: NOWEB (multi-sessão escala bem).
 *
 * Convenções:
 *  - `instanceId` no Sonar = `sessionName` no WAHA. Convenção:
 *    `ag_{agenciaId}_ch_{canalId}` ou similar.
 *  - Foto perfil / plataforma device: WAHA não expõe direto — omitidos.
 *  - Pair code (sem QR): WAHA não suporta — `connect({phone})` ignorado.
 */
import type {
  ConnectResult,
  CriarInstanciaResult,
  DownloadedMedia,
  GroupRef,
  InstanceRef,
  MensagemHistorico,
  ProviderRef,
  SendMediaParams,
  SendResult,
  SendTextParams,
  StatusCanal,
  WebhookEvent,
  WhatsAppProvider,
} from "./provider";

interface ReqOpts {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  apiKey: string;
  body?: unknown;
  timeoutMs?: number;
}

class WahaError extends Error {
  constructor(public status: number, public path: string, public payload: unknown, message: string) {
    super(message);
    this.name = "WahaError";
  }
}

async function call(baseUrl: string, path: string, opts: ReqOpts): Promise<unknown> {
  const url = `${baseUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 30_000);
  try {
    const res = await fetch(url, {
      method: opts.method ?? "GET",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        "X-Api-Key": opts.apiKey,
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      cache: "no-store",
      signal: ctrl.signal,
    });
    const text = await res.text();
    let json: unknown = null;
    try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text }; }
    if (!res.ok) {
      const msg =
        (json as { message?: string } | null)?.message ||
        (json as { error?: string } | null)?.error ||
        res.statusText;
      throw new WahaError(res.status, path, json, `WAHA ${path}: ${msg}`);
    }
    return json;
  } finally {
    clearTimeout(t);
  }
}

/** Converte número BR/E164 pra chatId WAHA (@c.us individual ou @g.us grupo). */
function toChatId(numero: string): string {
  if (numero.includes("@")) return numero;
  // Remove tudo que não é dígito
  const digits = numero.replace(/\D/g, "");
  return `${digits}@c.us`;
}

/** Mapeia status WAHA pra estado canônico. */
function mapStatusWaha(s: string | undefined): StatusCanal["estado"] {
  const norm = (s || "").toUpperCase();
  if (norm === "WORKING") return "connected";
  if (norm === "STARTING") return "connecting";
  if (norm === "SCAN_QR_CODE") return "pending_qr";
  if (norm === "STOPPED" || norm === "FAILED") return "disconnected";
  return "disconnected";
}

interface WahaSessionInfo {
  name: string;
  status: string;
  config?: { webhooks?: Array<{ url: string; events: string[] }> };
  me?: { id?: string; pushName?: string };
}

interface WahaMessageId {
  id?: string;
  ID?: string;
  _serialized?: string;
}

interface WahaSendResult {
  id?: WahaMessageId | string;
  ID?: WahaMessageId | string;
  ack?: number;
  timestamp?: number;
  _data?: unknown;
}

function extractWahaMessageId(r: WahaSendResult): string | undefined {
  const id = r.id || r.ID;
  if (!id) return undefined;
  if (typeof id === "string") return id;
  return id._serialized || id.id || id.ID || undefined;
}

export const WahaProvider: WhatsAppProvider = {
  tipo: "waha",

  async criarInstancia(server: ProviderRef, nome: string): Promise<CriarInstanciaResult> {
    // POST /api/sessions { name, start: true } — webhook embutido configurado depois via setWebhook
    const sessionName = nome;
    await call(server.baseUrl, "/api/sessions", {
      method: "POST",
      apiKey: server.adminToken,
      body: {
        name: sessionName,
        start: true,
      },
    });
    return {
      instanceId: sessionName,
      token: server.adminToken,
      sessionName,
    };
  },

  async connect(inst, _opts): Promise<ConnectResult> {
    // WAHA: ao criar session com start:true ela já entra em SCAN_QR_CODE.
    // QR é obtido via GET /api/sessions/{name}/auth/qr (PNG ou base64).
    if (!inst.sessionName) throw new Error("WAHA connect: sessionName obrigatório");
    // Pega QR como base64 (formato image)
    const r = await call(inst.baseUrl, `/api/${inst.sessionName}/auth/qr?format=image`, {
      method: "GET",
      apiKey: inst.token,
    }) as { mimetype?: string; data?: string } | string;
    // Resposta vem como { mimetype: 'image/png', data: 'base64...' } OU base64 puro
    let qrcode: string | undefined;
    if (typeof r === "string") qrcode = r;
    else if (r && typeof r === "object") qrcode = r.data;
    // Confere se já conectou
    const st = await this.getStatus(inst);
    return {
      qrcode,
      connected: st.estado === "connected",
    };
  },

  async getStatus(inst): Promise<StatusCanal> {
    if (!inst.sessionName) throw new Error("WAHA getStatus: sessionName obrigatório");
    const r = await call(inst.baseUrl, `/api/sessions/${inst.sessionName}`, {
      method: "GET",
      apiKey: inst.token,
    }) as WahaSessionInfo;
    const estado = mapStatusWaha(r.status);
    return {
      estado,
      numeroConectado: r.me?.id?.replace(/@.*/, "") || undefined,
      nomePerfil: r.me?.pushName,
      // WAHA não retorna foto perfil nem plataforma SO no status
    };
  },

  async disconnect(inst): Promise<void> {
    if (!inst.sessionName) throw new Error("WAHA disconnect: sessionName obrigatório");
    await call(inst.baseUrl, `/api/sessions/${inst.sessionName}/stop`, {
      method: "POST",
      apiKey: inst.token,
    });
  },

  async deleteInstance(inst): Promise<void> {
    if (!inst.sessionName) throw new Error("WAHA deleteInstance: sessionName obrigatório");
    await call(inst.baseUrl, `/api/sessions/${inst.sessionName}`, {
      method: "DELETE",
      apiKey: inst.token,
    });
  },

  async setWebhook(inst, url, events?: WebhookEvent[]): Promise<void> {
    if (!inst.sessionName) throw new Error("WAHA setWebhook: sessionName obrigatório");
    // WAHA: webhook é atributo da session.config — precisa atualizar via PUT /api/sessions/{name}
    // Eventos WAHA: 'message', 'message.any', 'message.ack', 'message.revoked',
    //               'session.status', 'group.join', 'group.leave', 'call.received'
    // Mapeamento dos eventos canônicos:
    const wahaEvents = (events || ["messages", "messages_update", "connection"]).flatMap((e) => {
      if (e === "messages") return ["message", "message.any"];
      if (e === "messages_update") return ["message.ack", "message.revoked"];
      if (e === "connection") return ["session.status"];
      return [];
    });
    await call(inst.baseUrl, `/api/sessions/${inst.sessionName}`, {
      method: "PUT",
      apiKey: inst.token,
      body: {
        config: {
          webhooks: [{
            url,
            events: wahaEvents,
            retries: { delaySeconds: 2, attempts: 5 },
          }],
        },
      },
    });
  },

  async sendText(inst, p: SendTextParams): Promise<SendResult> {
    if (!inst.sessionName) throw new Error("WAHA sendText: sessionName obrigatório");
    const body: Record<string, unknown> = {
      session: inst.sessionName,
      chatId: toChatId(p.numero),
      text: p.texto,
    };
    if (p.replyId) body.reply_to = p.replyId;
    if (p.mentions) body.mentions = p.mentions.map((m) => toChatId(m));
    // WAHA não tem delay nativo no send — quem precisar de delay aguarda antes de chamar
    const r = await call(inst.baseUrl, "/api/sendText", {
      method: "POST",
      apiKey: inst.token,
      body,
    }) as WahaSendResult;
    return { id: extractWahaMessageId(r), messageId: extractWahaMessageId(r), raw: r };
  },

  async sendMedia(inst, p: SendMediaParams): Promise<SendResult> {
    if (!inst.sessionName) throw new Error("WAHA sendMedia: sessionName obrigatório");
    // Endpoint varia por tipo
    const endpointMap: Record<typeof p.tipo, string> = {
      image: "/api/sendImage",
      video: "/api/sendVideo",
      document: "/api/sendFile",
      audio: "/api/sendVoice",
      ptt: "/api/sendVoice",
      sticker: "/api/sendImage", // WAHA não tem endpoint sticker dedicado; fallback
    };
    const endpoint = endpointMap[p.tipo];
    // arquivo pode ser URL (http...) ou base64
    const isUrl = /^https?:\/\//.test(p.arquivo);
    const file = isUrl
      ? { url: p.arquivo }
      : { data: p.arquivo, mimetype: "application/octet-stream", filename: p.filename || "file" };
    const body: Record<string, unknown> = {
      session: inst.sessionName,
      chatId: toChatId(p.numero),
      caption: p.caption,
      file,
    };
    if (p.replyId) body.reply_to = p.replyId;
    if (p.tipo === "audio" || p.tipo === "ptt") body.convert = true; // converte mp3/wav → ogg/opus
    const r = await call(inst.baseUrl, endpoint, {
      method: "POST",
      apiKey: inst.token,
      body,
    }) as WahaSendResult;
    return { id: extractWahaMessageId(r), messageId: extractWahaMessageId(r), raw: r };
  },

  async downloadMedia(_inst, _p): Promise<DownloadedMedia> {
    // WAHA: mídia recebida vem com URL temporária no payload do webhook
    // (mediaUrl ou hasMedia + GET /api/files/...). TTL controlado por
    // WHATSAPP_FILES_LIFETIME (default 180s). Estratégia: o webhook
    // parser baixa a URL direto pro bucket Supabase no momento que
    // recebe — não usa esse método.
    throw new Error("WAHA downloadMedia: use a mediaUrl direta do webhook (TTL 180s). Não há endpoint /message/download.");
  },

  async listGroups(inst): Promise<GroupRef[]> {
    if (!inst.sessionName) throw new Error("WAHA listGroups: sessionName obrigatório");
    const r = await call(inst.baseUrl, `/api/${inst.sessionName}/groups`, {
      method: "GET",
      apiKey: inst.token,
    }) as Array<{
      id?: string;
      name?: string;
      participants?: Array<{ id?: string; isAdmin?: boolean }>;
      isAnnounce?: boolean;
    }>;
    return (Array.isArray(r) ? r : []).map((g) => ({
      jid: g.id || "",
      nome: g.name || "",
      participantes: g.participants?.length,
      isAnnounce: g.isAnnounce,
    }));
  },

  async getGroupInfo(inst, groupJid): Promise<GroupRef> {
    if (!inst.sessionName) throw new Error("WAHA getGroupInfo: sessionName obrigatório");
    const r = await call(inst.baseUrl, `/api/${inst.sessionName}/groups/${encodeURIComponent(groupJid)}`, {
      method: "GET",
      apiKey: inst.token,
    }) as {
      id?: string;
      name?: string;
      participants?: Array<{ id?: string; isAdmin?: boolean; isSuperAdmin?: boolean }>;
      isAnnounce?: boolean;
    };
    return {
      jid: r.id || groupJid,
      nome: r.name || "",
      participantes: r.participants?.length,
      isAnnounce: r.isAnnounce,
      membros: r.participants?.map((p) => ({
        jid: p.id || "",
        numero: (p.id || "").replace(/@.*/, ""),
        isAdmin: !!(p.isAdmin || p.isSuperAdmin),
      })),
    };
  },

  async findMessages(inst, chatId, limit?: number): Promise<MensagemHistorico[]> {
    if (!inst.sessionName) throw new Error("WAHA findMessages: sessionName obrigatório");
    const qs = new URLSearchParams({
      chatId,
      session: inst.sessionName,
      limit: String(limit ?? 50),
    });
    const r = await call(inst.baseUrl, `/api/messages?${qs.toString()}`, {
      method: "GET",
      apiKey: inst.token,
    }) as Array<{
      id: string;
      timestamp: number;
      from?: string;
      fromMe?: boolean;
      body?: string;
      hasMedia?: boolean;
      mediaUrl?: string;
      type?: string;
      chatId?: string;
    }>;
    return (Array.isArray(r) ? r : []).map((m) => ({
      id: m.id,
      chatId: m.chatId || chatId,
      fromMe: !!m.fromMe,
      timestamp: (m.timestamp || 0) * 1000, // WAHA usa epoch segundos → ms
      tipo: m.type,
      texto: m.body,
      fileURL: m.mediaUrl,
    }));
  },
};
