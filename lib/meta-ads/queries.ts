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
  campanhaIds?: string[] | null,
): Promise<KpiResumo> {
  const { inicio, fim } = rangeDe(periodo);

  // Filtro cross-aba: array vazio = nada bate -> zera tudo.
  if (Array.isArray(campanhaIds) && campanhaIds.length === 0) {
    return { investido: 0, faturamento: 0, lucro: 0, roas: null, leads: 0, cpl: null, cac: null, conversoes: 0, impressoes: 0, alcance: 0, cliques: 0, ctr: null, campanhas_ativas: 0, vendas: 0 };
  }

  let q = supabase
    .from("metricas_diarias")
    .select("gasto, leads, conversoes, impressoes, alcance, cliques")
    .eq("agencia_id", agenciaId)
    .gte("data", inicio)
    .lte("data", fim);
  if (campanhaIds && campanhaIds.length > 0) q = q.in("campanha_id", campanhaIds);
  const { data: metricas, error: errMet } = await q;

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

  let qc = supabase
    .from("campanhas")
    .select("id", { count: "exact", head: true })
    .eq("agencia_id", agenciaId)
    .eq("status", "ACTIVE");
  if (campanhaIds && campanhaIds.length > 0) qc = qc.in("id", campanhaIds);
  const { count: campanhasAtivas, error: errCamp } = await qc;
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
  campanhaIds?: string[] | null,
): Promise<PontoSerie[]> {
  const { inicio, fim } = rangeDe(periodo);
  if (Array.isArray(campanhaIds) && campanhaIds.length === 0) return [];

  let q = supabase
    .from("metricas_diarias")
    .select("data, gasto, leads")
    .eq("agencia_id", agenciaId)
    .gte("data", inicio)
    .lte("data", fim)
    .order("data", { ascending: true });
  if (campanhaIds && campanhaIds.length > 0) q = q.in("campanha_id", campanhaIds);
  const { data, error } = await q;

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
  campanhaIds?: string[] | null,
): Promise<TopCampanha[]> {
  const { inicio, fim } = rangeDe(periodo);
  if (Array.isArray(campanhaIds) && campanhaIds.length === 0) return [];

  let q = supabase
    .from("metricas_diarias")
    .select("campanha_id, gasto, leads, conversoes, campanhas(nome, status)")
    .eq("agencia_id", agenciaId)
    .gte("data", inicio)
    .lte("data", fim);
  if (campanhaIds && campanhaIds.length > 0) q = q.in("campanha_id", campanhaIds);
  const { data, error } = await q;

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

export interface CriativoTop {
  anuncio_id: string;
  campanha_id: string;
  campanha_nome: string;
  nome: string;
  thumbnail_url: string | null;
  gasto: number;
  leads: number;
  conversoes: number;
  impressoes: number;
  alcance: number;
  cliques: number;
  receita: number;
}

/**
 * Top criativos por gasto no periodo, junto com thumbnail (criativo.thumbnail_url Meta).
 * Junta metricas_diarias agregado por anuncio_id + anuncios.criativo + campanhas.nome.
 */
export async function topCriativos(
  supabase: SupabaseClient,
  agenciaId: string,
  periodo: Periodo,
  limit = 6,
  campanhaIds?: string[] | null,
): Promise<CriativoTop[]> {
  const { inicio, fim } = rangeDe(periodo);
  if (Array.isArray(campanhaIds) && campanhaIds.length === 0) return [];

  let q = supabase
    .from("metricas_diarias")
    .select("anuncio_id, campanha_id, gasto, leads, conversoes, impressoes, alcance, cliques, receita")
    .eq("agencia_id", agenciaId)
    .gte("data", inicio)
    .lte("data", fim)
    .not("anuncio_id", "is", null);
  if (campanhaIds && campanhaIds.length > 0) q = q.in("campanha_id", campanhaIds);
  const { data: mets, error } = await q;
  if (error) throw new Error(`topCriativos: ${error.message}`);

  // Agrega por anuncio_id
  const acc = new Map<string, { campanha_id: string; gasto: number; leads: number; conversoes: number; impressoes: number; alcance: number; cliques: number; receita: number }>();
  for (const m of (mets || []) as Array<{ anuncio_id: string; campanha_id: string; gasto: number | string; leads: number | string; conversoes: number | string; impressoes: number | string; alcance: number | string; cliques: number | string; receita: number | string }>) {
    const cur = acc.get(m.anuncio_id) ?? { campanha_id: m.campanha_id, gasto: 0, leads: 0, conversoes: 0, impressoes: 0, alcance: 0, cliques: 0, receita: 0 };
    cur.gasto += Number(m.gasto) || 0;
    cur.leads += Number(m.leads) || 0;
    cur.conversoes += Number(m.conversoes) || 0;
    cur.impressoes += Number(m.impressoes) || 0;
    cur.alcance += Number(m.alcance) || 0;
    cur.cliques += Number(m.cliques) || 0;
    cur.receita += Number(m.receita) || 0;
    acc.set(m.anuncio_id, cur);
  }

  const topIds = Array.from(acc.entries())
    .sort(([, a], [, b]) => b.gasto - a.gasto)
    .slice(0, limit)
    .map(([id]) => id);

  if (topIds.length === 0) return [];

  // Busca anuncios.nome + criativo + campanha.nome
  const { data: anuncios } = await supabase
    .from("anuncios")
    .select("id, nome, criativo, conjunto:conjuntos!inner(campanha:campanhas!inner(nome))")
    .eq("agencia_id", agenciaId)
    .in("id", topIds);

  const mapaAn = new Map<string, { nome: string; thumb: string | null; campanhaNome: string }>();
  for (const a of (anuncios || []) as Array<{ id: string; nome: string; criativo: { thumbnail_url?: string; image_url?: string } | null; conjunto: { campanha: { nome: string } | { nome: string }[] } | { campanha: { nome: string } | { nome: string }[] }[] | null }>) {
    const conj = Array.isArray(a.conjunto) ? a.conjunto[0] : a.conjunto;
    const camp = conj ? (Array.isArray(conj.campanha) ? conj.campanha[0] : conj.campanha) : null;
    const thumb = a.criativo?.thumbnail_url || a.criativo?.image_url || null;
    mapaAn.set(a.id, { nome: a.nome || "—", thumb, campanhaNome: camp?.nome || "—" });
  }

  return topIds.map((id) => {
    const m = acc.get(id)!;
    const an = mapaAn.get(id);
    return {
      anuncio_id: id,
      campanha_id: m.campanha_id,
      campanha_nome: an?.campanhaNome || "—",
      nome: an?.nome || "—",
      thumbnail_url: an?.thumb || null,
      gasto: m.gasto,
      leads: m.leads,
      conversoes: m.conversoes,
      impressoes: m.impressoes,
      alcance: m.alcance,
      cliques: m.cliques,
      receita: m.receita,
    };
  });
}

export interface LinhaAnuncio {
  anuncio_id: string;
  nome: string;
  status: string | null;
  thumbnail_url: string | null;
  campanha_id: string;
  campanha_nome: string;
  conjunto_id: string;
  conjunto_nome: string;
  resultados: number;
  custo_por_resultado: number | null;
  valor_usado: number;
  impressoes: number;
  alcance: number;
  cliques: number;
  conversoes: number;
  leads: number;
  receita: number;
  cpm: number | null;
  ctr: number | null;
  roas: number | null;
}

/** Tabela estilo Meta Ads Manager — agrega metricas_diarias por anuncio_id no periodo. */
export async function tabelaAnuncios(
  supabase: SupabaseClient,
  agenciaId: string,
  periodo: Periodo,
  campanhaIds?: string[] | null,
): Promise<LinhaAnuncio[]> {
  const { inicio, fim } = rangeDe(periodo);
  if (Array.isArray(campanhaIds) && campanhaIds.length === 0) return [];

  let qm = supabase
    .from("metricas_diarias")
    .select("anuncio_id, campanha_id, conjunto_id, gasto, impressoes, alcance, cliques, conversoes, leads, receita")
    .eq("agencia_id", agenciaId)
    .gte("data", inicio)
    .lte("data", fim)
    .not("anuncio_id", "is", null);
  if (campanhaIds && campanhaIds.length > 0) qm = qm.in("campanha_id", campanhaIds);
  const { data: mets, error } = await qm;
  if (error) throw new Error(`tabelaAnuncios: ${error.message}`);

  const agg = new Map<string, { campanha_id: string; conjunto_id: string; gasto: number; impressoes: number; alcance: number; cliques: number; conversoes: number; leads: number; receita: number }>();
  for (const m of (mets || []) as Array<{ anuncio_id: string; campanha_id: string; conjunto_id: string; gasto: number | string; impressoes: number | string; alcance: number | string; cliques: number | string; conversoes: number | string; leads: number | string; receita: number | string }>) {
    const cur = agg.get(m.anuncio_id) ?? { campanha_id: m.campanha_id, conjunto_id: m.conjunto_id, gasto: 0, impressoes: 0, alcance: 0, cliques: 0, conversoes: 0, leads: 0, receita: 0 };
    cur.gasto += Number(m.gasto) || 0;
    cur.impressoes += Number(m.impressoes) || 0;
    cur.alcance += Number(m.alcance) || 0;
    cur.cliques += Number(m.cliques) || 0;
    cur.conversoes += Number(m.conversoes) || 0;
    cur.leads += Number(m.leads) || 0;
    cur.receita += Number(m.receita) || 0;
    agg.set(m.anuncio_id, cur);
  }

  const ids = Array.from(agg.keys());
  if (ids.length === 0) return [];

  const { data: anuncios } = await supabase
    .from("anuncios")
    .select("id, nome, status, criativo, conjunto:conjuntos!inner(id, nome, campanha:campanhas!inner(id, nome))")
    .eq("agencia_id", agenciaId)
    .in("id", ids);

  type AnuncioRow = { id: string; nome: string; status: string | null; criativo: { thumbnail_url?: string; image_url?: string } | null; conjunto: { id: string; nome: string; campanha: { id: string; nome: string } | { id: string; nome: string }[] } | { id: string; nome: string; campanha: { id: string; nome: string } | { id: string; nome: string }[] }[] | null };
  const mapaAn = new Map<string, AnuncioRow>();
  for (const a of (anuncios || []) as AnuncioRow[]) mapaAn.set(a.id, a);

  const linhas: LinhaAnuncio[] = ids.map((id) => {
    const m = agg.get(id)!;
    const an = mapaAn.get(id);
    const conj = an ? (Array.isArray(an.conjunto) ? an.conjunto[0] : an.conjunto) : null;
    const camp = conj ? (Array.isArray(conj.campanha) ? conj.campanha[0] : conj.campanha) : null;
    const resultados = m.leads || m.conversoes || 0;
    return {
      anuncio_id: id,
      nome: an?.nome || "—",
      status: an?.status ?? null,
      thumbnail_url: an?.criativo?.thumbnail_url || an?.criativo?.image_url || null,
      campanha_id: camp?.id || m.campanha_id,
      campanha_nome: camp?.nome || "—",
      conjunto_id: conj?.id || m.conjunto_id,
      conjunto_nome: conj?.nome || "—",
      resultados,
      custo_por_resultado: resultados > 0 ? m.gasto / resultados : null,
      valor_usado: m.gasto,
      impressoes: m.impressoes,
      alcance: m.alcance,
      cliques: m.cliques,
      conversoes: m.conversoes,
      leads: m.leads,
      receita: m.receita,
      cpm: m.impressoes > 0 ? (m.gasto * 1000) / m.impressoes : null,
      ctr: m.impressoes > 0 ? m.cliques / m.impressoes : null,
      roas: m.gasto > 0 && m.receita > 0 ? m.receita / m.gasto : null,
    };
  });

  return linhas.sort((a, b) => b.valor_usado - a.valor_usado);
}

export interface DistribStatus {
  status: string;
  count: number;
}

export async function distribuicaoStatus(
  supabase: SupabaseClient,
  agenciaId: string,
  campanhaIds?: string[] | null,
): Promise<DistribStatus[]> {
  if (Array.isArray(campanhaIds) && campanhaIds.length === 0) return [];
  let q = supabase
    .from("campanhas")
    .select("status")
    .eq("agencia_id", agenciaId);
  if (campanhaIds && campanhaIds.length > 0) q = q.in("id", campanhaIds);
  const { data, error } = await q;
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
