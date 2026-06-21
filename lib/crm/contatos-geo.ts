import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ufPorTelefone, normalizarUf } from "@/lib/geo/ddd-estado";

export interface ContatoEstado {
  uf: string;
  count: number;
}

/**
 * Agrupa contatos da agência por UF.
 * Fonte: `contatos.estado` (manual, tem prioridade) ou DDD do whatsapp/wa_id/telefone.
 * Snapshot atual da base — não filtra por período (visão de distribuição geográfica).
 */
export async function contatosPorEstado(
  supabase: SupabaseClient,
  agenciaId: string,
): Promise<{ porUf: ContatoEstado[]; total: number; semGeo: number }> {
  const { data, error } = await supabase
    .from("contatos")
    .select("estado, whatsapp, wa_id, telefone")
    .eq("agencia_id", agenciaId)
    .is("deleted_at", null);
  if (error) throw new Error(`contatosPorEstado: ${error.message}`);

  const cont = new Map<string, number>();
  let total = 0;
  let semGeo = 0;
  for (const c of (data as Array<{
    estado: string | null;
    whatsapp: string | null;
    wa_id: string | null;
    telefone: string | null;
  }> | null) ?? []) {
    total++;
    // Prioridade: estado manual → telefone (whatsapp > wa_id > telefone)
    const uf =
      normalizarUf(c.estado) ||
      ufPorTelefone(c.whatsapp) ||
      ufPorTelefone(c.wa_id) ||
      ufPorTelefone(c.telefone);
    if (!uf) {
      semGeo++;
      continue;
    }
    cont.set(uf, (cont.get(uf) || 0) + 1);
  }

  const porUf: ContatoEstado[] = Array.from(cont.entries())
    .map(([uf, count]) => ({ uf, count }))
    .sort((a, b) => b.count - a.count);

  return { porUf, total, semGeo };
}
