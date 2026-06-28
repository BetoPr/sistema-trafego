import { requireSuperAdmin } from "@/lib/crm/permissions";
import { createServiceClient } from "@/lib/supabase/service";
import { PixelVendasClient } from "./_client";
import Atribuicoes, { type CampanhaNode, type EtiquetaOpt } from "./_atribuicoes";

export const dynamic = "force-dynamic";

const PERIODOS: Record<string, number> = { "7d": 7, "14d": 14, "30d": 30, "90d": 90 };

export interface LinhaConjunto {
  conjunto_id: string | null;
  nome: string;
  gasto: number;
  bruto: number;
  liquido: number;
  roas: number | null;
  vendas: number;
}
export interface LinhaCampanha {
  campanha_id: string | null;
  nome: string;
  gasto: number;
  bruto: number;
  liquido: number;
  roas: number | null;
  vendas: number;
  conjuntos: LinhaConjunto[];
}
export interface EventoRow {
  id: string;
  contato_nome: string | null;
  valor: number;
  campanha_nome: string | null;
  ctwa_clid: string | null;
  status: string;
  created_at: string;
  // Diagnóstico (#1 Visibilidade)
  source_id: string | null;
  anuncio_id: string | null;
  campanha_id: string | null;
  integracao_id: string | null;
  pixel_id: string | null;
  pixel_nome: string | null;
  erro: string | null;
  tentativas: number;
}
export interface ClientePixel {
  cliente_id: string;
  cliente_nome: string;
  integracao_id: string;
  pixel_id: string | null;
  pixel_nome: string | null;
}
export interface Saude {
  tokenExpirando: { cliente_nome: string; dias: number }[];
  tokenExpirado: { cliente_nome: string }[];
  eventosErro: number;
  eventosSemAtribuicao: number;
  tudoOk: boolean;
}

export interface PassosCliente {
  cliente_id: string;
  cliente_nome: string;
  integracao_id: string;
  pixel_id: string | null;
  pixel_nome: string | null;
  temVenda: boolean;
}
export interface Onboarding {
  passos: PassosCliente[];
  semIntegracao: boolean;
  tudoPronto: boolean;
}

