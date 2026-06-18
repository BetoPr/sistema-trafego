/** Testa /chat/details pra resolver @lid -> numero real. npx tsx scripts/probe-details.ts [agenciaId] */
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

  // pega 3 @lid dos chats
  const cr = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/find`, { method: "POST", headers: { token, "content-type": "application/json" }, body: JSON.stringify({ limit: 1000 }) });
  const chats = ((await cr.json()) as { chats?: Array<Record<string, unknown>> }).chats || [];
  const lids = chats.filter((c) => !c.wa_isGroup && String(c.wa_chatid).endsWith("@lid")).slice(0, 4);

  for (const c of lids) {
    const lid = String(c.wa_chatid);
    for (const input of [lid, lid.replace(/@.+/, "")]) {
      const r = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/details`, { method: "POST", headers: { token, "content-type": "application/json" }, body: JSON.stringify({ number: input, preview: false }) });
      const j = await r.json() as Record<string, unknown>;
      console.log(`\ninput=${input} -> ${r.status}`);
      console.log("  wa_chatid:", j.wa_chatid, "| wa_chatlid:", j.wa_chatlid, "| phone:", j.phone, "| wa_label:", JSON.stringify(j.wa_label));
      if (j.wa_chatid) break; // resolveu, nao tenta a 2a forma
    }
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
