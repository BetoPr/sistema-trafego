import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ufPorTelefone, normalizarUf } from "@/lib/geo/ddd-estado";
import { FAIXAS_ETARIAS, type FaixaEtaria, type PontoContato } from "@/lib/crm/faixas-tipos";

export type { FaixaEtaria, PontoContato };

export interface ContatoEstado {
  uf: string;
  count: number;
}

export interface DadosGeoCompletos {
  porUf: ContatoEstado[];
  total: number;
  semGeo: number;
  servicos: string[];
  pontos: PontoContato[];
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
  const dados = await dadosGeoCompletos(supabase, agenciaId);
  return { porUf: dados.porUf, total: dados.total, semGeo: dados.semGeo };
}

/**
 * Versão enriquecida: além do agregado por UF, retorna a lista de pontos
 * (1 por contato com geo) já enriquecidos com serviço (do ticket mais recente)
 * e faixa etária. O cliente filtra reativamente sem nova ida ao banco.
 */
export async function dadosGeoCompletos(
  supabase: SupabaseClient,
  agenciaId: string,
): Promise<DadosGeoCompletos> {
  const { data: ticks, error: errT } = await supabase
    .from("tickets")
    .select("contato_id, metadata, created_at")
    .eq("agencia_id", agenciaId)
    .in("status", ["aberto", "pendente", "fechado"])
    .order("created_at", { ascending: false });
  if (errT) throw new Error(`dadosGeoCompletos tickets: ${errT.message}`);

  const servicoPorContato = new Map<string, string>();
  for (const t of (ticks || []) as Array<{ contato_id: string; metadata: Record<string, unknown> | null }>) {
    if (!t.contato_id) continue;
    if (!servicoPorContato.has(t.contato_id)) {
      const svc = t.metadata && typeof t.metadata === "object" ? (t.metadata as { servico?: unknown }).servico : null;
      if (typeof svc === "string" && svc.trim()) {
        servicoPorContato.set(t.contato_id, svc.trim());
      }
    }
  }

  const idsValidos = Array.from(
    new Set((ticks || []).map((t) => t.contato_id as string).filter(Boolean)),
  );

  if (idsValidos.length === 0) {
    return { porUf: [], total: 0, semGeo: 0, servicos: [], pontos: [] };
  }

  const all: Array<{
    id: string;
    estado: string | null;
    whatsapp: string | null;
    wa_id: string | null;
    telefone: string | null;
    faixa_etaria: string | null;
  }> = [];
  const BATCH = 200;
  for (let i = 0; i < idsValidos.length; i += BATCH) {
    const lote = idsValidos.slice(i, i + BATCH);
    const { data: parte, error } = await supabase
      .from("contatos")
      .select("id, estado, whatsapp, wa_id, telefone, faixa_etaria")
      .eq("agencia_id", agenciaId)
      .is("deleted_at", null)
      .in("id", lote);
    if (error) throw new Error(`dadosGeoCompletos contatos: ${error.message}`);
    if (parte) all.push(...(parte as typeof all));
  }

  const cont = new Map<string, number>();
  const pontos: PontoContato[] = [];
  const setServicos = new Set<string>();
  let total = 0;
  let semGeo = 0;
  for (const c of all) {
    total++;
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
    const servico = servicoPorContato.get(c.id) || null;
    if (servico) setServicos.add(servico);
    const faixa = (c.faixa_etaria as FaixaEtaria | null) || null;
    const faixaValida = faixa && FAIXAS_ETARIAS.includes(faixa) ? faixa : null;
    pontos.push({ uf, servico, faixa: faixaValida });
  }

  const porUf: ContatoEstado[] = Array.from(cont.entries())
    .map(([uf, count]) => ({ uf, count }))
    .sort((a, b) => b.count - a.count);

  return {
    porUf,
    total,
    semGeo,
    servicos: Array.from(setServicos).sort(),
    pontos,
  };
}
