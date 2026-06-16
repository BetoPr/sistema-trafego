"use client";

/**
 * Menu de acoes da mensagem estilo WhatsApp Web.
 *
 * - Hover/long-press na bolha: aparece chevron-down no canto sup direito
 *   + barra de reacoes rapidas acima da bolha (animacao scale-in).
 * - Click no chevron: dropdown com Responder, Copiar, Reagir, Apagar.
 * - Mobile long-press (500ms): mesmo dropdown.
 * - Apagar abre Balao confirmando "pra mim / pra todos".
 */
import { useEffect, useRef, useState } from "react";
import { Balao } from "@/components/ui/Balao";

const EMOJIS_RAPIDOS = ["👍", "❤️", "😂", "😯", "😢", "🙏"];

export function MsgAcoes({
  ladoCliente,
  podeApagarTodos,
  podeReagir,
  podeResponder,
  textoParaCopiar,
  onResponder,
  onReagir,
  onApagar,
}: {
  ladoCliente: boolean;
  podeApagarTodos: boolean;
  podeReagir: boolean;
  podeResponder: boolean;
  textoParaCopiar: string;
  onResponder: () => void;
  onReagir: (emoji: string) => void;
  onApagar: (paraTodos: boolean) => void;
}) {
  const [menuAberto, setMenuAberto] = useState(false);
  const [reactBarAberto, setReactBarAberto] = useState(false);
  const [confirmApagar, setConfirmApagar] = useState(false);
  const [hover, setHover] = useState(false);
  const refContainer = useRef<HTMLDivElement>(null);
  const refLongPress = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function fechar(e: MouseEvent) {
      if (refContainer.current && !refContainer.current.contains(e.target as Node)) {
        setMenuAberto(false);
      }
    }
    if (menuAberto) document.addEventListener("mousedown", fechar);
    return () => document.removeEventListener("mousedown", fechar);
  }, [menuAberto]);

  function onTouchStart() {
    refLongPress.current = setTimeout(() => setMenuAberto(true), 450);
  }
  function onTouchEnd() {
    if (refLongPress.current) clearTimeout(refLongPress.current);
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(textoParaCopiar || "");
    } catch {
      /* navigator.clipboard pode falhar — silencioso */
    }
    setMenuAberto(false);
  }

  function reagirClick(e: string) {
    onReagir(e);
    setReactBarAberto(false);
    setMenuAberto(false);
  }

  function escolherApagar(paraTodos: boolean) {
    onApagar(paraTodos);
    setConfirmApagar(false);
  }

  const mostrarChevron = hover || menuAberto;

  return (
    <div
      ref={refContainer}
      className="msg-acoes-wrap"
      onMouseEnter={() => { setHover(true); setReactBarAberto(true); }}
      onMouseLeave={() => { setHover(false); setReactBarAberto(false); }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      {/* Chevron no canto sup direito da bolha */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setMenuAberto((v) => !v); }}
        className="msg-chevron"
        aria-label="Opcoes da mensagem"
        style={{
          position: "absolute",
          top: 4,
          right: 6,
          width: 22,
          height: 22,
          borderRadius: 999,
          background: "rgba(0,0,0,0.55)",
          color: "#fff",
          border: 0,
          opacity: mostrarChevron ? 0.92 : 0,
          transform: mostrarChevron ? "scale(1)" : "scale(0.6)",
          transition: "opacity 0.15s ease, transform 0.18s cubic-bezier(0.34, 1.4, 0.64, 1)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "auto",
          fontSize: 14,
        }}
      >
        <i className="ti ti-chevron-down" />
      </button>

      {/* Barra reacoes acima da bolha */}
      {podeReagir && reactBarAberto && !menuAberto && (
        <div
          style={{
            position: "absolute",
            top: -36,
            [ladoCliente ? "left" : "right"]: 8,
            display: "flex",
            gap: 2,
            padding: "4px 8px",
            background: "var(--mk-surface)",
            border: "0.5px solid var(--mk-border)",
            borderRadius: 999,
            boxShadow: "0 6px 18px rgba(0,0,0,0.35)",
            zIndex: 4,
            animation: "msg-react-pop 0.18s cubic-bezier(0.34, 1.56, 0.64, 1)",
            pointerEvents: "auto",
          }}
        >
          {EMOJIS_RAPIDOS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => reagirClick(e)}
              className="msg-react-btn"
              style={{
                background: "transparent",
                border: 0,
                fontSize: 17,
                cursor: "pointer",
                padding: "2px 5px",
                borderRadius: 999,
                transition: "transform 0.14s cubic-bezier(0.34, 1.56, 0.64, 1)",
              }}
              onMouseEnter={(ev) => (ev.currentTarget as HTMLButtonElement).style.transform = "scale(1.35) translateY(-2px)"}
              onMouseLeave={(ev) => (ev.currentTarget as HTMLButtonElement).style.transform = "scale(1)"}
            >
              {e}
            </button>
          ))}
        </div>
      )}

      {/* Menu dropdown estilo WA */}
      {menuAberto && (
        <div
          style={{
            position: "absolute",
            top: 28,
            [ladoCliente ? "left" : "right"]: 0,
            background: "var(--mk-surface)",
            border: "0.5px solid var(--mk-border)",
            borderRadius: 10,
            boxShadow: "0 10px 28px rgba(0,0,0,0.40)",
            minWidth: 180,
            padding: 4,
            zIndex: 20,
            animation: "msg-menu-in 0.16s ease",
            pointerEvents: "auto",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {podeResponder && (
            <ItemMenu icone="ti-arrow-back-up" label="Responder" onClick={() => { onResponder(); setMenuAberto(false); }} />
          )}
          <ItemMenu icone="ti-copy" label="Copiar" onClick={copiar} />
          {podeReagir && (
            <ItemMenu icone="ti-mood-smile" label="Reagir" onClick={() => { setReactBarAberto(true); setMenuAberto(false); }} />
          )}
          <div style={{ height: 1, background: "var(--mk-border)", margin: "4px 0" }} />
          <ItemMenu icone="ti-trash" label="Apagar" cor="#C97064" onClick={() => { setConfirmApagar(true); setMenuAberto(false); }} />
        </div>
      )}

      {/* Balao confirmacao apagar */}
      <Balao
        open={confirmApagar}
        onClose={() => setConfirmApagar(false)}
        titulo="Apagar mensagem"
        icone="ti-trash"
        largura={380}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 13, color: "var(--mk-text-secondary)" }}>
            Tem certeza? Escolha como deseja apagar:
          </div>
          <button
            type="button"
            onClick={() => escolherApagar(false)}
            className="ghost-btn"
            style={{ justifyContent: "flex-start", fontSize: 12.5, padding: "10px 14px" }}
          >
            <i className="ti ti-eye-off" /> Apagar so pra mim (oculta no CRM)
          </button>
          {podeApagarTodos && (
            <button
              type="button"
              onClick={() => escolherApagar(true)}
              className="ghost-btn"
              style={{ justifyContent: "flex-start", fontSize: 12.5, padding: "10px 14px", color: "#C97064", borderColor: "rgba(201,112,100,0.4)" }}
            >
              <i className="ti ti-trash" /> Apagar pra todos (revogar no WhatsApp)
            </button>
          )}
          <button
            type="button"
            onClick={() => setConfirmApagar(false)}
            className="ghost-btn"
            style={{ fontSize: 12, alignSelf: "flex-end" }}
          >
            Cancelar
          </button>
        </div>
      </Balao>
    </div>
  );
}

function ItemMenu({ icone, label, cor, onClick }: { icone: string; label: string; cor?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        background: "transparent",
        border: 0,
        color: cor || "var(--mk-text)",
        fontSize: 12.5,
        padding: "8px 12px",
        textAlign: "left",
        cursor: "pointer",
        borderRadius: 6,
        transition: "background 0.12s ease",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--mk-surface-2)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <i className={`ti ${icone}`} style={{ fontSize: 14, width: 16 }} />
      {label}
    </button>
  );
}
