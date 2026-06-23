"use client";

import { useState, useTransition } from "react";
import { salvarTranscricao, salvarGroqKey } from "./_actions";

const MASK = "••••••••••••••••••••••••••••••••";

interface Props {
  temChave: boolean;
  inicial: { ativa: boolean; idioma: string };
}

export function GroqCloudCard({ temChave, inicial }: Props) {
  const [ativa, setAtiva] = useState(inicial.ativa);
  const [idioma, setIdioma] = useState(inicial.idioma);
  const [chave, setChave] = useState("");
  const [ver, setVer] = useState(false);
  const [editandoChave, setEditandoChave] = useState(!temChave);
  const [savingKey, setSavingKey] = useState(false);
  const [msg, setMsg] = useState("");
  const [, start] = useTransition();

  function flash(t: string) { setMsg(t); setTimeout(() => setMsg(""), 1600); }

  function persist(next: { ativa?: boolean; idioma?: string }) {
    const novo = { ativa: next.ativa ?? ativa, idioma: next.idioma ?? idioma };
    start(async () => {
      await salvarTranscricao(novo);
      flash("Alterações salvas");
    });
  }

  async function salvarChave() {
    if (!chave.trim()) return;
    setSavingKey(true);
    const r = await salvarGroqKey(chave.trim());
    setSavingKey(false);
    if (r?.ok) { setChave(""); setEditandoChave(false); flash("Chave salva"); }
  }

  return (
    <div className="mk-card mk-card-lg">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <i className="ti ti-cpu" style={{ fontSize: 18, color: "var(--mk-text)" }} />
        <h3 className="card-title" style={{ margin: 0 }}>GroqCloud</h3>
      </div>

      {/* Habilitar (só transcrição) */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 0", borderBottom: "0.5px solid var(--mk-border)" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--mk-text)" }}>Habilitar transcrição</div>
          <div style={{ fontSize: 11.5, color: "var(--mk-text-muted)", marginTop: 2 }}>Ativar transcrição de áudio via GroqCloud (Whisper). Não afeta resumo/sentimento.</div>
        </div>
        <Switch on={ativa} onToggle={() => { const v = !ativa; setAtiva(v); persist({ ativa: v }); }} />
      </div>

      {/* API Key — pontinhos + olho */}
      <Campo label="API Key">
        {!editandoChave && temChave ? (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ ...inp, display: "flex", alignItems: "center", color: "var(--mk-text-muted)", letterSpacing: 2 }}>{MASK}</div>
            <button type="button" className="ghost-btn" style={{ fontSize: 11.5, whiteSpace: "nowrap" }} onClick={() => { setEditandoChave(true); setChave(""); setVer(false); }}>
              <i className="ti ti-pencil" /> Trocar
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ position: "relative", flex: 1 }}>
              <input
                type={ver ? "text" : "password"}
                value={chave}
                onChange={(e) => setChave(e.target.value)}
                placeholder="gsk_..."
                style={{ ...inp, paddingRight: 40, width: "100%" }}
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setVer((s) => !s)}
                title={ver ? "Ocultar" : "Mostrar"}
                style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "transparent", border: 0, color: "var(--mk-text-muted)", cursor: "pointer", padding: 6 }}
              >
                <i className={`ti ${ver ? "ti-eye-off" : "ti-eye"}`} />
              </button>
            </div>
            <button type="button" className="cta-btn" style={{ fontSize: 12, whiteSpace: "nowrap" }} disabled={savingKey || !chave.trim()} onClick={salvarChave}>
              <i className="ti ti-device-floppy" /> {savingKey ? "Salvando…" : "Salvar"}
            </button>
            {temChave && (
              <button type="button" className="ghost-btn" style={{ fontSize: 11.5 }} onClick={() => { setEditandoChave(false); setChave(""); }}>
                Cancelar
              </button>
            )}
          </div>
        )}
      </Campo>

      {/* Idioma */}
      <Campo label="Idioma">
        <select value={idioma} onChange={(e) => { setIdioma(e.target.value); persist({ idioma: e.target.value }); }} style={inp}>
          <option value="pt">Português</option>
          <option value="en">Inglês</option>
          <option value="es">Espanhol</option>
        </select>
      </Campo>

      {/* Modelo — fixo Whisper Large v3 (transcrição) */}
      <Campo label="Modelo">
        <div style={{ ...inp, display: "flex", alignItems: "center", justifyContent: "space-between", color: "var(--mk-text)" }}>
          Whisper Large v3
          <i className="ti ti-lock" style={{ fontSize: 13, color: "var(--mk-text-muted)" }} title="Modelo fixo para transcrição" />
        </div>
        <div style={{ fontSize: 10.5, color: "var(--mk-text-muted)", marginTop: 4 }}>Modelo dedicado à transcrição de áudio.</div>
      </Campo>

      <div style={{ fontSize: 11, color: "var(--mk-text-muted)", marginTop: 14, display: "flex", alignItems: "center", gap: 6 }}>
        <i className="ti ti-info-circle" /> As alterações são salvas automaticamente.
        {msg && <span style={{ marginLeft: "auto", color: "#00E19A" }}><i className="ti ti-check" /> {msg}</span>}
      </div>
    </div>
  );
}

function Switch({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      style={{
        width: 46, height: 26, borderRadius: 13, border: 0, cursor: "pointer", position: "relative",
        background: on ? "#00E19A" : "var(--mk-surface-2)", transition: "background 0.18s", flexShrink: 0,
      }}
    >
      <span style={{ position: "absolute", top: 3, left: on ? 23 : 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left 0.18s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
    </button>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 16 }}>
      <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "var(--mk-text)", marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

const inp: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 8, border: "0.5px solid var(--mk-border)",
  background: "var(--mk-surface-2)", color: "var(--mk-text)", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box",
};
