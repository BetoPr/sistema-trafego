"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";

/**
 * D — Abas flutuantes (ON/OFF).
 * Launcher redondo arrastável (snap nos 4 cantos no mobile) que abre um painel
 * flutuante COM ABAS e REDIMENSIONÁVEL (arrasta as bordas/cantos). Cada aba
 * embute a PÁGINA REAL (iframe) → CRUD completo de graça. O chrome (sidebar/
 * topbar) some dentro do iframe via classe `embed-mode`. Portal no body.
 */

interface Aba {
  id: string;
  titulo: string;
  icone: string;
  rota: string;
}

const ABAS: Aba[] = [
  { id: "mr", titulo: "Mensagens Rápidas", icone: "ti-message-bolt", rota: "/mensagens-rapidas" },
  { id: "ct", titulo: "Contatos", icone: "ti-users", rota: "/contatos" },
  { id: "gr", titulo: "Grupos", icone: "ti-users-group", rota: "/grupos" },
  { id: "em", titulo: "Envio em Massa", icone: "ti-send", rota: "/envio-massa" },
];

const LW = 56;          // launcher
const PW_DEF = 460;     // largura default do painel
const PH_DEF = 620;     // altura default
const MIN_W = 300, MIN_H = 280;

function isMobile() {
  return typeof window !== "undefined" && window.innerWidth < 640;
}
function clampPos(x: number, y: number, w: number, h: number) {
  const m = 8;
  return {
    x: Math.max(m, Math.min(window.innerWidth - w - m, x)),
    y: Math.max(m, Math.min(window.innerHeight - h - m, y)),
  };
}
function clampSize(w: number, h: number) {
  return {
    w: Math.max(MIN_W, Math.min(window.innerWidth - 16, w)),
    h: Math.max(MIN_H, Math.min(window.innerHeight - 16, h)),
  };
}

// Alças de redimensionamento — só laterais e base (o topo é a barra de arraste).
const EDGE = 8, CORNER = 16;
const HANDLES: { dir: string; cursor: string; style: React.CSSProperties }[] = [
  { dir: "e", cursor: "ew-resize", style: { right: 0, top: 42, bottom: CORNER, width: EDGE } },
  { dir: "w", cursor: "ew-resize", style: { left: 0, top: 42, bottom: CORNER, width: EDGE } },
  { dir: "s", cursor: "ns-resize", style: { bottom: 0, left: CORNER, right: CORNER, height: EDGE } },
  { dir: "se", cursor: "nwse-resize", style: { right: 0, bottom: 0, width: CORNER, height: CORNER } },
  { dir: "sw", cursor: "nesw-resize", style: { left: 0, bottom: 0, width: CORNER, height: CORNER } },
];

