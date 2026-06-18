import { createServiceClient } from "@/lib/supabase/service";
import { calcularCustoUsd } from "./precos";

export type IntervaloUso = "24h" | "7d" | "30d" | "total";

export interface ResumoUso {
  respostas: number;
  tokens_in: number;
  tokens_out: number;
  custo_usd: number;
  media_in: number;
  media_out: number;
  por_dia: Array<{ dia: string; tokens_in: number; tokens_out: number; custo_usd: number; respostas: number }>;
}

function diasDoIntervalo(intervalo: IntervaloUso): number | null {
  switch (intervalo) {
    case "24h":   return 1;
    case "7d":    return 7;
    case "30d":   return 30;
    case "total": return null;
  }
}

/**
 * Carrega resumo de uso de tokens pra um perfil.
 * Calcula custo no app (lookup tabela de precos do codigo).
 */
export async function carregarUsoTokens(
  perfilId: string,
  agenciaId: string,
  intervalo: IntervaloUso = "7d",
): Promise<ResumoUso> {
  const sb = createServiceClient();
  const dias = diasDoIntervalo(intervalo);

  let q = sb
    .from("ia_atendimento_log")
    .select("modelo, tokens_in, tokens_out, created_at")
    .eq("perfil_id", perfilId)
    .eq("agencia_id", agenciaId)
    .eq("evento", "resposta");

  if (dias !== null) {
    const desde = new Date();
    desde.setDate(desde.getDate() - dias);
    q = q.gte("created_at", desde.toISOString());
  }

  const { data } = await q.order("created_at", { ascending: true }).limit(10000);
  const rows = (data || []) as Array<{
    modelo: string | null;
    tokens_in: number | null;
    tokens_out: number | null;
    created_at: string;
  }>;

  let tokens_in = 0;
  let tokens_out = 0;
  let custo_usd = 0;
  const respostas = rows.length;
  const porDiaMap = new Map<string, { tokens_in: number; tokens_out: number; custo_usd: number; respostas: number }>();

  for (const r of rows) {
    const tin = r.tokens_in || 0;
    const tout = r.tokens_out || 0;
    const c = calcularCustoUsd(r.modelo, tin, tout);
    tokens_in += tin;
    tokens_out += tout;
    custo_usd += c;
    const dia = new Date(r.created_at).toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
    const cur = porDiaMap.get(dia) || { tokens_in: 0, tokens_out: 0, custo_usd: 0, respostas: 0 };
    cur.tokens_in += tin;
    cur.tokens_out += tout;
    cur.custo_usd += c;
    cur.respostas += 1;
    porDiaMap.set(dia, cur);
  }

  // Preenche buracos pros ultimos 7 dias pro mini-grafico
  const por_dia: ResumoUso["por_dia"] = [];
  const hoje = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(hoje);
    d.setDate(d.getDate() - i);
    const dia = d.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
    const cur = porDiaMap.get(dia) || { tokens_in: 0, tokens_out: 0, custo_usd: 0, respostas: 0 };
    por_dia.push({ dia, ...cur });
  }

  return {
    respostas,
    tokens_in,
    tokens_out,
    custo_usd,
    media_in: respostas > 0 ? Math.round(tokens_in / respostas) : 0,
    media_out: respostas > 0 ? Math.round(tokens_out / respostas) : 0,
    por_dia,
  };
}

export interface UsoPorTicket {
  ticket_id: string;
  contato_nome: string;
  respostas: number;
  tokens_in: number;
  tokens_out: number;
  custo_usd: number;
}

/**
 * Uso de tokens agrupado por ticket (= conversa). Mostra quanto cada conversa
 * gastou de tokens/custo. Ordena por custo desc.
 */
export async function carregarUsoPorTicket(
  perfilId: string,
  agenciaId: string,
  intervalo: IntervaloUso = "7d",
  limite = 20,
): Promise<UsoPorTicket[]> {
  const sb = createServiceClient();
  const dias = diasDoIntervalo(intervalo);

  let q = sb
    .from("ia_atendimento_log")
    .select("ticket_id, modelo, tokens_in, tokens_out, created_at")
    .eq("perfil_id", perfilId)
    .eq("agencia_id", agenciaId)
    .eq("evento", "resposta")
    .not("ticket_id", "is", null);

  if (dias !== null) {
    const desde = new Date();
    desde.setDate(desde.getDate() - dias);
    q = q.gte("created_at", desde.toISOString());
  }

  const { data } = await q.limit(10000);
  const rows = (data || []) as Array<{
    ticket_id: string;
    modelo: string | null;
    tokens_in: number | null;
    tokens_out: number | null;
  }>;
  if (!rows.length) return [];

  const map = new Map<string, { respostas: number; tokens_in: number; tokens_out: number; custo_usd: number }>();
  for (const r of rows) {
    const tin = r.tokens_in || 0;
    const tout = r.tokens_out || 0;
    const c = calcularCustoUsd(r.modelo, tin, tout);
    const cur = map.get(r.ticket_id) || { respostas: 0, tokens_in: 0, tokens_out: 0, custo_usd: 0 };
    cur.respostas += 1;
    cur.tokens_in += tin;
    cur.tokens_out += tout;
    cur.custo_usd += c;
    map.set(r.ticket_id, cur);
  }

  const ticketIds = Array.from(map.keys());

  // Nome do contato por ticket (ticket -> contato_id -> nome)
  const nomePorTicket = new Map<string, string>();
  try {
    const { data: tks } = await sb.from("tickets").select("id, contato_id").in("id", ticketIds);
    const contatoPorTicket = new Map<string, string>();
    const contatoIds: string[] = [];
    for (const t of (tks || []) as Array<{ id: string; contato_id: string | null }>) {
      if (t.contato_id) { contatoPorTicket.set(t.id, t.contato_id); contatoIds.push(t.contato_id); }
    }
    if (contatoIds.length) {
      const { data: cts } = await sb.from("contatos").select("id, nome, whatsapp").in("id", contatoIds);
      const nomePorContato = new Map<string, string>();
      for (const c of (cts || []) as Array<{ id: string; nome: string | null; whatsapp: string | null }>) {
        nomePorContato.set(c.id, c.nome || c.whatsapp || "Contato");
      }
      for (const [tid, cid] of contatoPorTicket) {
        nomePorTicket.set(tid, nomePorContato.get(cid) || "Contato");
      }
    }
  } catch { /* nome opcional */ }

  return ticketIds
    .map((tid) => {
      const m = map.get(tid)!;
      return {
        ticket_id: tid,
        contato_nome: nomePorTicket.get(tid) || "Conversa",
        respostas: m.respostas,
        tokens_in: m.tokens_in,
        tokens_out: m.tokens_out,
        custo_usd: m.custo_usd,
      };
    })
    .sort((a, b) => b.custo_usd - a.custo_usd || (b.tokens_in + b.tokens_out) - (a.tokens_in + a.tokens_out))
    .slice(0, limite);
}
