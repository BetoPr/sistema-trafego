/**
 * Limites por chave de IA (Fase 3).
 *
 * Lê o uso de hoje (fuso de Brasília) por chave a partir de `ia_uso` pra o
 * gateway decidir, ANTES de chamar, se pula uma chave que já bateu o teto
 * diário (TPD) ou o limite de follow-ups/dia. É um skip proativo — o 429 do
 * próprio Groq continua sendo a rede de segurança no gateway.
 */
import { createServiceClient } from "@/lib/supabase/service";

export interface UsoChave {
  tokens: number;
  followups: number;
}

/**
 * Uso de IA de hoje (00h em America/Sao_Paulo) agrupado por chave (ia_chaves.id).
 * Só inclui registros com chave_id (chaves legadas/env não têm id e não são limitadas).
 */
export async function usoHojePorChave(agenciaId: string): Promise<Map<string, UsoChave>> {
  const sb = createServiceClient();
  const hojeSP = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date()); // YYYY-MM-DD
  const desde = `${hojeSP}T00:00:00-03:00`; // SP = UTC-3 fixo (sem horário de verão desde 2019)

  const { data } = await sb
    .from("ia_uso")
    .select("chave_id, total_tokens, tarefa")
    .eq("agencia_id", agenciaId)
    .gte("criado_em", desde)
    .not("chave_id", "is", null);

  const map = new Map<string, UsoChave>();
  for (const r of (data || []) as Array<{ chave_id: string; total_tokens: number | null; tarefa: string }>) {
    const cur = map.get(r.chave_id) || { tokens: 0, followups: 0 };
    cur.tokens += r.total_tokens || 0;
    if (r.tarefa === "followup") cur.followups += 1;
    map.set(r.chave_id, cur);
  }
  return map;
}
