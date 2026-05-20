"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Plataforma } from "@/lib/platform";

interface PlatformCtx {
  ativa: Plataforma | null;
  setAtiva: (p: Plataforma | null) => void;
  conectadas: Plataforma[];
}

const Ctx = createContext<PlatformCtx | undefined>(undefined);

const STORAGE_KEY = "mk-platform-ativa";

export function PlatformProvider({
  children,
  initialConectadas = [],
}: {
  children: ReactNode;
  initialConectadas?: Plataforma[];
}) {
  const [ativa, setAtivaState] = useState<Plataforma | null>(null);
  const conectadas = initialConectadas;

  // Lê preferência salva. Se não existe, pega primeira conectada como default.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "meta_ads" || saved === "google_ads") {
        if (conectadas.includes(saved as Plataforma)) {
          setAtivaState(saved as Plataforma);
          return;
        }
      }
      if (conectadas.length > 0) {
        setAtivaState(conectadas[0]);
      }
    } catch {}
  }, [conectadas]);

  const setAtiva = (p: Plataforma | null) => {
    setAtivaState(p);
    try {
      if (p) localStorage.setItem(STORAGE_KEY, p);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  return (
    <Ctx.Provider value={{ ativa, setAtiva, conectadas }}>{children}</Ctx.Provider>
  );
}

export function usePlatform() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePlatform fora de PlatformProvider");
  return ctx;
}
