/**
 * Sonda PROFUNDA de etiquetas UAZAPI do canal do guilherme.
 * Roda: npx tsx scripts/probe-labels.ts [agenciaId]
 * Mostra RAW de /labels + variantes + wa_label nos chats. NAO imprime token.
 */
import { readFileSync } from "node:fs";
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) { let v = m[2].trim(); if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1); if (!process.env[m[1]]) process.env[m[1]] = v; }
}
const AG = process.argv[2] || "9f762ec0-2ff8-4a74-aad2-c5c14f0b52a6";

async function raw(baseUrl: string, path: string, token: string, method = "GET", body?: unknown) {
  try {
    const res = await fetch(baseUrl.replace(/\/$/, "") + path, {
      method,
      headers: { token, "content-type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const txt = await res.text();
    let json: unknown; try { json = JSON.parse(txt); } catch { json = txt; }
    return { status: res.status, json };
  } catch (e) { return { status: -1, json: String(e) }; }
}

async function main() {
  const { createServiceClient } = await import("../lib/supabase/service");
  const { decryptToken, byteaToBuffer } = await import("../lib/crypto/tokens");
  const sb = createServiceClient();

  const { data: canal } = await sb
    .from("canais")
    .select("nome, instance_token_encrypted, servidor:super_admin_servidores(base_url)")
    .eq("agencia_id", AG).eq("status", "connected")
    .order("updated_at", { ascending: false }).limit(1).maybeSingle();
  if (!canal) { console.log("sem canal"); return; }
  const servidor = Array.isArray(canal.servidor) ? canal.servidor[0] : canal.servidor;
  const baseUrl = (servidor as { base_url: string }).base_url;
  const token = decryptToken(byteaToBuffer(canal.instance_token_encrypted as Parameters<typeof byteaToBuffer>[0]));
  console.log("Canal:", canal.nome, "|", baseUrl);

  // Variantes de endpoint de labels
  for (const [method, path, body] of [
    ["GET", "/labels", undefined],
    ["POST", "/labels", {}],
    ["GET", "/label/list", undefined],
    ["POST", "/label/find", {}],
    ["GET", "/chat/labels", undefined],
  ] as Array<[string, string, unknown]>) {
    const r = await raw(baseUrl, path, token, method, body);
    const preview = typeof r.json === "string" ? r.json.slice(0, 200) : JSON.stringify(r.json).slice(0, 300);
    console.log(`\n${method} ${path} -> ${r.status}: ${preview}`);
  }

  // Status/info da instancia (conta business?)
  const st = await raw(baseUrl, "/instance/status", token, "GET");
  const stj = st.json as { instance?: Record<string, unknown> };
  if (stj?.instance) {
    const inst = stj.instance;
    const keysBiz = Object.keys(inst).filter((k) => /business|platform|profile|isBusiness|account/i.test(k));
    console.log("\n=== instance (campos conta) ===");
    for (const k of keysBiz) console.log(`  ${k}:`, JSON.stringify(inst[k]).slice(0, 80));
  }

  // wa_label nos chats + procura QUALQUER chave com "label"
  const r = await raw(baseUrl, "/chat/find", token, "POST", { limit: 1000 });
  const chats = (r.json as { chats?: Array<Record<string, unknown>> })?.chats || [];
  console.log(`\n=== chats: ${chats.length} ===`);
  if (chats[0]) {
    const labelKeys = Object.keys(chats[0]).filter((k) => /label/i.test(k));
    console.log("chaves com 'label' no chat:", labelKeys.join(", ") || "(nenhuma)");
    console.log("TODAS as chaves do chat[0]:", Object.keys(chats[0]).join(", "));
  }
  // conta chats com qualquer campo label preenchido
  let comQualquerLabel = 0;
  const valoresLabel = new Set<string>();
  for (const c of chats) {
    if (c.wa_isGroup) continue;
    for (const k of Object.keys(c)) {
      if (/label/i.test(k)) {
        const v = c[k];
        if (Array.isArray(v) && v.length) { comQualquerLabel++; for (const x of v) valoresLabel.add(String(x)); }
        else if (v && typeof v === "string") { comQualquerLabel++; valoresLabel.add(v); }
      }
    }
  }
  console.log(`chats com algum label: ${comQualquerLabel} | valores distintos: ${valoresLabel.size}`);
  console.log("valores:", Array.from(valoresLabel).slice(0, 30).join(", "));

  // lead_tags / lead_status (CRM proprio UAZAPI)
  let comTags = 0; const tags = new Map<string, number>(); const status = new Map<string, number>();
  for (const c of chats) {
    if (c.wa_isGroup) continue;
    const lt = c.lead_tags;
    let arr: string[] = [];
    if (Array.isArray(lt)) arr = lt.map(String);
    else if (typeof lt === "string" && lt.trim()) arr = lt.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
    if (arr.length) { comTags++; for (const t of arr) tags.set(t, (tags.get(t) || 0) + 1); }
    const ls = c.lead_status;
    if (ls && typeof ls === "string") status.set(ls, (status.get(ls) || 0) + 1);
  }
  console.log(`\n=== lead_tags: ${comTags} chats com tags | ${tags.size} tags distintas ===`);
  for (const [t, n] of [...tags.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30)) console.log(`  "${t}": ${n} contatos`);
  console.log("lead_status distintos:", [...status.entries()].map(([s, n]) => `${s}(${n})`).join(", ") || "(nenhum)");
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
