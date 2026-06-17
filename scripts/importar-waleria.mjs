/**
 * Dispara import de contatos+etiquetas da Waleria via service_role.
 * Lê token do canal direto do DB, decripta, chama importarContatosUazapi.
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "..", ".env.local") });

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TOKEN_KEY = process.env.TOKEN_ENCRYPTION_KEY;

if (!SB_URL || !SB_SERVICE || !TOKEN_KEY) {
  console.error("Faltam vars .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TOKEN_ENCRYPTION_KEY");
  process.exit(1);
}

const sb = createClient(SB_URL, SB_SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });
const AGENCIA_ID = "68e31711-00a3-4cd5-a701-2c20d41612a3";
const CANAL_ID = "70ece0f0-f2b4-4745-a82e-c0f98a948a8a";

// Pega canal + servidor
const { data: canal } = await sb
  .from("canais")
  .select("id, instance_token_encrypted, status, servidor:super_admin_servidores(base_url)")
  .eq("id", CANAL_ID)
  .single();
if (!canal) { console.error("Canal nao encontrado"); process.exit(1); }
if (canal.status !== "connected") { console.error(`Canal status=${canal.status} — precisa connected`); process.exit(1); }

const baseUrl = canal.servidor?.base_url;
console.log("Canal OK, base_url:", baseUrl);

// Decripta token
import crypto from "node:crypto";
function byteaToBuffer(bytea) {
  if (typeof bytea === "string" && bytea.startsWith("\\x")) {
    return Buffer.from(bytea.slice(2), "hex");
  }
  return Buffer.isBuffer(bytea) ? bytea : Buffer.from(bytea);
}
function decryptToken(payload) {
  const key = Buffer.from(TOKEN_KEY, "hex");
  const iv = payload.subarray(0, 12);
  const authTag = payload.subarray(12, 28);
  const ciphertext = payload.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf-8");
}

const token = decryptToken(byteaToBuffer(canal.instance_token_encrypted));
console.log("Token decriptado OK");

// Chama import lib (TS) via tsx
process.env._WALERIA_BASE_URL = baseUrl;
process.env._WALERIA_TOKEN = token;
process.env._WALERIA_AGENCIA = AGENCIA_ID;

// Sub-import
const { importarContatosUazapi } = await import("../lib/crm/import-contatos.ts");
const resumo = await importarContatosUazapi({ sb, agenciaId: AGENCIA_ID, baseUrl, token, pularLabelsNativas: false });
console.log("\n=== RESUMO ===");
console.log(JSON.stringify(resumo, null, 2));
