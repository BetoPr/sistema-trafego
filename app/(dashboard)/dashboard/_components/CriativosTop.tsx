"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CriativoTop } from "@/lib/meta-ads/queries";

type ViewMode = "grid" | "carrossel" | "lista";
const LS_VIEW = "sonar:criativos:view:v1";
const LS_FILTRO = "sonar:criativos:campanhas:v1";

function fmtMoeda(v: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
}

function resultadoTxt(c: CriativoTop): string {
  if (c.leads > 0) return `${c.leads} leads`;
  if (c.conversoes > 0) return `${c.conversoes} conv`;
  if (c.impressoes > 0) return `${c.impressoes.toLocaleString("pt-BR")} imp`;
  return "—";
}

export function CriativosTop({ itens }: { itens: CriativoTop[] }) {
  const [view, setView] = useState<ViewMode>("grid");
  const [transicao, setTransicao] = useState(false);
  const [erroImg, setErroImg] = useState<Set<string>>(new Set());
  const [filtroAberto, setFiltroAberto] = useState(false);
  const [campanhasSelecionadas, setCampanhasSelecionadas] = useState<Set<string> | null>(null);
  const carRef = useRef<HTMLDivElement>(null);
  const filtroWrapRef = useRef<HTMLDivElement>(null);

  // Carrega prefs
  useEffect(() => {
    try {
      const v = localStorage.getItem(LS_VIEW) as ViewMode | null;
      if (v === "grid" || v === "carrossel" || v === "lista") setView(v);
      const f = localStorage.getItem(LS_FILTRO);
      if (f) setCampanhasSelecionadas(new Set(JSON.parse(f) as string[]));
    } catch {}
  }, []);

  // Fecha filtro clicando fora
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!filtroWrapRef.current?.contains(e.target as Node)) setFiltroAberto(false);
    }
    if (filtroAberto) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [filtroAberto]);

  function trocarView(v: ViewMode) {
    setTransicao(true);
    setTimeout(() => {
      setView(v);
      try { localStorage.setItem(LS_VIEW, v); } catch {}
      requestAnimationFrame(() => setTransicao(false));
    }, 180);
  }

  function scrollCar(dir: -1 | 1) {
    if (!carRef.current) return;
    const w = carRef.current.clientWidth;
    carRef.current.scrollBy({ left: dir * (w * 0.8), behavior: "smooth" });
  }

  function marcarErro(id: string) {
    setErroImg((s) => { const n = new Set(s); n.add(id); return n; });
  }

  // Lista unica de campanhas (id+nome)
  const campanhasOpcoes = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of itens) m.set(c.campanha_id, c.campanha_nome);
    return Array.from(m.entries()).map(([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [itens]);

  function toggleCamp(id: string) {
    setCampanhasSelecionadas((prev) => {
      const base = prev ?? new Set(campanhasOpcoes.map((c) => c.id)); // null = todas
      const n = new Set(base);
      if (n.has(id)) n.delete(id); else n.add(id);
      try { localStorage.setItem(LS_FILTRO, JSON.stringify(Array.from(n))); } catch {}
      return n;
    });
  }

  function todasMarcadas() {
    if (!campanhasSelecionadas) return true;
    return campanhasOpcoes.every((c) => campanhasSelecionadas.has(c.id));
  }

  function toggleTodas() {
    if (todasMarcadas()) {
      const vazio = new Set<string>();
      setCampanhasSelecionadas(vazio);
      try { localStorage.setItem(LS_FILTRO, JSON.stringify([])); } catch {}
    } else {
      setCampanhasSelecionadas(null);
      try { localStorage.removeItem(LS_FILTRO); } catch {}
    }
  }

  const itensFiltrados = useMemo(() => {
    if (!campanhasSelecionadas) return itens;
    return itens.filter((c) => campanhasSelecionadas.has(c.campanha_id));
  }, [itens, campanhasSelecionadas]);

  const filtroAtivo = campanhasSelecionadas !== null && !todasMarcadas();

  return (
    <div className="mk-card mk-card-lg" style={{ marginTop: 14 }}>
      <style>{`
        @keyframes criativos-fade-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        .criativos-content { animation: criativos-fade-in .35s cubic-bezier(.2,.8,.2,1); }
        .criativos-carrossel::-webkit-scrollbar { height: 6px; }
        .criativos-carrossel::-webkit-scrollbar-thumb { background: var(--mk-border); border-radius: 3px; }
        .criativos-carrossel { scroll-snap-type: x mandatory; }
        .criativos-card-carr { scroll-snap-align: start; transition: transform .25s cubic-bezier(.2,.8,.2,1); }
        .criativos-card-carr:hover { transform: translateY(-4px); }
        .criativos-row { transition: background .2s; }
        .criativos-row:hover { background: var(--mk-surface-2); }

        /* Checkbox custom verde */
        .sn-check {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          border: 2px solid #00E19A;
          border-radius: 5px;
          background: transparent;
          cursor: pointer;
          transition: background .15s, transform .15s;
          flex: none;
        }
        .sn-check:hover { background: rgba(0,225,154,.10); }
        .sn-check input { position: absolute; opacity: 0; pointer-events: none; }
        .sn-check svg {
          width: 22px;
          height: 22px;
          opacity: 0;
          transform: scale(.4) rotate(-12deg);
          transition: opacity .18s, transform .25s cubic-bezier(.2,1.6,.4,1);
          pointer-events: none;
        }
        .sn-check.on { background: transparent; }
        .sn-check.on svg { opacity: 1; transform: scale(1) rotate(0); }
      `}</style>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <i className="ti ti-photo" style={{ fontSize: 16, color: "var(--mk-accent-2)" }} />
        <h3 className="card-title" style={{ margin: 0 }}>Top Criativos</h3>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 10.5, color: "var(--mk-text-muted)" }}>por gasto</span>
          <ViewToggle atual={view} onTrocar={trocarView} />
          <div ref={filtroWrapRef} style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => setFiltroAberto((a) => !a)}
              aria-label="Filtrar por campanha"
              aria-expanded={filtroAberto}
              title="Filtrar por campanha"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 30,
                height: 26,
                background: filtroAtivo ? "rgba(0,225,154,.14)" : "var(--mk-surface-2)",
                border: `.5px solid ${filtroAtivo ? "#00E19A" : "var(--mk-border)"}`,
                borderRadius: 7,
                color: filtroAtivo ? "#00E19A" : "var(--mk-text-muted)",
                cursor: "pointer",
                transition: "background .2s, color .2s, border-color .2s",
                position: "relative",
              }}
            >
              <i className="ti ti-filter" style={{ fontSize: 13 }} />
              {filtroAtivo && (
                <span style={{ position: "absolute", top: -3, right: -3, width: 8, height: 8, borderRadius: "50%", background: "#00E19A" }} />
              )}
            </button>
            {filtroAberto && (
              <div
                role="dialog"
                aria-label="Filtro de campanhas"
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  right: 0,
                  width: 300,
                  maxHeight: 380,
                  overflowY: "auto",
                  background: "var(--mk-bg)",
                  border: ".5px solid var(--mk-border)",
                  borderRadius: 10,
                  boxShadow: "0 14px 40px rgba(0,0,0,.5)",
                  zIndex: 30,
                  padding: 10,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".4px", color: "var(--mk-text-muted)" }}>CAMPANHAS</span>
                  <button
                    type="button"
                    onClick={toggleTodas}
                    style={{ fontSize: 10.5, padding: "3px 7px", borderRadius: 5, background: "transparent", border: ".5px solid var(--mk-border)", color: "var(--mk-text-secondary)", cursor: "pointer" }}
                  >
                    {todasMarcadas() ? "Desmarcar tudo" : "Marcar tudo"}
                  </button>
                </div>
                {campanhasOpcoes.length === 0 ? (
                  <div style={{ fontSize: 11.5, color: "var(--mk-text-muted)", padding: 8 }}>Sem campanhas.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {campanhasOpcoes.map((c) => {
                      const on = campanhasSelecionadas ? campanhasSelecionadas.has(c.id) : true;
                      return (
                        <label
                          key={c.id}
                          style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 6px", borderRadius: 6, cursor: "pointer", fontSize: 12 }}
                          onClick={(e) => { e.preventDefault(); toggleCamp(c.id); }}
                        >
                          <span className={`sn-check ${on ? "on" : ""}`} aria-checked={on} role="checkbox" tabIndex={0}>
                            <input type="checkbox" checked={on} readOnly />
                            <svg viewBox="0 0 24 24" fill="none" stroke="#00E19A" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="4 13 10 19 20 6" />
                            </svg>
                          </span>
                          <span style={{ flex: 1, color: "var(--mk-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={c.nome}>
                            {c.nome}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {itensFiltrados.length === 0 ? (
        <div style={{ padding: 24, textAlign: "center", color: "var(--mk-text-muted)", fontSize: 12.5 }}>
          {itens.length === 0 ? "Sem anúncios com gasto no período." : "Nenhuma campanha selecionada no filtro."}
        </div>
      ) : (
        <div style={{ opacity: transicao ? 0 : 1, transition: "opacity .18s ease" }}>
          <div key={view} className="criativos-content">
            {view === "grid" && <Grid itens={itensFiltrados} erroImg={erroImg} onErro={marcarErro} />}
            {view === "carrossel" && <Carrossel itens={itensFiltrados} refEl={carRef} onScroll={scrollCar} erroImg={erroImg} onErro={marcarErro} />}
            {view === "lista" && <Lista itens={itensFiltrados} erroImg={erroImg} onErro={marcarErro} />}
          </div>
        </div>
      )}
    </div>
  );
}

function ViewToggle({ atual, onTrocar }: { atual: ViewMode; onTrocar: (v: ViewMode) => void }) {
  const btns: Array<{ v: ViewMode; icon: string; label: string }> = [
    { v: "grid", icon: "ti-layout-grid", label: "Grade" },
    { v: "carrossel", icon: "ti-arrows-left-right", label: "Carrossel" },
    { v: "lista", icon: "ti-list", label: "Lista" },
  ];
  return (
    <div role="tablist" aria-label="Modo de visualização" style={{ display: "inline-flex", background: "var(--mk-surface-2)", border: ".5px solid var(--mk-border)", borderRadius: 8, padding: 2 }}>
      {btns.map((b) => {
        const ativo = b.v === atual;
        return (
          <button
            key={b.v}
            type="button"
            role="tab"
            aria-selected={ativo}
            onClick={() => !ativo && onTrocar(b.v)}
            title={b.label}
            aria-label={b.label}
            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "4px 9px", border: 0, background: ativo ? "rgba(0,225,154,.14)" : "transparent", color: ativo ? "#00E19A" : "var(--mk-text-muted)", borderRadius: 6, cursor: ativo ? "default" : "pointer", transition: "background .2s, color .2s" }}
          >
            <i className={`ti ${b.icon}`} style={{ fontSize: 13 }} />
          </button>
        );
      })}
    </div>
  );
}

function Thumb({ c, erroImg, onErro, size }: { c: CriativoTop; erroImg: Set<string>; onErro: (id: string) => void; size: "full" | "mini" }) {
  const erro = erroImg.has(c.anuncio_id);
  const mostraImg = c.thumbnail_url && !erro;
  return (
    <>
      {mostraImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={c.thumbnail_url!}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => onErro(c.anuncio_id)}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      ) : (
        <i className="ti ti-photo-off" style={{ fontSize: size === "full" ? 28 : 16, color: "var(--mk-text-muted)" }} />
      )}
    </>
  );
}

function Card({ c, variant, erroImg, onErro }: { c: CriativoTop; variant: "grid" | "carr"; erroImg: Set<string>; onErro: (id: string) => void }) {
  const minW = variant === "carr" ? 200 : undefined;
  return (
    <div
      className={variant === "carr" ? "criativos-card-carr" : undefined}
      style={{ background: "var(--mk-surface-2)", border: ".5px solid var(--mk-border)", borderRadius: 10, overflow: "hidden", display: "flex", flexDirection: "column", minWidth: minW, width: minW ? 200 : undefined, flex: minW ? "0 0 auto" : undefined }}
    >
      <div style={{ aspectRatio: "1 / 1", background: "var(--mk-bg-deep)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        <Thumb c={c} erroImg={erroImg} onErro={onErro} size="full" />
      </div>
      <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 4 }}>
        <div title={c.nome} style={{ fontSize: 11.5, fontWeight: 600, color: "var(--mk-text)", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", minHeight: 28, lineHeight: 1.3 }}>
          {c.nome}
        </div>
        <div title={c.campanha_nome} style={{ fontSize: 10, color: "var(--mk-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          <i className="ti ti-speakerphone" style={{ fontSize: 9, marginRight: 3 }} />
          {c.campanha_nome}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 11 }}>
          <span style={{ color: "var(--mk-text)", fontWeight: 700 }}>{fmtMoeda(c.gasto)}</span>
          <span style={{ color: "var(--mk-text-muted)" }}>{resultadoTxt(c)}</span>
        </div>
      </div>
    </div>
  );
}

function Grid({ itens, erroImg, onErro }: { itens: CriativoTop[]; erroImg: Set<string>; onErro: (id: string) => void }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
      {itens.map((c) => <Card key={c.anuncio_id} c={c} variant="grid" erroImg={erroImg} onErro={onErro} />)}
    </div>
  );
}

function Carrossel({ itens, refEl, onScroll, erroImg, onErro }: { itens: CriativoTop[]; refEl: React.RefObject<HTMLDivElement | null>; onScroll: (dir: -1 | 1) => void; erroImg: Set<string>; onErro: (id: string) => void }) {
  return (
    <div style={{ position: "relative" }}>
      <button type="button" onClick={() => onScroll(-1)} aria-label="Anterior" style={btnSeta("esq")}>
        <i className="ti ti-chevron-left" style={{ fontSize: 18 }} />
      </button>
      <button type="button" onClick={() => onScroll(1)} aria-label="Proximo" style={btnSeta("dir")}>
        <i className="ti ti-chevron-right" style={{ fontSize: 18 }} />
      </button>
      <div ref={refEl} className="criativos-carrossel" style={{ display: "flex", gap: 12, overflowX: "auto", overflowY: "hidden", paddingBottom: 8, scrollBehavior: "smooth" }}>
        {itens.map((c) => <Card key={c.anuncio_id} c={c} variant="carr" erroImg={erroImg} onErro={onErro} />)}
      </div>
    </div>
  );
}

function btnSeta(lado: "esq" | "dir"): React.CSSProperties {
  return {
    position: "absolute",
    top: "50%",
    [lado === "esq" ? "left" : "right"]: -4,
    transform: "translateY(-50%)",
    zIndex: 5,
    width: 32,
    height: 32,
    borderRadius: "50%",
    background: "rgba(12,13,12,.85)",
    border: ".5px solid var(--mk-border)",
    color: "var(--mk-text)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backdropFilter: "blur(6px)",
    transition: "background .2s, transform .2s",
  };
}

function Lista({ itens, erroImg, onErro }: { itens: CriativoTop[]; erroImg: Set<string>; onErro: (id: string) => void }) {
  const cols = "56px 1.5fr 70px 80px 90px 90px 80px 70px 60px 65px 1.2fr";
  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ minWidth: 1100, display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{ display: "grid", gridTemplateColumns: cols, gap: 10, padding: "8px 10px", fontSize: 9.5, fontWeight: 700, letterSpacing: ".4px", color: "var(--mk-text-muted)", borderBottom: ".5px solid var(--mk-border)" }}>
          <span />
          <span>ANÚNCIO</span>
          <span style={{ textAlign: "right" }}>RESULT.</span>
          <span style={{ textAlign: "right" }}>CUSTO/R.</span>
          <span style={{ textAlign: "right" }}>VALOR USADO</span>
          <span style={{ textAlign: "right" }}>IMPRESSÕES</span>
          <span style={{ textAlign: "right" }}>ALCANCE</span>
          <span style={{ textAlign: "right" }}>CPM</span>
          <span style={{ textAlign: "right" }}>CTR</span>
          <span style={{ textAlign: "right" }}>ROAS</span>
          <span>CAMPANHA</span>
        </div>
        {itens.map((c) => {
          const resultados = c.leads || c.conversoes || 0;
          const custoPorResult = resultados > 0 ? c.gasto / resultados : null;
          const cpm = c.impressoes > 0 ? (c.gasto * 1000) / c.impressoes : null;
          const ctr = c.impressoes > 0 ? c.cliques / c.impressoes : null;
          const roas = c.gasto > 0 && c.receita > 0 ? c.receita / c.gasto : null;
          const alcance = c.alcance;
          return (
            <div key={c.anuncio_id} className="criativos-row" style={{ display: "grid", gridTemplateColumns: cols, gap: 10, padding: "8px 10px", alignItems: "center", borderRadius: 6, fontSize: 12 }}>
              <div style={{ width: 48, height: 48, borderRadius: 6, background: "var(--mk-bg-deep)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Thumb c={c} erroImg={erroImg} onErro={onErro} size="mini" />
              </div>
              <div title={c.nome} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--mk-text)", fontWeight: 600 }}>{c.nome}</div>
              <div style={{ textAlign: "right" }}>{resultados > 0 ? new Intl.NumberFormat("pt-BR").format(resultados) : "—"}</div>
              <div style={{ textAlign: "right" }}>{custoPorResult != null ? fmtMoeda(custoPorResult) : "—"}</div>
              <div style={{ textAlign: "right", fontWeight: 700, color: "var(--mk-text)" }}>{fmtMoeda(c.gasto)}</div>
              <div style={{ textAlign: "right" }}>{c.impressoes > 0 ? new Intl.NumberFormat("pt-BR").format(c.impressoes) : "—"}</div>
              <div style={{ textAlign: "right" }}>{alcance > 0 ? new Intl.NumberFormat("pt-BR").format(alcance) : "—"}</div>
              <div style={{ textAlign: "right" }}>{cpm != null ? fmtMoeda(cpm) : "—"}</div>
              <div style={{ textAlign: "right" }}>{ctr != null ? new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 2 }).format(ctr) : "—"}</div>
              <div style={{ textAlign: "right", color: roas != null && roas >= 1 ? "#00E19A" : "var(--mk-text-muted)" }}>{roas != null ? `${roas.toFixed(2)}x` : "—"}</div>
              <div title={c.campanha_nome} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--mk-text-muted)", fontSize: 11 }}>
                <i className="ti ti-speakerphone" style={{ fontSize: 10, marginRight: 4 }} />
                {c.campanha_nome}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
