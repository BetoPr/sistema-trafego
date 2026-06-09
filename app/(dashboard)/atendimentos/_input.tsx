"use client";

import { useState, useRef, useEffect } from "react";

interface Props {
  ticketId: string;
  canalId: string | null;
  canalConectado: boolean;
  atendenteNome: string;
  text: string;
  setText: (t: string) => void;
  sending: boolean;
  onSend: () => void;
  onOptimisticAudio: (blob: Blob) => string;
  onAudioConfirm: (tempId: string, mensagemId?: string) => void;
  onAudioFail: (tempId: string) => void;
}

type EstiloIA = "profissional" | "simpatico" | "marketing" | "ortografia";

const ESTILOS: Array<{ id: EstiloIA; nome: string; sub: string; icon: string; cor: string }> = [
  { id: "profissional", nome: "Profissional", sub: "Tom formal e corporativo", icon: "ti-briefcase", cor: "#5B8BA6" },
  { id: "simpatico", nome: "Simpático", sub: "Tom amigável e caloroso", icon: "ti-mood-smile", cor: "#6B8E4E" },
  { id: "marketing", nome: "Marketing", sub: "Tom persuasivo e envolvente", icon: "ti-sparkles", cor: "#C9A876" },
  { id: "ortografia", nome: "Ortografia", sub: "Correção ortográfica apenas", icon: "ti-spell-check", cor: "#9B7DBF" },
];

