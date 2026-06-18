/** Backfill contatos+etiquetas pra um canal. Roda: npx tsx scripts/run-import-contatos.ts [agenciaId] */
import { readFileSync } from "node:fs";
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) { let v = m[2].trim(); if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1); if (!process.env[m[1]]) process.env[m[1]] = v; }
}
const AG = process.argv[2] || "9f762ec0-2ff8-4a74-aad2-c5c14f0b52a6";

async function main() {
  const { createServiceClient } = await import("../lib/supabase/service");
  const { decryptToken, byteaToBuffer } = await import("../lib/crypto/tokens");
  const { importarContatosUazapi } = await import("../lib/crm/import-contatos");
  const sb = createServiceClient();
  const { data: canal } = await sb
    .from("canais").select("nome, instance_token_encrypted, servidor:super_admin_servidores(base_url)")
    .eq("agencia_id", AG).eq("status", "connected").order("updated_at", { ascending: false }).limit(1).maybeSingle();
  if (!canal) { console.log("sem canal"); return; }
  const servidor = Array.isArray(canal.servidor) ? canal.servidor[0] : canal.servidor;
  const baseUrl = (servidor as { base_url: string }).base_url;
  const token = decryptToken(byteaToBuffer(canal.instance_token_encrypted as Parameters<typeof byteaToBuffer>[0]));
  console.log(`Import contatos+etiquetas de "${canal.nome}"...`);
  const r = await importarContatosUazapi({ sb, agenciaId: AG, baseUrl, token });
  console.log(JSON.stringify({ contatos_totais: r.contatos_totais, contatos_novos: r.contatos_novos, etiquetas_criadas: r.etiquetas_criadas, etiquetas_criadas_nomes: r.etiquetas_criadas_nomes, etiquetas_aplicadas: r.etiquetas_aplicadas, etiquetas_existentes: r.etiquetas_existentes, erros: r.erros }, null, 2));
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
