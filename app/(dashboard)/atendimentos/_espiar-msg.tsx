"use client";

import { useEffect, useState } from "react";
import { AudioPlayer } from "./_audio";
import { MediaPreview } from "./_media";

/** Link de download de documento — resolve a signed URL do bucket (ou usa a URL direta). */
export function DocBaixar({ midiaPath, nome }: { midiaPath: string; nome: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (midiaPath.startsWith("http://") || midiaPath.startsWith("https://") || midiaPath.startsWith("data:")) { setUrl(midiaPath); return; }
    let cancel = false;
    fetch(`/api/media?path=${encodeURIComponent(midiaPath)}`).then((r) => r.json()).then((j) => { if (!cancel) setUrl(j.url || null); }).catch(() => {});
    return () => { cancel = true; };
  }, [midiaPath]);
  if (!url) return <span style={{ color: "var(--mk-text-secondary)" }}><i className="ti ti-loader-2 anim-spin" /> {nome}</span>;
  return (
    <a href={url} target="_blank" rel="noreferrer" download style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#5B8BA6", textDecoration: "none" }}>
      <i className="ti ti-file-download" /> {nome} <span style={{ fontSize: 10, color: "var(--mk-text-muted)" }}>(baixar)</span>
    </a>
  );
}

export interface MsgEspiada {
  id: string;
  autor: string;
  tipo: string;
  conteudo: string | null;
  transcricao: string | null;
  midia_url?: string | null;
  created_at: string;
}

/**
 * Bolha de mensagem pro modo "espiar" (follow-up + pendentes).
 * Renderiza imagem/vídeo (lightbox) e áudio (player + transcrição) iguais ao chat,
 * reusando MediaPreview/AudioPlayer.
 */
export function BolhaEspiada({ m, contatoNome }: { m: MsgEspiada; contatoNome?: string }) {
  const cliente = m.autor === "cliente";
  const legenda = m.conteudo && !/^\[(imagem|video|audio|documento)\]$/i.test(m.conteudo) ? m.conteudo : null;
  return (
    <div style={{ display: "flex", justifyContent: cliente ? "flex-start" : "flex-end" }}>
      <div style={{ maxWidth: "80%", minWidth: 0, padding: "7px 10px", borderRadius: 10, background: cliente ? "var(--mk-surface)" : "rgba(155,125,191,0.18)", border: "0.5px solid var(--mk-border)", color: "var(--mk-text)", fontSize: 12, lineHeight: 1.5, whiteSpace: "pre-wrap", overflowWrap: "anywhere", wordBreak: "break-word" }}>
        {m.tipo === "audio" ? (
          m.midia_url ? (
            <AudioPlayer midiaPath={m.midia_url} transcricao={m.transcricao} rotulo={`${cliente ? (contatoNome || "Cliente") : "Você"} · áudio`} status="entregue" />
          ) : (
            <span style={{ color: "var(--mk-text-secondary)" }}>
              <i className="ti ti-microphone" /> Áudio
              {m.transcricao && <span style={{ display: "block", marginTop: 4, fontSize: 11, color: "var(--mk-text-muted)", fontStyle: "italic" }}>{m.transcricao}</span>}
            </span>
          )
        ) : m.tipo === "imagem" || m.tipo === "video" ? (
          m.midia_url ? (
            <MediaPreview midiaPath={m.midia_url} tipo={m.tipo as "imagem" | "video"} legenda={legenda} mensagemId={m.id} />
          ) : (
            <span style={{ color: "var(--mk-text-secondary)" }}><i className={`ti ${m.tipo === "imagem" ? "ti-photo" : "ti-video"}`} /> {legenda || `[${m.tipo}]`}</span>
          )
        ) : m.tipo === "documento" ? (
          m.midia_url ? <DocBaixar midiaPath={m.midia_url} nome={legenda || "Documento"} /> : <span style={{ color: "var(--mk-text-secondary)" }}><i className="ti ti-file" /> {legenda || "[documento]"}</span>
        ) : (
          m.conteudo || m.transcricao || `[${m.tipo}]`
        )}
        <div style={{ fontSize: 9, color: "var(--mk-text-muted)", marginTop: 3, textAlign: "right" }}>
          {new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })}
        </div>
      </div>
    </div>
  );
}
