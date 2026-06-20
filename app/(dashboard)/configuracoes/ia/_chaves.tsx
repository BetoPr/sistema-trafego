"use client";

import { useState } from "react";
import { adicionarChaveIA, removerChaveIA, atualizarLimiteChaveIA } from "./_actions";

export interface ChaveItem {
  id: string;
  rotulo: string | null;
  criado_em: string;
  /** Limite de follow-ups/dia desta chave (Fase 3). 0 = sem limite. */
  limiteFollowupDia?: number;
}

const inp: React.CSSProperties = {
  width: "100%", padding: "8px 12px", borderRadius: 8, border: "0.5px solid var(--mk-border)",
  background: "var(--mk-surface-2)", color: "var(--mk-text)", fontSize: 12.5, fontFamily: "monospace",
};

/**
 * Gerenciador de chaves de um provider (Groq/OpenAI). Lista as chaves cadastradas
 * (ia_chaves) com remover, e um form pra adicionar. Várias chaves = rotação
 * automática (cada Groq = ~100k tokens/dia).
 */
export function ChavesManager({
  provider, titulo, emoji, cor, placeholder, chaves, ajuda, rotacao,
}: {
  provider: "groq" | "openai" | "anthropic";
  titulo: string;
  emoji: string;
  cor?: string;
  placeholder: string;
  chaves: ChaveItem[];
  ajuda?: React.ReactNode;
  rotacao?: boolean;
}) {
  const [aberto, setAberto] = useState(chaves.length === 0);
  const [testes, setTestes] = useState<Record<string, { loading?: boolean; ok?: boolean; msg?: string }>>({});

  async function testar(id: string) {
    setTestes((t) => ({ ...t, [id]: { loading: true } }));
    try {
      const r = await fetch("/api/ia/testar-chave", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) });
      const j = await r.json();
      setTestes((t) => ({ ...t, [id]: { ok: !!j.ok, msg: String(j.msg || (j.ok ? "OK" : "Falhou")) } }));
    } catch {
      setTestes((t) => ({ ...t, [id]: { ok: false, msg: "Falha de rede" } }));
    }
  }

  return (
    <div className="mk-card mk-card-lg" style={{ marginBottom: 14, borderLeft: cor ? `3px solid ${cor}` : undefined }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
        <h3 className="card-title">{emoji} {titulo}</h3>
        <span className={`mk-badge ${chaves.length ? "b-green" : "b-gray"}`} style={{ marginLeft: "auto", fontSize: 10 }}>
          {chaves.length ? `● ${chaves.length} chave${chaves.length > 1 ? "s" : ""}` : "○ Nenhuma"}
        </span>
      </div>

      {rotacao && (
        <p style={{ fontSize: 11.5, color: "var(--mk-text-muted)", marginBottom: 12, lineHeight: 1.6 }}>
          <i className="ti ti-refresh" style={{ color: cor }} /> <strong>Rotação automática:</strong> com várias chaves o
          sistema reveza entre elas. Cada chave Groq rende ~100 mil tokens/dia — <strong>3 chaves = ~300 mil/dia</strong>.
          Quando uma bate o limite (429), pula pra próxima; esgotadas, cai pro OpenAI (se configurado).
        </p>
      )}

      {/* Lista de chaves — cada uma com teste individual */}
      {chaves.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
          {chaves.map((c, i) => {
            const t = testes[c.id];
            return (
              <div key={c.id} style={{ background: "var(--mk-surface-2)", borderRadius: 8, padding: "8px 10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: cor || "var(--mk-accent)", minWidth: 18 }}>#{i + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, color: "var(--mk-text)", fontWeight: 600 }}>{c.rotulo || `Chave ${i + 1}`}</div>
                    <div style={{ fontSize: 10, color: "var(--mk-text-muted)", fontFamily: "monospace" }}>
                      •••••••••• · add {new Date(c.criado_em).toLocaleDateString("pt-BR")}
                    </div>
                  </div>
                  <button type="button" onClick={() => testar(c.id)} disabled={t?.loading} className="ghost-btn" style={{ fontSize: 11, padding: "4px 9px" }} title="Testar só esta chave">
                    <i className="ti ti-plug-connected" /> {t?.loading ? "Testando…" : "Testar"}
                  </button>
                  <form action={removerChaveIA} onSubmit={(e) => { if (!confirm(`Remover "${c.rotulo || `Chave ${i + 1}`}"? Essa chave deixa de ser usada.`)) e.preventDefault(); }}>
                    <input type="hidden" name="id" value={c.id} />
                    <button type="submit" className="ghost-btn" style={{ fontSize: 11, color: "#C97064", padding: "4px 8px" }} title="Remover">
                      <i className="ti ti-trash" />
                    </button>
                  </form>
                </div>
                {provider === "groq" && (
                  <form action={atualizarLimiteChaveIA} style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, fontSize: 10.5, color: "var(--mk-text-muted)", flexWrap: "wrap" }}>
                    <input type="hidden" name="id" value={c.id} />
                    <i className="ti ti-shield-half" /> Máx. follow-ups/dia:
                    <input
                      type="number" name="limite_followup_dia" min={0} max={100000} defaultValue={c.limiteFollowupDia ?? 80}
                      style={{ width: 72, padding: "3px 6px", borderRadius: 6, border: "0.5px solid var(--mk-border)", background: "var(--mk-bg)", color: "var(--mk-text)", fontSize: 11, fontFamily: "inherit" }}
                    />
                    <button type="submit" className="ghost-btn" style={{ fontSize: 10.5, padding: "3px 8px" }}>Salvar</button>
                    <span style={{ opacity: 0.7 }}>0 = sem limite · bate o teto → cai pra próxima chave/OpenAI</span>
                  </form>
                )}
                {t && !t.loading && (
                  <div style={{ marginTop: 6, fontSize: 11, color: t.ok ? "#10b981" : "#C97064", display: "flex", alignItems: "center", gap: 5 }}>
                    <i className={`ti ${t.ok ? "ti-circle-check" : "ti-alert-triangle"}`} /> {t.msg}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Adicionar */}
      {aberto ? (
        <form action={adicionarChaveIA} style={{ display: "flex", flexDirection: "column", gap: 8, padding: 10, background: "var(--mk-surface-2)", borderRadius: 8 }}>
          <input type="hidden" name="provider" value={provider} />
          <input name="rotulo" placeholder="Apelido (ex: Conta 1) — opcional" style={{ ...inp, fontFamily: "inherit" }} />
          <input type="password" name="key" placeholder={placeholder} style={inp} required autoComplete="off" />
          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" className="cta-btn" style={{ fontSize: 12 }}>
              <i className="ti ti-plus" /> Adicionar chave
            </button>
            {chaves.length > 0 && (
              <button type="button" onClick={() => setAberto(false)} className="ghost-btn" style={{ fontSize: 12 }}>Cancelar</button>
            )}
          </div>
        </form>
      ) : (
        <button type="button" onClick={() => setAberto(true)} className="ghost-btn" style={{ fontSize: 12 }}>
          <i className="ti ti-plus" /> Adicionar {rotacao ? "outra chave (rotação)" : "chave"}
        </button>
      )}

      {ajuda && (
        <div style={{ marginTop: 12, padding: 10, background: "var(--mk-surface-2)", borderRadius: 6, fontSize: 11, color: "var(--mk-text-secondary)", lineHeight: 1.6 }}>
          {ajuda}
        </div>
      )}
    </div>
  );
}
