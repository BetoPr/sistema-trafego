"use client";

import { useEffect, useRef, useState } from "react";

interface CountUpProps {
  /** Valor alvo (número). Pode mudar — anima do anterior pro novo. null/undefined → fallback. */
  value: number | null | undefined;
  /** Formatter opcional. Default: Intl.NumberFormat('pt-BR') de inteiro. */
  format?: (n: number) => string;
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
const defaultFormat = (n: number) => nfInt.format(Math.round(n));

/**
 * Anima de 0 (ou do valor anterior) até `value` com ease-out cubic.
 * Usa requestAnimationFrame. Respeita `prefers-reduced-motion` (mostra valor final direto).
 */
export function CountUp({
  value,
  format = defaultFormat,
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
      {format(display)}
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
