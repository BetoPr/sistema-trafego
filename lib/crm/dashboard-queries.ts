import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Faixa de data resolvida a partir do query string.
 * Aceita: "hoje" | "7d" | "30d" | { de: ISO, ate: ISO } via search params separados.
 */
export interface FaixaDatas {
  inicio: Date;
  fim: Date;
  label: string;
}

export function resolverFaixa(periodo: string | undefined, de?: string, ate?: string): FaixaDatas {
  if (de && ate) {
    const inicio = new Date(`${de}T00:00:00`);
    const fim = new Date(`${ate}T23:59:59.999`);
    if (!isNaN(inicio.getTime()) && !isNaN(fim.getTime())) {
      return { inicio, fim, label: `${de} → ${ate}` };
    }
  }
  const agora = new Date();
  if (periodo === "hoje") {
    const inicio = new Date(agora); inicio.setHours(0, 0, 0, 0);
    const fim = new Date(agora); fim.setHours(23, 59, 59, 999);
    return { inicio, fim, label: "Hoje" };
  }
  if (periodo === "7d") {
    const inicio = new Date(agora); inicio.setDate(inicio.getDate() - 6); inicio.setHours(0, 0, 0, 0);
    return { inicio, fim: agora, label: "7 dias" };
  }
  // default 30d
  const inicio = new Date(agora); inicio.setDate(inicio.getDate() - 29); inicio.setHours(0, 0, 0, 0);
  return { inicio, fim: agora, label: "30 dias" };
}

export interface KpisAtendimento {
  faturamento_total: number;
  tickets_fechados: number;
  quantidade_total: number;
  ticket_medio: number;
}

export interface ServicoStat {
  servico: string;
  quantidade: number;
  faturamento: number;
  tickets: number;
}

export interface SerieDiaAtend {
  data: string;          // YYYY-MM-DD
  faturamento: number;
  tickets: number;
}

export interface SatisfacaoStat {
  muito_bom: number;
  bom: number;
  ruim: number;
  total: number;
  /** % de satisfeitos (muito_bom + bom) sobre o total analisado. */
  score: number;
}

export interface TemposStat {
  /** Média (seg) do tempo até a 1ª resposta do atendente. null = sem amostra. */
  primeira_resposta_seg: number | null;
  /** Média (seg) do tempo de abertura até o fechamento do ticket. */
  ate_fechamento_seg: number | null;
  /** Média (seg) de espera do cliente por resposta, a cada vez que escreve. */
  resposta_media_seg: number | null;
  amostras: { primeira: number; fechamento: number; resposta: number };
}

const diffSeg = (a: string, b: string) => (new Date(a).getTime() - new Date(b).getTime()) / 1000;

/**
 * Métricas de tempo sobre os tickets ABERTOS na faixa (tudo ancorado em
 * created_at do ticket). TMR/TMA vêm da tabela tickets; o tempo de resposta
 * recorrente vem das mensagens (limitado a 500 tickets / 20k msgs).
 */
async function calcularTempos(
  supabase: SupabaseClient,
  agenciaId: string,
  faixa: FaixaDatas,
): Promise<TemposStat> {
  const { data: tk } = await supabase
    .from("tickets")
    .select("id, created_at, primeira_resposta_em, fechado_em")
    .eq("agencia_id", agenciaId)
    .gte("created_at", faixa.inicio.toISOString())
    .lte("created_at", faixa.fim.toISOString())
    .limit(5000);

  const tickets = (tk || []) as Array<{ id: string; created_at: string; primeira_resposta_em: string | null; fechado_em: string | null }>;

  let somaPrim = 0, nPrim = 0, somaFech = 0, nFech = 0;
  for (const t of tickets) {
    if (t.primeira_resposta_em) { const d = diffSeg(t.primeira_resposta_em, t.created_at); if (d >= 0) { somaPrim += d; nPrim++; } }
    if (t.fechado_em) { const d = diffSeg(t.fechado_em, t.created_at); if (d >= 0) { somaFech += d; nFech++; } }
  }

  // Tempo de resposta recorrente: a cada bloco do cliente, mede a espera até o atendente responder.
  const ids = tickets.slice(0, 500).map((t) => t.id);
  let somaResp = 0, nResp = 0;
  if (ids.length) {
    const { data: msgs } = await supabase
      .from("mensagens")
      .select("ticket_id, autor, created_at")
      .in("ticket_id", ids)
      .in("autor", ["cliente", "atendente"])
      .order("created_at", { ascending: true })
      .limit(20000);

    const porTicket = new Map<string, Array<{ autor: string; created_at: string }>>();
    for (const m of (msgs || []) as Array<{ ticket_id: string; autor: string; created_at: string }>) {
      const arr = porTicket.get(m.ticket_id) || [];
      arr.push({ autor: m.autor, created_at: m.created_at });
      porTicket.set(m.ticket_id, arr);
    }
    for (const arr of porTicket.values()) {
      let esperaDesde: string | null = null; // 1ª msg do cliente ainda sem resposta
      for (const m of arr) {
        if (m.autor === "cliente") {
          if (esperaDesde === null) esperaDesde = m.created_at;
        } else if (esperaDesde !== null) {
          const d = diffSeg(m.created_at, esperaDesde);
          if (d >= 0) { somaResp += d; nResp++; }
          esperaDesde = null;
        }
      }
    }
  }

  return {
    primeira_resposta_seg: nPrim ? Math.round(somaPrim / nPrim) : null,
    ate_fechamento_seg: nFech ? Math.round(somaFech / nFech) : null,
    resposta_media_seg: nResp ? Math.round(somaResp / nResp) : null,
    amostras: { primeira: nPrim, fechamento: nFech, resposta: nResp },
  };
}

