"use client";

import { useState } from "react";
import { adicionarChaveIA, removerChaveIA } from "./_actions";

export interface ChaveItem {
  id: string;
  rotulo: string | null;
  criado_em: string;
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

      {/* Lista de chaves */}
      {chaves.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
          {chaves.map((c, i) => (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "var(--mk-surface-2)", borderRadius: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: cor || "var(--mk-accent)", minWidth: 18 }}>#{i + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, color: "var(--mk-text)", fontWeight: 600 }}>{c.rotulo || `Chave ${i + 1}`}</div>
                <div style={{ fontSize: 10, color: "var(--mk-text-muted)", fontFamily: "monospace" }}>
                  •••••••••• · add {new Date(c.criado_em).toLocaleDateString("pt-BR")}
                </div>
              </div>
              <form action={removerChaveIA} onSubmit={(e) => { if (!confirm(`Remover "${c.rotulo || `Chave ${i + 1}`}"? Essa chave deixa de ser usada.`)) e.preventDefault(); }}>
                <input type="hidden" name="id" value={c.id} />
                <button type="submit" className="ghost-btn" style={{ fontSize: 11, color: "#C97064", padding: "4px 8px" }} title="Remover">
                  <i className="ti ti-trash" />
                </button>
              </form>
            </div>
          ))}
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
