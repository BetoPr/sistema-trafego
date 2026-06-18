/** Testa importarMensagensUazapi com 3 chats (bounded) e mostra o resumo. */
import { readFileSync } from "node:fs";
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) { let v = m[2].trim(); if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1); if (!process.env[m[1]]) process.env[m[1]] = v; }
}
async function main() {
  const { createServiceClient } = await import("../lib/supabase/service");
  const { decryptToken, byteaToBuffer } = await import("../lib/crypto/tokens");
  const { importarMensagensUazapi } = await import("../lib/crm/import-mensagens");
  const sb = createServiceClient();
  const { data: canal } = await sb.from("canais")
    .select("id, fila_id, instance_token_encrypted, servidor:super_admin_servidores(base_url)")
    .eq("agencia_id", "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa").maybeSingle();
  if (!canal) return console.log("sem canal");
  const servidor = Array.isArray(canal.servidor) ? canal.servidor[0] : canal.servidor;
  const baseUrl = (servidor as { base_url: string }).base_url;
  const token = decryptToken(byteaToBuffer(canal.instance_token_encrypted as Parameters<typeof byteaToBuffer>[0]));
  const r = await importarMensagensUazapi({
    sb, agenciaId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    canalId: canal.id, canalFilaPadrao: (canal as { fila_id?: string | null }).fila_id ?? null,
    baseUrl, token, maxChats: 3, porChat: 15,
  });
  console.log("RESUMO:", JSON.stringify(r, null, 2));
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
