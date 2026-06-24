"use client";

/**
 * FiltroAtivo: filtro global cross-aba. Persiste via URL params + localStorage.
 * Paginas que consomem: Dashboard, Campanhas, Pixel & Vendas, Analise IAs.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export type FiltroTipo = "pasta" | "etiqueta" | "campanha" | null;

export interface FiltroAtivo {
  tipo: FiltroTipo;
  id: string | null;
  nome: string | null;
}

interface Ctx {
  filtro: FiltroAtivo;
  setFiltro: (tipo: FiltroTipo, id: string | null, nome: string | null) => void;
  limpar: () => void;
}

const FiltroAtivoCtx = createContext<Ctx | null>(null);

const LS_KEY = "sonar:filtro-ativo:v1";

export function FiltroAtivoProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  // Inicializa do URL ou localStorage (URL prevalece).
  const [filtro, setFiltroState] = useState<FiltroAtivo>(() => {
    if (typeof window === "undefined") return { tipo: null, id: null, nome: null };
    const fromUrl = lerDoUrl(sp);
    if (fromUrl.tipo) return fromUrl;
    try {
      const raw = window.localStorage.getItem(LS_KEY);
      if (raw) return JSON.parse(raw) as FiltroAtivo;
    } catch {}
    return { tipo: null, id: null, nome: null };
  });

  // Sincroniza com URL quando navega entre paginas — mantem filtro.
  useEffect(() => {
    const fromUrl = lerDoUrl(sp);
    // Se URL nao tem mas estado tem, propaga estado pra URL.
    if (!fromUrl.tipo && filtro.tipo) {
      escreverNoUrl(router, pathname, sp, filtro);
    }
    // Se URL tem e bate com estado, OK.
    // Se URL tem e diverge (deep link), atualiza estado.
    if (fromUrl.tipo && (fromUrl.id !== filtro.id || fromUrl.tipo !== filtro.tipo)) {
      setFiltroState(fromUrl);
      persistirLs(fromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const setFiltro = useCallback((tipo: FiltroTipo, id: string | null, nome: string | null) => {
    const novo: FiltroAtivo = { tipo, id, nome };
    setFiltroState(novo);
    persistirLs(novo);
    escreverNoUrl(router, pathname, sp, novo);
  }, [router, pathname, sp]);

  const limpar = useCallback(() => setFiltro(null, null, null), [setFiltro]);

  const value = useMemo(() => ({ filtro, setFiltro, limpar }), [filtro, setFiltro, limpar]);

  return <FiltroAtivoCtx.Provider value={value}>{children}</FiltroAtivoCtx.Provider>;
}

export function useFiltroAtivo(): Ctx {
  const c = useContext(FiltroAtivoCtx);
  if (!c) throw new Error("useFiltroAtivo deve estar dentro de FiltroAtivoProvider");
  return c;
}

function lerDoUrl(sp: URLSearchParams | null): FiltroAtivo {
  if (!sp) return { tipo: null, id: null, nome: null };
  for (const t of ["pasta", "etiqueta", "campanha"] as const) {
    const id = sp.get(t);
    if (id) {
      const nome = sp.get(`${t}_nome`);
      return { tipo: t, id, nome: nome ? decodeURIComponent(nome) : null };
    }
  }
  return { tipo: null, id: null, nome: null };
}

function persistirLs(f: FiltroAtivo) {
  try { window.localStorage.setItem(LS_KEY, JSON.stringify(f)); } catch {}
}

function escreverNoUrl(
  router: ReturnType<typeof useRouter>,
  pathname: string,
  sp: URLSearchParams | null,
  f: FiltroAtivo,
) {
  const params = new URLSearchParams(sp ? sp.toString() : "");
  // limpa todas as chaves de filtro
  for (const t of ["pasta", "etiqueta", "campanha"]) {
    params.delete(t);
    params.delete(`${t}_nome`);
  }
  if (f.tipo && f.id) {
    params.set(f.tipo, f.id);
    if (f.nome) params.set(`${f.tipo}_nome`, encodeURIComponent(f.nome));
  }
  const qs = params.toString();
  router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
}
