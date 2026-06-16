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
