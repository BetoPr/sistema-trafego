"use client";

import { useEffect, useState, useMemo } from "react";

/**
 * Aba "Mídias" do detalhe de contato — estilo "Mídia, links e docs" do WhatsApp.
 * Varre TODAS as conversas do contato (GET /api/contatos/[id]/midias) e mostra
 * Fotos / Vídeos / Áudios / Docs / Links com zoom, download e "abrir conversa".
 */

interface Midia {
  id: string; ticket_id: string; tipo: string;
  conteudo: string | null; transcricao: string | null;
  midia_url: string | null; midia_mime: string | null; midia_filename: string | null;
  created_at: string;
}
interface LinkItem { url: string; created_at: string; ticket_id: string; contexto: string }
type Sub = "fotos" | "videos" | "audios" | "docs" | "links";

const spin: React.CSSProperties = { animation: "mc-spin 1s linear infinite" };

/** Resolve a URL exibível: http/data direto; senão signed URL do bucket via /api/media. */
function useResolvedUrl(path: string | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!path) { setUrl(null); return; }
    if (/^(https?:|data:)/.test(path)) { setUrl(path); return; }
    let cancel = false;
    fetch(`/api/media?path=${encodeURIComponent(path)}`)
      .then((r) => r.json())
      .then((j) => { if (!cancel) setUrl(j.url || null); })
      .catch(() => {});
    return () => { cancel = true; };
  }, [path]);
  return url;
}

function fmt(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}
function AbrirConversa({ ticketId }: { ticketId: string }) {
  return (
    <a href={`/atendimentos?t=${ticketId}`} title="Abrir essa conversa" style={{ color: "var(--mk-text-muted)", textDecoration: "none", fontSize: 13 }}>
      <i className="ti ti-external-link" />
    </a>
  );
}

export function MidiasContato({ contatoId }: { contatoId: string }) {
  const [midias, setMidias] = useState<Midia[] | null>(null);
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [erro, setErro] = useState("");
  const [sub, setSub] = useState<Sub>("fotos");
  const [zoom, setZoom] = useState<{ path: string; tipo: string } | null>(null);

  useEffect(() => {
    let vivo = true;
    setMidias(null); setErro("");
    (async () => {
      try {
        const r = await fetch(`/api/contatos/${contatoId}/midias`);
        const j = await r.json();
        if (!vivo) return;
        if (!j.ok) { setErro(j.error || "Falha"); setMidias([]); return; }
        setMidias(j.midias || []); setLinks(j.links || []);
      } catch { if (vivo) { setErro("Falha ao carregar mídias"); setMidias([]); } }
    })();
    return () => { vivo = false; };
  }, [contatoId]);

  const fotos = useMemo(() => (midias || []).filter((m) => m.tipo === "imagem"), [midias]);
  const videos = useMemo(() => (midias || []).filter((m) => m.tipo === "video"), [midias]);
  const audios = useMemo(() => (midias || []).filter((m) => m.tipo === "audio"), [midias]);
  const docs = useMemo(() => (midias || []).filter((m) => m.tipo === "documento"), [midias]);

  const subs: { v: Sub; label: string; icon: string; n: number }[] = [
    { v: "fotos", label: "Fotos", icon: "ti-photo", n: fotos.length },
    { v: "videos", label: "Vídeos", icon: "ti-video", n: videos.length },
    { v: "audios", label: "Áudios", icon: "ti-microphone", n: audios.length },
    { v: "docs", label: "Docs", icon: "ti-file-text", n: docs.length },
    { v: "links", label: "Links", icon: "ti-link", n: links.length },
  ];

  if (midias === null) {
    return <div style={{ textAlign: "center", padding: 30, fontSize: 12, color: "var(--mk-text-muted)" }}><i className="ti ti-loader-2" style={spin} /> Carregando mídias…</div>;
  }
  if (erro) return <div style={{ fontSize: 12, color: "#C97064", padding: 12 }}>{erro}</div>;

  return (
    <div>
      <style>{`@keyframes mc-spin { to { transform: rotate(360deg) } }`}</style>

      {/* Sub-abas */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 12 }}>
        {subs.map((s) => {
          const on = sub === s.v;
          return (
            <button key={s.v} onClick={() => setSub(s.v)} style={{
              display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, fontFamily: "inherit", cursor: "pointer",
              padding: "5px 9px", borderRadius: 7,
              border: `1px solid ${on ? "var(--mk-accent)" : "var(--mk-border)"}`,
              background: on ? "rgba(16,185,129,0.16)" : "var(--mk-surface-2)",
              color: on ? "var(--mk-accent)" : "var(--mk-text-muted)",
            }}>
              <i className={`ti ${s.icon}`} /> {s.label}
              <span style={{ fontSize: 9.5, opacity: 0.85, background: "var(--mk-bg)", borderRadius: 999, padding: "0 5px", minWidth: 14, textAlign: "center" }}>{s.n}</span>
            </button>
          );
        })}
      </div>

      {/* Grid fotos/vídeos */}
      {(sub === "fotos" || sub === "videos") && (
        (() => {
          const itens = sub === "fotos" ? fotos : videos;
          if (itens.length === 0) return <Vazio label={`Sem ${sub === "fotos" ? "fotos" : "vídeos"} nesta conversa.`} />;
          return (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
              {itens.map((m) => <Thumb key={m.id} m={m} onZoom={() => m.midia_url && setZoom({ path: m.midia_url, tipo: m.tipo })} />)}
            </div>
          );
        })()
      )}

      {/* Áudios */}
      {sub === "audios" && (audios.length === 0 ? <Vazio label="Sem áudios nesta conversa." /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {audios.map((m) => <AudioRow key={m.id} m={m} />)}
        </div>
      ))}

      {/* Docs */}
      {sub === "docs" && (docs.length === 0 ? <Vazio label="Sem documentos nesta conversa." /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {docs.map((m) => <DocRow key={m.id} m={m} />)}
        </div>
      ))}

      {/* Links */}
      {sub === "links" && (links.length === 0 ? <Vazio label="Nenhum link trocado nesta conversa." /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {links.map((l, i) => <LinkRow key={i} l={l} />)}
        </div>
      ))}

      {zoom && <Zoom path={zoom.path} tipo={zoom.tipo} onClose={() => setZoom(null)} />}
    </div>
  );
}

