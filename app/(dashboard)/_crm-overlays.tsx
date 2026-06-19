"use client";

import { createContext, useContext, useRef, useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ===== Tipos compartilhados do Follow-up com IA =====
export interface Cand {
  ticketId: string;
  contatoId: string;
  numero: number;
  nome: string;
  whatsapp: string | null;
  ultima_mensagem_em: string | null;
  followups_enviados: number;
  enviar: boolean;
  motivo: string;
  resumo: string;
  mensagem: string;
  tom: string;
  fecharAoDescartar: boolean;
  _sent?: boolean;
  _busy?: boolean;
  _pendente?: boolean;
  _analisado?: boolean;
}

interface FollowUpRunCtx {
  cands: Cand[] | null;
  setCands: (c: Cand[] | null) => void;
  analisando: { feitos: number; total: number } | null;
  enviandoTodos: boolean;
  patch: (id: string, p: Partial<Cand>) => void;
  remover: (id: string) => void;
  analisarUm: (id: string, tom?: string) => Promise<void>;
  analisarTodas: (porMinuto: number) => Promise<void>;
  enviar: (c: Cand) => Promise<boolean>;
  enviarTodos: (delayMin: number, delayMax: number) => Promise<void>;
  descartar: (c: Cand) => Promise<void>;
  pararAnalise: () => void;
}

const Ctx = createContext<FollowUpRunCtx | null>(null);
export function useFollowUpRun(): FollowUpRunCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useFollowUpRun fora do provider");
  return c;
}

/** Dispara o aviso "aba X alterada" (use em qualquer página que muda dado de outra aba). */
export function avisarAbaAlterada(aba: string) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("crm:aba-alterada", { detail: { aba } }));
}

export function CrmOverlays({ children }: { children: React.ReactNode }) {
  const [cands, setCands] = useState<Cand[] | null>(null);
  const [analisando, setAnalisando] = useState<{ feitos: number; total: number } | null>(null);
  const [enviandoTodos, setEnviandoTodos] = useState(false);
  const pararRef = useRef(false);

  const patch = useCallback((id: string, p: Partial<Cand>) => {
    setCands((cs) => (cs || []).map((c) => (c.ticketId === id ? { ...c, ...p } : c)));
  }, []);
  const remover = useCallback((id: string) => setCands((cs) => (cs || []).filter((c) => c.ticketId !== id)), []);

  const candsRef = useRef<Cand[] | null>(null);
  candsRef.current = cands;

  const analisarUm = useCallback(async (id: string, tom?: string) => {
    const c = (candsRef.current || []).find((x) => x.ticketId === id);
    patch(id, { _pendente: true });
    try {
      const r = await fetch("/api/follow-up/ia/regenerar", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ ticketId: id, tom: tom ?? c?.tom ?? "" }),
      });
      const j = await r.json();
      if (j.ok) patch(id, { enviar: j.enviar, motivo: j.motivo, resumo: j.resumo, mensagem: j.mensagem, followups_enviados: j.followups_enviados ?? c?.followups_enviados ?? 0, _pendente: false, _analisado: true });
      else patch(id, { _pendente: false, _analisado: true, enviar: false, motivo: j.error || "Falha na análise", resumo: "" });
    } catch { patch(id, { _pendente: false, _analisado: true, enviar: false, motivo: "Erro de rede" }); }
  }, [patch]);

  const analisarTodas = useCallback(async (porMinuto: number) => {
    const pend = (candsRef.current || []).filter((c) => !c._analisado && !c._pendente);
    if (!pend.length) return;
    pararRef.current = false;
    const gap = Math.max(700, Math.round(60000 / Math.max(1, porMinuto)));
    setAnalisando({ feitos: 0, total: pend.length });
    for (let i = 0; i < pend.length; i++) {
      if (pararRef.current) break;
      await analisarUm(pend[i].ticketId);
      setAnalisando({ feitos: i + 1, total: pend.length });
      if (i < pend.length - 1) await sleep(gap);
    }
    setAnalisando(null);
  }, [analisarUm]);

  const pararAnalise = useCallback(() => { pararRef.current = true; setAnalisando(null); }, []);

  const enviar = useCallback(async (c: Cand): Promise<boolean> => {
    patch(c.ticketId, { _busy: true });
    try {
      const r = await fetch("/api/follow-up/ia/enviar", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ticketId: c.ticketId, mensagem: c.mensagem }) });
      const j = await r.json();
      if (!j.ok) { patch(c.ticketId, { _busy: false }); return false; }
      // Auto-etiqueta "Em follow-up" (find-or-create por nome — não duplica).
      try {
        await fetch(`/api/contatos/${c.contatoId}/etiquetas`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ nome: "Em follow-up", cor: "#f59e0b" }) });
      } catch {}
      patch(c.ticketId, { _sent: true, _busy: false, followups_enviados: c.followups_enviados + 1 });
      return true;
    } catch { patch(c.ticketId, { _busy: false }); return false; }
  }, [patch]);

  const enviarTodos = useCallback(async (delayMin: number, delayMax: number) => {
    const fila = (candsRef.current || []).filter((c) => c.enviar && !c._sent && c.mensagem.trim());
    if (!fila.length) return;
    setEnviandoTodos(true);
    const dmin = Math.max(0, delayMin), dmax = Math.max(dmin, delayMax);
    for (let i = 0; i < fila.length; i++) {
      await enviar(fila[i]);
      if (i < fila.length - 1) await sleep((dmin + Math.random() * (dmax - dmin)) * 1000);
    }
    setEnviandoTodos(false);
  }, [enviar]);

  const descartar = useCallback(async (c: Cand) => {
    patch(c.ticketId, { _busy: true });
    try {
      const r = await fetch("/api/follow-up/ia/descartar", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ticketId: c.ticketId, fechar: c.fecharAoDescartar }) });
      const j = await r.json();
      if (j.ok) remover(c.ticketId); else patch(c.ticketId, { _busy: false });
    } catch { patch(c.ticketId, { _busy: false }); }
  }, [patch, remover]);

  const ctx: FollowUpRunCtx = { cands, setCands, analisando, enviandoTodos, patch, remover, analisarUm, analisarTodas, enviar, enviarTodos, descartar, pararAnalise };

  return (
    <Ctx.Provider value={ctx}>
      {children}
      <FollowUpWidget />
      <AvisosAbaAlterada />
    </Ctx.Provider>
  );
}