export function FloatingTabs() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [aberto, setAberto] = useState(false);
  const [abaId, setAbaId] = useState("mr");
  const [visitadas, setVisitadas] = useState<Set<string>>(() => new Set(["mr"]));
  const [ticks, setTicks] = useState<Record<string, number>>({});
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [size, setSize] = useState({ w: PW_DEF, h: PH_DEF });
  const [interacting, setInteracting] = useState(false); // desliga ponteiro do iframe durante arraste/resize
  const drag = useRef<{ dx: number; dy: number; sx: number; sy: number; moved: boolean } | null>(null);
  const resizing = useRef<{ dir: string; sx: number; sy: number; w: number; h: number; x: number; y: number } | null>(null);

  useEffect(() => {
    setMounted(true);
    setPos({ x: window.innerWidth - LW - 18, y: window.innerHeight - LW - 18 - 76 });
    setSize(clampSize(PW_DEF, Math.min(PH_DEF, Math.round(window.innerHeight * 0.82))));
  }, []);

  // Ponte "inserir atalho no chat": o iframe (Mensagens Rápidas) posta o texto.
  useEffect(() => {
    function on(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      const d = e.data as { __crm?: string; texto?: string } | null;
      if (d && d.__crm === "inserir-atalho" && typeof d.texto === "string") {
        window.dispatchEvent(new CustomEvent("crm:inserir-no-chat", { detail: { texto: d.texto } }));
      }
    }
    window.addEventListener("message", on);
    return () => window.removeEventListener("message", on);
  }, []);

  const W = aberto ? size.w : LW;
  const H = aberto ? size.h : LW;

  useEffect(() => {
    function move(e: PointerEvent) {
      // Resize
      if (resizing.current) {
        const r = resizing.current;
        const dx = e.clientX - r.sx, dy = e.clientY - r.sy;
        let w = r.w, h = r.h, x = r.x, y = r.y;
        if (r.dir.includes("e")) w = r.w + dx;
        if (r.dir.includes("w")) w = r.w - dx;
        if (r.dir.includes("s")) h = r.h + dy;
        const cs = clampSize(w, h);
        if (r.dir.includes("w")) x = r.x + (r.w - cs.w); // borda oeste: canto leste fica fixo
        x = Math.max(8, Math.min(window.innerWidth - cs.w - 8, x));
        y = Math.max(8, Math.min(window.innerHeight - cs.h - 8, y));
        setSize(cs);
        setPos({ x, y });
        return;
      }
      // Drag
      if (!drag.current) return;
      if (Math.abs(e.clientX - drag.current.sx) > 4 || Math.abs(e.clientY - drag.current.sy) > 4) drag.current.moved = true;
      setPos(clampPos(e.clientX - drag.current.dx, e.clientY - drag.current.dy, W, H));
    }
    function up() {
      if (resizing.current) {
        resizing.current = null;
        document.body.style.userSelect = "";
        setInteracting(false);
        return;
      }
      if (!drag.current) return;
      const wasMoved = drag.current.moved;
      drag.current = null;
      document.body.style.userSelect = "";
      setInteracting(false);
      // Launcher (fechado) no mobile: gruda no canto mais próximo.
      if (!aberto && wasMoved && isMobile()) {
        setPos((p) => {
          if (!p) return p;
          const m = 16;
          const x = p.x + LW / 2 < window.innerWidth / 2 ? m : window.innerWidth - LW - m;
          const y = p.y + LW / 2 < window.innerHeight / 2 ? m : window.innerHeight - LW - m;
          return { x, y };
        });
      }
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [W, H, aberto]);

  if (!mounted || !pos || pathname !== "/atendimentos") return null;

  const onDown = (e: React.PointerEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    drag.current = { dx: e.clientX - r.left, dy: e.clientY - r.top, sx: e.clientX, sy: e.clientY, moved: false };
    document.body.style.userSelect = "none";
    setInteracting(true);
  };
  const onResizeDown = (e: React.PointerEvent, dir: string) => {
    e.stopPropagation();
    e.preventDefault();
    resizing.current = { dir, sx: e.clientX, sy: e.clientY, w: size.w, h: size.h, x: pos.x, y: pos.y };
    document.body.style.userSelect = "none";
    setInteracting(true);
  };

  function abrir() {
    setPos((p) => (p ? clampPos(p.x, p.y, size.w, size.h) : p));
    setAberto(true);
  }
  function fechar() {
    setPos((p) => (p ? clampPos(p.x, p.y, LW, LW) : p));
    setAberto(false);
  }
  function trocar(id: string) {
    setAbaId(id);
    setVisitadas((s) => (s.has(id) ? s : new Set(s).add(id)));
  }
  function recarregar() {
    setTicks((t) => ({ ...t, [abaId]: (t[abaId] || 0) + 1 }));
  }

  const base: React.CSSProperties = { position: "fixed", left: pos.x, top: pos.y, zIndex: 4000 };

  const node = !aberto ? (
    <button
      onPointerDown={onDown}
      onPointerUp={() => { if (drag.current && !drag.current.moved) abrir(); }}
      title="Abas flutuantes"
      style={{ ...base, width: LW, height: LW, borderRadius: "50%", border: "1px solid var(--mk-accent)", background: "var(--mk-bg)", boxShadow: "0 10px 30px rgba(0,0,0,0.45)", cursor: "grab", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--mk-accent-2)" }}
    >
      <i className="ti ti-layout-grid-add" style={{ fontSize: 22 }} />
    </button>
  ) : (
    <div style={{ ...base, width: size.w, height: size.h, background: "var(--mk-bg)", border: "1px solid var(--mk-accent)", borderRadius: 12, boxShadow: "0 16px 50px rgba(0,0,0,0.5)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Barra de arraste */}
      <div onPointerDown={onDown} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 10px", background: "rgba(0,225,154,0.14)", cursor: "grab", borderBottom: "0.5px solid var(--mk-border)" }}>
        <i className="ti ti-grip-vertical" style={{ color: "var(--mk-text-muted)" }} />
        <strong style={{ fontSize: 11.5, flex: 1, color: "var(--mk-text)" }}>Abas flutuantes</strong>
        <button onClick={recarregar} title="Recarregar aba" style={iconBtn}><i className="ti ti-refresh" /></button>
        <button onClick={fechar} title="Minimizar (vira botão)" style={iconBtn}><i className="ti ti-minus" /></button>
        <button onClick={fechar} title="Fechar" style={iconBtn}><i className="ti ti-x" /></button>
      </div>
      {/* Abas */}
      <div style={{ display: "flex", gap: 2, padding: "6px 6px 0", borderBottom: "0.5px solid var(--mk-border)" }}>
        {ABAS.map((a) => {
          const on = a.id === abaId;
          return (
            <button
              key={a.id}
              onClick={() => trocar(a.id)}
              title={a.titulo}
              style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                padding: "7px 6px", fontSize: 11, fontWeight: on ? 600 : 500,
                background: on ? "var(--mk-bg)" : "transparent",
                color: on ? "var(--mk-accent-2)" : "var(--mk-text-muted)",
                border: "0.5px solid", borderColor: on ? "var(--mk-border)" : "transparent",
                borderBottom: on ? "2px solid #9B7DBF" : "0.5px solid transparent",
                borderRadius: "8px 8px 0 0", cursor: "pointer",
              }}
            >
              <i className={`ti ${a.icone}`} style={{ fontSize: 14 }} />
              <span className="ft-tab-label">{a.titulo.split(" ")[0]}</span>
            </button>
          );
        })}
      </div>
      {/* Conteúdo (iframe da página real) */}
      <div style={{ position: "relative", flex: 1, minHeight: 0, background: "var(--mk-bg)" }}>
        {ABAS.filter((a) => visitadas.has(a.id)).map((a) => (
          <iframe
            key={`${a.id}-${ticks[a.id] || 0}`}
            src={a.rota}
            title={a.titulo}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0, display: a.id === abaId ? "block" : "none", background: "var(--mk-bg)", pointerEvents: interacting ? "none" : "auto" }}
          />
        ))}
      </div>

      {/* Alças de redimensionamento */}
      {HANDLES.map((hd) => (
        <div
          key={hd.dir}
          onPointerDown={(e) => onResizeDown(e, hd.dir)}
          style={{ position: "absolute", ...hd.style, cursor: hd.cursor, zIndex: 6, touchAction: "none" }}
        />
      ))}
    </div>
  );

  return createPortal(node, document.body);
}

const iconBtn: React.CSSProperties = { background: "transparent", border: 0, color: "var(--mk-text-muted)", cursor: "pointer", fontSize: 13, padding: 2, display: "inline-flex", alignItems: "center" };
