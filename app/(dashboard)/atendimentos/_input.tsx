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
  replyId?: string | null;
  onClearReply?: () => void;
}

type EstiloIA = "profissional" | "simpatico" | "marketing" | "ortografia";

const ESTILOS: Array<{ id: EstiloIA; nome: string; sub: string; icon: string; cor: string }> = [
  { id: "profissional", nome: "Profissional", sub: "Tom formal e corporativo", icon: "ti-briefcase", cor: "#5B8BA6" },
  { id: "simpatico", nome: "Simpático", sub: "Tom amigável e caloroso", icon: "ti-mood-smile", cor: "#10b981" },
  { id: "marketing", nome: "Marketing", sub: "Tom persuasivo e envolvente", icon: "ti-sparkles", cor: "#10b981" },
  { id: "ortografia", nome: "Ortografia", sub: "Correção ortográfica apenas", icon: "ti-spell-check", cor: "#9B7DBF" },
];

interface Anexo {
  id: string;
  file: File;
  tipo: "image" | "video" | "document";
  previewUrl: string | null;
}

// Catálogo de emojis (sem lib externa) — os mais usados em atendimento.
const EMOJIS = [
  "😀","😁","😂","🤣","😊","😇","🙂","😉","😍","😘","😎","🤩","🥳","🤗","🤔","😅",
  "😆","😋","😜","🤪","😏","🙄","😬","😴","😢","😭","😤","😡","🥺","😱","🤦","🤷",
  "👍","👎","👌","🤝","🙏","👏","🙌","💪","🫶","✌️","🤙","👋","☝️","✅","❌","⚠️",
  "❤️","🧡","💛","💚","💙","💜","🖤","💔","💯","🔥","✨","⭐","🎉","🎊","🥂","🎁",
  "💰","💵","💳","🧾","📈","📉","📊","📌","📍","📅","⏰","⏳","🔔","📞","📲","💬",
  "🚀","✔️","➡️","⬆️","⬇️","🆗","🆕","🔝","💡","🎯","🤖","🛒","📦","🏷️","💲","🤑",
];