interface TicketRow {
  id: string;
  valor_fechado: number | null;
  fechado_em: string | null;
  metadata: { servico?: string; quantidade?: number } | null;
}

export async function carregarDashboardAtendimentos(
  supabase: SupabaseClient,
  agenciaId: string,
  faixa: FaixaDatas,
): Promise<{ kpis: KpisAtendimento; servicos: ServicoStat[]; serie: SerieDiaAtend[]; satisfacao: SatisfacaoStat; tempos: TemposStat }> {
  // Venda = ticket com valor_fechado registrado (independente do status do ticket —
  // fechamento de pedido não encerra o atendimento).
  const [{ data: tickets }, { data: sentRows }] = await Promise.all([
    supabase
      .from("tickets")
      .select("id, valor_fechado, fechado_em, metadata")
      .eq("agencia_id", agenciaId)
      .not("valor_fechado", "is", null)
      .gte("fechado_em", faixa.inicio.toISOString())
      .lte("fechado_em", faixa.fim.toISOString()),
    // Satisfação: tickets analisados (sentimento != null) na faixa.
    supabase
      .from("tickets")
      .select("sentimento")
      .eq("agencia_id", agenciaId)
      .not("sentimento", "is", null)
      .gte("created_at", faixa.inicio.toISOString())
      .lte("created_at", faixa.fim.toISOString()),
  ]);

  const sat = { muito_bom: 0, bom: 0, ruim: 0 };
  for (const r of (sentRows || []) as Array<{ sentimento: string | null }>) {
    if (r.sentimento === "muito_bom") sat.muito_bom++;
    else if (r.sentimento === "bom") sat.bom++;
    else if (r.sentimento === "ruim") sat.ruim++;
  }
  const satTotal = sat.muito_bom + sat.bom + sat.ruim;
  const satisfacao: SatisfacaoStat = {
    ...sat,
    total: satTotal,
    score: satTotal > 0 ? Math.round(((sat.muito_bom + sat.bom) / satTotal) * 100) : 0,
  };

  const tempos = await calcularTempos(supabase, agenciaId, faixa);

  const rows = (tickets || []) as TicketRow[];

  let faturamento_total = 0;
  let quantidade_total = 0;
  const tickets_fechados = rows.length;

  const porServico = new Map<string, ServicoStat>();
  const porDia = new Map<string, SerieDiaAtend>();

  for (const t of rows) {
    const valor = Number(t.valor_fechado || 0);
    const qtd = Number(t.metadata?.quantidade || 1);
    const serv = (t.metadata?.servico || "Sem serviço").trim() || "Sem serviço";

    faturamento_total += valor;
    quantidade_total += qtd;

    const existente = porServico.get(serv);
    if (existente) {
      existente.faturamento += valor;
      existente.quantidade += qtd;
      existente.tickets += 1;
    } else {
      porServico.set(serv, { servico: serv, faturamento: valor, quantidade: qtd, tickets: 1 });
    }

    if (t.fechado_em) {
      const dia = t.fechado_em.slice(0, 10);
      const ent = porDia.get(dia);
      if (ent) {
        ent.faturamento += valor;
        ent.tickets += 1;
      } else {
        porDia.set(dia, { data: dia, faturamento: valor, tickets: 1 });
      }
    }
  }

  const ticket_medio = tickets_fechados > 0 ? faturamento_total / tickets_fechados : 0;

  const servicos = Array.from(porServico.values()).sort((a, b) => b.faturamento - a.faturamento);

  // Preenche dias faltantes com zeros pro gráfico
  const serie: SerieDiaAtend[] = [];
  const dia = new Date(faixa.inicio);
  dia.setHours(0, 0, 0, 0);
  while (dia <= faixa.fim) {
    const k = dia.toISOString().slice(0, 10);
    serie.push(porDia.get(k) || { data: k, faturamento: 0, tickets: 0 });
    dia.setDate(dia.getDate() + 1);
  }

  return {
    kpis: { faturamento_total, tickets_fechados, quantidade_total, ticket_medio },
    servicos,
    serie,
    satisfacao,
    tempos,
  };
}