export function InputBar(p: Props) {
  const [assinado, setAssinado] = useState(false);
  const [menuAnexo, setMenuAnexo] = useState(false);
  const [menuIA, setMenuIA] = useState(false);
  const [iaLoading, setIaLoading] = useState<EstiloIA | null>(null);
  const [gravando, setGravando] = useState(false);
  const [tempoGrav, setTempoGrav] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const tempIdRef = useRef<string | null>(null);
  const menuAnexoRef = useRef<HTMLDivElement>(null);
  const menuIARef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuAnexoRef.current && !menuAnexoRef.current.contains(e.target as Node)) setMenuAnexo(false);
      if (menuIARef.current && !menuIARef.current.contains(e.target as Node)) setMenuIA(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function textoFinal(): string {
    if (assinado && p.text.trim()) return `*${p.atendenteNome}*:\n${p.text}`;
    return p.text;
  }

  async function enviarComAssinatura() {
    if (assinado && p.text.trim()) {
      const t = textoFinal();
      p.setText(t);
      // Hack: pequeno timeout pra prop atualizar antes do send
      setTimeout(() => p.onSend(), 10);
    } else {
      p.onSend();
    }
  }

  // ====================
  // Anexar arquivo
  // ====================
  async function anexarArquivo(file: File, tipo: "image" | "video" | "audio" | "document") {
    if (!p.canalId) return;
    setMenuAnexo(false);
    const base64 = await fileToBase64(file);
    try {
      const r = await fetch(`/api/canais/${p.canalId}/send`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ticketId: p.ticketId,
          media: {
            type: tipo,
            fileBase64: base64,
            filename: file.name,
            caption: p.text.trim() || undefined,
          },
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) alert(`Falha: ${j.error || j.msg || r.statusText}`);
      else p.setText("");
    } catch (e) {
      alert(`Erro: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  function fileToBase64(f: File): Promise<string> {
    return new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => {
        const r = reader.result as string;
        res(r.includes(",") ? r.split(",")[1] : r);
      };
      reader.onerror = rej;
      reader.readAsDataURL(f);
    });
  }

  function detectarTipo(file: File): "image" | "video" | "audio" | "document" {
    if (file.type.startsWith("image/")) return "image";
    if (file.type.startsWith("video/")) return "video";
    if (file.type.startsWith("audio/")) return "audio";
    return "document";
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) anexarArquivo(f, detectarTipo(f));
    e.target.value = "";
  }

  // ====================
  // IA reescrita
  // ====================
  async function reescrever(estilo: EstiloIA) {
    if (!p.text.trim()) {
      alert("Digite um texto pra reescrever");
      return;
    }
    setMenuIA(false);
    setIaLoading(estilo);
    try {
      const r = await fetch("/api/ia/reescrever", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ texto: p.text, estilo }),
      });
      const j = await r.json();
      if (!r.ok) alert(`Falha: ${j.error || r.statusText}`);
      else p.setText(j.texto);
    } catch (e) {
      alert(`Erro: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setIaLoading(null);
    }
  }

  // ====================
  // Gravação áudio (microfone)
  // ====================
  async function iniciarGravacao() {
    if (!p.canalId) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus"
                  : MediaRecorder.isTypeSupported("audio/ogg;codecs=opus") ? "audio/ogg;codecs=opus"
                  : "audio/webm";
      mediaRecorder.current = new MediaRecorder(stream, { mimeType: mime });
      audioChunks.current = [];
      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.current.push(e.data);
      };
      mediaRecorder.current.onstop = async () => {
        const blob = new Blob(audioChunks.current, { type: mime });
        stream.getTracks().forEach((t) => t.stop());
        await enviarAudio(blob);
      };
      mediaRecorder.current.start();
      setGravando(true);
      setTempoGrav(0);
      timerRef.current = window.setInterval(() => setTempoGrav((t) => t + 1), 1000);
    } catch (e) {
      alert(`Microfone bloqueado: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  function pararGravacao() {
    if (mediaRecorder.current && mediaRecorder.current.state !== "inactive") {
      mediaRecorder.current.stop();
    }
    setGravando(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function cancelarGravacao() {
    if (mediaRecorder.current && mediaRecorder.current.state !== "inactive") {
      // Sobrescreve onstop pra não enviar
      mediaRecorder.current.onstop = () => {
        const tracks = (mediaRecorder.current as MediaRecorder & { stream?: MediaStream }).stream?.getTracks();
        tracks?.forEach((t) => t.stop());
      };
      mediaRecorder.current.stop();
    }
    audioChunks.current = [];
    setGravando(false);
    setTempoGrav(0);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  async function enviarAudio(blob: Blob) {
    if (!p.canalId) return;
    const tempId = p.onOptimisticAudio(blob);
    tempIdRef.current = tempId;
    try {
      const base64 = await blobToBase64(blob);
      const r = await fetch(`/api/canais/${p.canalId}/send`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ticketId: p.ticketId,
          media: {
            type: "ptt",
            fileBase64: base64,
            filename: "audio.ogg",
          },
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        alert(`Falha ao enviar áudio: ${j.error || j.msg || r.statusText}`);
        p.onAudioFail(tempId);
      } else {
        p.onAudioConfirm(tempId, j.mensagemId);
      }
    } catch (e) {
      alert(`Erro: ${e instanceof Error ? e.message : String(e)}`);
      p.onAudioFail(tempId);
    } finally {
      tempIdRef.current = null;
    }
  }

  function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => {
        const r = reader.result as string;
        res(r.includes(",") ? r.split(",")[1] : r);
      };
      reader.onerror = rej;
      reader.readAsDataURL(blob);
    });
  }

  function formatTempo(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, "0")}`;
  }

  // ====================
  // Render
  // ====================
  return (
    <div style={{ borderTop: "0.5px solid var(--mk-border)", background: "var(--mk-surface)" }}>
      {gravando ? (
        // ===== Modo gravando =====
        <div style={{ display: "flex", alignItems: "center", padding: "12px 14px", gap: 10 }}>
          <button onClick={cancelarGravacao} className="ghost-btn" title="Cancelar" style={{ color: "#C97064" }}>
            <i className="ti ti-trash" />
          </button>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--mk-text-secondary)" }}>
            <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: "#C97064", animation: "pulse 1s infinite" }} />
            Gravando… <strong>{formatTempo(tempoGrav)}</strong>
          </div>
          <button onClick={pararGravacao} className="cta-btn">
            <i className="ti ti-send" /> Enviar
          </button>
        </div>
      ) : (
        // ===== Modo normal =====
        <>
          <textarea
            value={p.text}
            onChange={(e) => p.setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                enviarComAssinatura();
              }
            }}
            placeholder={p.canalConectado ? "Digite uma mensagem… (Enter envia, Shift+Enter quebra linha; / para atalho)" : "Canal desconectado"}
            disabled={!p.canalConectado || p.sending}
            rows={Math.min(5, Math.max(1, p.text.split("\n").length))}
            style={{
              width: "100%",
              padding: "10px 14px",
              border: 0,
              background: "transparent",
              color: "var(--mk-text)",
              fontSize: 12.5,
              resize: "none",
              fontFamily: "inherit",
              outline: "none",
            }}
          />
          <div style={{ display: "flex", alignItems: "center", padding: "6px 10px", gap: 4, borderTop: "0.5px solid var(--mk-border)" }}>
            {/* Anexar */}
            <div style={{ position: "relative" }} ref={menuAnexoRef}>
              <IconBtn icon="ti-paperclip" title="Anexar arquivo" onClick={() => setMenuAnexo((s) => !s)} active={menuAnexo} />
              {menuAnexo && (
                <div style={menuStyle}>
                  <MenuItem icon="ti-photo" onClick={() => { fileInputRef.current?.click(); setMenuAnexo(false); }}>Imagem / Vídeo / Documento</MenuItem>
                  <MenuItem icon="ti-microphone" onClick={iniciarGravacao}>Gravar áudio</MenuItem>
                </div>
              )}
            </div>
            <input ref={fileInputRef} type="file" hidden onChange={onPickFile} accept="image/*,video/*,audio/*,application/pdf,application/*" />

            {/* Mensagens rápidas (atalho via texto começa com /) */}
            <IconBtn icon="ti-bolt" title="Mensagens rápidas (digite / para usar)" onClick={() => p.setText("/")} />

            {/* IA reescrita */}
            <div style={{ position: "relative" }} ref={menuIARef}>
              <IconBtn
                icon="ti-pencil-bolt"
                title="Reescrever com IA"
                onClick={() => setMenuIA((s) => !s)}
                active={menuIA}
                color="#5B8BA6"
              />
              {menuIA && (
                <div style={{ ...menuStyle, minWidth: 240 }}>
                  <div style={{ padding: "8px 14px", fontSize: 11, fontWeight: 600, color: "var(--mk-text-muted)", borderBottom: "0.5px solid var(--mk-border)" }}>
                    Estilos de Reescrita
                  </div>
                  {ESTILOS.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => reescrever(e.id)}
                      disabled={!!iaLoading}
                      style={{
                        display: "flex",
                        gap: 10,
                        padding: "10px 14px",
                        width: "100%",
                        background: "transparent",
                        border: 0,
                        cursor: iaLoading ? "wait" : "pointer",
                        textAlign: "left",
                        color: "var(--mk-text)",
                      }}
                      onMouseEnter={(ev) => ((ev.target as HTMLButtonElement).style.background = "var(--mk-surface-2)")}
                      onMouseLeave={(ev) => ((ev.target as HTMLButtonElement).style.background = "transparent")}
                    >
                      <i className={`ti ${e.icon}`} style={{ fontSize: 16, color: e.cor, marginTop: 2 }} />
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 600 }}>{e.nome}{iaLoading === e.id && " …"}</div>
                        <div style={{ fontSize: 10.5, color: "var(--mk-text-muted)" }}>{e.sub}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Assinado toggle */}
            <label style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 8px", fontSize: 11, color: "var(--mk-text-secondary)", cursor: "pointer" }}>
              <input type="checkbox" checked={assinado} onChange={(e) => setAssinado(e.target.checked)} />
              Assinado
            </label>

            <div style={{ flex: 1, fontSize: 10, color: "var(--mk-text-muted)", textAlign: "right" }}>
              Enter envia · Shift+Enter nova linha
            </div>

            {/* Microfone */}
            <IconBtn icon="ti-microphone" title="Gravar áudio" onClick={iniciarGravacao} disabled={!p.canalConectado} />

            {/* Enviar */}
            <button
              onClick={enviarComAssinatura}
              disabled={!p.canalConectado || p.sending || !p.text.trim()}
              style={{
                background: "#25D366",
                border: 0,
                borderRadius: "50%",
                width: 36,
                height: 36,
                color: "#FFFDF8",
                cursor: p.text.trim() ? "pointer" : "not-allowed",
                opacity: p.text.trim() ? 1 : 0.4,
              }}
              title="Enviar"
            >
              <i className="ti ti-send" />
            </button>
          </div>
        </>
      )}
      <style>{`@keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.3 } }`}</style>
    </div>
  );
}

