import { createHmac, timingSafeEqual } from "node:crypto";

const PENDING_TTL_MS = 10 * 60 * 1000;

export interface PendingMetaConnection {
  cliente_id: string;
  user_id: string;
  agencia_id: string;
  // Token AES-256-GCM blob serializado em base64 (já criptografado).
  access_token_b64: string;
  token_expires_at: number; // epoch ms
  ad_accounts: Array<{
    id: string;
    account_id: string;
    name: string;
    currency?: string;
    business_name?: string;
  }>;
  expires_at: number; // TTL do próprio cookie
}

function getSecret(): string {
  const s = process.env.OAUTH_STATE_SECRET;
  if (!s) throw new Error("OAUTH_STATE_SECRET ausente");
  return s;
}

function b64urlEncode(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(str: string): Buffer {
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
  return Buffer.from(str.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

export function signPending(input: Omit<PendingMetaConnection, "expires_at">): string {
  const payload: PendingMetaConnection = {
    ...input,
    expires_at: Date.now() + PENDING_TTL_MS,
  };
  const body = b64urlEncode(Buffer.from(JSON.stringify(payload), "utf8"));
  const sig = b64urlEncode(createHmac("sha256", getSecret()).update(body).digest());
  return `${body}.${sig}`;
}

export function verifyPending(token: string): PendingMetaConnection {
  const parts = token.split(".");
  if (parts.length !== 2) throw new Error("pending cookie malformado");
  const [body, sig] = parts;
  const expected = b64urlEncode(createHmac("sha256", getSecret()).update(body).digest());
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error("pending cookie inválido");
  }
  const payload = JSON.parse(b64urlDecode(body).toString("utf8")) as PendingMetaConnection;
  if (Date.now() > payload.expires_at) throw new Error("pending cookie expirado");
  return payload;
}
