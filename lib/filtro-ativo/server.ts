/**
 * Helpers SERVER-SIDE pro filtro cross-aba.
 * Le URL searchParams e resolve em lista de campanha_ids p/ usar em queries.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export type FiltroTipo = "pasta" | "etiqueta" | "campanha" | null;

export interface FiltroParsed {
  tipo: FiltroTipo;
  id: string | null;
  nome: string | null;
}

/** Le searchParams do server component. */
export function parseFiltroSP(sp: Record<string, string | undefined>): FiltroParsed {
  for (const t of ["pasta", "etiqueta", "campanha"] as const) {
    if (sp[t]) {
      const nomeRaw = sp[`${t}_nome` as keyof typeof sp];
      const nome = nomeRaw ? decodeURIComponent(nomeRaw) : null;
      return { tipo: t, id: sp[t]!, nome };
    }
  }
  return { tipo: null, id: null, nome: null };
}

/**
 * Resolve filtro em lista de campanha_ids.
 * - null → sem filtro (consumidor pula clausula .in)
 * - [] → filtro sem matches (nada bate)
 * - [ids...] → filtra
 */
export async function resolverCampanhasFiltradas(
  supabase: SupabaseClient,
  agenciaId: string,
  filtro: FiltroParsed,
): Promise<string[] | null> {
  if (!filtro.tipo || !filtro.id) return null;

  if (filtro.tipo === "campanha") return [filtro.id];

  // Pasta: pega todas filhas + a propria, junta etiqueta_campanhas + etiqueta_conjuntos
  // Etiqueta: usa diretamente o id
  const etiquetaIds: string[] = [filtro.id];
  if (filtro.tipo === "pasta") {
    const { data: filhas } = await supabase
      .from("etiquetas")
      .select("id")
      .eq("agencia_id", agenciaId)
      .eq("etiqueta_pai_id", filtro.id);
    for (const f of filhas || []) etiquetaIds.push(f.id as string);
  }

  // Campanhas vinculadas direto
  const { data: ec } = await supabase
    .from("etiqueta_campanhas")
    .select("campanha_id")
    .eq("agencia_id", agenciaId)
    .in("etiqueta_id", etiquetaIds);

  // Conjuntos vinculados → campanha_id via conjuntos
  const { data: ej } = await supabase
    .from("etiqueta_conjuntos")
    .select("conjunto_id")
    .eq("agencia_id", agenciaId)
    .in("etiqueta_id", etiquetaIds);

  const conjuntoIds = (ej || []).map((r) => r.conjunto_id as string);
  let campanhaIdsDeConjuntos: string[] = [];
  if (conjuntoIds.length > 0) {
    const { data: cj } = await supabase
      .from("conjuntos")
      .select("campanha_id")
      .eq("agencia_id", agenciaId)
      .in("id", conjuntoIds);
    campanhaIdsDeConjuntos = (cj || []).map((c) => c.campanha_id as string).filter(Boolean);
  }

  const set = new Set<string>();
  for (const r of ec || []) set.add(r.campanha_id as string);
  for (const id of campanhaIdsDeConjuntos) set.add(id);
  return Array.from(set);
}
