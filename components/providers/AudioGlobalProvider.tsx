"use client";

import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";

interface AudioState {
  url: string;
  label: string;
  midiaPath: string; // identificador único pra saber se já está tocando
}

interface AudioContextValue {
  tocar: (params: { midiaPath: string; url: string; label: string }) => void;
  pausar: () => void;
  estaTocando: (midiaPath: string) => boolean;
  midiaAtual: string | null;
}

const AudioGlobalContext = createContext<AudioContextValue | null>(null);

export function useAudioGlobal() {
  const ctx = useContext(AudioGlobalContext);
  if (!ctx) throw new Error("useAudioGlobal precisa do <AudioGlobalProvider>");
  return ctx;
}

/**
 * Áudio único persistente — toca via <audio> montado no layout do dashboard.
 * Não para quando muda de conversa. Mini-player flutuante mostra controles
 * quando o áudio está tocando e o usuário não está mais vendo o balão original.
 */
const VELOCIDADES = [1, 1.2, 1.5, 2] as const;

export function AudioGlobalProvider({ children }: { children: React.ReactNode }) {
  const [estado, setEstado] = useState<AudioState | null>(null);
  const [tocandoUI, setTocandoUI] = useState(false);
  const [velocidade, setVelocidade] = useState<number>(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Aplica taxa de reprodução quando muda áudio ou velocidade
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = velocidade;
  }, [velocidade, estado]);

  const tocar = useCallback((p: { midiaPath: string; url: string; label: string }) => {
    setEstado({ midiaPath: p.midiaPath, url: p.url, label: p.label });
    // O <audio> reage ao mudar src via key
    setTimeout(() => {
      audioRef.current?.play().catch(() => {});
    }, 30);
  }, []);

  const pausar = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const estaTocando = useCallback((midiaPath: string) => {
    return estado?.midiaPath === midiaPath && tocandoUI;
  }, [estado, tocandoUI]);

  // Mantém ref do estado de play/pause
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onPlay = () => setTocandoUI(true);
    const onPause = () => setTocandoUI(false);
    const onEnded = () => setTocandoUI(false);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("ended", onEnded);
    return () => {
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("ended", onEnded);
    };
  }, [estado]);

  return (
    <AudioGlobalContext.Provider value={{ tocar, pausar, estaTocando, midiaAtual: estado?.midiaPath || null }}>
      {children}
      {estado && (
        <div
          style={{
            position: "fixed",
            bottom: 16,
            right: 16,
            zIndex: 4000,
            background: "var(--mk-surface)",
            border: "0.5px solid var(--mk-border)",
            borderRadius: 12,
            padding: "8px 12px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            minWidth: 280,
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          }}
        >
          <i className="ti ti-microphone" style={{ color: "#10b981", fontSize: 18 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--mk-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{estado.label}</div>
              <div style={{ display: "flex", gap: 2 }}>
                {VELOCIDADES.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setVelocidade(v)}
                    title={`Velocidade ${v}x`}
                    style={{
                      background: velocidade === v ? "#10b981" : "transparent",
                      color: velocidade === v ? "#FFFFFF" : "var(--mk-text-muted)",
                      border: "0.5px solid var(--mk-border)",
                      borderRadius: 6,
                      fontSize: 9.5,
                      fontWeight: 600,
                      padding: "1px 5px",
                      cursor: "pointer",
                      minWidth: 26,
                      lineHeight: 1.3,
                    }}
                  >
                    {v}x
                  </button>
                ))}
              </div>
            </div>
            <audio
              ref={audioRef}
              src={estado.url}
              controls
              autoPlay
              style={{ width: "100%", height: 28, marginTop: 4 }}
              key={estado.midiaPath}
            />
          </div>
          <button
            type="button"
            onClick={() => { audioRef.current?.pause(); setEstado(null); }}
            title="Parar"
            style={{ background: "transparent", border: 0, color: "var(--mk-text-muted)", cursor: "pointer", fontSize: 16, padding: 4 }}
          >
            <i className="ti ti-x" />
          </button>
        </div>
      )}
    </AudioGlobalContext.Provider>
  );
}
