import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

// 10min — TTL antes era 5min mas usuário 2FA / hesitação leva mais
const STATE_TTL_MS = 10 * 60 * 1000;

export interface OAuthStatePayload {
  cliente_id: string;
  user_id: string;
  nonce: string;
  expires_at: number;
}

function getSecret(): string {
  const s = process.env.OAUTH_STATE_SECRET;
  if (!s) throw new Error("OAUTH_STATE_SECRET ausente no .env.local");
  return s;
}

function b64urlEncode(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(str: string): Buffer {
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
  return Buffer.from(str.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

export function signState(input: { cliente_id: string; user_id: string }): string {
  const payload: OAuthStatePayload = {
    cliente_id: input.cliente_id,
    user_id: input.user_id,
    nonce: randomBytes(16).toString("hex"),
    expires_at: Date.now() + STATE_TTL_MS,
  };
  const body = b64urlEncode(Buffer.from(JSON.stringify(payload), "utf8"));
  const sig = b64urlEncode(createHmac("sha256", getSecret()).update(body).digest());
  return `${body}.${sig}`;
}

export function verifyState(token: string): OAuthStatePayload {
  const parts = token.split(".");
  if (parts.length !== 2) throw new Error("state malformado");
  const [body, sig] = parts;
  const expected = b64urlEncode(createHmac("sha256", getSecret()).update(body).digest());
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error("assinatura inválida");
  }
  const payload = JSON.parse(b64urlDecode(body).toString("utf8")) as OAuthStatePayload;
  if (Date.now() > payload.expires_at) throw new Error("state expirado");
  return payload;
}
