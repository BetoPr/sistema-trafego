"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

/**
 * Lightbox simples pra mostrar uma foto em tela cheia com fundo borrado.
 * Click no fundo ou Esc fecha.
 */
export function LightboxFoto({
  src,
  alt,
  open,
  onClose,
}: {
  src: string | null | undefined;
  alt?: string;
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open || !src) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 3000,
        cursor: "zoom-out",
        animation: "lb-fade 0.16s ease",
      }}
    >
      <style>{`@keyframes lb-fade { from { opacity: 0 } to { opacity: 1 } }`}</style>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt || ""}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "92vw",
          maxHeight: "92vh",
          borderRadius: 14,
          boxShadow: "0 12px 60px rgba(0,0,0,0.6)",
          cursor: "default",
        }}
      />
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        title="Fechar (Esc)"
        style={{
          position: "fixed",
          top: 18,
          right: 18,
          width: 38,
          height: 38,
          borderRadius: "50%",
          border: 0,
          background: "rgba(255,255,255,0.18)",
          color: "#fff",
          cursor: "pointer",
          fontSize: 18,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <i className="ti ti-x" />
      </button>
    </div>,
    document.body,
  );
}
