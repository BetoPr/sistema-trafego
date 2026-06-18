/** Testa se a IA aciona estoque_restauracao e quais imagens escolhe (sem mandar WhatsApp). */
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
  const { carregarGaleria, escolherImagens } = await import("../lib/ia-atendimento/galeria");
  const sb = createServiceClient();
  const PERFIL = "d2a328c4-41de-4e0f-93ad-bc07c685a675";
  const AG = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

  const { data: perfil } = await sb.from("ia_atendimento_perfis").select("*").eq("id", PERFIL).single();
  const apiKey = decryptToken(byteaToBuffer(perfil!.api_key_encrypted));
  const { data: ferr } = await sb.from("ia_atendimento_ferramentas").select("id,nome,descricao,acao,parametros").eq("perfil_id", PERFIL).eq("ativo", true);
  const tools = await buildToolsSchema((ferr || []) as never, { sb, agenciaId: AG });
  const galTool = (tools as Array<{ name: string }>).find((t) => t.name === "estoque_restauracao");
  console.log("estoque_restauracao no schema?", galTool ? "SIM (galeria carregada)" : "NAO");

  const casos = [
    "Oi! Quero ver exemplos de restauração de foto de bebê",
    "tem foto de antes e depois pra eu ver?",
  ];
  for (const msg of casos) {
    const r = await chamarIA({
      provider: perfil!.provider, modelo: perfil!.modelo, apiKey,
      mensagens: [{ role: "system", content: perfil!.prompt_sistema }, { role: "user", content: msg }],
      tools, maxTokens: 400, temperatura: 0.7,
    });
    console.log(`\nCLIENTE: "${msg}"`);
    for (const tc of r.toolCalls as Array<{ name: string; arguments: Record<string, unknown> }>) {
      console.log(`  -> tool: ${tc.name} args: ${JSON.stringify(tc.arguments)}`);
      const tdef = (tools as Array<{ name: string; acao: string; parametros_padrao?: Record<string, unknown> }>).find((t) => t.name === tc.name);
      if (tdef?.acao === "enviar_imagem_galeria") {
        const fid = String(tdef.parametros_padrao?.__ferramenta_id || "");
        const itens = await carregarGaleria(sb, fid, AG);
        const escolhidas = escolherImagens(itens, {
          indices: Array.isArray(tc.arguments.indices) ? tc.arguments.indices as number[] : undefined,
          tags: Array.isArray(tc.arguments.tags) ? tc.arguments.tags as string[] : undefined,
          quantidade: typeof tc.arguments.quantidade === "number" ? tc.arguments.quantidade : undefined,
        });
        console.log(`     imagens que enviaria (${escolhidas.length}): ${escolhidas.map((i) => i.nome).join(" | ")}`);
      }
    }
    if (!r.toolCalls.length) console.log(`  (nenhuma tool) texto: ${r.texto.slice(0, 80)}`);
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
