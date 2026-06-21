import crypto from "crypto";

const GRAPH_BASE = "https://graph.facebook.com";
function apiVersion(): string {
  return process.env.META_API_VERSION || "v21.0";
}

/** SHA-256 hex de um valor normalizado (lowercase + trim), conforme spec do Meta. */
export function hashSHA256(value: string): string {
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

export interface PurchaseInput {
  pixelId: string;
  accessToken: string;
  eventId: string;
  eventTimeMs: number;
  value: number;
  currency: string;
  ctwaClid?: string | null;
  telefone?: string | null;
  contentName?: string | null;
  numItems?: number | null;
  testEventCode?: string | null;
}

export interface CapiResult {
  ok: boolean;
  status: number;
  fbtrace?: string;
  error?: string;
  raw: unknown;
}

/**
 * Envia um evento Purchase ao Pixel via Conversions API.
 * CTWA: action_source "business_messaging" + messaging_channel "whatsapp" + ctwa_clid em user_data.
 */
export async function enviarPurchase(p: PurchaseInput): Promise<CapiResult> {
  const url = `${GRAPH_BASE}/${apiVersion()}/${p.pixelId}/events`;

  const user_data: Record<string, unknown> = {};
  if (p.ctwaClid) user_data.ctwa_clid = p.ctwaClid;
  if (p.telefone) {
    const digits = p.telefone.replace(/\D/g, "");
    if (digits) user_data.ph = [hashSHA256(digits)];
  }

  const custom_data: Record<string, unknown> = {
    currency: p.currency,
    value: Number(p.value) || 0,
  };
  if (p.contentName) custom_data.content_name = p.contentName;
  if (p.numItems) custom_data.num_items = p.numItems;

  const body: Record<string, unknown> = {
    data: [
      {
        event_name: "Purchase",
        event_time: Math.floor(p.eventTimeMs / 1000),
        action_source: "business_messaging",
        messaging_channel: "whatsapp",
        event_id: p.eventId,
        user_data,
        custom_data,
      },
    ],
    access_token: p.accessToken,
  };
  if (p.testEventCode) body.test_event_code = p.testEventCode;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch (e) {
    return { ok: false, status: 0, error: e instanceof Error ? e.message : String(e), raw: null };
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok || (json as { error?: unknown }).error) {
    const err = (json as { error?: { message?: string; fbtrace_id?: string } }).error;
    return { ok: false, status: res.status, error: err?.message || res.statusText, fbtrace: err?.fbtrace_id, raw: json };
  }
  return { ok: true, status: res.status, raw: json };
}
