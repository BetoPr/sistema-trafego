"use client";

import { useEffect, useState } from "react";

interface Props {
  midiaPath: string | null;
  tipo: "imagem" | "video";
  legenda?: string | null;
}

/**
 * Preview de imagem/vídeo com signed URL do bucket crm-media.
 * Clique na imagem abre lightbox fullscreen.
 */
export function MediaPreview({ midiaPath, tipo, legenda }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState(false);

  useEffect(() => {
    if (!midiaPath) return;
    let cancel = false;
    if (midiaPath.startsWith("http://") || midiaPath.startsWith("https://") || midiaPath.startsWith("data:")) {
      setUrl(midiaPath);
      return;
    }
    fetch(`/api/media?path=${encodeURIComponent(midiaPath)}`)
      .then(async (r) => {
        const j = await r.json();
        if (cancel) return;
        if (!r.ok) setErro(j.error || r.statusText);
        else setUrl(j.url);
      })
      .catch((e) => !cancel && setErro(String(e)));
    return () => { cancel = true; };
  }, [midiaPath]);

  if (!midiaPath) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--mk-text-secondary)" }}>
        <i className={`ti ${tipo === "imagem" ? "ti-photo" : "ti-video"}`} />
        [{tipo}] <span style={{ fontSize: 10, color: "var(--mk-text-muted)" }}>(baixando...)</span>
      </div>
    );
  }
  if (erro) {
    return <div style={{ fontSize: 10.5, color: "#C97064" }}>{erro}</div>;
  }
  if (!url) {
    return <div style={{ fontSize: 10.5, color: "var(--mk-text-muted)" }}>Carregando {tipo}…</div>;
  }

  return (
    <>
      {tipo === "imagem" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={legenda || "imagem"}
          onClick={() => setLightbox(true)}
          style={{ width: "100%", maxWidth: 260, maxHeight: 300, height: "auto", objectFit: "contain", borderRadius: 8, cursor: "zoom-in", display: "block", border: "0.5px solid var(--mk-border)" }}
        />
      ) : (
        <video src={url} controls preload="metadata" style={{ width: "100%", maxWidth: 260, maxHeight: 300, borderRadius: 8, display: "block", border: "0.5px solid var(--mk-border)" }} />
      )}
      {legenda && <div style={{ marginTop: 4, fontSize: 12 }}>{legenda}</div>}

      {lightbox && tipo === "imagem" && (
        <div
          onClick={() => setLightbox(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, cursor: "zoom-out" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={legenda || "imagem"} style={{ maxWidth: "92vw", maxHeight: "92vh", borderRadius: 6 }} />
          <button
            onClick={(e) => { e.stopPropagation(); setLightbox(false); }}
            style={{ position: "fixed", top: 16, right: 16, width: 36, height: 36, borderRadius: "50%", border: 0, background: "rgba(255,255,255,0.15)", color: "#fff", cursor: "pointer", fontSize: 18 }}
          >
            <i className="ti ti-x" />
          </button>
        </div>
      )}
    </>
  );
}
