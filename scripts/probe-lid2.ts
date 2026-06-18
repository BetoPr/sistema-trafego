/** Tenta resolver @lid -> numero real: campos da msg + endpoints resolver. */
import { readFileSync } from "node:fs";
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) { let v = m[2].trim(); if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1); if (!process.env[m[1]]) process.env[m[1]] = v; }
}
const AG = "9f762ec0-2ff8-4a74-aad2-c5c14f0b52a6";
async function raw(baseUrl: string, path: string, token: string, method = "POST", body?: unknown) {
  try {
    const res = await fetch(baseUrl.replace(/\/$/, "") + path, { method, headers: { token, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const t = await res.text(); let j: unknown; try { j = JSON.parse(t); } catch { j = t; }
    return { status: res.status, j };
  } catch (e) { return { status: -1, j: String(e) }; }
}
async function main() {
  const { createServiceClient } = await import("../lib/supabase/service");
  const { decryptToken, byteaToBuffer } = await import("../lib/crypto/tokens");
  const sb = createServiceClient();
  const { data: canal } = await sb.from("canais").select("instance_token_encrypted, servidor:super_admin_servidores(base_url)").eq("agencia_id", AG).eq("status", "connected").order("updated_at", { ascending: false }).limit(1).maybeSingle();
  const servidor = Array.isArray(canal!.servidor) ? canal!.servidor[0] : canal!.servidor;
  const baseUrl = (servidor as { base_url: string }).base_url;
  const token = decryptToken(byteaToBuffer(canal!.instance_token_encrypted as Parameters<typeof byteaToBuffer>[0]));

  // pega 1 chat @lid
  const cr = await raw(baseUrl, "/chat/find", token, "POST", { limit: 1000 });
  const chats = (cr.j as { chats?: Array<Record<string, unknown>> }).chats || [];
  const lidChat = chats.find((c) => !c.wa_isGroup && String(c.wa_chatid).endsWith("@lid"));
  if (!lidChat) { console.log("sem @lid"); return; }
  const lid = String(lidChat.wa_chatid);
  console.log("lid alvo:", lid);

  // 1) campos completos da msg desse chat
  const mr = await raw(baseUrl, "/message/find", token, "POST", { chatid: lid, limit: 3 });
  const msgs = (mr.j as { messages?: Array<Record<string, unknown>> }).messages || [];
  if (msgs[0]) {
    console.log("\nchaves msg[0]:", Object.keys(msgs[0]).join(", "));
    for (const k of Object.keys(msgs[0])) if (/phone|sender|author|participant|jid|chatid|number|remote/i.test(k)) console.log(`  ${k}:`, JSON.stringify(msgs[0][k]).slice(0, 60));
  }

  // 2) tenta resolvers
  const num = lid.replace(/@.+/, "");
  for (const [path, body] of [
    ["/chat/getNameAndImage", { number: num }],
    ["/chat/getNameAndImage", { number: lid }],
    ["/contact/onWhatsApp", { numbers: [num] }],
    ["/lid/find", { lid }],
  ] as Array<[string, unknown]>) {
    const r = await raw(baseUrl, path, token, "POST", body);
    console.log(`\nPOST ${path} ${JSON.stringify(body)} -> ${r.status}:`, JSON.stringify(r.j).slice(0, 160));
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
