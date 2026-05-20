"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface CollapseCtx {
  collapsed: boolean;
  toggle: () => void;
}

const Ctx = createContext<CollapseCtx | undefined>(undefined);

export function CollapseProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("mk-collapsed") : null;
    if (saved === "1") setCollapsed(true);
  }, []);

  const toggle = () => {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem("mk-collapsed", next ? "1" : "0");
      } catch {}
      return next;
    });
  };

  return <Ctx.Provider value={{ collapsed, toggle }}>{children}</Ctx.Provider>;
}

export function useCollapse() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCollapse fora de CollapseProvider");
  return ctx;
}
