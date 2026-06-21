import { requireSuperAdmin } from "@/lib/crm/permissions";
import { createServiceClient } from "@/lib/supabase/service";
import { PixelVendasClient } from "./_client";

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
}
export interface ClientePixel {
  cliente_id: string;
  cliente_nome: string;
  integracao_id: string;
  pixel_id: string | null;
  pixel_nome: string | null;
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
    .select("id, valor, campanha_id, conjunto_id, ctwa_clid, status, created_at, cliente_id, contato_id, servico")
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
  const feed: EventoRow[] = (eventos || []).slice(0, 50).map((e) => ({
    id: e.id,
    contato_nome: nomeContato.get(e.contato_id as string) || null,
    valor: Number(e.valor || 0),
    campanha_nome: e.campanha_id ? nomeCamp.get(e.campanha_id) || null : null,
    ctwa_clid: e.ctwa_clid,
    status: e.status,
    created_at: e.created_at,
  }));

  const { data: integs } = await sb
    .from("integracoes")
    .select("id, cliente_id, pixel_id, pixel_nome, clientes!inner(nome)")
    .eq("agencia_id", ctx.agenciaId)
    .eq("plataforma", "meta_ads");
  const clientesPixel: ClientePixel[] = (integs || []).map((i) => ({
    cliente_id: i.cliente_id as string,
    cliente_nome: (i as { clientes?: { nome?: string } }).clientes?.nome || "—",
    integracao_id: i.id as string,
    pixel_id: (i as { pixel_id: string | null }).pixel_id,
    pixel_nome: (i as { pixel_nome: string | null }).pixel_nome,
  }));

  return (
    <PixelVendasClient
      periodo={periodo}
      clienteFiltro={params.cliente || ""}
      kpis={kpis}
      linhas={linhas}
      feed={feed}
      clientesPixel={clientesPixel}
    />
  );
}
