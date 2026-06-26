/**
 * Helpers de trial e ciclo de vida de agencias.
 *
 * Politica de trial (decisao Roberto 2026-06-26):
 *   - empreendedor: 14 dias
 *   - autonomo:     14 dias
 *   - agencia:      21 dias
 *
 * Apos trial_acaba_em sem pagamento: acesso_bloqueado = true (login bloqueia).
 * Apos apagar_em (trial_acaba_em + 30d): agencia deletada do banco.
 */

export type TipoCliente = "empreendedor" | "autonomo" | "agencia";

export const TRIAL_DIAS_POR_TIPO: Record<TipoCliente, number> = {
  empreendedor: 14,
  autonomo: 14,
  agencia: 21,
};

/** Dias entre trial_acaba_em e exclusao automatica da conta. */
export const DIAS_PARA_APAGAR_APOS_TRIAL = 30;

export function calcularTrialAcabaEm(tipo: TipoCliente, agora: Date = new Date()): Date {
  const dias = TRIAL_DIAS_POR_TIPO[tipo];
  const d = new Date(agora);
  d.setDate(d.getDate() + dias);
  return d;
}

export function calcularApagarEm(trialAcabaEm: Date): Date {
  const d = new Date(trialAcabaEm);
  d.setDate(d.getDate() + DIAS_PARA_APAGAR_APOS_TRIAL);
  return d;
}

export function isTrialExpirado(trialAcabaEm: string | Date | null, agora: Date = new Date()): boolean {
  if (!trialAcabaEm) return false;
  const t = typeof trialAcabaEm === "string" ? new Date(trialAcabaEm) : trialAcabaEm;
  return agora.getTime() > t.getTime();
}

export function isParaApagar(apagarEm: string | Date | null, agora: Date = new Date()): boolean {
  if (!apagarEm) return false;
  const t = typeof apagarEm === "string" ? new Date(apagarEm) : apagarEm;
  return agora.getTime() > t.getTime();
}

/** Quantos dias faltam pro trial acabar. Negativo = ja expirou. */
export function diasRestantesTrial(trialAcabaEm: string | Date | null, agora: Date = new Date()): number | null {
  if (!trialAcabaEm) return null;
  const t = typeof trialAcabaEm === "string" ? new Date(trialAcabaEm) : trialAcabaEm;
  const ms = t.getTime() - agora.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export function tipoClienteLabel(tipo: TipoCliente | string | null): string {
  switch (tipo) {
    case "empreendedor":
      return "Empreendedor";
    case "autonomo":
      return "Autônomo";
    case "agencia":
      return "Agência";
    default:
      return "—";
  }
}
