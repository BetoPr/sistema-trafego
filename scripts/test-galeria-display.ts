/** Dry-run: valida o fix de DISPLAY da galeria (copia ia-galeria -> crm-media e confirma resolucao). NAO manda WhatsApp. */
import { readFileSync } from "node:fs";
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) { let v = m[2].trim(); if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1); if (!process.env[m[1]]) process.env[m[1]] = v; }
}
async function main() {
  const { createServiceClient } = await import("../lib/supabase/service");
  const { carregarGaleria, gerarSignedUrlGaleria } = await import("../lib/ia-atendimento/galeria");
  const { downloadAndUpload, getSignedUrl } = await import("../lib/crm/storage");
  const sb = createServiceClient();
  const AG = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
  const TICKET = "00000000-0000-0000-0000-0000000000ff"; // ticket ficticio so pro path do teste

  const { data: f } = await sb.from("ia_atendimento_ferramentas").select("id").eq("nome", "estoque_restauracao").eq("acao", "enviar_imagem_galeria").single();
  const itens = await carregarGaleria(sb, f!.id, AG);
  console.log("Itens na galeria (ordem):", itens.map((i, n) => `${n + 1}. ${i.nome}`).join(" | "));
  if (!itens.length) { console.log("galeria vazia"); return; }

  const im = itens[0];
  const signed = await gerarSignedUrlGaleria(sb, im.url_storage, 600);
  console.log("signed url ia-galeria:", signed ? "OK" : "FALHOU");
  if (!signed) return;

  const up = await downloadAndUpload({ agenciaId: AG, ticketId: TICKET, sourceUrl: signed, filename: "galeria.jpg", contentType: im.mime });
  console.log("copia pra crm-media:", up?.path || "FALHOU");
  if (!up?.path) return;

  // /api/media resolve via getSignedUrl(crm-media)
  const resolved = await getSignedUrl(up.path, 60);
  console.log("crm-media resolve (/api/media):", resolved ? "OK ✅ (chat vai exibir)" : "FALHOU ❌ (ainda nao_encontrada)");

  // limpa o arquivo de teste
  await sb.storage.from("crm-media").remove([up.path]);
  console.log("limpeza:", "removido", up.path);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
