"use client";

import { useEffect, useState } from "react";
import { useAudioGlobal } from "@/components/providers/AudioGlobalProvider";

interface Props {
  midiaPath: string;
  transcricao?: string | null;
  /** Rótulo mostrado no mini-player quando você sai da conversa (ex: nome do contato). */
  rotulo?: string;
  /** Status atual da mensagem (pendente=enviando, enviada=ok). */
  status?: string | null;
}

/**
 * Botão "Tocar áudio" que delega pro AudioGlobalProvider.
 * O <audio> real fica no provider (mini-player flutuante) — assim continua
 * tocando mesmo quando você muda de conversa.
 */
export function AudioPlayer({ midiaPath, transcricao, rotulo, status }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const audio = useAudioGlobal();

  useEffect(() => {
    let cancel = false;
    // URL direta — usa imediatamente (sem fetch). Inclui blob: pra optimistic
    // local (envio do atendente ainda subindo).
    if (
      midiaPath.startsWith("http://") ||
      midiaPath.startsWith("https://") ||
      midiaPath.startsWith("data:") ||
      midiaPath.startsWith("blob:")
    ) {
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
            background: "#00E19A",
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
          {erro ? (
            <span style={{ color: "#C97064" }}>{erro}</span>
          ) : status === "pendente" ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <i className="ti ti-loader-2" style={{ animation: "spin 0.8s linear infinite" }} />
              Enviando…
            </span>
          ) : status === "falha" ? (
            <span style={{ color: "#C97064" }}>Falha ao enviar</span>
          ) : url ? (
            ativo ? "Tocando…" : "Áudio"
          ) : (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <i className="ti ti-loader-2" style={{ animation: "spin 0.8s linear infinite" }} />
              Carregando…
            </span>
          )}
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
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
