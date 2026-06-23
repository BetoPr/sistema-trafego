"use client";

/**
 * Preview de mensagem WhatsApp — bolha verde de saída + fundo dark típico do app.
 * Recebe template com placeholders {{conta}} {{gasto}} {{limite}} {{tipo}} {{nome}}
 * e renderiza com valores de exemplo pra você visualizar como vai chegar pro destinatário.
 */
import { useMemo } from "react";

interface Props {
  template: string;
  contaExemplo?: string;
  limiteExemplo?: number;
  tipo?: "gasto_dia" | "gasto_mes";
  nomeExemplo?: string;
}

function fmtBRL(n: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
}

function aplicar(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);
}

function agoraBR(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function WhatsappPreview({
  template,
  contaExemplo = "Conta de exemplo",
  limiteExemplo = 500,
  tipo = "gasto_dia",
  nomeExemplo = "Alerta",
}: Props) {
  const texto = useMemo(
    () =>
      aplicar(template || "(mensagem vazia)", {
        conta: contaExemplo,
        gasto: fmtBRL(limiteExemplo + 23.4),
        limite: fmtBRL(limiteExemplo),
        tipo: tipo === "gasto_dia" ? "diário" : "mensal",
        nome: nomeExemplo,
      }),
    [template, contaExemplo, limiteExemplo, tipo, nomeExemplo],
  );

  const linhas = texto.split("\n");

  return (
    <div
      style={{
        background:
          "linear-gradient(135deg, #0b141a 0%, #0f1c20 100%)",
        backgroundImage:
          "radial-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), radial-gradient(rgba(255,255,255,0.02) 1px, transparent 1px)",
        backgroundSize: "20px 20px, 20px 20px",
        backgroundPosition: "0 0, 10px 10px",
        borderRadius: 12,
        padding: "18px 14px",
        minHeight: 120,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 6,
        border: ".5px solid var(--mk-border)",
      }}
    >
      <div
        style={{
          position: "relative",
          maxWidth: "82%",
          background: "#005C4B",
          color: "#e9edef",
          padding: "7px 9px 5px",
          borderRadius: "8px 0 8px 8px",
          boxShadow: "0 1px 0.5px rgba(11,20,26,.13)",
          fontSize: 13.5,
          lineHeight: 1.45,
          wordBreak: "break-word",
          whiteSpace: "pre-wrap",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        }}
      >
        <span
          aria-hidden
          style={{
            position: "absolute",
            top: 0,
            right: -7,
            width: 8,
            height: 13,
            background: "#005C4B",
            clipPath: "polygon(0 0, 100% 0, 0 100%)",
          }}
        />
        {linhas.map((l, i) => (
          <div key={i}>{l || " "}</div>
        ))}
        <div
          style={{
            marginTop: 3,
            fontSize: 10.5,
            color: "rgba(233,237,239,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 3,
          }}
        >
          {agoraBR()}
          <i className="ti ti-checks" style={{ fontSize: 13, color: "#53BDEB" }} />
        </div>
      </div>
      <div style={{ fontSize: 10, color: "var(--mk-text-muted)", marginTop: 4 }}>
        Pré-visualização — valores de exemplo
      </div>
    </div>
  );
}
