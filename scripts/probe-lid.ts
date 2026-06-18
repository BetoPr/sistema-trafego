/** Vê phone/wa_chatlid/wa_chatid de chats @lid. Roda: npx tsx scripts/probe-lid.ts [agenciaId] */
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
  const res = await fetch(baseUrl.replace(/\/$/, "") + "/chat/find", { method: "POST", headers: { token, "content-type": "application/json" }, body: JSON.stringify({ limit: 1000 }) });
  const j = await res.json() as { chats?: Array<Record<string, unknown>> };
  const chats = j.chats || [];
  const lid = chats.filter((c) => !c.wa_isGroup && String(c.wa_chatid).endsWith("@lid"));
  const snet = chats.filter((c) => !c.wa_isGroup && String(c.wa_chatid).endsWith("@s.whatsapp.net"));
  console.log(`naoGrupo=${chats.filter((c)=>!c.wa_isGroup).length} | @lid=${lid.length} | @s.whatsapp.net=${snet.length}`);
  console.log("\n@lid amostra (wa_chatid | phone | wa_chatlid | wa_contactName):");
  for (const c of lid.slice(0, 8)) console.log(`  ${c.wa_chatid} | phone=${JSON.stringify(c.phone)} | lid=${JSON.stringify(c.wa_chatlid)} | nome=${JSON.stringify(c.wa_contactName || c.name)}`);
  const comPhone = lid.filter((c) => c.phone && /^\d{8,15}$/.test(String(c.phone)));
  console.log(`\n@lid com phone numerico valido: ${comPhone.length}/${lid.length}`);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
