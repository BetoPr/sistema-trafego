/**
 * UAZAPI client — chamadas ao servidor UAZAPI (admin + por instância).
 *
 * Auth:
 *  - Admin endpoints: header `admintoken`
 *  - Instance endpoints: header `token` (instance token)
 *
 * Docs: https://docs.uazapi.com (referência geral, paths podem variar por versão)
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
// ADMIN — servidor / criação de instâncias / webhook global
// =========================================

export interface InstanceInfo {
  id: string;
  name?: string;
  token?: string;
  status?: string;
  number?: string;
  profileName?: string;
  profilePicUrl?: string;
  qrcode?: string;
  paircode?: string;
}

/**
 * Cria nova instância no servidor UAZAPI.
 * Retorna instance ID + token de instância (que vai criptografado no banco).
 */
export async function adminInitInstance(
  server: UazapiServer,
  params: { name: string; systemName?: string; adminField01?: string; adminField02?: string },
): Promise<InstanceInfo> {
  const r = (await call(server.baseUrl, "/instance/init", {
    method: "POST",
    headers: { admintoken: server.adminToken },
    body: params,
  })) as { instance?: InstanceInfo } & InstanceInfo;
  return r.instance ?? (r as InstanceInfo);
}

/**
 * Lista todas instâncias do servidor.
 */
export async function adminListInstances(server: UazapiServer): Promise<InstanceInfo[]> {
  const r = (await call(server.baseUrl, "/instance/all", {
    method: "GET",
    headers: { admintoken: server.adminToken },
  })) as InstanceInfo[] | { instances?: InstanceInfo[] };
  if (Array.isArray(r)) return r;
  return r.instances ?? [];
}

/**
 * Deleta instância no servidor.
 */
export async function adminDeleteInstance(server: UazapiServer, instanceId: string): Promise<void> {
  await call(server.baseUrl, "/instance/init", {
    method: "DELETE",
    headers: { admintoken: server.adminToken },
    body: { id: instanceId },
  });
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
// INSTANCE — chamadas com token da instância
// =========================================

/**
 * Solicita conexão / QR Code (ou pair code) da instância.
 * Resposta inclui qrcode (base64 PNG) ou paircode.
 */
export async function instanceConnect(
  inst: UazapiInstance,
  params: { phone?: string } = {},
): Promise<InstanceInfo> {
  return (await call(inst.baseUrl, "/instance/connect", {
    method: "POST",
    headers: { token: inst.token },
    body: params,
  })) as InstanceInfo;
}

/**
 * Status atual da instância (connected, connecting, disconnected, etc).
 */
export async function instanceGetStatus(inst: UazapiInstance): Promise<InstanceInfo> {
  return (await call(inst.baseUrl, "/instance/status", {
    method: "GET",
    headers: { token: inst.token },
  })) as InstanceInfo;
}

/**
 * Perfil do número conectado (nome, foto, número).
 */
export async function instanceGetMe(inst: UazapiInstance): Promise<InstanceInfo> {
  return (await call(inst.baseUrl, "/instance/me", {
    method: "GET",
    headers: { token: inst.token },
  })) as InstanceInfo;
}

export async function instanceDisconnect(inst: UazapiInstance): Promise<void> {
  await call(inst.baseUrl, "/instance/disconnect", {
    method: "POST",
    headers: { token: inst.token },
  });
}

// =========================================
// SEND messages
// =========================================

export interface SendTextParams {
  number: string; // 5511999999999 ou 5511999999999@s.whatsapp.net
  text: string;
  replyid?: string;
  mentions?: string[];
  delay?: number;
  readchat?: boolean;
}

export interface SendMessageResult {
  id?: string;
  status?: string;
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
  type: "image" | "video" | "audio" | "document" | "ptt";
  file: string; // URL ou base64
  filename?: string;
  caption?: string;
  replyid?: string;
  delay?: number;
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
// CHAT — grupos
// =========================================

export interface UazapiGroup {
  id: string;
  subject: string;
  participants?: Array<{ id: string; admin?: string | null }>;
  desc?: string;
  imageUrl?: string;
}

export async function instanceListGroups(inst: UazapiInstance): Promise<UazapiGroup[]> {
  const r = (await call(inst.baseUrl, "/chat/groups", {
    method: "GET",
    headers: { token: inst.token },
  })) as UazapiGroup[] | { groups?: UazapiGroup[] };
  if (Array.isArray(r)) return r;
  return r.groups ?? [];
}

export async function instanceGetGroupParticipants(
  inst: UazapiInstance,
  groupId: string,
): Promise<Array<{ id: string; admin?: string | null }>> {
  const r = (await call(inst.baseUrl, `/chat/groupParticipants/${encodeURIComponent(groupId)}`, {
    method: "GET",
    headers: { token: inst.token },
  })) as Array<{ id: string; admin?: string | null }> | {
    participants?: Array<{ id: string; admin?: string | null }>;
  };
  if (Array.isArray(r)) return r;
  return r.participants ?? [];
}

export async function instanceModifyGroup(
  inst: UazapiInstance,
  groupId: string,
  changes: {
    subject?: string;
    description?: string;
    imageUrl?: string;
    onlyAdmins?: boolean;
  },
): Promise<unknown> {
  return await call(inst.baseUrl, `/chat/modifyGroup/${encodeURIComponent(groupId)}`, {
    method: "POST",
    headers: { token: inst.token },
    body: changes,
  });
}

export async function instanceGroupParticipantsAction(
  inst: UazapiInstance,
  groupId: string,
  action: "add" | "remove" | "promote" | "demote",
  participants: string[],
): Promise<unknown> {
  return await call(inst.baseUrl, `/chat/groupParticipants/${encodeURIComponent(groupId)}`, {
    method: "POST",
    headers: { token: inst.token },
    body: { action, participants },
  });
}

// =========================================
// WEBHOOK por instância (canal)
// =========================================

export async function instanceSetWebhook(
  inst: UazapiInstance,
  url: string,
  events: string[] = ["messages", "messages_update", "connection"],
): Promise<unknown> {
  return await call(inst.baseUrl, "/webhook", {
    method: "POST",
    headers: { token: inst.token },
    body: { enabled: true, url, events },
  });
}

export { UazapiError };
