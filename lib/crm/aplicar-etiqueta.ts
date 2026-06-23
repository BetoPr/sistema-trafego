/**
 * Aplica etiqueta(s) a contato + herda Pasta-mãe quando a etiqueta é filha.
 * Ex.: aplicar "Restauração/Bebê" → também aplica "Restauração".
 *
 * Idempotente: unique constraint (contato_id, etiqueta_id) faz duplicatas falharem silenciosamente.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export async function aplicarEtiquetasComMaes(
  sb: SupabaseClient,
  agenciaId: string,
  contatoId: string,
  etiquetaIds: string[],
): Promise<string[]> {
  if (etiquetaIds.length === 0) return [];

  // Expande pais: pra cada filha, adiciona Pasta-mãe.
  const { data: rows } = await sb
    .from("etiquetas")
    .select("id, etiqueta_pai_id")
    .eq("agencia_id", agenciaId)
    .in("id", etiquetaIds);

  const aSetar = new Set<string>(etiquetaIds);
  for (const r of rows || []) {
    const paiId = (r as { etiqueta_pai_id: string | null }).etiqueta_pai_id;
    if (paiId) aSetar.add(paiId);
  }

  const aplicadas: string[] = [];
  for (const eid of aSetar) {
    const { error } = await sb.from("contato_etiquetas").insert({ contato_id: contatoId, etiqueta_id: eid });
    if (!error) aplicadas.push(eid);
  }
  return aplicadas;
}
