/** Roda o fluxo COMPLETO do botão (contatos+etiquetas -> resolver @lid -> historico -> dedup). npx tsx scripts/run-import-full.ts [agenciaId] */
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
  const { importarMensagensUazapi } = await import("../lib/crm/import-mensagens");
  const { resolverNumerosLid } = await import("../lib/crm/resolver-lid");
  const sb = createServiceClient();
  const { data: canal } = await sb.from("canais").select("id, fila_id, nome, instance_token_encrypted, servidor:super_admin_servidores(base_url)").eq("agencia_id", AG).eq("status", "connected").order("updated_at", { ascending: false }).limit(1).maybeSingle();
  if (!canal) { console.log("sem canal"); return; }
  const servidor = Array.isArray(canal.servidor) ? canal.servidor[0] : canal.servidor;
  const baseUrl = (servidor as { base_url: string }).base_url;
  const token = decryptToken(byteaToBuffer(canal.instance_token_encrypted as Parameters<typeof byteaToBuffer>[0]));

  console.log(`Fluxo completo em "${canal.nome}"...`);
  const c = await importarContatosUazapi({ sb, agenciaId: AG, baseUrl, token });
  console.log(`1) contatos: ${c.contatos_novos} novos chat + ${c.contatos_reais_novos} reais(/contacts) | etiquetas criadas ${c.etiquetas_criadas} aplicadas ${c.etiquetas_aplicadas}`);
  const r = await resolverNumerosLid({ sb, agenciaId: AG, baseUrl, token, limite: 600, maxMs: 180_000 });
  console.log(`2) numeros @lid: resolvidos ${r.resolvidos} | restantes ${r.restantes}`);
  const msg = await importarMensagensUazapi({ sb, agenciaId: AG, canalId: canal.id, canalFilaPadrao: (canal as { fila_id?: string | null }).fila_id ?? null, baseUrl, token, maxChats: 60, porChat: 20 });
  console.log(`3) historico: ${msg.mensagens_novas} msgs novas | ${msg.tickets_criados} tickets`);
  const { data: ded } = await sb.rpc("dedup_contatos_agencia", { p_agencia: AG });
  console.log(`4) dedup: ${ded} contato(s) duplicado(s) juntados`);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
