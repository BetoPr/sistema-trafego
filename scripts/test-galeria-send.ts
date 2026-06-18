/** Envio REAL: manda 2 fotos do estoque_restauracao pro WhatsApp do Roberto (teste). */
import { readFileSync } from "node:fs";
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) { let v = m[2].trim(); if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1); if (!process.env[m[1]]) process.env[m[1]] = v; }
}
async function main() {
  const { createServiceClient } = await import("../lib/supabase/service");
  const { decryptToken, byteaToBuffer } = await import("../lib/crypto/tokens");
  const { carregarGaleria, gerarSignedUrlGaleria } = await import("../lib/ia-atendimento/galeria");
  const { instanceSendMedia } = await import("../lib/uazapi/client");
  const sb = createServiceClient();
  const AG = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

  const { data: canal } = await sb.from("canais").select("instance_token_encrypted, servidor:super_admin_servidores(base_url)").eq("agencia_id", AG).maybeSingle();
  const servidor = Array.isArray(canal!.servidor) ? canal!.servidor[0] : canal!.servidor;
  const baseUrl = (servidor as { base_url: string }).base_url;
  const token = decryptToken(byteaToBuffer(canal!.instance_token_encrypted as Parameters<typeof byteaToBuffer>[0]));

  const { data: f } = await sb.from("ia_atendimento_ferramentas").select("id").eq("perfil_id", "d2a328c4-41de-4e0f-93ad-bc07c685a675").eq("nome", "estoque_restauracao").single();
  const itens = await carregarGaleria(sb, f!.id, AG);
  const enviar = itens.slice(0, 2); // antes + depois (ordem)
  console.log("Enviando:", enviar.map((i) => i.nome).join(", "));
  for (let i = 0; i < enviar.length; i++) {
    const url = await gerarSignedUrlGaleria(sb, enviar[i].url_storage, 600);
    if (!url) { console.log("signed url falhou", enviar[i].nome); continue; }
    const r = await instanceSendMedia({ baseUrl, token }, { number: "558191594716", type: "image", file: url, text: i === 0 ? "🧪 Teste galeria estoque_restauracao" : undefined });
    console.log("  enviado", enviar[i].nome, "->", JSON.stringify(r).slice(0, 80));
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