// ===== #6 — Widget flutuante: botão launcher (liga/desliga) + painel arrastável =====
// Renderizado via PORTAL no document.body — assim position:fixed é relativo à
// viewport mesmo dentro de pais com transform (corrige o "chiclete" no scroll).
function FollowUpWidget() {
  const { cands, analisando, pararAnalise } = useFollowUpRun();
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [aberto, setAberto] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const drag = useRef<{ dx: number; dy: number; sx: number; sy: number; moved: boolean } | null>(null);
  useEffect(() => setMounted(true), []);

  const naFollowUp = pathname === "/follow-up";
  const total = cands?.length || 0;
  const valem = (cands || []).filter((c) => c.enviar && !c._sent).length;
  const visivel = !naFollowUp && (!!analisando || total > 0);
  const W = aberto ? 280 : 56;
  const H = aberto ? 160 : 56;

  useEffect(() => {
    // Drag LIVRE — fica onde você soltar; só clampa pra não sair da tela (margem 8px).
    function move(e: PointerEvent) {
      if (!drag.current) return;
      if (Math.abs(e.clientX - drag.current.sx) > 4 || Math.abs(e.clientY - drag.current.sy) > 4) drag.current.moved = true;
      const m = 8;
      const x = Math.max(m, Math.min(window.innerWidth - W - m, e.clientX - drag.current.dx));
      const y = Math.max(m, Math.min(window.innerHeight - H - m, e.clientY - drag.current.dy));
      setPos({ x, y });
    }
    function up() {
      if (!drag.current) return;
      document.body.style.userSelect = "";
      drag.current = null;
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
  }, [W, H]);

  if (!mounted || !visivel) return null;

  const onDown = (e: React.PointerEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    drag.current = { dx: e.clientX - r.left, dy: e.clientY - r.top, sx: e.clientX, sy: e.clientY, moved: false };
    document.body.style.userSelect = "none";
  };
  // Colapsar/expandir mantendo a BORDA DIREITA no lugar (não "salta" ao fechar).
  const clampX = (x: number, w: number) => Math.max(8, Math.min(window.innerWidth - w - 8, x));
  const colapsar = () => { setPos((p) => (p ? { x: clampX(p.x + (280 - 56), 56), y: p.y } : p)); setAberto(false); };
  const expandir = () => { setPos((p) => (p ? { x: clampX(p.x - (280 - 56), 280), y: p.y } : p)); setAberto(true); };
  const style: React.CSSProperties = pos
    ? { position: "fixed", left: Math.max(8, Math.min(window.innerWidth - W - 8, pos.x)), top: Math.max(8, Math.min(window.innerHeight - H - 8, pos.y)), zIndex: 4000 }
    : { position: "fixed", right: 18, bottom: 18, zIndex: 4000 };

  // Launcher (fechado) — botão redondo com ícone da aba; arrastável; clique abre.
  const node = !aberto ? (
    <button
      onPointerDown={onDown}
      onPointerUp={() => { if (drag.current && !drag.current.moved) expandir(); }}
      title="Follow-up com IA"
      style={{ ...style, width: 56, height: 56, borderRadius: "50%", border: "1px solid var(--mk-accent)", background: "var(--mk-bg)", boxShadow: "0 10px 30px rgba(0,0,0,0.45)", cursor: "grab", display: "flex", alignItems: "center", justifyContent: "center", position: "fixed" }}
    >
      <i className="ti ti-sparkles" style={{ fontSize: 22, color: "#9B7DBF", animation: analisando ? "spin 1.4s linear infinite" : undefined }} />
      {(analisando || valem > 0) && (
        <span style={{ position: "absolute", top: -2, right: -2, minWidth: 16, height: 16, padding: "0 4px", borderRadius: 999, background: analisando ? "#9B7DBF" : "#10b981", color: "#fff", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {analisando ? `${analisando.feitos}` : valem}
        </span>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </button>
  ) : (
    <div style={{ ...style, width: 280, background: "var(--mk-bg)", border: "1px solid var(--mk-accent)", borderRadius: 12, boxShadow: "0 12px 40px rgba(0,0,0,0.45)", overflow: "hidden" }}>
      <div onPointerDown={onDown} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 10px", background: "rgba(155,125,191,0.18)", cursor: "grab", borderBottom: "0.5px solid var(--mk-border)" }}>
        <i className="ti ti-sparkles" style={{ color: "#9B7DBF" }} />
        <strong style={{ fontSize: 11.5, flex: 1, color: "var(--mk-text)" }}>Follow-up com IA</strong>
        <button onClick={colapsar} title="Minimizar" style={iconBtn}><i className="ti ti-minus" /></button>
        <button onClick={colapsar} title="Fechar (vira botão)" style={iconBtn}><i className="ti ti-x" /></button>
      </div>
      <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
        {analisando ? (
          <>
            <div style={{ fontSize: 11.5, color: "var(--mk-text)" }}><i className="ti ti-loader-2" style={{ animation: "spin 1s linear infinite", display: "inline-block" }} /> Analisando {analisando.feitos}/{analisando.total}…</div>
            <div style={{ height: 5, borderRadius: 3, background: "var(--mk-surface-2)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.round((analisando.feitos / Math.max(1, analisando.total)) * 100)}%`, background: "#9B7DBF", transition: "width .3s" }} />
            </div>
            <button onClick={pararAnalise} className="ghost-btn" style={{ fontSize: 11, color: "#C97064" }}><i className="ti ti-player-stop" /> Parar</button>
          </>
        ) : (
          <div style={{ fontSize: 11.5, color: "var(--mk-text)" }}><i className="ti ti-circle-check" style={{ color: "#10b981" }} /> {total} conversa(s) · {valem} valem follow-up</div>
        )}
        <button onClick={() => router.push("/follow-up")} className="cta-btn" style={{ fontSize: 11, justifyContent: "center" }}><i className="ti ti-arrow-right" /> Abrir Follow-up</button>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );

  return createPortal(node, document.body);
}

// ===== #7 — Toast "aba X alterada" (portal no body) =====
function AvisosAbaAlterada() {
  const [mounted, setMounted] = useState(false);
  const [avisos, setAvisos] = useState<Array<{ id: number; aba: string }>>([]);
  const idRef = useRef(1);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    function on(e: Event) {
      const aba = (e as CustomEvent<{ aba?: string }>).detail?.aba || "uma aba";
      const id = idRef.current++;
      setAvisos((a) => [...a, { id, aba }]);
      setTimeout(() => setAvisos((a) => a.filter((x) => x.id !== id)), 6000);
    }
    window.addEventListener("crm:aba-alterada", on as EventListener);
    return () => window.removeEventListener("crm:aba-alterada", on as EventListener);
  }, []);

  if (!mounted || avisos.length === 0) return null;
  return createPortal(
    <div style={{ position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", zIndex: 5000, display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
      {avisos.map((a) => (
        <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(245,158,11,0.16)", border: "1px solid #f59e0b", color: "var(--mk-text)", borderRadius: 10, padding: "9px 14px", fontSize: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.35)", animation: "aviso-in .25s ease" }}>
          <i className="ti ti-alert-triangle" style={{ color: "#f59e0b", fontSize: 16 }} />
          <span>Aba <strong>{a.aba}</strong> alterada — atualize a página de Atendimentos pra ver.</span>
          <button onClick={() => setAvisos((x) => x.filter((y) => y.id !== a.id))} style={{ ...iconBtn, marginLeft: 4 }}><i className="ti ti-x" /></button>
        </div>
      ))}
      <style>{`@keyframes aviso-in { from { opacity: 0; transform: translateY(-8px) } to { opacity: 1; transform: translateY(0) } }`}</style>
    </div>,
    document.body
  );
}

const iconBtn: React.CSSProperties = { background: "transparent", border: 0, color: "var(--mk-text-muted)", cursor: "pointer", fontSize: 13, padding: 2, display: "inline-flex", alignItems: "center" };
