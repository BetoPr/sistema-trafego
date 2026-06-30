import { requireAuth } from "@/lib/crm/permissions";
import { createServiceClient } from "@/lib/supabase/service";
import { DashboardClient } from "./_client";

export const dynamic = "force-dynamic";

export default async function PipelineDashboardPage() {
  const ctx = await requireAuth();
  const sb = createServiceClient();

  // Cards = oportunidades. Tickets fornecem ganho/perdido.
  const [
    { data: cards },
    { data: colunas },
    { data: quadros },
    { data: tickets },
    { data: contatosEtq },
  ] = await Promise.all([
    sb.from("kanban_cards")
      .select("id, coluna_id, contato_id, valor, criado_em")
      .eq("agencia_id", ctx.agenciaId),
    sb.from("kanban_colunas")
      .select("id, quadro_id, nome, cor, ordem")
      .eq("agencia_id", ctx.agenciaId)
      .order("ordem"),
    sb.from("kanban_quadros")
      .select("id, nome, cor")
      .eq("agencia_id", ctx.agenciaId)
      .is("deleted_at", null),
    sb.from("tickets")
      .select("id, resultado, valor_fechado, fechado_em, contato_id")
      .eq("agencia_id", ctx.agenciaId)
      .not("resultado", "is", null),
    sb.from("contato_etiquetas")
      .select("contato_id, etiqueta_id, etiquetas!inner(id, nome, cor, agencia_id)")
      .eq("etiquetas.agencia_id", ctx.agenciaId),
  ]);

  const cs = (cards || []) as Array<{ id: string; coluna_id: string; contato_id: string | null; valor: number | null; criado_em: string }>;
  const cols = (colunas || []) as Array<{ id: string; quadro_id: string; nome: string; cor: string; ordem: number }>;
  const qds = (quadros || []) as Array<{ id: string; nome: string; cor: string }>;
  const tks = (tickets || []) as Array<{ id: string; resultado: "ganho" | "perdido"; valor_fechado: number | null; fechado_em: string | null; contato_id: string | null }>;
  const lks = (contatosEtq || []) as Array<{ contato_id: string; etiqueta_id: string; etiquetas: { id: string; nome: string; cor: string | null } | { id: string; nome: string; cor: string | null }[] }>;

  // KPIs
  const ganhos = tks.filter((t) => t.resultado === "ganho");
  const perdidos = tks.filter((t) => t.resultado === "perdido");
  const totalGanho = ganhos.reduce((s, t) => s + (Number(t.valor_fechado) || 0), 0);
  const totalCriadas = cs.length;
  const abertos = totalCriadas - (ganhos.length + perdidos.length);
  const ticketMedio = ganhos.length > 0 ? totalGanho / ganhos.length : 0;
  const taxaConv = totalCriadas > 0 ? (ganhos.length / totalCriadas) * 100 : 0;

  // Por status (donut): Abertas / Ganhas / Perdidas
  const porStatus = [
    { nome: "Abertas", valor: Math.max(0, abertos), cor: "#5cd0ff" },
    { nome: "Ganhas", valor: ganhos.length, cor: "#00E19A" },
    { nome: "Perdidas", valor: perdidos.length, cor: "#FFB547" },
  ];

  // Por etapa (bar): coluna_nome → qtd cards
  const colNomeById = new Map(cols.map((c) => [c.id, c.nome] as const));
  const colCorById = new Map(cols.map((c) => [c.id, c.cor] as const));
  const contagemPorEtapa: Record<string, { qtd: number; valor: number; cor: string }> = {};
  for (const c of cs) {
    const nome = colNomeById.get(c.coluna_id) || "—";
    const cor = colCorById.get(c.coluna_id) || "#5cd0ff";
    if (!contagemPorEtapa[nome]) contagemPorEtapa[nome] = { qtd: 0, valor: 0, cor };
    contagemPorEtapa[nome].qtd += 1;
    contagemPorEtapa[nome].valor += Number(c.valor) || 0;
  }
  const porEtapa = Object.entries(contagemPorEtapa).map(([nome, v]) => ({ nome, qtd: v.qtd, valor: v.valor, cor: v.cor }));

  // Por mês (12m): YYYY-MM → qtd cards criados
  const porMes: Record<string, number> = {};
  for (const c of cs) {
    const mes = (c.criado_em || "").slice(0, 7); // YYYY-MM
    if (!mes) continue;
    porMes[mes] = (porMes[mes] || 0) + 1;
  }
  const porMesArr = Object.entries(porMes)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([mes, qtd]) => ({ mes, qtd }));

  // Valor por etapa (bars com R$)
  const valorPorEtapa = porEtapa.map((e) => ({ nome: e.nome, qtd: e.qtd, valor: e.valor, cor: e.cor }));

  // Por etiqueta: agrupa por etiqueta os cards (via contato_id → contato_etiquetas)
  const etqInfo = new Map<string, { nome: string; cor: string }>();
  const cardsByContato: Record<string, number> = {};
  const valorByContato: Record<string, number> = {};
  for (const c of cs) {
    if (!c.contato_id) continue;
    cardsByContato[c.contato_id] = (cardsByContato[c.contato_id] || 0) + 1;
    valorByContato[c.contato_id] = (valorByContato[c.contato_id] || 0) + (Number(c.valor) || 0);
  }
  const porEtiquetaMap: Record<string, { qtd: number; valor: number }> = {};
  for (const l of lks) {
    const et = Array.isArray(l.etiquetas) ? l.etiquetas[0] : l.etiquetas;
    if (!et) continue;
    etqInfo.set(l.etiqueta_id, { nome: et.nome, cor: et.cor || "#5cd0ff" });
    if (!porEtiquetaMap[l.etiqueta_id]) porEtiquetaMap[l.etiqueta_id] = { qtd: 0, valor: 0 };
    porEtiquetaMap[l.etiqueta_id].qtd += cardsByContato[l.contato_id] || 0;
    porEtiquetaMap[l.etiqueta_id].valor += valorByContato[l.contato_id] || 0;
  }
  const porEtiqueta = Object.entries(porEtiquetaMap)
    .map(([eid, v]) => ({
      id: eid,
      nome: etqInfo.get(eid)?.nome || "—",
      cor: etqInfo.get(eid)?.cor || "#5cd0ff",
      qtd: v.qtd,
      valor: v.valor,
    }))
    .filter((e) => e.qtd > 0)
    .sort((a, b) => b.qtd - a.qtd)
    .slice(0, 8);

  // Por kanban (quadro): qtd + valor agrupando por quadro
  const colQuadroById = new Map(cols.map((c) => [c.id, c.quadro_id] as const));
  const porKanbanMap: Record<string, { qtd: number; valor: number }> = {};
  for (const c of cs) {
    const qid = colQuadroById.get(c.coluna_id);
    if (!qid) continue;
    if (!porKanbanMap[qid]) porKanbanMap[qid] = { qtd: 0, valor: 0 };
    porKanbanMap[qid].qtd += 1;
    porKanbanMap[qid].valor += Number(c.valor) || 0;
  }
  const porKanban = qds.map((q) => ({
    id: q.id,
    nome: q.nome,
    cor: q.cor || "#00E19A",
    qtd: porKanbanMap[q.id]?.qtd || 0,
    valor: porKanbanMap[q.id]?.valor || 0,
  })).sort((a, b) => b.qtd - a.qtd);

  // Pipelines ativos = qtd quadros não soft-deletados + total etapas
  const pipelinesAtivos = { quadros: qds.length, etapas: cols.length };

  return (
    <DashboardClient
      kpis={{
        criadas: totalCriadas,
        abertos: Math.max(0, abertos),
        ganhos: ganhos.length,
        perdidos: perdidos.length,
        ticketMedio,
        taxaConv,
        totalGanho,
      }}
      porStatus={porStatus}
      porEtapa={porEtapa}
      porMes={porMesArr}
      valorPorEtapa={valorPorEtapa}
      porEtiqueta={porEtiqueta}
      porKanban={porKanban}
      pipelinesAtivos={pipelinesAtivos}
    />
  );
}
