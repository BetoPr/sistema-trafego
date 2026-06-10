"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

/**
 * Balão — modal padrão do sistema.
 *
 * Estilo: overlay escuro com blur, caixa centralizada no viewport (via portal,
 * imune a transform/translate de containers pai), header com título + X,
 * corpo com scroll fino (.chat-scroll), Esc ou clique fora fecha.
 *
 * Uso:
 *   const [aberto, setAberto] = useState(false);
 *   <button onClick={() => setAberto(true)}>Abrir</button>
 *   <Balao open={aberto} onClose={() => setAberto(false)} titulo="Minhas funções" icone="ti-settings">
 *     ...conteúdo...
 *   </Balao>
 */
interface BalaoProps {
  open: boolean;
  onClose: () => void;
  titulo: React.ReactNode;
  /** Classe do ícone Tabler (ex: "ti-flag", "ti-receipt-2"). Opcional. */
  icone?: string;
  /** Largura máxima da caixa. Default 460. */
  largura?: number;
  /** Altura máxima (vh). Default 75. */
  alturaVh?: number;
  children: React.ReactNode;
  /** Conteúdo fixo no rodapé (botões de ação). Opcional. */
  footer?: React.ReactNode;
}

export function Balao({ open, onClose, titulo, icone, largura = 460, alturaVh = 75, children, footer }: BalaoProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof window === "undefined") return null;

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0, left: 0, right: 0, bottom: 0,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(2px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--mk-bg)",
          border: "0.5px solid var(--mk-border)",
          borderRadius: 12,
          width: `min(${largura}px, 92vw)`,
          maxHeight: `${alturaVh}vh`,
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 24px 60px rgba(0,0,0,0.55)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "0.5px solid var(--mk-border)" }}>
          <div style={{ fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
            {icone && <i className={`ti ${icone}`} style={{ fontSize: 15 }} />}
            {titulo}
          </div>
          <button
            onClick={onClose}
            style={{ background: "transparent", border: 0, color: "var(--mk-text-muted)", cursor: "pointer", fontSize: 16, padding: 2 }}
            title="Fechar (Esc)"
          >
            <i className="ti ti-x" />
          </button>
        </div>

        {/* Corpo scrollável */}
        <div className="chat-scroll" style={{ padding: 14, overflowY: "auto", flex: 1 }}>
          {children}
        </div>

        {/* Footer fixo opcional */}
        {footer && (
          <div style={{ padding: "10px 16px", borderTop: "0.5px solid var(--mk-border)" }}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
