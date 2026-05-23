import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type Periodo = "hoje" | "7d" | "30d";

interface PeriodoRange {
  inicio: string;
  fim: string;
}

export function rangeDe(periodo: Periodo): PeriodoRange {
  const hoje = new Date();
  hoje.setUTCHours(0, 0, 0, 0);
  const fim = hoje.toISOString().slice(0, 10);
  const inicio = new Date(hoje);
  if (periodo === "hoje") inicio.setUTCDate(inicio.getUTCDate());
  else if (periodo === "7d") inicio.setUTCDate(inicio.getUTCDate() - 6);
  else if (periodo === "30d") inicio.setUTCDate(inicio.getUTCDate() - 29);
  return { inicio: inicio.toISOString().slice(0, 10), fim };
}

export interface KpiResumo {
  investido: number;
  faturamento: number;
  roas: number | null;
  leads: number;
  cpl: number | null;
  cac: number | null;
  conversoes: number;
  impressoes: number;
  cliques: number;
  ctr: number | null;
  campanhas_ativas: number;
}

export async function kpiResumo(
  supabase: SupabaseClient,
  agenciaId: string,
  periodo: Periodo,
): Promise<KpiResumo> {
  const { inicio, fim } = rangeDe(periodo);

  const { data: metricas, error: errMet } = await supabase
    .from("metricas_diarias")
    .select("gasto, receita, leads, conversoes, impressoes, cliques")
    .eq("agencia_id", agenciaId)
    .gte("data", inicio)
    .lte("data", fim);

  if (errMet) throw new Error(`kpiResumo metricas: ${errMet.message}`);

  let investido = 0;
  let faturamento = 0;
  let leads = 0;
  let conversoes = 0;
  let impressoes = 0;
  let cliques = 0;
  for (const m of metricas || []) {
    investido += Number(m.gasto) || 0;
    faturamento += Number(m.receita) || 0;
    leads += Number(m.leads) || 0;
    conversoes += Number(m.conversoes) || 0;
    impressoes += Number(m.impressoes) || 0;
    cliques += Number(m.cliques) || 0;
  }

  const { count: campanhasAtivas, error: errCamp } = await supabase
    .from("campanhas")
    .select("id", { count: "exact", head: true })
    .eq("agencia_id", agenciaId)
    .eq("status", "ACTIVE");
  if (errCamp) throw new Error(`kpiResumo campanhas: ${errCamp.message}`);

  return {
    investido,
    faturamento,
    roas: investido > 0 ? faturamento / investido : null,
    leads,
    cpl: leads > 0 ? investido / leads : null,
    cac: conversoes > 0 ? investido / conversoes : null,
    conversoes,
    impressoes,
    cliques,
    ctr: impressoes > 0 ? cliques / impressoes : null,
    campanhas_ativas: campanhasAtivas ?? 0,
  };
}

export interface PontoSerie {
  data: string;
  gasto: number;
  receita: number;
  leads: number;
}

export async function serieDiaria(
  supabase: SupabaseClient,
  agenciaId: string,
  periodo: Periodo,
): Promise<PontoSerie[]> {
  const { inicio, fim } = rangeDe(periodo);

  const { data, error } = await supabase
    .from("metricas_diarias")
    .select("data, gasto, receita, leads")
    .eq("agencia_id", agenciaId)
    .gte("data", inicio)
    .lte("data", fim)
    .order("data", { ascending: true });

  if (error) throw new Error(`serieDiaria: ${error.message}`);

  const acc = new Map<string, PontoSerie>();
  for (const r of data || []) {
    const cur = acc.get(r.data) ?? { data: r.data, gasto: 0, receita: 0, leads: 0 };
    cur.gasto += Number(r.gasto) || 0;
    cur.receita += Number(r.receita) || 0;
    cur.leads += Number(r.leads) || 0;
    acc.set(r.data, cur);
  }
  return Array.from(acc.values());
}

export interface TopCampanha {
  campanha_id: string;
  nome: string;
  status: string | null;
  gasto: number;
  leads: number;
  conversoes: number;
}

export async function topCampanhas(
  supabase: SupabaseClient,
  agenciaId: string,
  periodo: Periodo,
  limit = 5,
): Promise<TopCampanha[]> {
  const { inicio, fim } = rangeDe(periodo);

  const { data, error } = await supabase
    .from("metricas_diarias")
    .select("campanha_id, gasto, leads, conversoes, campanhas(nome, status)")
    .eq("agencia_id", agenciaId)
    .gte("data", inicio)
    .lte("data", fim);

  if (error) throw new Error(`topCampanhas: ${error.message}`);

  const acc = new Map<string, TopCampanha>();
  for (const r of (data || []) as unknown as Array<{
    campanha_id: string;
    gasto: number | string;
    leads: number | string;
    conversoes: number | string;
    campanhas: { nome: string; status: string | null } | { nome: string; status: string | null }[] | null;
  }>) {
    const camp = Array.isArray(r.campanhas) ? r.campanhas[0] : r.campanhas;
    const cur = acc.get(r.campanha_id) ?? {
      campanha_id: r.campanha_id,
      nome: camp?.nome ?? "—",
      status: camp?.status ?? null,
      gasto: 0,
      leads: 0,
      conversoes: 0,
    };
    cur.gasto += Number(r.gasto) || 0;
    cur.leads += Number(r.leads) || 0;
    cur.conversoes += Number(r.conversoes) || 0;
    acc.set(r.campanha_id, cur);
  }

  return Array.from(acc.values())
    .sort((a, b) => b.gasto - a.gasto)
    .slice(0, limit);
}

export interface DistribStatus {
  status: string;
  count: number;
}

export async function distribuicaoStatus(
  supabase: SupabaseClient,
  agenciaId: string,
): Promise<DistribStatus[]> {
  const { data, error } = await supabase
    .from("campanhas")
    .select("status")
    .eq("agencia_id", agenciaId);
  if (error) throw new Error(`distribuicaoStatus: ${error.message}`);

  const acc = new Map<string, number>();
  for (const r of data || []) {
    const key = r.status ?? "DESCONHECIDO";
    acc.set(key, (acc.get(key) ?? 0) + 1);
  }
  return Array.from(acc.entries()).map(([status, count]) => ({ status, count }));
}

export interface ContagemIntegracoes {
  total: number;
  ativas: number;
  com_erro: number;
}

export async function contagemIntegracoes(
  supabase: SupabaseClient,
  agenciaId: string,
): Promise<ContagemIntegracoes> {
  const { data, error } = await supabase
    .from("integracoes")
    .select("status")
    .eq("agencia_id", agenciaId);
  if (error) throw new Error(`contagemIntegracoes: ${error.message}`);

  let ativas = 0;
  let erro = 0;
  for (const r of data || []) {
    if (r.status === "ativa") ativas++;
    if (r.status === "erro" || r.status === "expirada") erro++;
  }
  return { total: data?.length ?? 0, ativas, com_erro: erro };
}
