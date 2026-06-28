/**
 * Enforcement do limite de usuarios por agencia.
 *
 * Modelo:
 *   - Plano define usuarios_inclusos (Solo 1, Time 4, Agencia 8, Studio 15)
 *   - Usuarios extras pagos (canais_extras_pagos) — super-admin ajusta apos pagamento
 *   - Usuarios extras cortesia (canais_extras_cortesia) — super-admin define manualmente
 *
 * total = usuarios_inclusos + usuarios_extras_pagos + usuarios_extras_cortesia
 *
 * Usuario "ativo" = registro em usuarios com deleted_at IS NULL.
 * Soft-deleted nao conta.
 */

import { createServiceClient } from "@/lib/supabase/service";

export interface StatusLimiteUsuarios {
  agenciaId: string;
  usados: number;
  limite: number;
  inclusos: number;
  extrasPagos: number;
  extrasCortesia: number;
  podeAdicionar: boolean;
  disponivel: number;
}

export async function obterStatusLimiteUsuarios(agenciaId: string): Promise<StatusLimiteUsuarios> {
  const sb = createServiceClient();

  const { data: ag, error: errAg } = await sb
    .from("agencias")
    .select("limite_usuarios, usuarios_inclusos, usuarios_extras_pagos, usuarios_extras_cortesia")
    .eq("id", agenciaId)
    .maybeSingle();

  if (errAg || !ag) {
    throw new Error("Agência não encontrada.");
  }

  const { count, error: errCount } = await sb
    .from("usuarios")
    .select("id", { count: "exact", head: true })
    .eq("agencia_id", agenciaId)
    .is("deleted_at", null);

  if (errCount) {
    throw new Error(`Erro ao contar usuários: ${errCount.message}`);
  }

  const usados = count ?? 0;
  const limite = (ag.limite_usuarios as number) ?? 1;
  const disponivel = Math.max(0, limite - usados);

  return {
    agenciaId,
    usados,
    limite,
    inclusos: (ag.usuarios_inclusos as number) ?? 1,
    extrasPagos: (ag.usuarios_extras_pagos as number) ?? 0,
    extrasCortesia: (ag.usuarios_extras_cortesia as number) ?? 0,
    podeAdicionar: usados < limite,
    disponivel,
  };
}

/**
 * Lanca erro com mensagem amigavel se nao houver slot disponivel.
 * Chame ANTES de criar o usuario (cadastro interno via super-admin/admin).
 */
export async function assertPodeAdicionarUsuario(agenciaId: string): Promise<StatusLimiteUsuarios> {
  const st = await obterStatusLimiteUsuarios(agenciaId);
  if (!st.podeAdicionar) {
    throw new Error(
      `Limite de usuários atingido: ${st.usados}/${st.limite}. ` +
      `Cada usuário adicional custa R$5/mês. ` +
      `Solicite liberação no suporte (WhatsApp +55 81 99159-4716).`,
    );
  }
  return st;
}
