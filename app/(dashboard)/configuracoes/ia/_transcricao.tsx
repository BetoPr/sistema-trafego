"use client";

import { useState, useTransition } from "react";
import { salvarTranscricao } from "../groqcloud/_actions";

/**
 * Transcrição de áudio — usa a MESMA chave Groq configurada acima (uma só chave
 * faz transcrição com Whisper Large v3 + resumo/análise com Llama 3.3 70B).
 * Aqui só ligamos/desligamos a transcrição e escolhemos o idioma. Auto-salva.
 */
export function TranscricaoCard({ inicial }: { inicial: { ativa: boolean; idioma: string } }) {
  const [ativa, setAtiva] = useState(inicial.ativa);
  const [idioma, setIdioma] = useState(inicial.idioma);
  const [msg, setMsg] = useState("");
  const [, start] = useTransition();

  function flash(t: string) { setMsg(t); setTimeout(() => setMsg(""), 1600); }
  function persist(next: { ativa?: boolean; idioma?: string }) {
    const novo = { ativa: next.ativa ?? ativa, idioma: next.idioma ?? idioma };
    start(async () => { await salvarTranscricao(novo); flash("Salvo"); });
  }

  return (
    <div className="mk-card mk-card-lg" style={{ marginBottom: 14, borderLeft: "3px solid #F55036" }}>
      <h3 className="card-title" style={{ marginBottom: 4 }}>🎙️ Transcrição de áudio</h3>
      <p style={{ fontSize: 11.5, color: "var(--mk-text-muted)", marginBottom: 6, lineHeight: 1.6 }}>
        Usa a <strong>mesma chave Groq acima</strong> — não precisa de outra chave. Modelo fixo <strong>Whisper Large v3</strong>.
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "0.5px solid var(--mk-border)" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--mk-text)" }}>Habilitar transcrição</div>
          <div style={{ fontSize: 11.5, color: "var(--mk-text-muted)", marginTop: 2 }}>Transcreve os áudios recebidos. Não afeta resumo/análise.</div>
        </div>
        <Switch on={ativa} onToggle={() => { const v = !ativa; setAtiva(v); persist({ ativa: v }); }} />
      </div>

      <div style={{ marginTop: 14 }}>
        <label style={lbl}>Idioma</label>
        <select value={idioma} onChange={(e) => { setIdioma(e.target.value); persist({ idioma: e.target.value }); }} style={inp}>
          <option value="pt">Português</option>
          <option value="en">Inglês</option>
          <option value="es">Espanhol</option>
        </select>
      </div>

      <div style={{ marginTop: 14 }}>
        <label style={lbl}>Modelo</label>
        <div style={{ ...inp, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          Whisper Large v3
          <i className="ti ti-lock" style={{ fontSize: 13, color: "var(--mk-text-muted)" }} title="Modelo fixo para transcrição" />
        </div>
      </div>

      <div style={{ fontSize: 11, color: "var(--mk-text-muted)", marginTop: 14, display: "flex", alignItems: "center", gap: 6 }}>
        <i className="ti ti-info-circle" /> As alterações são salvas automaticamente.
        {msg && <span style={{ marginLeft: "auto", color: "#10b981" }}><i className="ti ti-check" /> {msg}</span>}
      </div>
    </div>
  );
}

function Switch({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button" role="switch" aria-checked={on} onClick={onToggle}
      style={{ width: 46, height: 26, borderRadius: 13, border: 0, cursor: "pointer", position: "relative", background: on ? "#10b981" : "var(--mk-surface-2)", transition: "background 0.18s", flexShrink: 0 }}
    >
      <span style={{ position: "absolute", top: 3, left: on ? 23 : 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left 0.18s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
    </button>
  );
}

const lbl: React.CSSProperties = { display: "block", fontSize: 12.5, fontWeight: 600, color: "var(--mk-text)", marginBottom: 6 };
const inp: React.CSSProperties = { width: "100%", padding: "10px 12px", borderRadius: 8, border: "0.5px solid var(--mk-border)", background: "var(--mk-surface-2)", color: "var(--mk-text)", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" };
