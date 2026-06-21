"use client";

import { useMemo, useState } from "react";
import { PATH_CONTORNO_BR, proj, ESTADO_POR_UF } from "@/lib/geo/brasil";
import type { DadosMapa } from "./MapaContatosEstado";

const nf = new Intl.NumberFormat("pt-BR");
const nfPct = (n: number) => n.toFixed(1).replace(".", ",");

interface BolhaProps {
  uf: string;
  nome: string;
  count: number;
  xpct: number;
  ypct: number;
  diametro: number;
  fontSize: number;
  fill: string;
  border: string;
  txtColor: string;
}

export function MapaContatosClient({ dados }: { dados: DadosMapa }) {
  const [hover, setHover] = useState<{ tipo: "mapa" | "regiao"; uf: string } | null>(null);

  // Map UF -> count para acesso rápido
  const countPorUf = useMemo(
    () => new Map(dados.porUf.map((p) => [p.uf, p.count])),
    [dados.porUf],
  );
  const maxCount = useMemo(
    () => dados.porUf.reduce((m, p) => (p.count > m ? p.count : m), 0),
    [dados.porUf],
  );

  // Bolhas: posição + tamanho proporcional (sqrt da contagem normalizada)
  const bolhas: BolhaProps[] = useMemo(() => {
    return dados.estados.map((e) => {
      const count = countPorUf.get(e.uf) || 0;
      const it = maxCount > 0 ? Math.sqrt(count / maxCount) : 0;
      const p = proj(e.lon, e.lat);
      const diametro = 11 + it * 46;
      return {
        uf: e.uf,
        nome: e.nome,
        count,
        xpct: p.x / 10, // viewBox 1000 → %
        ypct: p.y / 10,
        diametro,
        fontSize: it > 0.4 ? 11 : 9,
        fill: count > 0 ? `rgba(16,185,129,${(0.32 + 0.55 * it).toFixed(3)})` : "rgba(255,255,255,0.04)",
        border: count > 0 ? `rgba(52,211,153,${(0.5 + 0.4 * it).toFixed(3)})` : "rgba(255,255,255,0.10)",
        txtColor: it > 0.28 ? "#04130d" : "rgba(255,255,255,0.7)",
      };
    });
  }, [dados.estados, countPorUf, maxCount]);

  const top10 = useMemo(() => dados.porUf.slice(0, 10), [dados.porUf]);

  // Tooltip / highlight compartilhado
  const hoverUf = hover?.uf || null;
  const hoverInfo = hoverUf ? bolhas.find((b) => b.uf === hoverUf) || null : null;
  const hoverPct = hoverInfo && dados.total > 0 ? (hoverInfo.count / dados.total) * 100 : 0;

  return (
    <div className="mk-card" style={{ padding: "20px 22px", borderRadius: 16, marginTop: 14 }}>
      {/* Cabeçalho */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 6 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <i className="ti ti-map-pin" style={{ fontSize: 16, color: "var(--mk-accent-2)" }} />
            <span className="label-tiny">Contatos por estado</span>
          </div>
          <p style={{ margin: "7px 0 0", fontSize: 12.5, color: "var(--mk-text-muted)" }}>
            Distribuição geográfica da base · {nf.format(dados.total - dados.semGeo)} de {nf.format(dados.total)} contatos com localização
            {dados.semGeo > 0 && (
              <span style={{ marginLeft: 6, opacity: 0.7 }}>
                ({nf.format(dados.semGeo)} sem geo)
              </span>
            )}
            · passe o mouse sobre um estado
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 10, color: "var(--mk-text-muted)" }}>menos</span>
          <span
            style={{
              width: 90,
              height: 8,
              borderRadius: 4,
              background: "linear-gradient(90deg, rgba(16,185,129,0.14), rgba(16,185,129,0.55), #10B981)",
            }}
          />
          <span style={{ fontSize: 10, color: "var(--mk-text-muted)" }}>mais</span>
        </div>
      </div>

      {/* Corpo: mapa + lateral */}
      <div style={{ display: "flex", gap: 30, flexWrap: "wrap", alignItems: "flex-start", marginTop: 16 }}>
        {/* Mapa SVG + bolhas posicionadas em % */}
        <div style={{ position: "relative", width: 400, height: 400, flex: "none" }}>
          <svg viewBox="0 0 1000 1000" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
            <defs>
              <radialGradient id="brSea" cx="50%" cy="42%" r="70%">
                <stop offset="0" stopColor="rgba(16,185,129,0.06)" />
                <stop offset="1" stopColor="rgba(16,185,129,0)" />
              </radialGradient>
            </defs>
            <path
              d={PATH_CONTORNO_BR}
              fill="url(#brSea)"
              stroke="rgba(52,211,153,0.4)"
              strokeWidth={2.5}
              strokeLinejoin="round"
            />
          </svg>
          {bolhas.map((b) => (
            <div
              key={b.uf}
              onMouseEnter={() => setHover({ tipo: "mapa", uf: b.uf })}
              onMouseLeave={() => setHover(null)}
              style={{
                position: "absolute",
                left: `${b.xpct}%`,
                top: `${b.ypct}%`,
                width: b.diametro,
                height: b.diametro,
                borderRadius: "50%",
                background: b.fill,
                border: `1px solid ${b.border}`,
                transform: "translate(-50%,-50%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                zIndex: hoverUf === b.uf ? 30 : 1,
                boxShadow:
                  hoverUf === b.uf
                    ? "0 0 0 3px rgba(52,211,153,0.25), 0 10px 26px rgba(16,185,129,0.5)"
                    : "none",
                transition: "box-shadow 0.18s",
              }}
            >
              <span
                style={{
                  fontSize: b.fontSize,
                  fontWeight: 700,
                  color: b.txtColor,
                  pointerEvents: "none",
                }}
              >
                {b.uf}
              </span>
            </div>
          ))}
          {hoverInfo && hover?.tipo === "mapa" && (
            <div
              style={{
                position: "absolute",
                left: `${hoverInfo.xpct}%`,
                top: `${hoverInfo.ypct}%`,
                transform: "translate(-50%, calc(-100% - 10px))",
                pointerEvents: "none",
                zIndex: 40,
                background: "rgba(10,12,11,0.96)",
                border: "0.5px solid rgba(52,211,153,0.4)",
                borderRadius: 11,
                padding: "8px 12px",
                boxShadow: "0 14px 40px rgba(0,0,0,0.6)",
                whiteSpace: "nowrap",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>{hoverInfo.nome}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 2 }}>
                <span style={{ fontSize: 17, fontWeight: 700, color: "var(--mk-accent-2)" }}>
                  {nf.format(hoverInfo.count)}
                </span>
                <span style={{ fontSize: 10.5, color: "var(--mk-text-muted)" }}>
                  contatos · {nfPct(hoverPct)}%
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Lateral: total + maior concentração + ranking */}
        <div style={{ flex: 1, minWidth: 280, display: "flex", flexDirection: "column", gap: 15 }}>
          <div style={{ display: "flex", gap: 22, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "var(--mk-text-muted)" }}>
                TOTAL DE CONTATOS
              </div>
              <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-0.5px", color: "var(--mk-text)", marginTop: 4 }}>
                {nf.format(dados.total)}
              </div>
            </div>
            {dados.maiorUf && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "var(--mk-text-muted)" }}>
                  MAIOR CONCENTRAÇÃO
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--mk-accent-2)", marginTop: 7 }}>
                  {dados.maiorUf.nome} · {nfPct(dados.maiorUf.pct)}%
                </div>
              </div>
            )}
          </div>

          <div style={{ height: 0.5, background: "var(--mk-border)" }} />

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "var(--mk-text-muted)" }}>
              RANKING DE ESTADOS · TOP 10
            </div>
            {top10.map((p, i) => {
              const info = ESTADO_POR_UF[p.uf];
              const regiao = info?.regiao;
              const cor = regiao ? "var(--mk-accent-2)" : "var(--mk-text-muted)";
              const pct = dados.total > 0 ? (p.count / dados.total) * 100 : 0;
              return (
                <div
                  key={p.uf}
                  onMouseEnter={() => setHover({ tipo: "mapa", uf: p.uf })}
                  onMouseLeave={() => setHover(null)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    cursor: "pointer",
                    padding: "2px 0",
                    opacity: hoverUf && hoverUf !== p.uf ? 0.55 : 1,
                    transition: "opacity 0.18s",
                  }}
                >
                  <span style={{ flex: "none", width: 16, fontSize: 10.5, fontWeight: 700, color: "var(--mk-text-muted)", textAlign: "right" }}>
                    {i + 1}
                  </span>
                  <span style={{ flex: "none", width: 28, fontSize: 12.5, fontWeight: 700, color: "var(--mk-accent-2)" }}>
                    {p.uf}
                  </span>
                  <span style={{ flex: "none", width: 8, height: 8, borderRadius: 2, background: cor }} />
                  <span style={{ flex: "none", width: 110, fontSize: 11.5, color: "var(--mk-text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {info?.nome || p.uf}
                  </span>
                  <div style={{ flex: 1, height: 7, background: "rgba(255,255,255,0.04)", borderRadius: 4, overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${maxCount > 0 ? (p.count / maxCount) * 100 : 0}%`,
                        background: "linear-gradient(90deg, rgba(52,211,153,0.6), var(--mk-accent-2))",
                        borderRadius: 4,
                        transition: "width .9s cubic-bezier(.2,.8,.2,1)",
                      }}
                    />
                  </div>
                  <span style={{ flex: "none", width: 44, textAlign: "right", fontSize: 12, fontWeight: 700, color: "var(--mk-text)" }}>
                    {nf.format(p.count)}
                  </span>
                  <span style={{ flex: "none", width: 44, textAlign: "right", fontSize: 10.5, color: "var(--mk-text-muted)" }}>
                    {nfPct(pct)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Distribuição por região (marimekko) */}
      {dados.regioes.length > 0 && (
        <div style={{ marginTop: 18, paddingTop: 16, borderTop: "0.5px solid var(--mk-border)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "var(--mk-text-muted)" }}>
              DISTRIBUIÇÃO POR REGIÃO
            </span>
            {hoverInfo && (
              <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--mk-accent-2)" }}>
                {hoverInfo.nome} · {nf.format(hoverInfo.count)} ({nfPct(hoverPct)}%)
              </div>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {dados.regioes.map((reg) => {
              const totalSemGeo = dados.total - dados.semGeo;
              const pctReg = totalSemGeo > 0 ? (reg.total / totalSemGeo) * 100 : 0;
              const maxRegTotal = Math.max(...dados.regioes.map((r) => r.total));
              const widthPct = maxRegTotal > 0 ? 22 + (reg.total / maxRegTotal) * 78 : 22;
              return (
                <div key={reg.regiao}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--mk-text-secondary)", display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 3, background: reg.cor }} />
                      {reg.nome}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--mk-text-muted)" }}>
                      {nf.format(reg.total)} · {pctReg.toFixed(0)}%
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 3, height: 30, width: `${widthPct}%`, minWidth: 60 }}>
                    {reg.estados.map((s) => {
                      const it = maxCount > 0 ? Math.sqrt(s.count / maxCount) : 0;
                      return (
                        <div
                          key={s.uf}
                          onMouseEnter={() => setHover({ tipo: "regiao", uf: s.uf })}
                          onMouseLeave={() => setHover(null)}
                          style={{
                            flex: `${s.count} 1 0`,
                            minWidth: 22,
                            background: `rgba(16,185,129,${(0.30 + 0.6 * it).toFixed(3)})`,
                            borderRadius: 6,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            overflow: "hidden",
                            filter: hoverUf === s.uf ? "brightness(1.4)" : "none",
                            transition: "filter 0.18s",
                          }}
                        >
                          <span
                            style={{
                              fontSize: 10.5,
                              fontWeight: 700,
                              color: it > 0.3 ? "#04130d" : "#cfe",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {s.uf}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
