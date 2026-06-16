"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import type { ResumoUso, IntervaloUso } from "@/lib/ia-atendimento/uso-tokens";
import { formatarUsd } from "@/lib/ia-atendimento/precos";

interface Props {
  resumo: ResumoUso;
  intervalo: IntervaloUso;
  perfilId: string;
}

const fmtInt = (n: number) => new Intl.NumberFormat("pt-BR").format(n);

const fsBloco: React.CSSProperties = {
  border: "0.5px solid var(--mk-border)",
  borderRadius: 10,
  padding: 14,
  background: "var(--mk-surface)",
  marginTop: 18,
};

const lblBloco: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "var(--mk-text)",
  padding: "0 6px",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
};

const kpiGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
  gap: 8,
  marginBottom: 14,
};

const kpiCard: React.CSSProperties = {
  border: "0.5px solid var(--mk-border)",
  borderRadius: 8,
  padding: "10px 12px",
  background: "var(--mk-surface-2)",
};

const kpiLbl: React.CSSProperties = { fontSize: 10, color: "var(--mk-text-muted)", textTransform: "uppercase", letterSpacing: 0.5 };
const kpiVal: React.CSSProperties = { fontSize: 17, fontWeight: 700, color: "var(--mk-text)", marginTop: 2 };
const kpiSub: React.CSSProperties = { fontSize: 10, color: "var(--mk-text-muted)", marginTop: 2 };

const filtroBtn = (ativo: boolean): React.CSSProperties => ({
  padding: "4px 10px",
  fontSize: 11,
  borderRadius: 6,
  border: `0.5px solid ${ativo ? "#9B7DBF" : "var(--mk-border)"}`,
  background: ativo ? "rgba(155,125,191,0.2)" : "transparent",
  color: ativo ? "#9B7DBF" : "var(--mk-text)",
  cursor: "pointer",
  fontWeight: 600,
});

const INTERVALOS: Array<{ key: IntervaloUso; label: string }> = [
  { key: "24h",   label: "24h" },
  { key: "7d",    label: "7 dias" },
  { key: "30d",   label: "30 dias" },
  { key: "total", label: "Total" },
];

export default function UsoTokensCard({ resumo, intervalo, perfilId }: Props) {
  const router = useRouter();
  const search = useSearchParams();
  const [pending, startTransition] = useTransition();

  function trocarIntervalo(novo: IntervaloUso) {
    const params = new URLSearchParams(search.toString());
    params.set("editar", perfilId);
    params.set("uso", novo);
    startTransition(() => router.replace(`?${params.toString()}`, { scroll: false }));
  }

  const maxTokens = Math.max(1, ...resumo.por_dia.map((d) => d.tokens_in + d.tokens_out));

  return (
    <fieldset style={fsBloco}>
      <legend style={lblBloco}>
        <i className="ti ti-coin" style={{ color: "#C9A876" }} /> Uso de tokens
      </legend>

      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        {INTERVALOS.map((it) => (
          <button
            key={it.key}
            type="button"
            onClick={() => trocarIntervalo(it.key)}
            style={filtroBtn(it.key === intervalo)}
            disabled={pending}
          >
            {it.label}
          </button>
        ))}
        {pending && <span style={{ fontSize: 11, color: "var(--mk-text-muted)", alignSelf: "center" }}>carregando...</span>}
      </div>

      <div style={kpiGrid}>
        <div style={kpiCard}>
          <div style={kpiLbl}>Respostas</div>
          <div style={kpiVal}>{fmtInt(resumo.respostas)}</div>
        </div>
        <div style={kpiCard}>
          <div style={kpiLbl}>Tokens IN</div>
          <div style={kpiVal}>{fmtInt(resumo.tokens_in)}</div>
          <div style={kpiSub}>média {fmtInt(resumo.media_in)}/resp</div>
        </div>
        <div style={kpiCard}>
          <div style={kpiLbl}>Tokens OUT</div>
          <div style={kpiVal}>{fmtInt(resumo.tokens_out)}</div>
          <div style={kpiSub}>média {fmtInt(resumo.media_out)}/resp</div>
        </div>
        <div style={kpiCard}>
          <div style={kpiLbl}>Custo USD</div>
          <div style={kpiVal}>{formatarUsd(resumo.custo_usd)}</div>
          <div style={kpiSub}>estimado</div>
        </div>
      </div>

      <div>
        <div style={{ fontSize: 11, color: "var(--mk-text-muted)", marginBottom: 6 }}>
          Últimos 7 dias (tokens IN + OUT por dia)
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 80, padding: "0 4px" }}>
          {resumo.por_dia.map((d) => {
            const total = d.tokens_in + d.tokens_out;
            const altura = total > 0 ? Math.max(4, (total / maxTokens) * 70) : 2;
            const dia = new Date(d.dia + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short" }).slice(0, 3);
            return (
              <div key={d.dia} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                <div
                  title={`${d.dia}: ${fmtInt(total)} tokens (${fmtInt(d.respostas)} resp, ${formatarUsd(d.custo_usd)})`}
                  style={{
                    width: "100%",
                    height: altura,
                    background: total > 0 ? "linear-gradient(180deg, #9B7DBF 0%, #5B8BA6 100%)" : "var(--mk-border)",
                    borderRadius: "4px 4px 0 0",
                  }}
                />
                <div style={{ fontSize: 9, color: "var(--mk-text-muted)" }}>{dia}</div>
              </div>
            );
          })}
        </div>
      </div>
    </fieldset>
  );
}
