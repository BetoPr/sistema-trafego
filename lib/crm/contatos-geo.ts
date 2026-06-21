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
 * Filtra apenas contatos com ao menos 1 ticket em (aberto, pendente, fechado)
 * — exclui base fria sem histórico de atendimento.
 */
export async function contatosPorEstado(
  supabase: SupabaseClient,
  agenciaId: string,
): Promise<{ porUf: ContatoEstado[]; total: number; semGeo: number }> {
  // 1. IDs de contatos com ticket em algum dos status alvo
  const { data: ticks, error: errT } = await supabase
    .from("tickets")
    .select("contato_id")
    .eq("agencia_id", agenciaId)
    .in("status", ["aberto", "pendente", "fechado"]);
  if (errT) throw new Error(`contatosPorEstado tickets: ${errT.message}`);
  const idsValidos = Array.from(
    new Set((ticks || []).map((t) => t.contato_id as string).filter(Boolean)),
  );

  if (idsValidos.length === 0) {
    return { porUf: [], total: 0, semGeo: 0 };
  }

  // 2. Busca os contatos correspondentes (em batches pra evitar URL longa)
  const all: Array<{ estado: string | null; whatsapp: string | null; wa_id: string | null; telefone: string | null }> = [];
  const BATCH = 200;
  for (let i = 0; i < idsValidos.length; i += BATCH) {
    const lote = idsValidos.slice(i, i + BATCH);
    const { data: parte, error } = await supabase
      .from("contatos")
      .select("estado, whatsapp, wa_id, telefone")
      .eq("agencia_id", agenciaId)
      .is("deleted_at", null)
      .in("id", lote);
    if (error) throw new Error(`contatosPorEstado: ${error.message}`);
    if (parte) all.push(...(parte as typeof all));
  }
  const data = all;

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
