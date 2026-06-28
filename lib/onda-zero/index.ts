/**
 * Onda Zero — comunidade exclusiva dos 10 primeiros membros do Sonar.
 *
 * Beneficios: 30% OFF vitalicio, trial dobrado, atualizacoes antecipadas,
 * grupo WhatsApp privado, voz direta no roadmap.
 */

import { createServiceClient } from "@/lib/supabase/service";

export const ONDA_ZERO_LIMITE = 10;

export interface OndaZeroStatus {
  ehMembro: boolean;
  conviteVistoEm: string | null;
  whatsappGrupoLink: string | null;
  mensagemConvite: string;
}

/**
 * Verifica se uma agencia recem-criada deve entrar na Onda Zero.
 * Marca onda_zero_membro=true + preco_travado=true se houver vaga.
 */
export async function tentarEntrarOndaZero(agenciaId: string): Promise<boolean> {
  const sb = createServiceClient();
  const { count } = await sb
    .from("agencias")
    .select("id", { count: "exact", head: true })
    .eq("onda_zero_membro", true);
  if ((count ?? 0) >= ONDA_ZERO_LIMITE) return false;

  const { error } = await sb
    .from("agencias")
    .update({ onda_zero_membro: true, preco_travado: true })
    .eq("id", agenciaId)
    .eq("onda_zero_membro", false);
  return !error;
}

/**
 * Carrega status da Onda Zero pra renderizar o balao de convite.
 */
export async function carregarStatusOndaZero(agenciaId: string): Promise<OndaZeroStatus> {
  const sb = createServiceClient();
  const [{ data: ag }, { data: cfg }] = await Promise.all([
    sb.from("agencias").select("onda_zero_membro, onda_zero_convite_visto_em").eq("id", agenciaId).maybeSingle(),
    sb.from("super_admin_onda_zero_config").select("whatsapp_grupo_link, mensagem_convite").eq("id", 1).maybeSingle(),
  ]);
  return {
    ehMembro: !!ag?.onda_zero_membro,
    conviteVistoEm: (ag?.onda_zero_convite_visto_em as string | null) ?? null,
    whatsappGrupoLink: (cfg?.whatsapp_grupo_link as string | null) ?? null,
    mensagemConvite: (cfg?.mensagem_convite as string | null) ?? "Bem-vindo à Onda Zero!",
  };
}