export default async function Page({ searchParams }: { searchParams: Promise<{ periodo?: string; cliente?: string }> }) {
  const ctx = await requireSuperAdmin();
  const sb = createServiceClient();
  const params = await searchParams;
  const periodo = params.periodo && PERIODOS[params.periodo] ? params.periodo : "30d";
  const dias = PERIODOS[periodo];
  const desdeDate = new Date(Date.now() - dias * 24 * 3600 * 1000);
  const desdeISO = desdeDate.toISOString();
  const desdeData = desdeISO.slice(0, 10);

  let mq = sb
    .from("metricas_diarias")
    .select("campanha_id, conjunto_id, gasto, cliente_id")
    .eq("agencia_id", ctx.agenciaId)
    .gte("data", desdeData);
  if (params.cliente) mq = mq.eq("cliente_id", params.cliente);
  const { data: metricas } = await mq;

  const gastoCamp = new Map<string, number>();
  const gastoConj = new Map<string, number>();
  for (const m of metricas || []) {
    if (m.campanha_id) gastoCamp.set(m.campanha_id, (gastoCamp.get(m.campanha_id) || 0) + Number(m.gasto || 0));
    if (m.conjunto_id) gastoConj.set(m.conjunto_id, (gastoConj.get(m.conjunto_id) || 0) + Number(m.gasto || 0));
  }

  let eq = sb
    .from("capi_eventos")
    .select("id, valor, campanha_id, conjunto_id, ctwa_clid, status, created_at, cliente_id, contato_id, servico, source_id, anuncio_id, integracao_id, pixel_id, erro, tentativas")
    .eq("agencia_id", ctx.agenciaId)
    .gte("created_at", desdeISO)
    .order("created_at", { ascending: false })
    .limit(500);
  if (params.cliente) eq = eq.eq("cliente_id", params.cliente);
  const { data: eventos } = await eq;

  const brutoCamp = new Map<string, number>();
  const vendasCamp = new Map<string, number>();
  const brutoConj = new Map<string, number>();
  const vendasConj = new Map<string, number>();
  let brutoTotal = 0;
  let vendasTotal = 0;
  let comClid = 0;
  for (const e of eventos || []) {
    brutoTotal += Number(e.valor || 0);
    vendasTotal++;
    if (e.ctwa_clid) comClid++;
    const ck = e.campanha_id || "__none__";
    brutoCamp.set(ck, (brutoCamp.get(ck) || 0) + Number(e.valor || 0));
    vendasCamp.set(ck, (vendasCamp.get(ck) || 0) + 1);
    if (e.conjunto_id) {
      brutoConj.set(e.conjunto_id, (brutoConj.get(e.conjunto_id) || 0) + Number(e.valor || 0));
      vendasConj.set(e.conjunto_id, (vendasConj.get(e.conjunto_id) || 0) + 1);
    }
  }

  const campIds = Array.from(new Set([...gastoCamp.keys(), ...brutoCamp.keys()].filter((k) => k && k !== "__none__")));
  const conjIds = Array.from(new Set([...gastoConj.keys(), ...brutoConj.keys()]));
  const { data: campRows } = campIds.length
    ? await sb.from("campanhas").select("id, nome").eq("agencia_id", ctx.agenciaId).in("id", campIds)
    : { data: [] as { id: string; nome: string }[] };
  const { data: conjRows } = conjIds.length
    ? await sb.from("conjuntos").select("id, nome, campanha_id").eq("agencia_id", ctx.agenciaId).in("id", conjIds)
    : { data: [] as { id: string; nome: string; campanha_id: string }[] };
  const nomeCamp = new Map((campRows || []).map((c) => [c.id, c.nome]));
  const conjPorCamp = new Map<string, { id: string; nome: string }[]>();
  for (const c of conjRows || []) {
    const arr = conjPorCamp.get(c.campanha_id) || [];
    arr.push({ id: c.id, nome: c.nome });
    conjPorCamp.set(c.campanha_id, arr);
  }

  const calcRoas = (bruto: number, gasto: number) => (gasto > 0 ? bruto / gasto : null);

  const linhas: LinhaCampanha[] = campIds.map((cid) => {
    const gasto = gastoCamp.get(cid) || 0;
    const bruto = brutoCamp.get(cid) || 0;
    const conjuntos: LinhaConjunto[] = (conjPorCamp.get(cid) || []).map((cj) => {
      const cg = gastoConj.get(cj.id) || 0;
      const cb = brutoConj.get(cj.id) || 0;
      return { conjunto_id: cj.id, nome: cj.nome, gasto: cg, bruto: cb, liquido: cb - cg, roas: calcRoas(cb, cg), vendas: vendasConj.get(cj.id) || 0 };
    });
    return { campanha_id: cid, nome: nomeCamp.get(cid) || cid, gasto, bruto, liquido: bruto - gasto, roas: calcRoas(bruto, gasto), vendas: vendasCamp.get(cid) || 0, conjuntos };
  });
  if (brutoCamp.has("__none__")) {
    const bruto = brutoCamp.get("__none__") || 0;
    linhas.push({ campanha_id: null, nome: "Sem campanha (sem click-id)", gasto: 0, bruto, liquido: bruto, roas: null, vendas: vendasCamp.get("__none__") || 0, conjuntos: [] });
  }
  linhas.sort((a, b) => b.bruto - a.bruto);

  const gastoTotal = Array.from(gastoCamp.values()).reduce((s, v) => s + v, 0);
  const kpis = {
    gasto: gastoTotal,
    bruto: brutoTotal,
    liquido: brutoTotal - gastoTotal,
    roas: gastoTotal > 0 ? brutoTotal / gastoTotal : null,
    matchClid: vendasTotal > 0 ? Math.round((comClid / vendasTotal) * 100) : 0,
    vendas: vendasTotal,
  };

  const contatoIds = Array.from(new Set((eventos || []).map((e) => e.contato_id).filter(Boolean) as string[]));
  const { data: contatos } = contatoIds.length
    ? await sb.from("contatos").select("id, nome").in("id", contatoIds)
    : { data: [] as { id: string; nome: string | null }[] };
  const nomeContato = new Map((contatos || []).map((c) => [c.id, c.nome]));
  const { data: integs } = await sb
    .from("integracoes")
    .select("id, cliente_id, pixel_id, pixel_nome, token_expires_at, status, clientes!inner(nome)")
    .eq("agencia_id", ctx.agenciaId)
    .eq("plataforma", "meta_ads");
  const clientesPixel: ClientePixel[] = (integs || []).map((i) => ({
    cliente_id: i.cliente_id as string,
    cliente_nome: (i as { clientes?: { nome?: string } }).clientes?.nome || "—",
    integracao_id: i.id as string,
    pixel_id: (i as { pixel_id: string | null }).pixel_id,
    pixel_nome: (i as { pixel_nome: string | null }).pixel_nome,
  }));
  const nomePixelPorIntegracao = new Map(
    (integs || []).map((i) => [
      i.id as string,
      (i as { pixel_nome: string | null }).pixel_nome,
    ]),
  );

  const feed: EventoRow[] = (eventos || []).slice(0, 50).map((e) => ({
    id: e.id,
    contato_nome: nomeContato.get(e.contato_id as string) || null,
    valor: Number(e.valor || 0),
    campanha_nome: e.campanha_id ? nomeCamp.get(e.campanha_id) || null : null,
    ctwa_clid: e.ctwa_clid,
    status: e.status,
    created_at: e.created_at,
    source_id: (e as { source_id: string | null }).source_id ?? null,
    anuncio_id: (e as { anuncio_id: string | null }).anuncio_id ?? null,
    campanha_id: e.campanha_id ?? null,
    integracao_id: (e as { integracao_id: string | null }).integracao_id ?? null,
    pixel_id: (e as { pixel_id: string | null }).pixel_id ?? null,
    pixel_nome: (e as { integracao_id: string | null }).integracao_id
      ? nomePixelPorIntegracao.get((e as { integracao_id: string }).integracao_id) ?? null
      : null,
    erro: (e as { erro: string | null }).erro ?? null,
    tentativas: (e as { tentativas: number | null }).tentativas ?? 0,
  }));

  // Onboarding (passos por cliente)
  const { data: vendasOk } = await sb
    .from("capi_eventos")
    .select("cliente_id")
    .eq("agencia_id", ctx.agenciaId)
    .eq("status", "enviado")
    .not("cliente_id", "is", null);
  const clientesComVenda = new Set(
    (vendasOk || []).map((v) => v.cliente_id as string),
  );
  const passos: PassosCliente[] = clientesPixel.map((c) => ({
    cliente_id: c.cliente_id,
    cliente_nome: c.cliente_nome,
    integracao_id: c.integracao_id,
    pixel_id: c.pixel_id,
    pixel_nome: c.pixel_nome,
    temVenda: clientesComVenda.has(c.cliente_id),
  }));
  const onboarding: Onboarding = {
    passos,
    semIntegracao: clientesPixel.length === 0,
    tudoPronto: passos.length > 0 && passos.every((p) => p.pixel_id && p.temVenda),
  };

  // Config de eventos automáticos (Lead/AddToCart)
  const { getCapiConfig } = await import("@/lib/crm/capi-palavras");
  const eventosConfig = await getCapiConfig(ctx.agenciaId);

  // Banner de saúde (só token + eventos com erro — alarmes movidos pra aba Alertas)
  const agora = Date.now();
  const saude: Saude = {
    tokenExpirando: (integs || [])
      .filter((i) => {
        const exp = (i as { token_expires_at: string | null }).token_expires_at;
        if (!exp) return false;
        const dias = Math.floor((Date.parse(exp) - agora) / 86400000);
        return dias >= 0 && dias <= 7;
      })
      .map((i) => {
        const exp = (i as { token_expires_at: string }).token_expires_at;
        return {
          cliente_nome: (i as { clientes?: { nome?: string } }).clientes?.nome || "—",
          dias: Math.floor((Date.parse(exp) - agora) / 86400000),
        };
      }),
    tokenExpirado: (integs || [])
      .filter((i) => {
        const exp = (i as { token_expires_at: string | null }).token_expires_at;
        return exp && Date.parse(exp) < agora;
      })
      .map((i) => ({
        cliente_nome: (i as { clientes?: { nome?: string } }).clientes?.nome || "—",
      })),
    eventosErro: (eventos || []).filter((e) => e.status === "erro").length,
    eventosSemAtribuicao: (eventos || []).filter((e) => e.status === "sem_atribuicao").length,
    tudoOk: false,
  };
  saude.tudoOk =
    saude.tokenExpirando.length === 0 &&
    saude.tokenExpirado.length === 0 &&
    saude.eventosErro === 0;

  // ----- Atribuições etiqueta x campanha/conjunto/anuncio -----
  const [etiquetasQ, allCampQ, allConjQ, allAdQ, vcQ, vcjQ, vaQ] = await Promise.all([
    sb
      .from("etiquetas")
      .select("id, nome, cor, categoria, ativo")
      .eq("agencia_id", ctx.agenciaId)
      .eq("ativo", true)
      .order("nome"),
    sb
      .from("campanhas")
      .select("id, nome, status, cliente_id, clientes(nome)")
      .eq("agencia_id", ctx.agenciaId)
      .order("nome"),
    sb
      .from("conjuntos")
      .select("id, nome, status, campanha_id")
      .eq("agencia_id", ctx.agenciaId)
      .order("nome"),
    sb
      .from("anuncios")
      .select("id, nome, status, conjunto_id")
      .eq("agencia_id", ctx.agenciaId)
      .order("nome"),
    sb
      .from("etiqueta_campanhas")
      .select("etiqueta_id, campanha_id")
      .eq("agencia_id", ctx.agenciaId),
    sb
      .from("etiqueta_conjuntos")
      .select("etiqueta_id, conjunto_id")
      .eq("agencia_id", ctx.agenciaId),
    sb
      .from("etiqueta_anuncios")
      .select("etiqueta_id, anuncio_id")
      .eq("agencia_id", ctx.agenciaId),
  ]);

  const etiquetasOpts: EtiquetaOpt[] = (etiquetasQ.data || [])
    .filter((e) => (e.categoria || "etiqueta") === "etiqueta")
    .map((e) => ({ id: e.id as string, nome: e.nome as string, cor: (e.cor as string) || "#00E19A" }));

  const vincCamp = new Map<string, string[]>();
  for (const v of vcQ.data || []) {
    const cid = v.campanha_id as string;
    const arr = vincCamp.get(cid) || [];
    arr.push(v.etiqueta_id as string);
    vincCamp.set(cid, arr);
  }
  const vincConj = new Map<string, string[]>();
  for (const v of vcjQ.data || []) {
    const cid = v.conjunto_id as string;
    const arr = vincConj.get(cid) || [];
    arr.push(v.etiqueta_id as string);
    vincConj.set(cid, arr);
  }
  const vincAn = new Map<string, string[]>();
  for (const v of vaQ.data || []) {
    const aid = (v as { anuncio_id: string }).anuncio_id;
    const arr = vincAn.get(aid) || [];
    arr.push((v as { etiqueta_id: string }).etiqueta_id);
    vincAn.set(aid, arr);
  }

  const anunciosPorConj = new Map<string, { id: string; nome: string; status: string | null; etiqueta_ids: string[] }[]>();
  for (const ad of allAdQ.data || []) {
    const cjId = (ad as { conjunto_id: string | null }).conjunto_id;
    if (!cjId) continue;
    const arr = anunciosPorConj.get(cjId) || [];
    arr.push({
      id: ad.id as string,
      nome: (ad.nome as string) || "(sem nome)",
      status: (ad.status as string | null) ?? null,
      etiqueta_ids: vincAn.get(ad.id as string) || [],
    });
    anunciosPorConj.set(cjId, arr);
  }

  const conjPorCampPlain = new Map<string, { id: string; nome: string; status: string | null }[]>();
  for (const cj of allConjQ.data || []) {
    const cid = cj.campanha_id as string;
    const arr = conjPorCampPlain.get(cid) || [];
    arr.push({ id: cj.id as string, nome: (cj.nome as string) || "(sem nome)", status: (cj.status as string | null) ?? null });
    conjPorCampPlain.set(cid, arr);
  }

  const campanhasNodes: CampanhaNode[] = (allCampQ.data || []).map((c) => {
    const conjs = (conjPorCampPlain.get(c.id as string) || []).map((cj) => ({
      ...cj,
      etiqueta_ids: vincConj.get(cj.id) || [],
      anuncios: anunciosPorConj.get(cj.id) || [],
    }));
    const clienteNome = (c as { clientes?: { nome?: string } | null }).clientes?.nome ?? null;
    return {
      id: c.id as string,
      nome: (c.nome as string) || "(sem nome)",
      status: (c.status as string | null) ?? null,
      cliente_nome: clienteNome,
      etiqueta_ids: vincCamp.get(c.id as string) || [],
      conjuntos: conjs,
    };
  });

  return (
    <PixelVendasClient
      periodo={periodo}
      clienteFiltro={params.cliente || ""}
      kpis={kpis}
      feed={feed}
      clientesPixel={clientesPixel}
      saude={saude}
      onboarding={onboarding}
      eventosConfig={eventosConfig}
      slotAtribuicoes={<Atribuicoes campanhas={campanhasNodes} etiquetas={etiquetasOpts} />}
    />
  );
}
