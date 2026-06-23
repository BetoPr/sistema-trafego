/**
 * Auto-etiquetagem por campanha/conjunto Meta.
 *
 * Quando uma mensagem chega com ad_referral.sourceId (CTWA — click-to-WhatsApp),
 * resolve sourceId -> anuncio -> conjunto + campanha e aplica TODAS as etiquetas
 * vinculadas em:
 *   - etiqueta_campanhas (granularidade campanha)
 *   - etiqueta_conjuntos (granularidade conjunto)
 *
 * Idempotente: unique constraint (contato_id, etiqueta_id) em contato_etiquetas
 * faz inserts duplicados falharem em silêncio.
 *
 * Não lança — chamado em fire-and-forget pelo ingest.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

interface Params {
  sb: SupabaseClient;
  agenciaId: string;
  contatoId: string;
  sourceId: string;
}

export interface AutoEtiquetaResult {
  campanhaId: string | null;
  conjuntoId: string | null;
  etiquetasAplicadas: string[];
}

export async function aplicarEtiquetasDeCampanha(p: Params): Promise<AutoEtiquetaResult> {
  // 1. sourceId (ad external id) -> conjunto_id + campanha_id
  const { data: an } = await p.sb
    .from("anuncios")
    .select("conjunto_id, conjuntos!inner(campanha_id)")
    .eq("agencia_id", p.agenciaId)
    .eq("external_id", p.sourceId)
    .limit(1)
    .maybeSingle<{ conjunto_id: string; conjuntos: { campanha_id: string } }>();
  const conjuntoId = an?.conjunto_id ?? null;
  const campanhaId = an?.conjuntos?.campanha_id ?? null;
  if (!conjuntoId && !campanhaId) return { campanhaId, conjuntoId, etiquetasAplicadas: [] };

  // 2. junta etiquetas vinculadas a campanha + conjunto
  const candidatasSet = new Set<string>();
  if (campanhaId) {
    const { data } = await p.sb
      .from("etiqueta_campanhas")
      .select("etiqueta_id")
      .eq("agencia_id", p.agenciaId)
      .eq("campanha_id", campanhaId);
    for (const v of data || []) candidatasSet.add(v.etiqueta_id as string);
  }
  if (conjuntoId) {
    const { data } = await p.sb
      .from("etiqueta_conjuntos")
      .select("etiqueta_id")
      .eq("agencia_id", p.agenciaId)
      .eq("conjunto_id", conjuntoId);
    for (const v of data || []) candidatasSet.add(v.etiqueta_id as string);
  }
  const candidatas = Array.from(candidatasSet);
  if (candidatas.length === 0) return { campanhaId, conjuntoId, etiquetasAplicadas: [] };

  // 3. filtra inativas
  const { data: ativas } = await p.sb
    .from("etiquetas")
    .select("id")
    .eq("agencia_id", p.agenciaId)
    .eq("ativo", true)
    .in("id", candidatas);
  const etiquetaIds = (ativas || []).map((e) => e.id as string);
  if (etiquetaIds.length === 0) return { campanhaId, conjuntoId, etiquetasAplicadas: [] };

  // 4. insert N:M contato_etiquetas (duplicados falham silenciosamente)
  const aplicadas: string[] = [];
  for (const eid of etiquetaIds) {
    const { error } = await p.sb.from("contato_etiquetas").insert({ contato_id: p.contatoId, etiqueta_id: eid });
    if (!error) aplicadas.push(eid);
  }

  return { campanhaId, conjuntoId, etiquetasAplicadas: aplicadas };
}
