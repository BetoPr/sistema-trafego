/**
 * Pricing snapshot 2026-01 — USD por 1M tokens.
 * Atualizar quando providers reajustarem.
 */

export const PRECOS_POR_MODELO: Record<string, { in_usd_por_milhao: number; out_usd_por_milhao: number }> = {
  // Anthropic
  "claude-haiku-4-5-20251001":     { in_usd_por_milhao: 1.00,  out_usd_por_milhao: 5.00 },
  "claude-haiku-4-5":              { in_usd_por_milhao: 1.00,  out_usd_por_milhao: 5.00 },
  "claude-sonnet-4-6":             { in_usd_por_milhao: 3.00,  out_usd_por_milhao: 15.00 },
  "claude-opus-4-8":               { in_usd_por_milhao: 15.00, out_usd_por_milhao: 75.00 },
  "claude-3-5-haiku-latest":       { in_usd_por_milhao: 0.80,  out_usd_por_milhao: 4.00 },
  "claude-3-5-sonnet-latest":      { in_usd_por_milhao: 3.00,  out_usd_por_milhao: 15.00 },
  // OpenAI
  "gpt-4o-mini":                   { in_usd_por_milhao: 0.15,  out_usd_por_milhao: 0.60 },
  "gpt-4o":                        { in_usd_por_milhao: 2.50,  out_usd_por_milhao: 10.00 },
  "gpt-4.1":                       { in_usd_por_milhao: 2.00,  out_usd_por_milhao: 8.00 },
  "gpt-4.1-mini":                  { in_usd_por_milhao: 0.40,  out_usd_por_milhao: 1.60 },
  "gpt-4.1-nano":                  { in_usd_por_milhao: 0.10,  out_usd_por_milhao: 0.40 },
  "o1":                            { in_usd_por_milhao: 15.00, out_usd_por_milhao: 60.00 },
  "o1-mini":                       { in_usd_por_milhao: 3.00,  out_usd_por_milhao: 12.00 },
  "o3-mini":                       { in_usd_por_milhao: 1.10,  out_usd_por_milhao: 4.40 },
  // Groq
  "llama-3.3-70b-versatile":       { in_usd_por_milhao: 0.59,  out_usd_por_milhao: 0.79 },
  "llama-3.1-8b-instant":          { in_usd_por_milhao: 0.05,  out_usd_por_milhao: 0.08 },
  "deepseek-r1-distill-llama-70b": { in_usd_por_milhao: 0.75,  out_usd_por_milhao: 0.99 },
};

/**
 * Calcula custo em USD pra um par de tokens dado o modelo.
 * Match case-insensitive. Modelo desconhecido => 0.
 */
export function calcularCustoUsd(
  modelo: string | null | undefined,
  tokensIn: number,
  tokensOut: number,
): number {
  if (!modelo) return 0;
  const key = Object.keys(PRECOS_POR_MODELO).find((k) => k.toLowerCase() === modelo.toLowerCase());
  if (!key) return 0;
  const p = PRECOS_POR_MODELO[key];
  return (tokensIn / 1_000_000) * p.in_usd_por_milhao + (tokensOut / 1_000_000) * p.out_usd_por_milhao;
}

/**
 * Formata USD pra exibicao. Mostra 4 casas se < 0.01.
 */
export function formatarUsd(valor: number): string {
  const opts: Intl.NumberFormatOptions = valor > 0 && valor < 0.01
    ? { style: "currency", currency: "USD", minimumFractionDigits: 4, maximumFractionDigits: 4 }
    : { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 };
  return new Intl.NumberFormat("en-US", opts).format(valor);
}
