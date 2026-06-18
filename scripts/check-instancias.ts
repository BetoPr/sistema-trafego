/**
 * Verifica o status REAL (ao vivo na UAZAPI) de todos os canais.
 * Roda: npx tsx scripts/check-instancias.ts
 * NUNCA imprime token. Mostra status DB vs status real + numero conectado.
 */
import { readFileSync } from "node:fs";
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) { let v = m[2].trim(); if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1); if (!process.env[m[1]]) process.env[m[1]] = v; }
}

async function main() {
  const { createServiceClient } = await import("../lib/supabase/service");
  const { decryptToken, byteaToBuffer } = await import("../lib/crypto/tokens");
  const { instanceGetStatus, adminListInstances } = await import("../lib/uazapi/client");
  const sb = createServiceClient();

  const { data: canais } = await sb
    .from("canais")
    .select("id, nome, status, numero_conectado, instance_id, instance_token_encrypted, servidor:super_admin_servidores(base_url)")
    .order("updated_at", { ascending: false });

  if (!canais?.length) { console.log("Nenhum canal."); return; }

  console.log(`\n=== ${canais.length} canal(is) — status DB vs UAZAPI ao vivo ===\n`);
  for (const c of canais) {
    const servidor = Array.isArray(c.servidor) ? c.servidor[0] : c.servidor;
    const baseUrl = (servidor as { base_url: string } | null)?.base_url;
    let live = "?", num = "-", logged = "?";
    if (baseUrl && c.instance_token_encrypted) {
      try {
        const token = decryptToken(byteaToBuffer(c.instance_token_encrypted as Parameters<typeof byteaToBuffer>[0]));
        const st = await instanceGetStatus({ baseUrl, token });
        live = String(st.status?.connected ? "connected" : (st.instance?.status || "?"));
        logged = String(st.status?.loggedIn ?? "?");
        const jid = st.status?.jid as unknown;
        num = typeof jid === "string" ? jid.split("@")[0] : (jid as { user?: string })?.user || "-";
      } catch (e) {
        live = "ERRO: " + (e instanceof Error ? e.message : String(e)).slice(0, 60);
      }
    }
    const bate = live === c.status ? "✓" : "⚠ DIVERGE";
    console.log(`• ${c.nome}`);
    console.log(`    DB: ${c.status} | AO VIVO: ${live} | loggedIn: ${logged} | numero: ${num} ${bate}`);
    if (num !== "-" && !c.numero_conectado) console.log(`    (DB.numero_conectado vazio — podia gravar ${num})`);
  }

  // Capacidade do servidor (admin token)
  const { data: srv } = await sb
    .from("super_admin_servidores")
    .select("nome, base_url, admin_token_encrypted")
    .limit(5);
  for (const s of srv || []) {
    if (!s.admin_token_encrypted) continue;
    try {
      const adminToken = decryptToken(byteaToBuffer(s.admin_token_encrypted as Parameters<typeof byteaToBuffer>[0]));
      const all = await adminListInstances({ baseUrl: s.base_url, adminToken });
      const conectadas = all.filter((i) => i.status === "connected").length;
      console.log(`\n=== Servidor ${s.nome}: ${conectadas}/${all.length} conectadas ===`);
    } catch (e) {
      console.log(`\nServidor ${s.nome}: falha admin list — ${e instanceof Error ? e.message : e}`);
    }
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
