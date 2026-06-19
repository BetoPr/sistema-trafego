"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";

/**
 * D — Abas flutuantes (ON/OFF).
 * Launcher redondo arrastável (snap nos 4 cantos no mobile) que abre um painel
 * flutuante com abas. Cada aba embute a PÁGINA REAL (iframe) → CRUD completo de
 * graça. O chrome (sidebar/topbar) some dentro do iframe via classe `embed-mode`
 * (ver _crm-overlays + globals.css). Renderizado por portal no body.
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
];

const LW = 56; // launcher
const PW = 380; // painel
function panelH() {
  return Math.min(560, Math.round((typeof window !== "undefined" ? window.innerHeight : 700) * 0.8));
}
function isMobile() {
  return typeof window !== "undefined" && window.innerWidth < 640;
}
function clamp(x: number, y: number, w: number, h: number) {
  const m = 8;
  return {
    x: Math.max(m, Math.min(window.innerWidth - w - m, x)),
    y: Math.max(m, Math.min(window.innerHeight - h - m, y)),
  };
}

export function FloatingTabs() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [aberto, setAberto] = useState(false);
  const [abaId, setAbaId] = useState("mr");
  const [visitadas, setVisitadas] = useState<Set<string>>(() => new Set(["mr"]));
  const [ticks, setTicks] = useState<Record<string, number>>({});
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const drag = useRef<{ dx: number; dy: number; sx: number; sy: number; moved: boolean } | null>(null);

  useEffect(() => {
    setMounted(true);
    // Sobe ~76px pra não cair em cima do widget de Follow-up (#6), que abre no mesmo canto.
    setPos({ x: window.innerWidth - LW - 18, y: window.innerHeight - LW - 18 - 76 });
  }, []);

  // Ponte "inserir atalho no chat": o iframe (Mensagens Rápidas) posta o texto;
  // repassamos como evento que o ChatView escuta pra jogar na barra de digitação.
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

  const W = aberto ? PW : LW;
  const H = aberto ? panelH() : LW;

  useEffect(() => {
    function move(e: PointerEvent) {
      if (!drag.current) return;
      if (Math.abs(e.clientX - drag.current.sx) > 4 || Math.abs(e.clientY - drag.current.sy) > 4) drag.current.moved = true;
      const c = clamp(e.clientX - drag.current.dx, e.clientY - drag.current.dy, W, H);
      setPos(c);
    }
    function up() {
      if (!drag.current) return;
      const wasMoved = drag.current.moved;
      drag.current = null;
      document.body.style.userSelect = "";
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
  };

  function abrir() {
    setPos((p) => (p ? clamp(p.x, p.y, PW, panelH()) : p));
    setAberto(true);
  }
  function fechar() {
    setPos((p) => (p ? clamp(p.x, p.y, LW, LW) : p));
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
      style={{ ...base, width: LW, height: LW, borderRadius: "50%", border: "1px solid var(--mk-accent)", background: "var(--mk-bg)", boxShadow: "0 10px 30px rgba(0,0,0,0.45)", cursor: "grab", display: "flex", alignItems: "center", justifyContent: "center", color: "#9B7DBF" }}
    >
      <i className="ti ti-layout-grid-add" style={{ fontSize: 22 }} />
    </button>
  ) : (
    <div style={{ ...base, width: PW, maxWidth: "92vw", height: panelH(), background: "var(--mk-bg)", border: "1px solid var(--mk-accent)", borderRadius: 12, boxShadow: "0 16px 50px rgba(0,0,0,0.5)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Barra de arraste */}
      <div onPointerDown={onDown} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 10px", background: "rgba(155,125,191,0.18)", cursor: "grab", borderBottom: "0.5px solid var(--mk-border)" }}>
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
                color: on ? "#9B7DBF" : "var(--mk-text-muted)",
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
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0, display: a.id === abaId ? "block" : "none", background: "var(--mk-bg)" }}
          />
        ))}
      </div>
    </div>
  );

  return createPortal(node, document.body);
}

const iconBtn: React.CSSProperties = { background: "transparent", border: 0, color: "var(--mk-text-muted)", cursor: "pointer", fontSize: 13, padding: 2, display: "inline-flex", alignItems: "center" };
