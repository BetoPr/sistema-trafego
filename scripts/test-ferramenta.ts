/** Testa se a IA (perfil Ana, gpt-4.1) ACIONA as ferramentas, sem mandar WhatsApp. */
import { readFileSync } from "node:fs";
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) { let v = m[2].trim(); if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1); if (!process.env[m[1]]) process.env[m[1]] = v; }
}
async function main() {
  const { createServiceClient } = await import("../lib/supabase/service");
  const { decryptToken, byteaToBuffer } = await import("../lib/crypto/tokens");
  const { buildToolsSchema } = await import("../lib/ia-atendimento/tools-runner");
  const { chamarIA } = await import("../lib/ia-atendimento/providers");
  const sb = createServiceClient();
  const PERFIL = "d2a328c4-41de-4e0f-93ad-bc07c685a675";
  const AG = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

  const { data: perfil } = await sb.from("ia_atendimento_perfis").select("*").eq("id", PERFIL).single();
  if (!perfil) return console.log("perfil nao encontrado");
  const apiKey = decryptToken(byteaToBuffer(perfil.api_key_encrypted));
  const { data: ferr } = await sb.from("ia_atendimento_ferramentas").select("id,nome,descricao,acao,parametros").eq("perfil_id", PERFIL).eq("ativo", true);
  const tools = await buildToolsSchema((ferr || []) as never, { sb, agenciaId: AG });
  console.log("Modelo:", perfil.modelo, "| tools disponiveis:", tools.map((t: { name: string }) => t.name).join(", "), "\n");

  // Simula o bloco genérico do executor (mesmo texto) + um prompt LIMPO sem a regra,
  // pra validar que o bloco sozinho faz a ferramenta disparar em qualquer agente.
  const blocoFerramentas = `[FERRAMENTAS / AÇÕES — OBRIGATÓRIO]\nVocê tem estas funções. Assim que a situação se encaixar, CHAME a função correspondente NA MESMA resposta, ANTES de conversar. É ação interna: NÃO escreva o nome da função nem comente com o cliente. Pode cumprimentar E chamar a função juntos.\n${(tools as Array<{ name: string; description?: string }>).map((t) => `- ${t.name}: ${(t.description || "").split("\n")[0]}`).join("\n")}\n\n`;
  const promptLimpo = blocoFerramentas + "Você é a Ana, atendente simpática de um estúdio de fotos com IA (ensaios e restauração). Atenda o cliente de forma natural.";
  console.log("--- TESTE BLOCO GENERICO (prompt limpo, sem regra) ---");
  for (const msg of ["quero um ensaio de aniversario", "quero restaurar uma foto antiga"]) {
    const r = await chamarIA({ provider: perfil.provider, modelo: perfil.modelo, apiKey, mensagens: [{ role: "system", content: promptLimpo }, { role: "user", content: msg }], tools, maxTokens: 300, temperatura: 0.7 });
    console.log(`  "${msg}" -> ${r.toolCalls.length ? r.toolCalls.map((t: { name: string }) => t.name).join(", ") : "(NENHUMA)"}`);
  }
  console.log("");

  const casos: Array<{ label: string; msgs: { role: "system" | "user" | "assistant"; content: string }[] }> = [
    { label: "Turno 1: 'quero ensaio aniversario'", msgs: [{ role: "system", content: perfil.prompt_sistema }, { role: "user", content: "Oi, quero fazer um ensaio de aniversario" }] },
    { label: "Turno 2: depois de responder a pessoa", msgs: [
      { role: "system", content: perfil.prompt_sistema },
      { role: "user", content: "Oi, quero fazer um ensaio de aniversario" },
      { role: "assistant", content: "Oii! Para qual pessoa especial será o ensaio de aniversário?" },
      { role: "user", content: "é pra minha mãe que faz 60 anos" },
    ] },
    { label: "Pede humano", msgs: [{ role: "system", content: perfil.prompt_sistema }, { role: "user", content: "quero falar com um atendente humano" }] },
  ];
  for (const caso of casos) {
    const r = await chamarIA({
      provider: perfil.provider, modelo: perfil.modelo, apiKey,
      mensagens: caso.msgs, tools, maxTokens: perfil.max_tokens_por_resposta || 400, temperatura: Number(perfil.temperatura) || 0.7,
    });
    console.log(caso.label);
    console.log(`  tools chamadas: ${r.toolCalls.length ? r.toolCalls.map((t: { name: string }) => t.name).join(", ") : "(NENHUMA)"}`);
    console.log(`  texto: ${r.texto.slice(0, 90)}\n`);
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
