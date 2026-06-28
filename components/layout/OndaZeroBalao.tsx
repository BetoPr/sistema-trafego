"use client";

import { useState } from "react";
import { Balao } from "@/components/ui/Balao";

interface Props {
  mensagem: string;
  whatsappGrupoLink: string | null;
}

export function OndaZeroBalao({ mensagem, whatsappGrupoLink }: Props) {
  const [aberto, setAberto] = useState(true);
  const [dispensando, setDispensando] = useState(false);

  async function dispensar() {
    setDispensando(true);
    try {
      await fetch("/api/onda-zero/dispensar", { method: "POST" });
    } catch {
      /* silencia */
    }
    setAberto(false);
  }

  async function entrarNoGrupo() {
    if (whatsappGrupoLink) window.open(whatsappGrupoLink, "_blank", "noopener,noreferrer");
    await dispensar();
  }

  return (
    <Balao open={aberto} onClose={dispensar} titulo="Bem-vindo à Onda Zero" icone="ti-wave-square" largura={520}>
      <div style={{ padding: "8px 4px 16px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div
          style={{
            padding: "16px 18px",
            background: "linear-gradient(135deg, rgba(0,225,154,0.12), rgba(139,92,246,0.08))",
            border: "1px solid rgba(0,225,154,0.35)",
            borderRadius: 12,
          }}
        >
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 0.5,
                padding: "3px 10px",
                background: "#00E19A",
                color: "#0c0c0c",
                borderRadius: 999,
              }}
            >
              MEMBRO FUNDADOR
            </span>
            <span style={{ fontSize: 11, color: "var(--mk-text-muted)" }}>1 de 10</span>
          </div>
          <div style={{ fontSize: 13.5, lineHeight: 1.6, color: "var(--mk-text)" }}>
            {mensagem}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
          <Beneficio icone="ti-discount" titulo="30% OFF vitalício" desc="Preço travado pra sempre" />
          <Beneficio icone="ti-clock-hour-3" titulo="Trial dobrado" desc="14 ou 28 dias grátis" />
          <Beneficio icone="ti-rocket" titulo="Acesso antecipado" desc="Features antes de todo mundo" />
          <Beneficio icone="ti-microphone" titulo="Voz no roadmap" desc="Decide o que vem depois" />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
          {whatsappGrupoLink ? (
            <button
              type="button"
              onClick={entrarNoGrupo}
              disabled={dispensando}
              className="cta-btn"
              style={{
                fontSize: 13,
                padding: "11px 18px",
                background: "#25D366",
                color: "#0c0c0c",
                fontWeight: 700,
                border: 0,
                borderRadius: 10,
                cursor: "pointer",
              }}
            >
              <i className="ti ti-brand-whatsapp" style={{ marginRight: 6 }} />
              Entrar no grupo da Onda Zero
            </button>
          ) : (
            <div
              style={{
                padding: "10px 14px",
                background: "var(--mk-surface)",
                border: "1px dashed var(--mk-border)",
                borderRadius: 10,
                fontSize: 12,
                color: "var(--mk-text-muted)",
                textAlign: "center",
              }}
            >
              O link do grupo será liberado em breve — o time vai te chamar direto no WhatsApp.
            </div>
          )}
          <button
            type="button"
            onClick={dispensar}
            disabled={dispensando}
            style={{
              fontSize: 11.5,
              padding: "8px 14px",
              background: "transparent",
              color: "var(--mk-text-muted)",
              border: 0,
              cursor: "pointer",
            }}
          >
            {dispensando ? "Fechando..." : "Lembrar depois"}
          </button>
        </div>
      </div>
    </Balao>
  );
}

function Beneficio({ icone, titulo, desc }: { icone: string; titulo: string; desc: string }) {
  return (
    <div
      style={{
        padding: 10,
        background: "var(--mk-surface)",
        border: ".5px solid var(--mk-border)",
        borderRadius: 8,
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
      }}
    >
      <i className={`ti ${icone}`} style={{ fontSize: 18, color: "#00E19A", flexShrink: 0 }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--mk-text)" }}>{titulo}</div>
        <div style={{ fontSize: 10.5, color: "var(--mk-text-muted)", marginTop: 1 }}>{desc}</div>
      </div>
    </div>
  );
}
