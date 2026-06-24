"use client";

import { useEffect, useRef, useState } from "react";
import type { CriativoTop } from "@/lib/meta-ads/queries";

type ViewMode = "grid" | "carrossel" | "lista";
const LS_KEY = "sonar:criativos:view:v1";

function fmtMoeda(v: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
}

export function CriativosTop({ itens }: { itens: CriativoTop[] }) {
  const [view, setView] = useState<ViewMode>("grid");
  const [transicao, setTransicao] = useState(false);
  const carRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const v = localStorage.getItem(LS_KEY) as ViewMode | null;
      if (v === "grid" || v === "carrossel" || v === "lista") setView(v);
    } catch {}
  }, []);

  function trocar(v: ViewMode) {
    setTransicao(true);
    setTimeout(() => {
      setView(v);
      try { localStorage.setItem(LS_KEY, v); } catch {}
      requestAnimationFrame(() => setTransicao(false));
    }, 180);
  }

  function scrollCar(dir: -1 | 1) {
    if (!carRef.current) return;
    const w = carRef.current.clientWidth;
    carRef.current.scrollBy({ left: dir * (w * 0.8), behavior: "smooth" });
  }

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
      `}</style>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <i className="ti ti-photo" style={{ fontSize: 16, color: "var(--mk-accent-2)" }} />
        <h3 className="card-title" style={{ margin: 0 }}>Top Criativos</h3>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 10.5, color: "var(--mk-text-muted)" }}>por gasto</span>
          <ViewToggle atual={view} onTrocar={trocar} />
        </div>
      </div>

      {itens.length === 0 ? (
        <div style={{ padding: 24, textAlign: "center", color: "var(--mk-text-muted)", fontSize: 12.5 }}>
          Sem anúncios com gasto no período.
        </div>
      ) : (
        <div style={{ opacity: transicao ? 0 : 1, transition: "opacity .18s ease" }}>
          <div key={view} className="criativos-content">
            {view === "grid" && <Grid itens={itens} />}
            {view === "carrossel" && <Carrossel itens={itens} refEl={carRef} onScroll={scrollCar} />}
            {view === "lista" && <Lista itens={itens} />}
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
    <div
      role="tablist"
      aria-label="Modo de visualização"
      style={{
        display: "inline-flex",
        background: "var(--mk-surface-2)",
        border: ".5px solid var(--mk-border)",
        borderRadius: 8,
        padding: 2,
      }}
    >
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
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "4px 9px",
              border: 0,
              background: ativo ? "rgba(0,225,154,.14)" : "transparent",
              color: ativo ? "#00E19A" : "var(--mk-text-muted)",
              borderRadius: 6,
              cursor: ativo ? "default" : "pointer",
              transition: "background .2s, color .2s",
            }}
          >
            <i className={`ti ${b.icon}`} style={{ fontSize: 13 }} />
          </button>
        );
      })}
    </div>
  );
}

function Card({ c, variant }: { c: CriativoTop; variant: "grid" | "carr" }) {
  const minW = variant === "carr" ? 200 : undefined;
  return (
    <div
      className={variant === "carr" ? "criativos-card-carr" : undefined}
      style={{
        background: "var(--mk-surface-2)",
        border: ".5px solid var(--mk-border)",
        borderRadius: 10,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        minWidth: minW,
        width: minW ? 200 : undefined,
        flex: minW ? "0 0 auto" : undefined,
      }}
    >
      <div
        style={{
          aspectRatio: "1 / 1",
          background: "var(--mk-bg-deep)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {c.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.thumbnail_url} alt={c.nome} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        ) : (
          <i className="ti ti-photo-off" style={{ fontSize: 28, color: "var(--mk-text-muted)" }} />
        )}
      </div>
      <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 4 }}>
        <div
          title={c.nome}
          style={{
            fontSize: 11.5,
            fontWeight: 600,
            color: "var(--mk-text)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            minHeight: 28,
            lineHeight: 1.3,
          }}
        >
          {c.nome}
        </div>
        <div title={c.campanha_nome} style={{ fontSize: 10, color: "var(--mk-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          <i className="ti ti-speakerphone" style={{ fontSize: 9, marginRight: 3 }} />
          {c.campanha_nome}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 11 }}>
          <span style={{ color: "var(--mk-text)", fontWeight: 700 }}>{fmtMoeda(c.gasto)}</span>
          <span style={{ color: "var(--mk-text-muted)" }}>
            {c.leads > 0 ? `${c.leads} leads` : c.conversoes > 0 ? `${c.conversoes} conv` : "—"}
          </span>
        </div>
      </div>
    </div>
  );
}

function Grid({ itens }: { itens: CriativoTop[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
      {itens.map((c) => <Card key={c.anuncio_id} c={c} variant="grid" />)}
    </div>
  );
}

function Carrossel({ itens, refEl, onScroll }: { itens: CriativoTop[]; refEl: React.RefObject<HTMLDivElement | null>; onScroll: (dir: -1 | 1) => void }) {
  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => onScroll(-1)}
        aria-label="Anterior"
        style={btnSeta("esq")}
      >
        <i className="ti ti-chevron-left" style={{ fontSize: 18 }} />
      </button>
      <button
        type="button"
        onClick={() => onScroll(1)}
        aria-label="Proximo"
        style={btnSeta("dir")}
      >
        <i className="ti ti-chevron-right" style={{ fontSize: 18 }} />
      </button>
      <div
        ref={refEl}
        className="criativos-carrossel"
        style={{
          display: "flex",
          gap: 12,
          overflowX: "auto",
          overflowY: "hidden",
          paddingBottom: 8,
          scrollBehavior: "smooth",
        }}
      >
        {itens.map((c) => <Card key={c.anuncio_id} c={c} variant="carr" />)}
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

function Lista({ itens }: { itens: CriativoTop[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <div style={{ display: "grid", gridTemplateColumns: "56px 1.7fr 1.2fr 90px 80px", gap: 12, padding: "8px 10px", fontSize: 9.5, fontWeight: 700, letterSpacing: ".4px", color: "var(--mk-text-muted)", borderBottom: ".5px solid var(--mk-border)" }}>
        <span />
        <span>ANÚNCIO</span>
        <span>CAMPANHA</span>
        <span style={{ textAlign: "right" }}>GASTO</span>
        <span style={{ textAlign: "right" }}>RESULTADO</span>
      </div>
      {itens.map((c) => (
        <div
          key={c.anuncio_id}
          className="criativos-row"
          style={{ display: "grid", gridTemplateColumns: "56px 1.7fr 1.2fr 90px 80px", gap: 12, padding: "8px 10px", alignItems: "center", borderRadius: 6, fontSize: 12 }}
        >
          <div style={{ width: 48, height: 48, borderRadius: 6, background: "var(--mk-bg-deep)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {c.thumbnail_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.thumbnail_url} alt={c.nome} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <i className="ti ti-photo-off" style={{ fontSize: 16, color: "var(--mk-text-muted)" }} />
            )}
          </div>
          <div title={c.nome} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--mk-text)", fontWeight: 600 }}>
            {c.nome}
          </div>
          <div title={c.campanha_nome} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--mk-text-muted)", fontSize: 11 }}>
            <i className="ti ti-speakerphone" style={{ fontSize: 10, marginRight: 4 }} />
            {c.campanha_nome}
          </div>
          <div style={{ textAlign: "right", color: "var(--mk-text)", fontWeight: 700 }}>{fmtMoeda(c.gasto)}</div>
          <div style={{ textAlign: "right", color: "var(--mk-text-muted)", fontSize: 11 }}>
            {c.leads > 0 ? `${c.leads} leads` : c.conversoes > 0 ? `${c.conversoes} conv` : "—"}
          </div>
        </div>
      ))}
    </div>
  );
}
