/** Sonda GET /contacts (numeros reais) do guilherme. npx tsx scripts/probe-contacts.ts [agenciaId] */
import { readFileSync } from "node:fs";
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) { let v = m[2].trim(); if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1); if (!process.env[m[1]]) process.env[m[1]] = v; }
}
const AG = process.argv[2] || "9f762ec0-2ff8-4a74-aad2-c5c14f0b52a6";
async function main() {
  const { createServiceClient } = await import("../lib/supabase/service");
  const { decryptToken, byteaToBuffer } = await import("../lib/crypto/tokens");
  const sb = createServiceClient();
  const { data: canal } = await sb.from("canais").select("instance_token_encrypted, servidor:super_admin_servidores(base_url)").eq("agencia_id", AG).eq("status", "connected").order("updated_at", { ascending: false }).limit(1).maybeSingle();
  const servidor = Array.isArray(canal!.servidor) ? canal!.servidor[0] : canal!.servidor;
  const baseUrl = (servidor as { base_url: string }).base_url;
  const token = decryptToken(byteaToBuffer(canal!.instance_token_encrypted as Parameters<typeof byteaToBuffer>[0]));

  for (const scope of ["all", "inAddressBook", "notInAddressBook"]) {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/contacts?contactScope=${scope}`, { headers: { token, accept: "application/json" } });
    const j = await res.json() as Array<Record<string, unknown>> | Record<string, unknown>;
    const arr = Array.isArray(j) ? j : ((j as { contacts?: unknown[] }).contacts || []);
    console.log(`\n=== contactScope=${scope} -> ${res.status} | ${arr.length} contatos ===`);
    if (scope === "all" && arr[0]) {
      console.log("chaves:", Object.keys(arr[0] as object).join(", "));
      const jids = (arr as Array<Record<string, unknown>>).map((c) => String(c.jid || ""));
      const real = jids.filter((j) => /@s\.whatsapp\.net$/.test(j));
      const lid = jids.filter((j) => j.endsWith("@lid"));
      console.log(`jids reais @s.whatsapp.net: ${real.length} | @lid: ${lid.length}`);
      for (const c of (arr as Array<Record<string, unknown>>).slice(0, 6)) console.log("  ", JSON.stringify({ jid: c.jid, lid: c.lid, name: c.contact_name || c.contact_FirstName }));
      // tem campo lid pra casar com chats @lid?
      const comLid = (arr as Array<Record<string, unknown>>).filter((c) => Object.keys(c).some((k) => /lid/i.test(k) && c[k]));
      console.log(`contatos com algum campo 'lid': ${comLid.length}`);
      if (comLid[0]) console.log("  ex campo lid:", JSON.stringify(Object.fromEntries(Object.entries(comLid[0]).filter(([k]) => /lid|jid/i.test(k)))));
    }
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
