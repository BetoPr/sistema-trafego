"use client";

import { useEffect, useRef, useState } from "react";

interface CountUpProps {
  /** Valor alvo (número). Pode mudar — anima do anterior pro novo. null/undefined → fallback. */
  value: number | null | undefined;
  /**
   * Formato pré-definido. Usar string em vez de função porque Server Components
   * não conseguem passar funções pra Client Components.
   * - int (default): inteiro pt-BR
   * - brl: moeda R$
   * - usd: dólar ("$x.xx", ou "$x.xxxx" pra valores < 1)
   * - mult: multiplicador "x" (ROAS)
   * - pct: porcentagem inteira
   */
  kind?: "int" | "brl" | "usd" | "mult" | "pct";
  /** Duração em ms. Default 900. */
  duration?: number;
  /** Prefixo (ex.: "R$ "). */
  prefix?: string;
  /** Sufixo (ex.: "%", " seg"). */
  suffix?: string;
  /** Se true, valor null/undefined renderiza "—" (não anima). */
  fallback?: string;
}

const nfInt = new Intl.NumberFormat("pt-BR");
const nfBRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function applyFormat(n: number, kind: NonNullable<CountUpProps["kind"]>): string {
  switch (kind) {
    case "brl":
      return nfBRL.format(n);
    case "usd":
      return "$" + (Math.abs(n) < 1 ? n.toFixed(4) : n.toFixed(2));
    case "mult":
      return Number.isFinite(n) && n > 0 ? `${n.toFixed(2).replace(".", ",")}x` : "—";
    case "pct":
      return `${Math.round(n)}%`;
    case "int":
    default:
      return nfInt.format(Math.round(n));
  }
}

/**
 * Anima de 0 (ou do valor anterior) até `value` com ease-out cubic.
 * Usa requestAnimationFrame. Respeita `prefers-reduced-motion` (mostra valor final direto).
 */
export function CountUp({
  value,
  kind = "int",
  duration = 900,
  prefix = "",
  suffix = "",
  fallback = "—",
}: CountUpProps) {
  const [display, setDisplay] = useState<number>(0);
  const prevRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const target = value;
    if (target === null || target === undefined || !Number.isFinite(target)) return;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setDisplay(target);
      prevRef.current = target;
      return;
    }

    const from = prevRef.current;
    const to = target;
    const start = performance.now();

    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const ease = 1 - Math.pow(1 - p, 3); // ease-out cubic
      const cur = from + (to - from) * ease;
      setDisplay(cur);
      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        prevRef.current = to;
      }
    };

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  if (value === null || value === undefined || !Number.isFinite(value)) {
    return <>{fallback}</>;
  }

  return (
    <>
      {prefix}
      {applyFormat(display, kind)}
      {suffix}
    </>
  );
}

/** Helper: formatter de moeda BRL. */
export const fmtCountBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

/** Helper: formatter "Nx" (multiplicador ROAS). */
export const fmtCountMultX = (n: number) =>
  Number.isFinite(n) && n > 0 ? `${n.toFixed(2).replace(".", ",")}x` : "—";

/** Helper: formatter de porcentagem inteira. */
export const fmtCountPct = (n: number) => `${Math.round(n)}%`;
