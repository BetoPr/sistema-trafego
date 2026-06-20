import type { SupabaseClient } from "@supabase/supabase-js";

/** Teto de mensagens AUTOMÁTICAS (workers/bot, sem usuario_id humano) por ticket em 24h. */
export const TETO_AUTOMATICO_24H = 10;

/**
 * Rede de segurança anti-flood (defesa em profundidade).
 *
 * Conta mensagens AUTOMÁTICAS (autor 'atendente'/'bot' SEM usuario_id humano)
 * enviadas a um ticket na janela. Acima do teto, os workers de follow-up pulam o
 * envio. Limita o estrago de QUALQUER reenvio em massa, mesmo que algum bug futuro
 * escape do claim atômico. NÃO conta envios feitos por humano (têm usuario_id).
 *
 * Não lança — em erro, retorna false (não bloqueia o fluxo normal).
 */
export async function automacaoExcedeuTeto(
  sb: SupabaseClient,
  ticketId: string | null | undefined,
  agenciaId: string,
  teto: number = TETO_AUTOMATICO_24H,
  janelaHoras = 24,
): Promise<boolean> {
  if (!ticketId) return false;
  try {
    const desde = new Date(Date.now() - janelaHoras * 3600000).toISOString();
    const { count } = await sb
      .from("mensagens")
      .select("id", { count: "exact", head: true })
      .eq("ticket_id", ticketId)
      .eq("agencia_id", agenciaId)
      .in("autor", ["atendente", "bot"])
      .is("usuario_id", null)
      .gte("created_at", desde);
    return (count || 0) >= teto;
  } catch {
    return false;
  }
}
