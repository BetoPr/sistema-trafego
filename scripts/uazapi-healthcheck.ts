/**
 * Healthcheck dos endpoints UAZAPI que o CRM usa.
 * Testa os de LEITURA ao vivo (status HTTP), documenta os mutáveis sem disparar.
 * Grava docs/uazapi-health.json + docs/UAZAPI-STATUS.md pra consulta/comparação.
 *
 * Roda: npx tsx scripts/uazapi-healthcheck.ts [agenciaId]
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) { let v = m[2].trim(); if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1); if (!process.env[m[1]]) process.env[m[1]] = v; }
}
const AG = process.argv[2] || "9f762ec0-2ff8-4a74-aad2-c5c14f0b52a6";

interface Res { nome: string; metodo: string; path: string; uso: string; status: number; ok: boolean; ms: number; obs: string }

async function hitOnce(baseUrl: string, token: string, metodo: string, path: string, body?: unknown): Promise<{ status: number; ms: number; json: unknown }> {
  const t0 = Date.now();
  try {
    const headers: Record<string, string> = { token, accept: "application/json" };
    if (body !== undefined) headers["content-type"] = "application/json";
    const res = await fetch(baseUrl.replace(/\/$/, "") + path, { method: metodo, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
    const txt = await res.text(); let j: unknown; try { j = JSON.parse(txt); } catch { j = txt; }
    return { status: res.status, ms: Date.now() - t0, json: j };
  } catch (e) { return { status: -1, ms: Date.now() - t0, json: String(e) }; }
}

// Retry 1x em falha transiente (-1/404/429/5xx) pra não gerar falso negativo.
async function hit(baseUrl: string, token: string, metodo: string, path: string, body?: unknown): Promise<{ status: number; ms: number; json: unknown }> {
  let r = await hitOnce(baseUrl, token, metodo, path, body);
  if (r.status === -1 || r.status === 404 || r.status === 429 || r.status >= 500) {
    await new Promise((res) => setTimeout(res, 800));
    const r2 = await hitOnce(baseUrl, token, metodo, path, body);
    if (r2.status >= 200 && r2.status < 300) r = r2;
    else r = r2.status !== -1 ? r2 : r;
  }
  return r;
}

async function main() {
  const { createServiceClient } = await import("../lib/supabase/service");
  const { decryptToken, byteaToBuffer } = await import("../lib/crypto/tokens");
  const sb = createServiceClient();
  const { data: canal } = await sb.from("canais").select("nome, instance_token_encrypted, servidor:super_admin_servidores(base_url, admin_token_encrypted)").eq("agencia_id", AG).eq("status", "connected").order("updated_at", { ascending: false }).limit(1).maybeSingle();
  if (!canal) { console.log("sem canal conectado"); return; }
  const servidor = Array.isArray(canal.servidor) ? canal.servidor[0] : canal.servidor;
  const baseUrl = (servidor as { base_url: string }).base_url;
  const token = decryptToken(byteaToBuffer(canal.instance_token_encrypted as Parameters<typeof byteaToBuffer>[0]));

  // dados dinâmicos pra endpoints que precisam de id
  const chatsR = await hit(baseUrl, token, "POST", "/chat/find", { limit: 5 });
  const chats = ((chatsR.json as { chats?: Array<Record<string, unknown>> })?.chats) || [];
  const umChat = chats.find((c) => !c.wa_isGroup)?.wa_chatid as string | undefined;
  const gruposR = await hit(baseUrl, token, "GET", "/group/list", undefined);
  const grupos = Array.isArray(gruposR.json) ? gruposR.json : ((gruposR.json as { groups?: unknown[] })?.groups || []);
  const umGrupo = (grupos[0] as { jid?: string } | undefined)?.jid;

  const leitura: Array<{ nome: string; metodo: string; path: string; uso: string; body?: unknown }> = [
    { nome: "instance_status", metodo: "GET", path: "/instance/status", uso: "Status real da conexão (connected/loggedIn)" },
    { nome: "webhook_get", metodo: "GET", path: "/webhook", uso: "Ler config de webhook da instância" },
    { nome: "labels", metodo: "GET", path: "/labels", uso: "Etiquetas do WhatsApp Business (import)" },
    { nome: "contacts", metodo: "GET", path: "/contacts?contactScope=all", uso: "Contatos com número real (@s.whatsapp.net)" },
    { nome: "chat_find", metodo: "POST", path: "/chat/find", uso: "Lista chats (import contatos/histórico)", body: { limit: 1 } },
    { nome: "group_list", metodo: "GET", path: "/group/list", uso: "Lista grupos (envio em grupo)" },
    ...(umChat ? [{ nome: "chat_details", metodo: "POST", path: "/chat/details", uso: "Resolve número real do @lid", body: { number: umChat, preview: false } }] : []),
    ...(umChat ? [{ nome: "message_find", metodo: "POST", path: "/message/find", uso: "Histórico de mensagens do chat", body: { chatid: umChat, limit: 1 } }] : []),
    ...(umChat ? [{ nome: "chat_nameimage", metodo: "POST", path: "/chat/GetNameAndImageURL", uso: "Nome + foto de um número", body: { number: String(umChat).replace(/@.+/, "") } }] : []),
    ...(umGrupo ? [{ nome: "group_info", metodo: "POST", path: "/group/info", uso: "Detalhes do grupo", body: { groupjid: umGrupo } }] : []),
  ];

  const resultados: Res[] = [];
  for (const e of leitura) {
    const r = await hit(baseUrl, token, e.metodo, e.path, e.body);
    const ok = r.status >= 200 && r.status < 300;
    let obs = ok ? "" : (typeof r.json === "object" && r.json && "message" in (r.json as object) ? String((r.json as { message: unknown }).message) : "");
    if (e.nome === "labels") obs = `${Array.isArray(r.json) ? r.json.length : 0} etiqueta(s)`;
    if (e.nome === "contacts") obs = `${Array.isArray(r.json) ? r.json.length : 0} contato(s)`;
    resultados.push({ nome: e.nome, metodo: e.metodo, path: e.path, uso: e.uso, status: r.status, ok, ms: r.ms, obs });
  }

  const mutaveis = [
    { nome: "send_text", metodo: "POST", path: "/send/text", uso: "Enviar texto" },
    { nome: "send_media", metodo: "POST", path: "/send/media", uso: "Enviar imagem/áudio/doc" },
    { nome: "message_download", metodo: "POST", path: "/message/download", uso: "Baixar mídia recebida" },
    { nome: "message_react", metodo: "POST", path: "/message/react", uso: "Reagir com emoji" },
    { nome: "message_delete", metodo: "POST", path: "/message/delete", uso: "Apagar mensagem" },
    { nome: "webhook_set", metodo: "POST", path: "/webhook", uso: "Configurar webhook" },
    { nome: "instance_connect", metodo: "POST", path: "/instance/connect", uso: "Conectar (QR)" },
    { nome: "instance_disconnect", metodo: "POST", path: "/instance/disconnect", uso: "Desconectar" },
    { nome: "instance_create", metodo: "POST", path: "/instance/create", uso: "Criar instância (admin)" },
    { nome: "instance_all", metodo: "GET", path: "/instance/all", uso: "Listar instâncias (admin)" },
    { nome: "instance_delete", metodo: "DELETE", path: "/instance", uso: "Deletar instância" },
    { nome: "group_update*", metodo: "POST", path: "/group/update*", uso: "Editar grupo (membros/nome/desc/img)" },
  ];

  const ts = new Date().toISOString();
  const okN = resultados.filter((r) => r.ok).length;
  const snapshot = { gerado_em: ts, instancia: canal.nome, base_url: baseUrl, uazapi: "uazapiGO v2.1.1 (139 endpoints)", testados: resultados, mutaveis_nao_testados: mutaveis };

  mkdirSync("docs", { recursive: true });
  writeFileSync("docs/uazapi-health.json", JSON.stringify(snapshot, null, 2));

  const md = `# UAZAPI — Status dos endpoints usados pelo CRM

> Gerado: **${ts}** · Instância de teste: **${canal.nome}** · Servidor: ${baseUrl}
> Base: uazapiGO **v2.1.1** (139 endpoints no total; abaixo só os que o CRM usa).
> Re-rodar: \`npx tsx scripts/uazapi-healthcheck.ts [agenciaId]\` (git diff = comparação ao longo do tempo).

## Leitura — testados ao vivo: ${okN}/${resultados.length} OK
| Endpoint | Método | Uso no CRM | HTTP | OK | ms | Obs |
|---|---|---|---|---|---|---|
${resultados.map((r) => `| \`${r.path}\` | ${r.metodo} | ${r.uso} | ${r.status} | ${r.ok ? "✅" : "❌"} | ${r.ms} | ${r.obs} |`).join("\n")}

## Mutáveis — documentados (NÃO testados, alteram dados)
| Endpoint | Método | Uso no CRM |
|---|---|---|
${mutaveis.map((m) => `| \`${m.path}\` | ${m.metodo} | ${m.uso} |`).join("\n")}

### Legenda status
- **2xx** = ok. **401** = sem sessão/token inválido. **404** = rota/recurso inexistente. **405** = método errado. **500** = erro interno UAZAPI. **-1** = falha de rede/timeout.
`;
  writeFileSync("docs/UAZAPI-STATUS.md", md);

  console.log(`\n=== ${canal.nome} | ${okN}/${resultados.length} OK ===`);
  for (const r of resultados) console.log(`  ${r.ok ? "✅" : "❌"} ${r.status} ${r.metodo} ${r.path} ${r.obs ? "— " + r.obs : ""}`);
  console.log("\nGravado: docs/UAZAPI-STATUS.md + docs/uazapi-health.json");
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
