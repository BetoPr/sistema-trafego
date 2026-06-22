import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_BYTES = 12;
const TAG_BYTES = 16;

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex) {
    throw new Error("ENCRYPTION_KEY ausente no .env.local");
  }
  if (hex.length !== 64) {
    throw new Error("ENCRYPTION_KEY deve ter 64 chars hex (32 bytes)");
  }
  return Buffer.from(hex, "hex");
}

export function encryptToken(plaintext: string): Buffer {
  const key = getKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ct]);
}

/**
 * Converte Buffer pra literal `\xHEX` aceito pelo Postgres em campo `bytea`.
 *
 * IMPORTANTE: nunca passe Buffer direto em payload do supabase-js — ele
 * serializa como `{"type":"Buffer","data":[...]}` e vira lixo no banco.
 * Use SEMPRE este helper antes de insert/update em colunas `_encrypted`.
 */
export function bufferToBytea(buf: Buffer): string {
  return `\\x${buf.toString("hex")}`;
}

/**
 * Converte campo `bytea` retornado pelo supabase-js em Buffer.
 * O driver retorna como string "\xHEX" (default) ou Buffer real.
 */
export function byteaToBuffer(raw: unknown): Buffer {
  // Tokens nulos (canal desconectado, integracao expirada) viram Buffer vazio.
  // Quem chama decryptToken depois precisa tratar o "" como "sem token".
  if (raw === null || raw === undefined) return Buffer.alloc(0);
  if (Buffer.isBuffer(raw)) return raw;
  if (typeof raw === "string") {
    if (!raw) return Buffer.alloc(0);
    if (raw.startsWith("\\x")) return Buffer.from(raw.slice(2), "hex");
    // Fallback: base64 (alguns clientes podem retornar assim).
    if (/^[A-Za-z0-9+/=]+$/.test(raw)) return Buffer.from(raw, "base64");
    return Buffer.from(raw, "hex");
  }
  throw new Error(`bytea inesperado: ${typeof raw}`);
}

export function decryptToken(blob: Buffer): string {
  // Buffer vazio = canal/integracao sem token cifrado. Retorna "" pra chamador tratar.
  if (!blob || blob.length === 0) return "";
  const key = getKey();
  const iv = blob.subarray(0, IV_BYTES);
  const tag = blob.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const ct = blob.subarray(IV_BYTES + TAG_BYTES);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString("utf8");
}
