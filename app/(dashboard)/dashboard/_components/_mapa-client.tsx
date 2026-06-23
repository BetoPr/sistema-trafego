"use client";

import { useMemo, useState } from "react";
import { PATH_CONTORNO_BR, proj, ESTADO_POR_UF } from "@/lib/geo/brasil";
import { FAIXAS_ETARIAS, type FaixaEtaria } from "@/lib/crm/faixas-tipos";
import type { DadosMapa } from "./MapaContatosEstado";

const nf = new Intl.NumberFormat("pt-BR");
const nfPct = (n: number) => n.toFixed(1).replace(".", ",");

type SvcFilter = "todos" | string;
type AgeFilter = "all" | FaixaEtaria;

export function MapaContatosClient({ dados }: { dados: DadosMapa }) {
  const [svc, setSvc] = useState<SvcFilter>("todos");
  const [age, setAge] = useState<AgeFilter>("all");
  const [hover, setHover] = useState<{ tipo: "mapa" | "regiao"; uf: string } | null>(null);
  const [pulse, setPulse] = useState(0);

  const filtroAtivo = svc !== "todos" || age !== "all";

  const pontosFiltrados = useMemo(() => {
    return dados.pontos.filter((p) => {
      if (svc !== "todos" && p.servico !== svc) return false;
      if (age !== "all" && p.faixa !== age) return false;
      return true;
    });
  }, [dados.pontos, svc, age]);

  const countPorUf = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of pontosFiltrados) m.set(p.uf, (m.get(p.uf) || 0) + 1);
    return m;
  }, [pontosFiltrados]);

  const totalFiltrado = pontosFiltrados.length;
  const maxCount = useMemo(() => {
    let max = 0;
    for (const v of countPorUf.values()) if (v > max) max = v;
    return max;
  }, [countPorUf]);

  const bolhas = useMemo(() => {
    return dados.estados.map((e) => {
      const count = countPorUf.get(e.uf) || 0;
      const it = maxCount > 0 ? Math.sqrt(count / maxCount) : 0;
      const p = proj(e.lon, e.lat);
      const diametro = 11 + it * 46;
      return {
        uf: e.uf,
        nome: e.nome,
        count,
        xpct: p.x / 10,
        ypct: p.y / 10,
        diametro,
        fontSize: it > 0.4 ? 11 : 9,
        fill: count > 0 ? `rgba(16,185,129,${(0.32 + 0.55 * it).toFixed(3)})` : "rgba(255,255,255,0.04)",
        border: count > 0 ? `rgba(52,211,153,${(0.5 + 0.4 * it).toFixed(3)})` : "rgba(255,255,255,0.10)",
        txtColor: it > 0.28 ? "#04130d" : "rgba(255,255,255,0.7)",
      };
    });
  }, [dados.estados, countPorUf, maxCount]);

  const top10 = useMemo(() => {
    return Array.from(countPorUf.entries())
      .map(([uf, count]) => ({ uf, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [countPorUf]);

  const regioesData = useMemo(() => {
    return dados.regioes
      .map((reg) => {
        const ufs = dados.estados.filter((e) => e.regiao === reg.regiao);
        const estadosCount = ufs
          .map((e) => ({ uf: e.uf, count: countPorUf.get(e.uf) || 0 }))
          .filter((x) => x.count > 0)
          .sort((a, b) => b.count - a.count);
        const total = estadosCount.reduce((s, x) => s + x.count, 0);
        return { ...reg, total, estados: estadosCount };
      })
      .filter((r) => r.total > 0);
  }, [dados.regioes, dados.estados, countPorUf]);

  const maiorUf = top10[0];
  const maiorInfo = maiorUf ? ESTADO_POR_UF[maiorUf.uf] : null;
  const maiorPct = maiorUf && totalFiltrado > 0 ? (maiorUf.count / totalFiltrado) * 100 : 0;

  const hoverUf = hover?.uf || null;
  const hoverInfo = hoverUf ? bolhas.find((b) => b.uf === hoverUf) || null : null;
  const hoverPct = hoverInfo && totalFiltrado > 0 ? (hoverInfo.count / totalFiltrado) * 100 : 0;

  function aplicarSvc(novo: SvcFilter) {
    if (novo === svc) return;
    setSvc(novo);
    setPulse(Date.now());
  }
  function aplicarAge(novo: AgeFilter) {
    if (novo === age) return;
    setAge(novo);
    setPulse(Date.now());
  }
  function limpar() {
    if (!filtroAtivo) return;
    setSvc("todos");
    setAge("all");
    setPulse(Date.now());
  }

  const svcLabel = svc === "todos" ? "Todos os serviços" : svc;
  const ageLabel = age === "all" ? "todas as idades" : `${age} anos`;

  return (
    <div className="mk-card" style={{ padding: "20px 22px", borderRadius: 16, marginTop: 14 }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 6 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <i className="ti ti-map-pin" style={{ fontSize: 16, color: "var(--mk-accent-2)" }} />
            <span className="label-tiny">Contatos por estado</span>
            {filtroAtivo && (
              <span style={{
                fontSize: 10.5, fontWeight: 700, letterSpacing: 0.4, color: "var(--mk-accent-2)",
                background: "rgba(52,211,153,0.10)", border: "0.5px solid rgba(52,211,153,0.3)",
                borderRadius: 6, padding: "3px 8px",
              }}>
                {svcLabel} · {ageLabel}
              </span>
            )}
          </div>
          <p style={{ margin: "7px 0 0", fontSize: 12.5, color: "var(--mk-text-muted)" }}>
            Distribuição geográfica · {nf.format(totalFiltrado)} contato{totalFiltrado === 1 ? "" : "s"} no filtro atual
            {dados.semGeo > 0 && (
              <span style={{ marginLeft: 6, opacity: 0.7 }}>
                ({nf.format(dados.semGeo)} sem geo na base)
              </span>
            )}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 10, color: "var(--mk-text-muted)" }}>menos</span>
          <span
            style={{
              width: 90, height: 8, borderRadius: 4,
              background: "linear-gradient(90deg, rgba(16,185,129,0.14), rgba(16,185,129,0.55), #00E19A)",
            }}
          />
          <span style={{ fontSize: 10, color: "var(--mk-text-muted)" }}>mais</span>
        </div>
      </div>

      {/* Filtros — chips Serviço + Idade */}
      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
        <ChipRow
          label="Serviço"
          opcoes={[
            { id: "todos", label: "Todos os serviços" },
            ...dados.servicos.map((s) => ({ id: s, label: s })),
          ]}
          ativo={svc}
          onSelecionar={(id) => aplicarSvc(id)}
        />
        <ChipRow
          label="Idade"
          opcoes={[
            { id: "all", label: "Todas as idades" },
            ...FAIXAS_ETARIAS.map((f) => ({ id: f, label: `${f} anos` })),
          ]}
          ativo={age}
          onSelecionar={(id) => aplicarAge(id as AgeFilter)}
          acaoExtra={
            filtroAtivo ? (
              <button
                onClick={limpar}
                className="ghost-btn"
                style={{ fontSize: 11, padding: "5px 11px", borderRadius: 8 }}
              >
                <i className="ti ti-x" style={{ fontSize: 12, marginRight: 4 }} />
                Limpar filtro
              </button>
            ) : null
          }
        />
      </div>

      {/* Corpo: mapa + lateral */}
      <div style={{ display: "flex", gap: 30, flexWrap: "wrap", alignItems: "flex-start", marginTop: 16 }}>
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

          {/* Varredura ao trocar filtro */}
          {pulse > 0 && (
            <div
              key={pulse}
              style={{
                position: "absolute", inset: 0, pointerEvents: "none", zIndex: 5,
                background: "linear-gradient(90deg, transparent 0%, rgba(52,211,153,0.16) 50%, transparent 100%)",
                animation: "mapSweep 900ms ease-out forwards",
                mixBlendMode: "screen",
              }}
            />
          )}
          <style>{`@keyframes mapSweep { 0% { transform: translateX(-100%); opacity: 0; } 30% { opacity: 1; } 100% { transform: translateX(100%); opacity: 0; } }`}</style>

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
                transition: "box-shadow 0.18s, width 0.4s cubic-bezier(.2,.8,.2,1), height 0.4s cubic-bezier(.2,.8,.2,1), background 0.3s, border-color 0.3s",
              }}
            >
              {b.count > 0 && (
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
              )}
            </div>
          ))}
          {hoverInfo && hover?.tipo === "mapa" && hoverInfo.count > 0 && (
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

        <div style={{ flex: 1, minWidth: 280, display: "flex", flexDirection: "column", gap: 15 }}>
          <div style={{ display: "flex", gap: 22, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "var(--mk-text-muted)" }}>
                TOTAL NO FILTRO
              </div>
              <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-0.5px", color: "var(--mk-text)", marginTop: 4 }}>
                {nf.format(totalFiltrado)}
              </div>
            </div>
            {maiorUf && maiorInfo && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "var(--mk-text-muted)" }}>
                  MAIOR CONCENTRAÇÃO
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--mk-accent-2)", marginTop: 7 }}>
                  {maiorInfo.nome} · {nfPct(maiorPct)}%
                </div>
              </div>
            )}
          </div>

          <div style={{ height: 0.5, background: "var(--mk-border)" }} />

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "var(--mk-text-muted)" }}>
              RANKING DE ESTADOS · TOP 10
            </div>
            {top10.length === 0 && (
              <div style={{ fontSize: 12, color: "var(--mk-text-muted)", padding: "12px 0" }}>
                Sem contatos no filtro atual.
              </div>
            )}
            {top10.map((p, i) => {
              const info = ESTADO_POR_UF[p.uf];
              const pct = totalFiltrado > 0 ? (p.count / totalFiltrado) * 100 : 0;
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
                  <span style={{ flex: "none", width: 8, height: 8, borderRadius: 2, background: "var(--mk-accent-2)" }} />
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

      {regioesData.length > 0 && (
        <div style={{ marginTop: 18, paddingTop: 16, borderTop: "0.5px solid var(--mk-border)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "var(--mk-text-muted)" }}>
              DISTRIBUIÇÃO POR REGIÃO
            </span>
            {hoverInfo && hoverInfo.count > 0 && (
              <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--mk-accent-2)" }}>
                {hoverInfo.nome} · {nf.format(hoverInfo.count)} ({nfPct(hoverPct)}%)
              </div>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {regioesData.map((reg) => {
              const pctReg = totalFiltrado > 0 ? (reg.total / totalFiltrado) * 100 : 0;
              const maxRegTotal = Math.max(...regioesData.map((r) => r.total));
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
                  <div style={{ display: "flex", gap: 3, height: 30, width: `${widthPct}%`, minWidth: 60, transition: "width 0.6s cubic-bezier(.2,.8,.2,1)" }}>
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
                            transition: "filter 0.18s, background 0.4s",
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

function ChipRow({
  label, opcoes, ativo, onSelecionar, acaoExtra,
}: {
  label: string;
  opcoes: { id: string; label: string }[];
  ativo: string;
  onSelecionar: (id: string) => void;
  acaoExtra?: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <span style={{
        fontSize: 9.5, fontWeight: 700, letterSpacing: 1, color: "var(--mk-text-muted)",
        minWidth: 56,
      }}>
        {label.toUpperCase()}
      </span>
      <div data-chip-strip style={{ display: "flex", gap: 6, flexWrap: "wrap", flex: 1, minWidth: 0 }}>
        {opcoes.map((o) => {
          const a = o.id === ativo;
          return (
            <button
              key={o.id}
              onClick={() => onSelecionar(o.id)}
              style={{
                fontSize: 11.5,
                fontWeight: a ? 700 : 500,
                color: a ? "#fff" : "var(--mk-text-secondary)",
                background: a ? "rgba(16,185,129,0.16)" : "var(--mk-surface-2)",
                border: a ? "0.5px solid rgba(52,211,153,0.4)" : "0.5px solid var(--mk-border)",
                borderRadius: 8,
                padding: "5px 11px",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.18s",
              }}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      {acaoExtra}
    </div>
  );
}
