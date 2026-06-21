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
  lucro: number;
  roas: number | null;
  leads: number;
  cpl: number | null;
  cac: number | null;
  conversoes: number;
  impressoes: number;
  alcance: number;
  cliques: number;
  ctr: number | null;
  campanhas_ativas: number;
  vendas: number;
}

export async function kpiResumo(
  supabase: SupabaseClient,
  agenciaId: string,
  periodo: Periodo,
): Promise<KpiResumo> {
  const { inicio, fim } = rangeDe(periodo);

  const { data: metricas, error: errMet } = await supabase
    .from("metricas_diarias")
    .select("gasto, leads, conversoes, impressoes, alcance, cliques")
    .eq("agencia_id", agenciaId)
    .gte("data", inicio)
    .lte("data", fim);

  if (errMet) throw new Error(`kpiResumo metricas: ${errMet.message}`);

  let investido = 0;
  let leads = 0;
  let conversoes = 0;
  let impressoes = 0;
  let alcance = 0;
  let cliques = 0;
  for (const m of metricas || []) {
    investido += Number(m.gasto) || 0;
    leads += Number(m.leads) || 0;
    conversoes += Number(m.conversoes) || 0;
    impressoes += Number(m.impressoes) || 0;
    alcance += Number(m.alcance) || 0;
    cliques += Number(m.cliques) || 0;
  }

  // Faturamento = soma dos fechamentos do CRM no período.
  // (metricas_diarias.receita vem 0 do Meta — Meta não retorna receita direto.)
  const inicioTs = new Date(inicio + "T00:00:00.000Z").toISOString();
  const fimTs = new Date(fim + "T23:59:59.999Z").toISOString();
  const { data: ticks } = await supabase
    .from("tickets")
    .select("valor_fechado")
    .eq("agencia_id", agenciaId)
    .not("valor_fechado", "is", null)
    .gte("fechado_em", inicioTs)
    .lte("fechado_em", fimTs);
  let faturamento = 0;
  let vendas = 0;
  for (const t of ticks || []) {
    faturamento += Number(t.valor_fechado) || 0;
    vendas++;
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
    lucro: faturamento - investido,
    roas: investido > 0 ? faturamento / investido : null,
    leads,
    cpl: leads > 0 ? investido / leads : null,
    cac: conversoes > 0 ? investido / conversoes : null,
    conversoes,
    impressoes,
    alcance,
    cliques,
    ctr: impressoes > 0 ? cliques / impressoes : null,
    campanhas_ativas: campanhasAtivas ?? 0,
    vendas,
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
    .select("data, gasto, leads")
    .eq("agencia_id", agenciaId)
    .gte("data", inicio)
    .lte("data", fim)
    .order("data", { ascending: true });

  if (error) throw new Error(`serieDiaria: ${error.message}`);

  const acc = new Map<string, PontoSerie>();
  for (const r of data || []) {
    const cur = acc.get(r.data) ?? { data: r.data, gasto: 0, receita: 0, leads: 0 };
    cur.gasto += Number(r.gasto) || 0;
    cur.leads += Number(r.leads) || 0;
    acc.set(r.data, cur);
  }

  // Receita por dia = soma de tickets.valor_fechado por data de fechamento (CRM real).
  const inicioTs = new Date(inicio + "T00:00:00.000Z").toISOString();
  const fimTs = new Date(fim + "T23:59:59.999Z").toISOString();
  const { data: ticks } = await supabase
    .from("tickets")
    .select("valor_fechado, fechado_em")
    .eq("agencia_id", agenciaId)
    .not("valor_fechado", "is", null)
    .gte("fechado_em", inicioTs)
    .lte("fechado_em", fimTs);
  for (const t of (ticks || []) as Array<{ valor_fechado: number | string; fechado_em: string }>) {
    const dia = String(t.fechado_em).slice(0, 10);
    const cur = acc.get(dia) ?? { data: dia, gasto: 0, receita: 0, leads: 0 };
    cur.receita += Number(t.valor_fechado) || 0;
    acc.set(dia, cur);
  }

  return Array.from(acc.values()).sort((a, b) => a.data.localeCompare(b.data));
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

  const top = Array.from(acc.values())
    .sort((a, b) => b.gasto - a.gasto)
    .slice(0, limit);

  // Desambigua nomes duplicados (Meta permite 2 campanhas com mesmo nome).
  // Sem isso, o YAxis do Recharts colapsa visualmente as barras de mesmo label.
  const ocorr = new Map<string, number>();
  for (const t of top) ocorr.set(t.nome, (ocorr.get(t.nome) || 0) + 1);
  const repetidos = new Set(Array.from(ocorr.entries()).filter(([, n]) => n > 1).map(([k]) => k));
  const contador = new Map<string, number>();
  for (const t of top) {
    if (repetidos.has(t.nome)) {
      const n = (contador.get(t.nome) || 0) + 1;
      contador.set(t.nome, n);
      t.nome = `${t.nome} · #${n}`;
    }
  }
  return top;
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
