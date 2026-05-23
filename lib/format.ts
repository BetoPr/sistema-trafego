const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 2,
});

const DEC = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });
const INT = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const PCT = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  maximumFractionDigits: 2,
});

export function fmtBRL(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return BRL.format(n);
}

export function fmtInt(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return INT.format(n);
}

export function fmtDec(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return DEC.format(n);
}

export function fmtPct(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return PCT.format(n);
}

export function fmtMultX(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return `${DEC.format(n)}x`;
}