function formatBytes(b: number): string {
  if (b >= 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)}MB`;
  if (b >= 1024) return `${Math.round(b / 1024)}KB`;
  return `${b}B`;
}

export function InputBar(p: Props) {
  const [assinado, setAssinado] = useState(false);
  const [menuAnexo, setMenuAnexo] = useState(false);
  const [menuIA, setMenuIA] = useState(false);
  const [menuEmoji, setMenuEmoji] = useState(false);
  const [visuUnica, setVisuUnica] = useState(false);
  const [iaLoading, setIaLoading] = useState<EstiloIA | null>(null);
  const [gravando, setGravando] = useState(false);
  const [tempoGrav, setTempoGrav] = useState(0);
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [enviandoAnexos, setEnviandoAnexos] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const imgInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const tempIdRef = useRef<string | null>(null);
  const menuAnexoRef = useRef<HTMLDivElement>(null);
  const menuIARef = useRef<HTMLDivElement>(null);
  const menuEmojiRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuAnexoRef.current && !menuAnexoRef.current.contains(e.target as Node)) setMenuAnexo(false);
      if (menuIARef.current && !menuIARef.current.contains(e.target as Node)) setMenuIA(false);
      if (menuEmojiRef.current && !menuEmojiRef.current.contains(e.target as Node)) setMenuEmoji(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function inserirEmoji(emo: string) {
    const ta = taRef.current;
    if (!ta) { p.setText(p.text + emo); return; }
    const start = ta.selectionStart ?? p.text.length;
    const end = ta.selectionEnd ?? p.text.length;
    p.setText(p.text.slice(0, start) + emo + p.text.slice(end));
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + emo.length;
      ta.setSelectionRange(pos, pos);
    });
  }

  function textoFinal(): string {
    if (assinado && p.text.trim()) return `*${p.atendenteNome}*:\n${p.text}`;
    return p.text;
  }

  async function enviarComAssinatura() {
    // Com anexos na fila, envia mídia (texto vira legenda da primeira)
    if (anexos.length > 0) {
      await enviarAnexos();
      return;
    }
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
  // Fila de anexos (preview antes de enviar)
  // ====================
  function detectarTipo(file: File): "image" | "video" | "document" {
    if (file.type.startsWith("image/")) return "image";
    if (file.type.startsWith("video/")) return "video";
    return "document";
  }

  /**
   * Converte AVIF/HEIC/HEIF → JPEG via canvas (WhatsApp não aceita esses).
   * Browser decodifica AVIF nativamente em <img>. HEIC só roda em Safari/iOS;
   * fora disso retornamos null e o usuário vê aviso.
   */
  async function converterImagemSeNecessario(f: File): Promise<File | null> {
    const ext = f.name.toLowerCase().split(".").pop() || "";
    const mime = (f.type || "").toLowerCase();
    const incompativel =
      ["avif", "heic", "heif"].includes(ext) ||
      mime.includes("avif") ||
      mime.includes("heic") ||
      mime.includes("heif");
    if (!incompativel) return f;

    try {
      const url = URL.createObjectURL(f);
      const img = new Image();
      const ok: boolean = await new Promise((res) => {
        img.onload = () => res(true);
        img.onerror = () => res(false);
        img.src = url;
      });
      if (!ok || !img.naturalWidth) {
        URL.revokeObjectURL(url);
        return null;
      }
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) { URL.revokeObjectURL(url); return null; }
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);

      const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, "image/jpeg", 0.92));
      if (!blob) return null;
      const nome = f.name.replace(/\.(avif|heic|heif)$/i, ".jpg");
      return new File([blob], nome, { type: "image/jpeg" });
    } catch {
      return null;
    }
  }

  async function addAnexos(files: FileList | File[]) {
    const novos: Anexo[] = [];
    for (const original of Array.from(files)) {
      let f = original;
      const tipoOriginal = detectarTipo(f);
      // só tenta converter quando é imagem
      if (tipoOriginal === "image") {
        const convertido = await converterImagemSeNecessario(f);
        if (!convertido) {
          alert(`"${f.name}" tem formato (AVIF/HEIC) que o WhatsApp não aceita e não consegui converter. Salve como JPG/PNG e tente de novo.`);
          continue;
        }
        f = convertido;
      }
      if (f.size > 30 * 1024 * 1024) {
        alert(`"${f.name}" passa de 30MB — não dá pra enviar pelo WhatsApp.`);
        continue;
      }
      const tipo = detectarTipo(f);
      novos.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file: f,
        tipo,
        previewUrl: tipo === "image" || tipo === "video" ? URL.createObjectURL(f) : null,
      });
    }
    if (novos.length) setAnexos((prev) => [...prev, ...novos]);
    setMenuAnexo(false);
  }

  function removerAnexo(id: string) {
    setAnexos((prev) => {
      const alvo = prev.find((a) => a.id === id);
      if (alvo?.previewUrl) URL.revokeObjectURL(alvo.previewUrl);
      return prev.filter((a) => a.id !== id);
    });
  }

  function fileToBase64(f: File | Blob): Promise<string> {
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

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.length) void addAnexos(e.target.files);
    e.target.value = "";
  }

  function onPaste(e: React.ClipboardEvent) {
    const files = Array.from(e.clipboardData?.files || []);
    if (files.length) {
      e.preventDefault();
      void addAnexos(files);
    }
  }

  async function enviarAnexos() {
    if (!p.canalId || anexos.length === 0) return;
    setEnviandoAnexos(true);
    const caption = textoFinal().trim();
    const fila = [...anexos];
    try {
      for (let i = 0; i < fila.length; i++) {
        const a = fila[i];
        const base64 = await fileToBase64(a.file);
        const r = await fetch(`/api/canais/${p.canalId}/send`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            ticketId: p.ticketId,
            media: {
              type: a.tipo,
              fileBase64: base64,
              filename: a.file.name,
              mimetype: a.file.type || undefined,
              caption: i === 0 && caption ? caption : undefined,
            },
            // citação e visu única só na primeira mídia da fila
            replyid: i === 0 ? p.replyId || undefined : undefined,
            viewOnce: visuUnica || undefined,
          }),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) {
          alert(`Falha ao enviar "${a.file.name}": ${j.error || j.msg || r.statusText}`);
          setEnviandoAnexos(false);
          return; // mantém os restantes na fila
        }
        removerAnexo(a.id);
      }
      p.setText("");
      setVisuUnica(false);
      p.onClearReply?.();
    } catch (e) {
      alert(`Erro: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setEnviandoAnexos(false);
    }
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
    <div
      style={{ borderTop: dragOver ? "2px dashed #10b981" : "0.5px solid var(--mk-border)", background: dragOver ? "rgba(16,185,129,0.08)" : "var(--mk-surface)", transition: "background 0.15s ease" }}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer?.files?.length) void addAnexos(e.dataTransfer.files);
      }}
    >
      {/* Fila de anexos (preview antes de enviar) */}
      {anexos.length > 0 && !gravando && (
        <div style={{ display: "flex", gap: 10, padding: "12px 14px 4px", flexWrap: "wrap" }}>
          {anexos.map((a) => (
            <div key={a.id} style={{ position: "relative", width: 72, height: 72 }}>
              {a.tipo === "image" && a.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.previewUrl} alt={a.file.name} style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 10, border: "0.5px solid var(--mk-border)", display: "block" }} />
              ) : a.tipo === "video" && a.previewUrl ? (
                <video src={a.previewUrl} muted style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 10, border: "0.5px solid var(--mk-border)", display: "block", background: "#000" }} />
              ) : (
                <div title={a.file.name} style={{ width: 72, height: 72, borderRadius: 10, border: "0.5px solid var(--mk-border)", background: "var(--mk-surface-2)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, color: "var(--mk-text-secondary)", overflow: "hidden", padding: 4 }}>
                  <i className={`ti ${a.tipo === "video" ? "ti-video" : "ti-file"}`} style={{ fontSize: 22 }} />
                  <span style={{ fontSize: 8, maxWidth: 64, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.file.name}</span>
                </div>
              )}
              {/* Tamanho */}
              <span style={{ position: "absolute", bottom: 3, left: 3, fontSize: 8.5, fontWeight: 600, padding: "1px 5px", borderRadius: 5, background: "rgba(0,0,0,0.65)", color: "#fff" }}>
                {formatBytes(a.file.size)}
              </span>
              {/* X remover */}
              <button
                onClick={() => removerAnexo(a.id)}
                title="Remover"
                style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", border: 0, background: "#C0392B", color: "#fff", cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 6px rgba(0,0,0,0.4)" }}
              >
                <i className="ti ti-x" />
              </button>
            </div>
          ))}
          {enviandoAnexos && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--mk-text-muted)" }}>
              <i className="ti ti-loader-2" style={{ animation: "spin 1s linear infinite" }} /> Enviando…
            </div>
          )}
        </div>
      )}

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
            ref={taRef}
            value={p.text}
            onChange={(e) => p.setText(e.target.value)}
            onPaste={onPaste}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                enviarComAssinatura();
              }
            }}
            placeholder={!p.canalConectado ? "Canal desconectado" : anexos.length > 0 ? "Legenda (opcional)…" : "Digite uma mensagem…"}
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
            {/* Emoji */}
            <div style={{ position: "relative" }} ref={menuEmojiRef}>
              <IconBtn icon="ti-mood-smile" title="Emojis" onClick={() => setMenuEmoji((s) => !s)} active={menuEmoji} />
              {menuEmoji && (
                <div style={{ ...menuStyle, width: 296, maxHeight: 220, overflowY: "auto", padding: 8 }} className="chat-scroll">
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 2 }}>
                    {EMOJIS.map((emo) => (
                      <button
                        key={emo}
                        type="button"
                        onClick={() => inserirEmoji(emo)}
                        title={emo}
                        style={{ fontSize: 20, lineHeight: 1, padding: "5px 0", background: "transparent", border: 0, borderRadius: 6, cursor: "pointer" }}
                        onMouseEnter={(ev) => ((ev.currentTarget as HTMLButtonElement).style.background = "var(--mk-surface-2)")}
                        onMouseLeave={(ev) => ((ev.currentTarget as HTMLButtonElement).style.background = "transparent")}
                      >
                        {emo}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {/* Anexar */}
            <div style={{ position: "relative" }} ref={menuAnexoRef}>
              <IconBtn icon="ti-paperclip" title="Anexar arquivo" onClick={() => setMenuAnexo((s) => !s)} active={menuAnexo} />
              {menuAnexo && (
                <div style={menuStyle}>
                  <MenuItem icon="ti-photo" onClick={() => { imgInputRef.current?.click(); setMenuAnexo(false); }}>Imagem</MenuItem>
                  <MenuItem icon="ti-video" onClick={() => { videoInputRef.current?.click(); setMenuAnexo(false); }}>Vídeo</MenuItem>
                  <MenuItem icon="ti-file" onClick={() => { docInputRef.current?.click(); setMenuAnexo(false); }}>Documento</MenuItem>
                  <MenuItem icon="ti-microphone" onClick={iniciarGravacao}>Gravar áudio</MenuItem>
                </div>
              )}
            </div>
            <input ref={imgInputRef} type="file" hidden multiple onChange={onPickFile} accept="image/*" />
            <input ref={videoInputRef} type="file" hidden multiple onChange={onPickFile} accept="video/*" />
            <input ref={docInputRef} type="file" hidden multiple onChange={onPickFile} accept="application/pdf,application/*,text/*,.doc,.docx,.xls,.xlsx,.csv,.zip" />

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

            {/* Visu única — só com mídia na fila */}
            {anexos.length > 0 && (
              <label style={{ display: "flex", alignItems: "center", gap: 5, padding: "0 8px", fontSize: 11, color: visuUnica ? "#9B7DBF" : "var(--mk-text-secondary)", cursor: "pointer" }} title="Enviar a mídia como visualização única">
                <input type="checkbox" checked={visuUnica} onChange={(e) => setVisuUnica(e.target.checked)} />
                <i className="ti ti-eye" /> Visu única
              </label>
            )}

            <div style={{ flex: 1 }} />

            {/* Microfone */}
            <IconBtn icon="ti-microphone" title="Gravar áudio" onClick={iniciarGravacao} disabled={!p.canalConectado} />

            {/* Enviar */}
            <button
              onClick={enviarComAssinatura}
              disabled={!p.canalConectado || p.sending || enviandoAnexos || (!p.text.trim() && anexos.length === 0)}
              style={{
                background: "#25D366",
                border: 0,
                borderRadius: "50%",
                width: 36,
                height: 36,
                color: "#FFFDF8",
                cursor: (p.text.trim() || anexos.length > 0) ? "pointer" : "not-allowed",
                opacity: (p.text.trim() || anexos.length > 0) ? 1 : 0.4,
              }}
              title="Enviar"
            >
              <i className="ti ti-send" />
            </button>
          </div>
        </>
      )}
      <style>{`@keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.3 } } @keyframes spin { to { transform: rotate(360deg) } }`}</style>
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
