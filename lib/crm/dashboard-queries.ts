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
): Promise<{ kpis: KpisAtendimento; servicos: ServicoStat[]; serie: SerieDiaAtend[] }> {
  // Venda = ticket com valor_fechado registrado (independente do status do ticket —
  // fechamento de pedido não encerra o atendimento).
  const { data: tickets } = await supabase
    .from("tickets")
    .select("id, valor_fechado, fechado_em, metadata")
    .eq("agencia_id", agenciaId)
    .not("valor_fechado", "is", null)
    .gte("fechado_em", faixa.inicio.toISOString())
    .lte("fechado_em", faixa.fim.toISOString());

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
  };
}
