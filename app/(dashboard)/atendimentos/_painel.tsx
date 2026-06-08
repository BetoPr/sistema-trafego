"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Contato {
  id: string;
  nome: string;
  whatsapp: string | null;
  ia_habilitada: boolean;
}

interface Ticket {
  id: string;
  numero: number;
  sentimento: string | null;
  sentimento_confianca: number | null;
  sentimento_motivo: string | null;
  resumo: string | null;
  resumo_atualizado_em: string | null;
}

interface Tag {
  id: string;
  nome: string;
  cor: string;
}

interface Props {
  ticket: Ticket;
  contato: Contato;
  etiquetas: Tag[];
}

export function PainelDireito({ ticket, contato, etiquetas }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<"perfil" | "atend" | "util">("perfil");
  const [loadingResumo, setLoadingResumo] = useState(false);
  const [loadingSent, setLoadingSent] = useState(false);

  async function gerarResumo() {
    setLoadingResumo(true);
    try {
      const r = await fetch(`/api/atendimentos/${ticket.id}/resumo`, { method: "POST" });
      const j = await r.json();
      if (!r.ok) alert(`Erro: ${j.error || j.msg}`);
      else router.refresh();
    } finally {
      setLoadingResumo(false);
    }
  }

  async function gerarSentimento() {
    setLoadingSent(true);
    try {
      const r = await fetch(`/api/atendimentos/${ticket.id}/sentimento`, { method: "POST" });
      const j = await r.json();
      if (!r.ok) alert(`Erro: ${j.error || j.msg}`);
      else router.refresh();
    } finally {
      setLoadingSent(false);
    }
  }

  const sentimentoCor = ticket.sentimento === "muito_bom" ? "#6B8E4E" : ticket.sentimento === "bom" ? "#5B8BA6" : ticket.sentimento === "ruim" ? "#C97064" : "var(--mk-text-muted)";
  const sentimentoLabel = ticket.sentimento === "muito_bom" ? "Muito bom" : ticket.sentimento === "bom" ? "Bom" : ticket.sentimento === "ruim" ? "Ruim" : "Não analisado";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <div style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--mk-border)", fontSize: 13, fontWeight: 600 }}>Detalhes do contato</div>
      <div style={{ display: "flex", borderBottom: "0.5px solid var(--mk-border)" }}>
        {[
          { id: "perfil", label: "Perfil" },
          { id: "atend", label: "Atend." },
          { id: "util", label: "Util." },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as typeof tab)}
            style={{
              flex: 1,
              padding: "8px 6px",
              background: tab === t.id ? "var(--mk-surface)" : "transparent",
              border: 0,
              borderBottom: tab === t.id ? "2px solid var(--mk-accent)" : "2px solid transparent",
              color: tab === t.id ? "var(--mk-text)" : "var(--mk-text-muted)",
              fontSize: 11.5,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
        {tab === "perfil" && (
          <>
            <div style={{ textAlign: "center", marginBottom: 14 }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(155,125,191,0.25)", color: "#9B7DBF", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 22 }}>
                {contato.nome.slice(0, 2).toUpperCase()}
              </div>
              <div style={{ marginTop: 8, fontSize: 13, fontWeight: 600 }}>{contato.nome}</div>
              <div style={{ fontSize: 10.5, color: "var(--mk-text-muted)", fontFamily: "monospace" }}>{contato.whatsapp || "—"}</div>
              <div style={{ marginTop: 6, display: "flex", gap: 4, justifyContent: "center", flexWrap: "wrap" }}>
                {contato.ia_habilitada && <span className="mk-badge b-purple" style={{ fontSize: 9.5 }}>✨ IA</span>}
              </div>
            </div>

            <Section titulo="Etiquetas">
              {etiquetas.length > 0 ? (
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {etiquetas.map((e) => (
                    <span key={e.id} style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: `${e.cor}33`, color: e.cor, border: `0.5px solid ${e.cor}` }}>{e.nome}</span>
                  ))}
                </div>
              ) : <Empty>Sem etiquetas</Empty>}
            </Section>

            <Section titulo="Resumo IA">
              {ticket.resumo ? (
                <div style={{ fontSize: 11.5, color: "var(--mk-text-secondary)", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                  {ticket.resumo}
                  {ticket.resumo_atualizado_em && (
                    <div style={{ fontSize: 9.5, color: "var(--mk-text-muted)", marginTop: 6 }}>
                      {new Date(ticket.resumo_atualizado_em).toLocaleString("pt-BR")}
                    </div>
                  )}
                </div>
              ) : <Empty>Não gerado ainda.</Empty>}
              <button onClick={gerarResumo} disabled={loadingResumo} className="cta-btn" style={{ marginTop: 8, fontSize: 11, width: "100%" }}>
                <i className="ti ti-sparkles" /> {loadingResumo ? "Gerando..." : "Gerar resumo"}
              </button>
            </Section>
          </>
        )}

        {tab === "atend" && (
          <>
            <Section titulo="Sentimento (IA)">
              <div style={{ fontSize: 12, color: sentimentoCor, fontWeight: 600, marginBottom: 4 }}>
                <i className="ti ti-mood-smile" /> {sentimentoLabel}
                {ticket.sentimento_confianca !== null && ` · ${ticket.sentimento_confianca}%`}
              </div>
              {ticket.sentimento_motivo && (
                <div style={{ fontSize: 11, color: "var(--mk-text-muted)", fontStyle: "italic" }}>“{ticket.sentimento_motivo}”</div>
              )}
              <button onClick={gerarSentimento} disabled={loadingSent} className="ghost-btn" style={{ marginTop: 8, fontSize: 11, width: "100%" }}>
                <i className="ti ti-refresh" /> {loadingSent ? "Analisando..." : "Re-analisar"}
              </button>
            </Section>

            <Section titulo="Protocolo">
              <Empty>Não emitido</Empty>
            </Section>
            <Section titulo="Avaliação">
              <Empty>Não enviada</Empty>
            </Section>
            <Section titulo="Notas">
              <Empty>Sem notas</Empty>
            </Section>
          </>
        )}

        {tab === "util" && (
          <>
            <Section titulo="Exportar conversa">
              <button className="ghost-btn" style={{ fontSize: 11, width: "100%" }} disabled><i className="ti ti-file-export" /> Exportar PDF (em breve)</button>
            </Section>
            <Section titulo="Sanitizar contato">
              <button className="ghost-btn" style={{ fontSize: 11, width: "100%", color: "#C97064" }} disabled><i className="ti ti-eraser" /> Remover dados sensíveis (em breve)</button>
            </Section>
          </>
        )}
      </div>
    </div>
  );
}

function Section({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10.5, color: "var(--mk-text-muted)", fontFamily: "monospace", marginBottom: 6, letterSpacing: 0.5 }}>{titulo.toUpperCase()}</div>
      <div>{children}</div>
    </div>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, color: "var(--mk-text-muted)" }}>{children}</div>;
}