function IconBtn({ icon, title, onClick, disabled, active, color }: { icon: string; title: string; onClick?: () => void; disabled?: boolean; active?: boolean; color?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        background: active ? "var(--mk-surface-2)" : "transparent",
        border: 0,
        borderRadius: 6,
        padding: "6px 9px",
        cursor: disabled ? "not-allowed" : "pointer",
        color: color || "var(--mk-text-secondary)",
        opacity: disabled ? 0.4 : 1,
        fontSize: 15,
      }}
    >
      <i className={`ti ${icon}`} />
    </button>
  );
}

function MenuItem({ icon, children, onClick }: { icon: string; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 14px",
        width: "100%",
        background: "transparent",
        border: 0,
        cursor: "pointer",
        textAlign: "left",
        color: "var(--mk-text)",
        fontSize: 12,
      }}
      onMouseEnter={(e) => ((e.target as HTMLButtonElement).style.background = "var(--mk-surface-2)")}
      onMouseLeave={(e) => ((e.target as HTMLButtonElement).style.background = "transparent")}
    >
      <i className={`ti ${icon}`} style={{ fontSize: 14 }} />
      {children}
    </button>
  );
}

const menuStyle: React.CSSProperties = {
  position: "absolute",
  bottom: "100%",
  left: 0,
  marginBottom: 6,
  background: "var(--mk-bg)",
  border: "0.5px solid var(--mk-border)",
  borderRadius: 8,
  boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
  minWidth: 200,
  zIndex: 50,
  padding: "4px 0",
};
