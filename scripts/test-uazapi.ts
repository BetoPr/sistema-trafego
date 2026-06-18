/**
 * Teste pontual da instância UAZAPI do canal "Innova".
 * Roda: npx tsx scripts/test-uazapi.ts
 *
 * NÃO imprime o token. Mostra status real, webhook configurado e tenta um envio.
 */
import { readFileSync } from "node:fs";

// Carrega .env.local manualmente (script standalone não tem o loader do Next)
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) {
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
}

async function main() {
  const { createServiceClient } = await import("../lib/supabase/service");
  const { decryptToken, byteaToBuffer } = await import("../lib/crypto/tokens");
  const { instanceGetStatus, instanceGetWebhook, instanceSendText } = await import("../lib/uazapi/client");

  const sb = createServiceClient();
  const { data: canal } = await sb
    .from("canais")
    .select("id, nome, status, instance_id, instance_token_encrypted, servidor:super_admin_servidores(base_url)")
    .eq("agencia_id", "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
    .maybeSingle();

  if (!canal) { console.log("Canal não encontrado"); return; }

  const servidor = Array.isArray(canal.servidor) ? canal.servidor[0] : canal.servidor;
  const baseUrl = (servidor as { base_url: string }).base_url;
  console.log("Canal:", canal.nome, "| status DB:", canal.status, "| base_url:", baseUrl, "| instance:", canal.instance_id);

  let token: string;
  try {
    token = decryptToken(byteaToBuffer(canal.instance_token_encrypted as Parameters<typeof byteaToBuffer>[0]));
    console.log("Token decriptado OK (len:", token.length, ")");
  } catch (e) {
    console.log("FALHA ao decriptar token:", e instanceof Error ? e.message : e);
    return;
  }

  const inst = { baseUrl, token };

  // 1) STATUS real na UAZAPI
  try {
    const st = await instanceGetStatus(inst);
    console.log("\n=== STATUS REAL UAZAPI ===");
    console.log("instance.status:", st.instance?.status);
    console.log("connected:", st.status?.connected, "| loggedIn:", st.status?.loggedIn);
    console.log("jid:", JSON.stringify(st.status?.jid));
  } catch (e) {
    console.log("\nFALHA getStatus:", e instanceof Error ? e.message : e);
  }

  // 2) Webhook configurado na instância
  try {
    const wh = await instanceGetWebhook(inst);
    console.log("\n=== WEBHOOK CONFIGURADO ===");
    for (const w of wh) console.log("url:", w.url, "| enabled:", w.enabled, "| events:", (w.events || []).join(","));
  } catch (e) {
    console.log("\nFALHA getWebhook:", e instanceof Error ? e.message : e);
  }

  // 2b) Tenta reconectar (acordar da hibernação)
  try {
    const { instanceConnect } = await import("../lib/uazapi/client");
    const c = await instanceConnect(inst, {});
    console.log("\n=== CONNECT (acordar) ===");
    console.log("connected:", c.connected, "| loggedIn:", c.loggedIn);
    console.log("precisa QR?", c.instance?.qrcode ? "SIM (sessão perdida — rescan)" : "não (qrcode ausente)");
    console.log("instance.status:", c.instance?.status);
  } catch (e) {
    console.log("\nFALHA connect:", e instanceof Error ? e.message : e);
  }

  // 4) Lista TODAS as instâncias do servidor (admin token) — ver o que ocupa os slots
  try {
    const { adminListInstances } = await import("../lib/uazapi/client");
    const { data: srv } = await sb
      .from("super_admin_servidores")
      .select("base_url, admin_token_encrypted")
      .eq("base_url", baseUrl)
      .maybeSingle();
    if (srv?.admin_token_encrypted) {
      const adminToken = decryptToken(byteaToBuffer(srv.admin_token_encrypted as Parameters<typeof byteaToBuffer>[0]));
      const all = await adminListInstances({ baseUrl, adminToken });
      console.log("\n=== INSTANCIAS NO SERVIDOR (", all.length, ") ===");
      let conectadas = 0;
      for (const i of all) {
        if (i.status === "connected") conectadas++;
        console.log(`- ${i.name || i.id} | status: ${i.status} | jid: ${i.jid?.user || "-"}`);
      }
      console.log(`>>> conectadas: ${conectadas} / total: ${all.length}`);
    } else {
      console.log("\n(admin token não disponível pra listar instâncias)");
    }
  } catch (e) {
    console.log("\nFALHA adminListInstances:", e instanceof Error ? e.message : e);
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
