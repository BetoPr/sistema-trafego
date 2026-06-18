/**
 * Diagnostica import (contatos/labels/mensagens) de um canal AO VIVO na UAZAPI.
 * Roda: npx tsx scripts/check-import.ts [agenciaId]
 * NAO imprime token nem conteudo de mensagem. So contagens + formato dos campos.
 */
import { readFileSync } from "node:fs";
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) { let v = m[2].trim(); if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1); if (!process.env[m[1]]) process.env[m[1]] = v; }
}
const AG = process.argv[2] || "9f762ec0-2ff8-4a74-aad2-c5c14f0b52a6"; // guilherme

async function main() {
  const { createServiceClient } = await import("../lib/supabase/service");
  const { decryptToken, byteaToBuffer } = await import("../lib/crypto/tokens");
  const { instanceListLabels, instanceFindChats, instanceFindMessages } = await import("../lib/uazapi/client");
  const sb = createServiceClient();

  const { data: canais } = await sb
    .from("canais")
    .select("id, nome, status, instance_id, instance_token_encrypted, servidor:super_admin_servidores(base_url)")
    .eq("agencia_id", AG)
    .order("updated_at", { ascending: false });
  if (!canais?.length) { console.log("Nenhum canal pra agencia", AG); return; }

  for (const canal of canais) {
    const servidor = Array.isArray(canal.servidor) ? canal.servidor[0] : canal.servidor;
    const baseUrl = (servidor as { base_url: string } | null)?.base_url;
    console.log(`\n=== Canal: ${canal.nome} | DB status: ${canal.status} | ${baseUrl} ===`);
    if (!baseUrl || !canal.instance_token_encrypted) { console.log("  sem baseUrl/token"); continue; }
    let token: string;
    try { token = decryptToken(byteaToBuffer(canal.instance_token_encrypted as Parameters<typeof byteaToBuffer>[0])); }
    catch (e) { console.log("  token corrompido:", e instanceof Error ? e.message : e); continue; }
    const inst = { baseUrl, token };

    // 1. LABELS
    try {
      const labels = await instanceListLabels(inst);
      console.log(`  LABELS: ${labels.length}`, labels.slice(0, 8).map((l) => l.name).join(", "));
    } catch (e) { console.log("  LABELS ERRO:", e instanceof Error ? e.message : e); }

    // 2. CHATS
    let topChat: string | null = null;
    try {
      const r = await instanceFindChats(inst, { limit: 1000 });
      const naoGrupo = r.chats.filter((c) => !c.wa_isGroup);
      const regexAntigo = naoGrupo.filter((c) => /^\d+@s\.whatsapp\.net$/.test(c.wa_chatid));
      const regexOk = naoGrupo.filter((c) => /@(s\.whatsapp\.net|lid)$/.test(c.wa_chatid));
      console.log(`  CHATS: total=${r.totalRecords} retornados=${r.chats.length} naoGrupo=${naoGrupo.length} regexAntigo=${regexAntigo.length} regexNovo=${regexOk.length}`);
      const sample = naoGrupo.slice(0, 5).map((c) => `${c.wa_chatid} (ts:${c.wa_lastMsgTimestamp ?? "—"})`);
      console.log("  amostra wa_chatid:", sample.join(" | "));
      topChat = (regexOk[0] || naoGrupo[0])?.wa_chatid || null;
    } catch (e) { console.log("  CHATS ERRO:", e instanceof Error ? e.message : e); }

    // 3. MESSAGES do top chat
    if (topChat) {
      try {
        const r = await instanceFindMessages(inst, { chatid: topChat, limit: 5 });
        console.log(`  MESSAGES(${topChat.replace(/@.+/, "")}): ${r.messages.length}`);
        const m0 = r.messages[0];
        if (m0) console.log("  campos msg[0]:", JSON.stringify({ messageid: !!m0.messageid, messageTimestamp: m0.messageTimestamp, messageType: m0.messageType, fromMe: m0.fromMe, temText: !!(m0.text || m0.content?.text) }));
      } catch (e) { console.log("  MESSAGES ERRO:", e instanceof Error ? e.message : e); }
    }
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
