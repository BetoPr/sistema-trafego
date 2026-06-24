"use client";

import { useMemo, useState } from "react";
import type { LinhaAnuncio } from "@/lib/meta-ads/queries";

const fmtBRL = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 }).format(v);
const fmtNum = (v: number) => new Intl.NumberFormat("pt-BR").format(Math.round(v));
const fmtPct = (v: number | null) => v == null ? "—" : new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 2 }).format(v);
const fmtBRLPlano = (v: number | null) => v == null ? "—" : fmtBRL(v);

type Filtro = "todos" | "ativos" | "pausados";
type SortKey = keyof LinhaAnuncio | "campanha_nome";

export function TabelaAnuncios({ linhas }: { linhas: LinhaAnuncio[] }) {
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [busca, setBusca] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("valor_usado");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [erroImg, setErroImg] = useState<Set<string>>(new Set());

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return linhas.filter((l) => {
      if (filtro === "ativos" && (l.status || "").toUpperCase() !== "ACTIVE") return false;
      if (filtro === "pausados" && (l.status || "").toUpperCase() === "ACTIVE") return false;
      if (q && !l.nome.toLowerCase().includes(q) && !l.campanha_nome.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [linhas, filtro, busca]);

  const ordenadas = useMemo(() => {
    const arr = [...filtradas];
    arr.sort((a, b) => {
      const va = (a as unknown as Record<string, unknown>)[sortKey];
      const vb = (b as unknown as Record<string, unknown>)[sortKey];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === "number" && typeof vb === "number") return sortDir === "asc" ? va - vb : vb - va;
      return sortDir === "asc"
        ? String(va).localeCompare(String(vb))
        : String(vb).localeCompare(String(va));
    });
    return arr;
  }, [filtradas, sortKey, sortDir]);

  function sortClick(k: SortKey) {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir("desc"); }
  }

  function marcarErro(id: string) {
    setErroImg((s) => { const n = new Set(s); n.add(id); return n; });
  }

  const totais = useMemo(() => {
    let gasto = 0, imp = 0, alc = 0, cli = 0, lead = 0, conv = 0, rec = 0;
    for (const l of ordenadas) {
      gasto += l.valor_usado; imp += l.impressoes; alc += l.alcance; cli += l.cliques; lead += l.leads; conv += l.conversoes; rec += l.receita;
    }
    return {
      gasto, imp, alc, cli, lead, conv, rec,
      cpm: imp > 0 ? (gasto * 1000) / imp : null,
      ctr: imp > 0 ? cli / imp : null,
      roas: gasto > 0 && rec > 0 ? rec / gasto : null,
      cpr: (lead || conv) > 0 ? gasto / (lead || conv) : null,
    };
  }, [ordenadas]);

  return (
    <div className="mk-card mk-card-lg" style={{ padding: 0, overflow: "hidden" }}>
      <style>{`
        .meta-tabs { display: inline-flex; border: .5px solid var(--mk-border); border-radius: 8px; padding: 2px; background: var(--mk-surface-2); }
        .meta-tab { padding: 5px 12px; font-size: 12px; border-radius: 6px; border: 0; background: transparent; color: var(--mk-text-muted); cursor: pointer; transition: background .2s, color .2s; }
        .meta-tab.on { background: rgba(0,225,154,.14); color: #00E19A; }
        .meta-th { font-size: 10px; font-weight: 700; letterspacing: .5px; color: var(--mk-text-muted); padding: 10px 12px; text-transform: uppercase; cursor: pointer; user-select: none; white-space: nowrap; }
        .meta-th:hover { color: var(--mk-text); }
        .meta-td { padding: 10px 12px; font-size: 12px; color: var(--mk-text); white-space: nowrap; }
        .meta-tr:hover { background: var(--mk-surface-2); }
        .meta-tr { border-bottom: .5px solid var(--mk-border); transition: background .15s; }
        .meta-sort-arrow { font-size: 10px; margin-left: 4px; opacity: .6; }
        /* status dot */
        .st-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-right: 6px; }
        .st-active { background: #00E19A; box-shadow: 0 0 6px rgba(0,225,154,.6); }
        .st-paused { background: #C9A227; }
        .st-deleted { background: #C97064; }
        .st-other { background: var(--mk-text-muted); }
      `}</style>

      {/* Header com tabs filtro + busca */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 12, borderBottom: ".5px solid var(--mk-border)", flexWrap: "wrap" }}>
        <div className="meta-tabs">
          {([["todos", "Todos"], ["ativos", "Ativos"], ["pausados", "Pausados"]] as Array<[Filtro, string]>).map(([k, lbl]) => (
            <button key={k} type="button" className={`meta-tab ${filtro === k ? "on" : ""}`} onClick={() => setFiltro(k)}>
              {lbl}
            </button>
          ))}
        </div>
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Pesquisar nome ou campanha…"
          style={{ flex: 1, minWidth: 200, padding: "7px 11px", background: "var(--mk-surface-2)", border: ".5px solid var(--mk-border)", borderRadius: 8, color: "var(--mk-text)", fontSize: 12.5 }}
        />
        <span style={{ fontSize: 11.5, color: "var(--mk-text-muted)" }}>
          {ordenadas.length} anúncio{ordenadas.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* Tabela com scroll horizontal */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1200 }}>
          <thead>
            <tr style={{ background: "var(--mk-surface-2)", borderBottom: ".5px solid var(--mk-border)" }}>
              <th className="meta-th" style={{ textAlign: "left", width: 360 }} onClick={() => sortClick("nome")}>Anúncio<Arrow on={sortKey === "nome"} dir={sortDir} /></th>
              <th className="meta-th" style={{ textAlign: "right" }} onClick={() => sortClick("resultados")}>Result.<Arrow on={sortKey === "resultados"} dir={sortDir} /></th>
              <th className="meta-th" style={{ textAlign: "right" }} onClick={() => sortClick("custo_por_resultado")}>Custo/Result.<Arrow on={sortKey === "custo_por_resultado"} dir={sortDir} /></th>
              <th className="meta-th" style={{ textAlign: "right" }} onClick={() => sortClick("valor_usado")}>Valor usado<Arrow on={sortKey === "valor_usado"} dir={sortDir} /></th>
              <th className="meta-th" style={{ textAlign: "right" }} onClick={() => sortClick("impressoes")}>Impressões<Arrow on={sortKey === "impressoes"} dir={sortDir} /></th>
              <th className="meta-th" style={{ textAlign: "right" }} onClick={() => sortClick("alcance")}>Alcance<Arrow on={sortKey === "alcance"} dir={sortDir} /></th>
              <th className="meta-th" style={{ textAlign: "right" }} onClick={() => sortClick("cpm")}>CPM<Arrow on={sortKey === "cpm"} dir={sortDir} /></th>
              <th className="meta-th" style={{ textAlign: "right" }} onClick={() => sortClick("ctr")}>CTR<Arrow on={sortKey === "ctr"} dir={sortDir} /></th>
              <th className="meta-th" style={{ textAlign: "right" }} onClick={() => sortClick("roas")}>ROAS<Arrow on={sortKey === "roas"} dir={sortDir} /></th>
              <th className="meta-th" style={{ textAlign: "left" }} onClick={() => sortClick("campanha_nome")}>Campanha<Arrow on={sortKey === "campanha_nome"} dir={sortDir} /></th>
            </tr>
          </thead>
          <tbody>
            {ordenadas.length === 0 ? (
              <tr><td colSpan={10} style={{ padding: 32, textAlign: "center", color: "var(--mk-text-muted)", fontSize: 12.5 }}>Nada bate com os filtros atuais.</td></tr>
            ) : ordenadas.map((l) => {
              const status = (l.status || "").toUpperCase();
              const dot = status === "ACTIVE" ? "st-active" : status === "PAUSED" ? "st-paused" : status === "DELETED" ? "st-deleted" : "st-other";
              const erro = erroImg.has(l.anuncio_id);
              return (
                <tr key={l.anuncio_id} className="meta-tr">
                  <td className="meta-td" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className={`st-dot ${dot}`} title={l.status || "—"} />
                    <div style={{ width: 40, height: 40, borderRadius: 6, background: "var(--mk-bg-deep)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                      {l.thumbnail_url && !erro ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={l.thumbnail_url} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => marcarErro(l.anuncio_id)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <i className="ti ti-photo-off" style={{ fontSize: 14, color: "var(--mk-text-muted)" }} />
                      )}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div title={l.nome} style={{ fontWeight: 600, color: "var(--mk-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 280 }}>{l.nome}</div>
                      <div style={{ fontSize: 10, color: "var(--mk-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.conjunto_nome}</div>
                    </div>
                  </td>
                  <td className="meta-td" style={{ textAlign: "right", fontWeight: 600 }}>{l.resultados > 0 ? fmtNum(l.resultados) : "—"}</td>
                  <td className="meta-td" style={{ textAlign: "right" }}>{fmtBRLPlano(l.custo_por_resultado)}</td>
                  <td className="meta-td" style={{ textAlign: "right", fontWeight: 700 }}>{fmtBRL(l.valor_usado)}</td>
                  <td className="meta-td" style={{ textAlign: "right" }}>{fmtNum(l.impressoes)}</td>
                  <td className="meta-td" style={{ textAlign: "right" }}>{fmtNum(l.alcance)}</td>
                  <td className="meta-td" style={{ textAlign: "right" }}>{fmtBRLPlano(l.cpm)}</td>
                  <td className="meta-td" style={{ textAlign: "right" }}>{fmtPct(l.ctr)}</td>
                  <td className="meta-td" style={{ textAlign: "right", color: l.roas != null && l.roas >= 1 ? "#00E19A" : "var(--mk-text)" }}>{l.roas != null ? `${l.roas.toFixed(2)}x` : "—"}</td>
                  <td className="meta-td" title={l.campanha_nome} style={{ color: "var(--mk-text-muted)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>{l.campanha_nome}</td>
                </tr>
              );
            })}
          </tbody>
          {ordenadas.length > 0 && (
            <tfoot>
              <tr style={{ background: "var(--mk-bg-deep)", fontWeight: 700 }}>
                <td className="meta-td" style={{ color: "var(--mk-text-muted)", fontSize: 11 }}>
                  TOTAL ({ordenadas.length})
                </td>
                <td className="meta-td" style={{ textAlign: "right" }}>{fmtNum(totais.lead || totais.conv)}</td>
                <td className="meta-td" style={{ textAlign: "right" }}>{fmtBRLPlano(totais.cpr)}</td>
                <td className="meta-td" style={{ textAlign: "right", color: "#00E19A" }}>{fmtBRL(totais.gasto)}</td>
                <td className="meta-td" style={{ textAlign: "right" }}>{fmtNum(totais.imp)}</td>
                <td className="meta-td" style={{ textAlign: "right" }}>{fmtNum(totais.alc)}</td>
                <td className="meta-td" style={{ textAlign: "right" }}>{fmtBRLPlano(totais.cpm)}</td>
                <td className="meta-td" style={{ textAlign: "right" }}>{fmtPct(totais.ctr)}</td>
                <td className="meta-td" style={{ textAlign: "right" }}>{totais.roas != null ? `${totais.roas.toFixed(2)}x` : "—"}</td>
                <td className="meta-td"></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

function Arrow({ on, dir }: { on: boolean; dir: "asc" | "desc" }) {
  if (!on) return null;
  return <span className="meta-sort-arrow"><i className={`ti ti-arrow-${dir === "asc" ? "up" : "down"}`} /></span>;
}
