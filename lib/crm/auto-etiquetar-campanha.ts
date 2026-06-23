/**
 * Auto-etiquetagem por campanha Meta.
 *
 * Quando uma mensagem chega com ad_referral.sourceId (CTWA — click-to-WhatsApp),
 * resolve sourceId -> campanha_id e aplica TODAS as etiquetas vinculadas
 * a essa campanha em `etiqueta_campanhas` ao contato.
 *
 * Idempotente: a unique constraint (contato_id, etiqueta_id) em contato_etiquetas
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
  etiquetasAplicadas: string[];
}

export async function aplicarEtiquetasDeCampanha(p: Params): Promise<AutoEtiquetaResult> {
  // 1. sourceId (ad external id) -> campanha_id via anuncios -> conjuntos
  const { data: an } = await p.sb
    .from("anuncios")
    .select("conjunto_id, conjuntos!inner(campanha_id)")
    .eq("agencia_id", p.agenciaId)
    .eq("external_id", p.sourceId)
    .limit(1)
    .maybeSingle<{ conjunto_id: string; conjuntos: { campanha_id: string } }>();
  const campanhaId = an?.conjuntos?.campanha_id ?? null;
  if (!campanhaId) return { campanhaId: null, etiquetasAplicadas: [] };

  // 2. etiquetas vinculadas a essa campanha (filtra inativas via 2 queries)
  const { data: vinc } = await p.sb
    .from("etiqueta_campanhas")
    .select("etiqueta_id")
    .eq("agencia_id", p.agenciaId)
    .eq("campanha_id", campanhaId);
  const candidatas = (vinc || []).map((v) => v.etiqueta_id as string);
  if (candidatas.length === 0) return { campanhaId, etiquetasAplicadas: [] };

  const { data: ativas } = await p.sb
    .from("etiquetas")
    .select("id")
    .eq("agencia_id", p.agenciaId)
    .eq("ativo", true)
    .in("id", candidatas);
  const etiquetaIds = (ativas || []).map((e) => e.id as string);
  if (etiquetaIds.length === 0) return { campanhaId, etiquetasAplicadas: [] };

  // 3. insert N:M contato_etiquetas (duplicados falham silenciosamente)
  const aplicadas: string[] = [];
  for (const eid of etiquetaIds) {
    const { error } = await p.sb.from("contato_etiquetas").insert({ contato_id: p.contatoId, etiqueta_id: eid });
    if (!error) aplicadas.push(eid);
  }

  return { campanhaId, etiquetasAplicadas: aplicadas };
}
