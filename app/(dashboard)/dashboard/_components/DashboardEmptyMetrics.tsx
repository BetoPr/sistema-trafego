"use client";

import { usePlatform } from "@/components/providers/PlatformProvider";
import { PLATFORMS } from "@/lib/platform";

export function DashboardEmptyMetrics() {
  const { ativa } = usePlatform();
  if (!ativa) return null;
  const info = PLATFORMS[ativa];

  const KPIS = [
    { label: "Investido", value: "—", icon: "ti-currency-dollar" },
    { label: "Faturamento", value: "—", icon: "ti-coins" },
    { label: "ROAS médio", value: "—", icon: "ti-target-arrow" },
    { label: "Leads", value: "—", icon: "ti-user-plus" },
    { label: "CPL médio", value: "—", icon: "ti-cash" },
    { label: "CAC médio", value: "—", icon: "ti-receipt" },
    { label: "Conversões", value: "—", icon: "ti-shopping-cart" },
    { label: "Campanhas ativas", value: "0", icon: "ti-flame" },
  ];

  return (
    <>
      <div className="meta-card" style={{ marginBottom: 14 }}>
        <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
          <div>
            <div className="label-tiny-w" style={{ color: "rgba(255,253,248,0.75)" }}>
              {info.nome} · aguardando sincronização
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 6 }}>
              <span style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.5px" }}>
                Sem dados ainda
              </span>
            </div>
            <div style={{ fontSize: 11.5, opacity: 0.8, marginTop: 4 }}>
              Conecte uma conta de anúncios e aguarde o primeiro sync (até 3h).
            </div>
          </div>
        </div>
      </div>

      <div className="grid-4">
        {KPIS.slice(0, 4).map((k) => (
          <div key={k.label} className="mk-card">
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span className="label-tiny">{k.label}</span>
              <div className="icon-pill" style={{ background: "var(--mk-surface-2)", color: "var(--mk-text-muted)" }}>
                <i className={`ti ${k.icon}`} style={{ fontSize: 14 }} />
              </div>
            </div>
            <div className="big-num" style={{ color: "var(--mk-text-muted)" }}>{k.value}</div>
            <div style={{ fontSize: 11, marginTop: 5, color: "var(--mk-text-muted)" }}>
              Aguardando sync
            </div>
          </div>
        ))}
      </div>
      <div className="grid-4">
        {KPIS.slice(4).map((k) => (
          <div key={k.label} className="mk-card">
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span className="label-tiny">{k.label}</span>
              <div className="icon-pill" style={{ background: "var(--mk-surface-2)", color: "var(--mk-text-muted)" }}>
                <i className={`ti ${k.icon}`} style={{ fontSize: 14 }} />
              </div>
            </div>
            <div className="big-num" style={{ color: "var(--mk-text-muted)" }}>{k.value}</div>
            <div style={{ fontSize: 11, marginTop: 5, color: "var(--mk-text-muted)" }}>
              Aguardando sync
            </div>
          </div>
        ))}
      </div>

      <div className="mk-card mk-card-lg" style={{ textAlign: "center", padding: "40px 30px" }}>
        <i className={`ti ${info.icon}`} style={{ fontSize: 36, color: "var(--mk-text-muted)", marginBottom: 12 }} />
        <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--mk-text)", marginBottom: 6 }}>
          {info.nome} conectada
        </h3>
        <p style={{ fontSize: 12, color: "var(--mk-text-secondary)", maxWidth: 480, margin: "0 auto", lineHeight: 1.5 }}>
          Gráficos, campanhas, criativos e funil aparecem aqui assim que o primeiro sync completar.
          Pode levar até 3h após conectar a conta.
        </p>
      </div>
    </>
  );
}
