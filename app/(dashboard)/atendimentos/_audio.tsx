"use client";

import { useEffect, useState } from "react";

interface Props {
  midiaPath: string;
  transcricao?: string | null;
}

/**
 * Player de áudio com signed URL on-demand do bucket crm-media.
 * Path do banco (e.g. agenciaId/ticketId/uuid.ogg) → /api/media → URL signed.
 */
export function AudioPlayer({ midiaPath, transcricao }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    // Se já é URL completa, usa direto
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
    return () => {
      cancel = true;
    };
  }, [midiaPath]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--mk-text-secondary)" }}>
        <i className="ti ti-microphone" /> Áudio
      </div>
      {url ? (
        <audio controls preload="metadata" style={{ width: "100%", marginTop: 6, height: 32 }} src={url} />
      ) : erro ? (
        <div style={{ fontSize: 10.5, color: "#C97064", marginTop: 4 }}>{erro}</div>
      ) : (
        <div style={{ fontSize: 10.5, color: "var(--mk-text-muted)", marginTop: 4 }}>Carregando…</div>
      )}
      {transcricao && (
        <div style={{ marginTop: 6, fontSize: 11, color: "var(--mk-text-muted)", fontStyle: "italic", borderLeft: "2px solid var(--mk-accent)", paddingLeft: 6 }}>
          <div style={{ fontSize: 9.5, color: "var(--mk-accent)", fontWeight: 600, letterSpacing: 0.5, marginBottom: 2 }}>📝 TRANSCRIÇÃO</div>
          {transcricao}
        </div>
      )}
    </div>
  );
}
