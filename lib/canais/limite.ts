/**
 * Enforcement do limite de conexoes WhatsApp por agencia.
 *
 * Modelo:
 *   - Plano base R$29/mes inclui 1 conexao (canais_inclusos)
 *   - Conexoes extras pagas (canais_extras_pagos) — super-admin ajusta apos pagamento
 *   - Conexoes extras cortesia (canais_extras_cortesia) — super-admin define manualmente
 *
 * total = canais_inclusos + canais_extras_pagos + canais_extras_cortesia
 *
 * Canal "ativo" = qualquer status diferente de 'arquivado' / soft-deleted.
 * Importante: status pode ser pending_qr, connected, disconnected etc — todos
 * contam pro limite porque ocupam slot (instancia provisionada no UAZAPI).
 */

import { createServiceClient } from "@/lib/supabase/service";

export interface StatusLimiteCanais {
  agenciaId: string;
  usados: number;
  limite: number;
  inclusos: number;
  extrasPagos: number;
  extrasCortesia: number;
  podeAdicionar: boolean;
  disponivel: number;
}

export async function obterStatusLimite(agenciaId: string): Promise<StatusLimiteCanais> {
  const sb = createServiceClient();

  const { data: ag, error: errAg } = await sb
    .from("agencias")
    .select("limite_canais, canais_inclusos, canais_extras_pagos, canais_extras_cortesia")
    .eq("id", agenciaId)
    .maybeSingle();

  if (errAg || !ag) {
    throw new Error("Agência não encontrada.");
  }

  const { count, error: errCount } = await sb
    .from("canais")
    .select("id", { count: "exact", head: true })
    .eq("agencia_id", agenciaId);

  if (errCount) {
    throw new Error(`Erro ao contar canais: ${errCount.message}`);
  }

  const usados = count ?? 0;
  const limite = (ag.limite_canais as number) ?? 1;
  const disponivel = Math.max(0, limite - usados);

  return {
    agenciaId,
    usados,
    limite,
    inclusos: (ag.canais_inclusos as number) ?? 1,
    extrasPagos: (ag.canais_extras_pagos as number) ?? 0,
    extrasCortesia: (ag.canais_extras_cortesia as number) ?? 0,
    podeAdicionar: usados < limite,
    disponivel,
  };
}

/**
 * Lanca erro com mensagem amigavel se nao houver slot disponivel.
 * Chame ANTES de criar instancia no UAZAPI/WAHA pra nao gerar lixo no provedor.
 */
export async function assertPodeAdicionarCanal(agenciaId: string): Promise<StatusLimiteCanais> {
  const st = await obterStatusLimite(agenciaId);
  if (!st.podeAdicionar) {
    throw new Error(
      `Limite de conexões atingido: ${st.usados}/${st.limite}. ` +
      `Cada conexão adicional custa R$19/mês. ` +
      `Solicite liberação no suporte (WhatsApp +55 81 99159-4716).`,
    );
  }
  return st;
}
