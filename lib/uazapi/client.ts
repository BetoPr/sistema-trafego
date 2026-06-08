/**
 * UAZAPI client v2.1.0 — alinhado ao OpenAPI spec oficial.
 *
 * Auth:
 *  - Admin endpoints (criação de instância, listagem, webhook global):
 *    header `admintoken`
 *  - Instance endpoints (resto): header `token` (instance token)
 *
 * Estados da instância: `disconnected | connecting | connected`
 *
 * Docs: https://docs.uazapi.com
 */

export interface UazapiServer {
  baseUrl: string; // ex: https://infinitycomercialia.uazapi.com
  adminToken: string;
}

export interface UazapiInstance {
  baseUrl: string;
  token: string;
}

interface ReqOpts {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
}

class UazapiError extends Error {
  constructor(
    public status: number,
    public path: string,
    public payload: unknown,
    message: string,
  ) {
    super(message);
    this.name = "UazapiError";
  }
}

async function call(baseUrl: string, path: string, opts: ReqOpts = {}): Promise<unknown> {
  const url = `${baseUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 25_000);
  try {
    const res = await fetch(url, {
      method: opts.method ?? "GET",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        ...(opts.headers || {}),
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      cache: "no-store",
      signal: ctrl.signal,
    });
    const text = await res.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = { raw: text };
    }
    if (!res.ok) {
      const msg =
        (json as { error?: string } | null)?.error ||
        (json as { message?: string } | null)?.message ||
        res.statusText;
      throw new UazapiError(res.status, path, json, `UAZAPI ${path}: ${msg}`);
    }
    return json;
  } finally {
    clearTimeout(t);
  }
}

// =========================================
// Tipos compartilhados (subset do schema oficial)
// =========================================

export interface InstanceInfo {
  id: string;
  name?: string;
  status?: "disconnected" | "connecting" | "connected" | string;
  profileName?: string;
  profilePicUrl?: string;
  qrcode?: string;
  paircode?: string;
  jid?: { user?: string; server?: string } | null;
  adminField01?: string;
  adminField02?: string;
}

export interface ConnectionStatus {
  connected: boolean;
  loggedIn: boolean;
  jid: { user?: string; server?: string } | null;
}

// =========================================
// ADMIN — criação/listagem de instâncias + webhook global
// =========================================

/**
 * POST /instance/create — cria nova instância.
 * Body: { name, adminField01?, adminField02? }
 * Retorna: { instance, token, connected, loggedIn, ... }
 */
export async function adminCreateInstance(
  server: UazapiServer,
  params: { name: string; adminField01?: string; adminField02?: string },
): Promise<{ instance: InstanceInfo; token: string }> {
  const r = (await call(server.baseUrl, "/instance/create", {
    method: "POST",
    headers: { admintoken: server.adminToken },
    body: params,
  })) as { instance: InstanceInfo; token: string };
  return { instance: r.instance, token: r.token };
}

/** Alias retrocompatível. */
export const adminInitInstance = adminCreateInstance;

/**
 * GET /instance/all — lista todas instâncias do servidor.
 */
export async function adminListInstances(server: UazapiServer): Promise<InstanceInfo[]> {
  const r = (await call(server.baseUrl, "/instance/all", {
    method: "GET",
    headers: { admintoken: server.adminToken },
  })) as InstanceInfo[] | { instances?: InstanceInfo[] };
  if (Array.isArray(r)) return r;
  return r.instances ?? [];
}

export interface GlobalWebhookConfig {
  id?: string;
  enabled: boolean;
  url: string;
  events: string[];
  excludeMessages?: string[];
  addUrlEvents?: boolean;
  addUrlTypesMessages?: boolean;
}

export async function adminGetGlobalWebhook(server: UazapiServer): Promise<GlobalWebhookConfig | null> {
  try {
    return (await call(server.baseUrl, "/globalwebhook", {
      method: "GET",
      headers: { admintoken: server.adminToken },
    })) as GlobalWebhookConfig;
  } catch (e) {
    if (e instanceof UazapiError && e.status === 404) return null;
    throw e;
  }
}

export async function adminSetGlobalWebhook(
  server: UazapiServer,
  cfg: GlobalWebhookConfig,
): Promise<GlobalWebhookConfig> {
  return (await call(server.baseUrl, "/globalwebhook", {
    method: "POST",
    headers: { admintoken: server.adminToken },
    body: cfg,
  })) as GlobalWebhookConfig;
}

// =========================================
// INSTANCE — autenticado com `token` da instância
// =========================================

/**
 * POST /instance/connect — inicia conexão (gera QR ou pair code).
 * Body opcional: { phone?, browser?, systemName?, proxy_managed_* }
 *  - sem phone → gera QR
 *  - com phone → gera código de pareamento
 * Retorna: { connected, loggedIn, jid, instance: { qrcode?, paircode?, ... } }
 */
export async function instanceConnect(
  inst: UazapiInstance,
  params: { phone?: string; browser?: "auto" | "safari" | "firefox" | "edge" | "chrome"; systemName?: string } = {},
): Promise<{ connected: boolean; loggedIn: boolean; jid: unknown; instance: InstanceInfo }> {
  return (await call(inst.baseUrl, "/instance/connect", {
    method: "POST",
    headers: { token: inst.token },
    body: params,
  })) as { connected: boolean; loggedIn: boolean; jid: unknown; instance: InstanceInfo };
}

/**
 * GET /instance/status — status + qr atualizado + jid.
 * Retorna: { instance, status: { connected, loggedIn, jid } }
 */
export async function instanceGetStatus(
  inst: UazapiInstance,
): Promise<{ instance: InstanceInfo; status: ConnectionStatus }> {
  return (await call(inst.baseUrl, "/instance/status", {
    method: "GET",
    headers: { token: inst.token },
  })) as { instance: InstanceInfo; status: ConnectionStatus };
}

/**
 * POST /instance/disconnect — desconecta sessão WhatsApp.
 */
export async function instanceDisconnect(inst: UazapiInstance): Promise<void> {
  await call(inst.baseUrl, "/instance/disconnect", {
    method: "POST",
    headers: { token: inst.token },
  });
}

/**
 * DELETE /instance — remove a instância no servidor (autenticada com instance token).
 *
 * IMPORTANTE: spec usa instance token (não admintoken).
 */
export async function instanceDelete(inst: UazapiInstance): Promise<void> {
  await call(inst.baseUrl, "/instance", {
    method: "DELETE",
    headers: { token: inst.token },
  });
}

/**
 * Backwards-compat alias — UAZAPI não tem admin delete-by-id;
 * use o instance token disponível.
 *
 * @deprecated use instanceDelete com UazapiInstance
 */
export async function adminDeleteInstance(_server: UazapiServer, _instanceId: string): Promise<void> {
  throw new Error("UAZAPI não suporta admin-delete por ID. Use instanceDelete com instance token.");
}

// =========================================
// SEND messages
// =========================================

export interface SendTextParams {
  number: string; // 5511999999999 ou {jid}@s.whatsapp.net ou {jid}@g.us ou {jid}@newsletter
  text: string;
  replyid?: string;
  mentions?: string[];
  delay?: number;
  readchat?: boolean;
  readmessages?: boolean;
  linkPreview?: boolean;
  linkPreviewTitle?: string;
  linkPreviewDescription?: string;
  linkPreviewImage?: string;
  linkPreviewLarge?: boolean;
}

export interface SendMessageResult {
  id?: string;
  status?: string;
  messageid?: string;
  raw?: unknown;
}

export async function instanceSendText(
  inst: UazapiInstance,
  p: SendTextParams,
): Promise<SendMessageResult> {
  return (await call(inst.baseUrl, "/send/text", {
    method: "POST",
    headers: { token: inst.token },
    body: p,
  })) as SendMessageResult;
}

export interface SendMediaParams {
  number: string;
  /**
   * image | video | videoplay | document | audio | myaudio | ptt | ptv | sticker
   */
  type: "image" | "video" | "videoplay" | "document" | "audio" | "myaudio" | "ptt" | "ptv" | "sticker";
  /** URL ou base64 do arquivo. */
  file: string;
  /** Caption/legenda — placeholders suportados. */
  text?: string;
  docName?: string;
  replyid?: string;
  delay?: number;
  viewOnce?: boolean;
}

export async function instanceSendMedia(
  inst: UazapiInstance,
  p: SendMediaParams,
): Promise<SendMessageResult> {
  return (await call(inst.baseUrl, "/send/media", {
    method: "POST",
    headers: { token: inst.token },
    body: p,
  })) as SendMessageResult;
}

// =========================================
// GROUPS
// =========================================

export interface UazapiGroup {
  JID: string;
  Name: string;
  OwnerJID?: string;
  Topic?: string;
  IsAnnounce?: boolean;
  IsLocked?: boolean;
  Participants?: Array<{ JID: string; IsAdmin?: boolean; IsSuperAdmin?: boolean }>;
}

/**
 * GET /group/list — lista grupos da conta conectada.
 */
export async function instanceListGroups(
  inst: UazapiInstance,
  opts: { force?: boolean; noparticipants?: boolean } = {},
): Promise<UazapiGroup[]> {
  const qs = new URLSearchParams();
  if (opts.force) qs.set("force", "true");
  if (opts.noparticipants) qs.set("noparticipants", "true");
  const path = qs.toString() ? `/group/list?${qs.toString()}` : "/group/list";
  const r = (await call(inst.baseUrl, path, {
    method: "GET",
    headers: { token: inst.token },
  })) as { groups?: UazapiGroup[] } | UazapiGroup[];
  if (Array.isArray(r)) return r;
  return r.groups ?? [];
}

/**
 * POST /group/info — detalhes do grupo (inclui participantes).
 */
export async function instanceGetGroupInfo(
  inst: UazapiInstance,
  params: { groupjid: string; getInviteLink?: boolean; getRequestsParticipants?: boolean; force?: boolean },
): Promise<UazapiGroup> {
  return (await call(inst.baseUrl, "/group/info", {
    method: "POST",
    headers: { token: inst.token },
    body: params,
  })) as UazapiGroup;
}

/**
 * POST /group/updateParticipants — adiciona/remove/promote/demote membros.
 */
export async function instanceGroupParticipantsAction(
  inst: UazapiInstance,
  params: {
    groupjid: string;
    action: "add" | "remove" | "promote" | "demote";
    participants: string[];
  },
): Promise<unknown> {
  return await call(inst.baseUrl, "/group/updateParticipants", {
    method: "POST",
    headers: { token: inst.token },
    body: params,
  });
}

export async function instanceGroupUpdateName(
  inst: UazapiInstance,
  params: { groupjid: string; name: string },
): Promise<unknown> {
  return await call(inst.baseUrl, "/group/updateName", {
    method: "POST",
    headers: { token: inst.token },
    body: params,
  });
}

export async function instanceGroupUpdateDescription(
  inst: UazapiInstance,
  params: { groupjid: string; description: string },
): Promise<unknown> {
  return await call(inst.baseUrl, "/group/updateDescription", {
    method: "POST",
    headers: { token: inst.token },
    body: params,
  });
}

export async function instanceGroupUpdateImage(
  inst: UazapiInstance,
  params: { groupjid: string; image: string },
): Promise<unknown> {
  return await call(inst.baseUrl, "/group/updateImage", {
    method: "POST",
    headers: { token: inst.token },
    body: params,
  });
}

/**
 * Alias retrocompatível: modifica subject/description/image em chamadas separadas.
 */
export async function instanceModifyGroup(
  inst: UazapiInstance,
  groupId: string,
  changes: { subject?: string; description?: string; imageUrl?: string; onlyAdmins?: boolean },
): Promise<void> {
  if (changes.subject) {
    await instanceGroupUpdateName(inst, { groupjid: groupId, name: changes.subject });
  }
  if (changes.description) {
    await instanceGroupUpdateDescription(inst, { groupjid: groupId, description: changes.description });
  }
  if (changes.imageUrl) {
    await instanceGroupUpdateImage(inst, { groupjid: groupId, image: changes.imageUrl });
  }
  // onlyAdmins → /group/updateAnnounce (anuncio: true = só admins falam)
  // Não implementado aqui pra manter MVP simples.
}

// =========================================
// WEBHOOK por instância (canal)
// =========================================

export interface InstanceWebhookConfig {
  url: string;
  events?: string[];
  excludeMessages?: string[];
  addUrlEvents?: boolean;
  addUrlTypesMessages?: boolean;
  enabled?: boolean;
  id?: string;
  action?: "add" | "update" | "remove";
}

/**
 * POST /webhook — configura webhook da instância.
 *
 * mode:
 *  - 'add' (default): ADICIONA webhook novo, preservando os existentes
 *    (UAZAPI suporta múltiplos webhooks por instância)
 *  - 'replace': substitui o webhook único (modo simples)
 *
 * Sempre inclui `excludeMessages: ["wasSentByApi"]` pra evitar loops.
 */
export async function instanceSetWebhook(
  inst: UazapiInstance,
  url: string,
  events: string[] = ["messages", "messages_update", "connection"],
  excludeMessages: string[] = ["wasSentByApi"],
  mode: "add" | "replace" = "replace",
): Promise<unknown> {
  const body: Record<string, unknown> = {
    url,
    events,
    excludeMessages,
    addUrlEvents: false,
    addUrlTypesMessages: false,
    enabled: true,
  };
  if (mode === "add") {
    body.action = "add";
  }
  return await call(inst.baseUrl, "/webhook", {
    method: "POST",
    headers: { token: inst.token },
    body,
  });
}

/**
 * Remove webhook específico por ID.
 */
export async function instanceRemoveWebhook(
  inst: UazapiInstance,
  webhookId: string,
): Promise<unknown> {
  return await call(inst.baseUrl, "/webhook", {
    method: "POST",
    headers: { token: inst.token },
    body: { action: "remove", id: webhookId },
  });
}

/** GET /webhook — retorna config atual (array de webhooks). */
export async function instanceGetWebhook(inst: UazapiInstance): Promise<InstanceWebhookConfig[]> {
  const r = (await call(inst.baseUrl, "/webhook", {
    method: "GET",
    headers: { token: inst.token },
  })) as InstanceWebhookConfig[] | InstanceWebhookConfig;
  if (Array.isArray(r)) return r;
  return [r];
}

export { UazapiError };
