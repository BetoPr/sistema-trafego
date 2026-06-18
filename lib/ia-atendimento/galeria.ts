import type { SupabaseClient } from "@supabase/supabase-js";

export interface GaleriaItem {
  id: string;
  nome: string;
  descricao: string;
  tags: string[];
  url_storage: string;
  mime: string;
  ordem: number;
}

export async function carregarGaleria(
  sb: SupabaseClient,
  ferramentaId: string,
  agenciaId: string,
): Promise<GaleriaItem[]> {
  const { data, error } = await sb
    .from("ia_atendimento_galeria")
    .select("id, nome, descricao, tags, url_storage, mime, ordem")
    .eq("ferramenta_id", ferramentaId)
    .eq("agencia_id", agenciaId)
    .order("ordem", { ascending: true });
  if (error || !data) return [];
  return data as GaleriaItem[];
}

export async function gerarSignedUrlGaleria(
  sb: SupabaseClient,
  path: string,
  ttl = 600,
): Promise<string | null> {
  const { data, error } = await sb.storage.from("ia-galeria").createSignedUrl(path, ttl);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export function formatCatalogoParaIA(itens: GaleriaItem[]): string {
  if (!itens.length) return "\n[Galeria vazia — tool sem efeito]";
  const linhas = itens.map((im, i) => {
    const tagsStr = im.tags?.length ? ` [tags: ${im.tags.join(", ")}]` : "";
    const desc = im.descricao ? ` — ${im.descricao}` : "";
    return `  ${i + 1}. ${im.nome}${desc}${tagsStr}`;
  });
  return `\n\nImagens disponíveis (use índice 1-based em "indices" OU "tags" pra filtrar):\n${linhas.join("\n")}`;
}

export function escolherImagens(
  itens: GaleriaItem[],
  args: { indices?: number[]; tags?: string[]; quantidade?: number },
): GaleriaItem[] {
  if (!itens.length) return [];
  const { indices, tags, quantidade } = args;

  if (Array.isArray(indices) && indices.length) {
    return indices.map((i) => itens[i - 1]).filter((x): x is GaleriaItem => !!x);
  }

  if (Array.isArray(tags) && tags.length) {
    const tagsLower = tags.map((t) => t.toLowerCase());
    const matches = itens.filter((im) => {
      const imTags = (im.tags || []).map((t) => t.toLowerCase());
      const inTag = tagsLower.some((t) => imTags.includes(t));
      const inDesc = tagsLower.some(
        (t) => (im.descricao || "").toLowerCase().includes(t) || (im.nome || "").toLowerCase().includes(t),
      );
      return inTag || inDesc;
    });
    return quantidade ? matches.slice(0, quantidade) : matches;
  }

  // Sem filtro: envia a galeria inteira na ordem definida (antes/depois etc).
  return quantidade ? itens.slice(0, quantidade) : itens;
}
