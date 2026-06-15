"use client";

import { useEffect, useState } from "react";
import { useAudioGlobal } from "@/components/providers/AudioGlobalProvider";

interface Props {
  midiaPath: string;
  transcricao?: string | null;
  /** Rótulo mostrado no mini-player quando você sai da conversa (ex: nome do contato). */
  rotulo?: string;
}

/**
 * Botão "Tocar áudio" que delega pro AudioGlobalProvider.
 * O <audio> real fica no provider (mini-player flutuante) — assim continua
 * tocando mesmo quando você muda de conversa.
 */
export function AudioPlayer({ midiaPath, transcricao, rotulo }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const audio = useAudioGlobal();

  useEffect(() => {
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

  const ativo = audio.estaTocando(midiaPath);

  function tocarOuPausar() {
    if (!url) return;
    if (ativo) audio.pausar();
    else audio.tocar({ midiaPath, url, label: rotulo || "Áudio" });
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          type="button"
          onClick={tocarOuPausar}
          disabled={!url}
          title={ativo ? "Pausar" : "Tocar"}
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "#10b981",
            color: "#FFFFFF",
            border: 0,
            cursor: url ? "pointer" : "not-allowed",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            flexShrink: 0,
            opacity: url ? 1 : 0.5,
          }}
        >
          <i className={`ti ${ativo ? "ti-player-pause-filled" : "ti-player-play-filled"}`} />
        </button>
        <div style={{ flex: 1, color: "var(--mk-text-secondary)", fontSize: 11.5 }}>
          {erro ? <span style={{ color: "#C97064" }}>{erro}</span> : url ? (ativo ? "Tocando…" : "Áudio") : "Carregando…"}
        </div>
      </div>
      {transcricao && (
        <div style={{ marginTop: 6, fontSize: 11, color: "var(--mk-text-muted)", fontStyle: "italic", borderLeft: "2px solid var(--mk-accent)", paddingLeft: 6 }}>
          <div style={{ fontSize: 9.5, color: "var(--mk-accent)", fontWeight: 600, letterSpacing: 0.5, marginBottom: 2 }}>📝 TRANSCRIÇÃO</div>
          {transcricao}
        </div>
      )}
    </div>
  );
}