function Vazio({ label }: { label: string }) {
  return <div style={{ textAlign: "center", padding: 28, fontSize: 11.5, color: "var(--mk-text-muted)" }}><i className="ti ti-mood-empty" style={{ display: "block", fontSize: 24, marginBottom: 6, opacity: 0.5 }} />{label}</div>;
}

function Thumb({ m, onZoom }: { m: Midia; onZoom: () => void }) {
  const url = useResolvedUrl(m.midia_url);
  return (
    <button onClick={onZoom} title={fmt(m.created_at)} style={{ aspectRatio: "1", border: "0.5px solid var(--mk-border)", borderRadius: 8, overflow: "hidden", padding: 0, cursor: "zoom-in", background: "var(--mk-surface-2)", position: "relative" }}>
      {url ? (
        m.tipo === "imagem" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        ) : (
          <>
            <video src={url} preload="metadata" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            <i className="ti ti-player-play-filled" style={{ position: "absolute", inset: 0, margin: "auto", width: 24, height: 24, fontSize: 24, color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,.6)" }} />
          </>
        )
      ) : <i className="ti ti-loader-2" style={{ ...spin, position: "absolute", inset: 0, margin: "auto", width: 18, height: 18, fontSize: 18, color: "var(--mk-text-muted)" }} />}
    </button>
  );
}

function AudioRow({ m }: { m: Midia }) {
  const url = useResolvedUrl(m.midia_url);
  return (
    <div style={{ border: "0.5px solid var(--mk-border)", borderRadius: 8, padding: 8, background: "var(--mk-surface-2)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: m.transcricao ? 6 : 0 }}>
        {url ? <audio src={url} controls preload="none" style={{ flex: 1, height: 32 }} /> : <span style={{ flex: 1, fontSize: 11, color: "var(--mk-text-muted)" }}><i className="ti ti-loader-2" style={spin} /> carregando…</span>}
        <span style={{ fontSize: 10, color: "var(--mk-text-muted)" }}>{fmt(m.created_at)}</span>
        <AbrirConversa ticketId={m.ticket_id} />
      </div>
      {m.transcricao && <div style={{ fontSize: 11, color: "var(--mk-text-secondary)", fontStyle: "italic" }}><i className="ti ti-text-caption" /> {m.transcricao}</div>}
    </div>
  );
}

function DocRow({ m }: { m: Midia }) {
  const url = useResolvedUrl(m.midia_url);
  const nome = m.midia_filename || m.conteudo || "Documento";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, border: "0.5px solid var(--mk-border)", borderRadius: 8, padding: "8px 10px", background: "var(--mk-surface-2)" }}>
      <i className="ti ti-file-text" style={{ fontSize: 18, color: "var(--mk-accent)" }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: "var(--mk-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nome}</div>
        <div style={{ fontSize: 10, color: "var(--mk-text-muted)" }}>{fmt(m.created_at)}</div>
      </div>
      {url && <a href={url} download={nome} target="_blank" rel="noreferrer" title="Baixar" style={{ color: "var(--mk-accent)", textDecoration: "none", fontSize: 15 }}><i className="ti ti-download" /></a>}
      <AbrirConversa ticketId={m.ticket_id} />
    </div>
  );
}

function LinkRow({ l }: { l: LinkItem }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, border: "0.5px solid var(--mk-border)", borderRadius: 8, padding: "8px 10px", background: "var(--mk-surface-2)" }}>
      <i className="ti ti-link" style={{ fontSize: 16, color: "var(--mk-accent)" }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <a href={l.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "var(--mk-accent)", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>{l.url}</a>
        <div style={{ fontSize: 10, color: "var(--mk-text-muted)" }}>{fmt(l.created_at)}</div>
      </div>
      <AbrirConversa ticketId={l.ticket_id} />
    </div>
  );
}

function Zoom({ path, tipo, onClose }: { path: string; tipo: string; onClose: () => void }) {
  const url = useResolvedUrl(path);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-out" }}>
      {!url ? <i className="ti ti-loader-2" style={{ ...spin, color: "#fff", fontSize: 28 }} /> : tipo === "imagem" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" style={{ maxWidth: "92vw", maxHeight: "92vh", borderRadius: 6 }} onClick={(e) => e.stopPropagation()} />
      ) : (
        <video src={url} controls autoPlay style={{ maxWidth: "92vw", maxHeight: "92vh", borderRadius: 6 }} onClick={(e) => e.stopPropagation()} />
      )}
      <button onClick={(e) => { e.stopPropagation(); onClose(); }} style={{ position: "fixed", top: 16, right: 16, width: 36, height: 36, borderRadius: "50%", border: 0, background: "rgba(255,255,255,0.15)", color: "#fff", cursor: "pointer", fontSize: 18 }}>
        <i className="ti ti-x" />
      </button>
    </div>
  );
}
