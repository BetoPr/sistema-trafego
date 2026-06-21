"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { LinhaCampanha, EventoRow, ClientePixel } from "./page";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const PERIODOS: [string, string][] = [["7d", "7 dias"], ["14d", "14 dias"], ["30d", "30 dias"], ["90d", "90 dias"]];

// Projeto não tem classe `mk-input`/`mk-btn-sm`. Inputs/selects usam este objeto
// inline (padrão `inp` de configuracoes/etiquetas/_client.tsx); botões pequenos
// usam a classe `ghost-btn`.
const inp: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "0.5px solid var(--mk-border)",
  background: "var(--mk-surface-2)",
  color: "var(--mk-text)",
  fontSize: 12.5,
  fontFamily: "inherit",
  outline: "none",
};

interface Kpis { gasto: number; bruto: number; liquido: number; roas: number | null; matchClid: number; vendas: number }

export function PixelVendasClient({
  periodo, clienteFiltro, kpis, linhas, feed, clientesPixel,
}: {
  periodo: string; clienteFiltro: string; kpis: Kpis; linhas: LinhaCampanha[]; feed: EventoRow[]; clientesPixel: ClientePixel[];
}) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [aberta, setAberta] = useState<Record<string, boolean>>({});

  const ir = (p: { periodo?: string; cliente?: string }) => {
    const q = new URLSearchParams();
    q.set("periodo", p.periodo ?? periodo);
    const cli = p.cliente ?? clienteFiltro;
    if (cli) q.set("cliente", cli);
    router.push(`/pixel-vendas?${q.toString()}`);
  };

  const linhasFiltradas = useMemo(
    () => linhas.filter((l) => l.nome.toLowerCase().includes(busca.trim().toLowerCase())),
    [linhas, busca],
  );

  const roasTxt = (r: number | null) => (r == null ? "—" : `${r.toFixed(2).replace(".", ",")}x`);

  async function reenviar(id: string) {
    await fetch("/api/pixel-vendas/reenviar", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ evento_id: id }) });
    router.refresh();
  }

  return (
    <div className="mk-page">
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
        <h1 style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 22, fontWeight: 700, color: "var(--mk-accent)" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1" /></svg>
          Pixel &amp; Vendas
        </h1>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input placeholder="Pesquisar campanha…" value={busca} onChange={(e) => setBusca(e.target.value)} style={{ ...inp, minWidth: 200 }} />
          <select value={clienteFiltro} onChange={(e) => ir({ cliente: e.target.value })} style={inp}>
            <option value="">Todos os clientes</option>
            {clientesPixel.map((c) => <option key={c.cliente_id} value={c.cliente_id}>{c.cliente_nome}</option>)}
          </select>
          <select value={periodo} onChange={(e) => ir({ periodo: e.target.value })} style={inp}>
            {PERIODOS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 16 }}>
        <Kpi titulo="Gasto em ads" valor={BRL.format(kpis.gasto)} sub="investido no período" cor="#f0a35e" />
        <Kpi titulo="Faturamento bruto" valor={BRL.format(kpis.bruto)} sub={`${kpis.vendas} vendas atribuídas`} />
        <Kpi titulo="Faturamento líquido" valor={BRL.format(kpis.liquido)} sub="bruto − gasto" cor="var(--mk-accent)" destaque />
        <Kpi titulo="ROAS" valor={roasTxt(kpis.roas)} sub={`match de click-id: ${kpis.matchClid}%`} />
      </div>

      <div className="mk-card" style={{ padding: 0, marginBottom: 16, overflow: "hidden" }}>
        <div style={{ padding: "12px 14px", fontWeight: 600, borderBottom: "1px solid var(--mk-border)" }}>Desempenho por campanha</div>
        <table className="mk-table mk-table-card" style={{ width: "100%" }}>
          <thead>
            <tr><th>Campanha / Conjunto</th><th>Gasto</th><th>Bruto</th><th>Líquido</th><th>ROAS</th><th>Vendas</th></tr>
          </thead>
          <tbody>
            {linhasFiltradas.length === 0 && <tr><td colSpan={6} style={{ textAlign: "center", opacity: 0.6, padding: 18 }}>Sem dados no período.</td></tr>}
            {linhasFiltradas.map((l) => {
              const key = l.campanha_id || "__none__";
              const temConj = l.conjuntos.length > 0;
              const open = !!aberta[key];
              return (
                <FragmentLinha key={key} linha={l} open={open} temConj={temConj} onToggle={() => setAberta((s) => ({ ...s, [key]: !s[key] }))} BRL={BRL} roasTxt={roasTxt} />
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mk-card" style={{ padding: 0, marginBottom: 16, overflow: "hidden" }}>
        <div style={{ padding: "12px 14px", fontWeight: 600, borderBottom: "1px solid var(--mk-border)" }}>Vendas enviadas ao Meta (Purchase)</div>
        {feed.length === 0 && <div style={{ padding: 16, opacity: 0.6 }}>Nenhum evento ainda.</div>}
        {feed.map((e) => (
          <div key={e.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderTop: "1px solid var(--mk-border)", fontSize: 13 }}>
            <div>{e.contato_nome || "Contato"} · <b>{BRL.format(e.valor)}</b> · {e.campanha_nome || (e.ctwa_clid ? "—" : "sem click-id")} · {new Date(e.created_at).toLocaleString("pt-BR")}</div>
            <StatusEvento status={e.status} onReenviar={() => reenviar(e.id)} />
          </div>
        ))}
      </div>

      <ConectarPixel clientes={clientesPixel} />
    </div>
  );
}

function FragmentLinha({ linha, open, temConj, onToggle, BRL, roasTxt }: { linha: LinhaCampanha; open: boolean; temConj: boolean; onToggle: () => void; BRL: Intl.NumberFormat; roasTxt: (r: number | null) => string }) {
  return (
    <>
      <tr onClick={temConj ? onToggle : undefined} style={{ cursor: temConj ? "pointer" : "default" }}>
        <td>{temConj ? (open ? "▾ " : "▸ ") : ""}{linha.nome}</td>
        <td style={{ color: "#f0a35e" }}>{BRL.format(linha.gasto)}</td>
        <td>{BRL.format(linha.bruto)}</td>
        <td style={{ color: "var(--mk-accent)", fontWeight: 600 }}>{BRL.format(linha.liquido)}</td>
        <td>{roasTxt(linha.roas)}</td>
        <td>{linha.vendas}</td>
      </tr>
      {open && linha.conjuntos.map((cj) => (
        <tr key={cj.conjunto_id} style={{ opacity: 0.8 }}>
          <td style={{ paddingLeft: 32 }}>· {cj.nome}</td>
          <td>{BRL.format(cj.gasto)}</td>
          <td>{BRL.format(cj.bruto)}</td>
          <td>{BRL.format(cj.liquido)}</td>
          <td>{roasTxt(cj.roas)}</td>
          <td>{cj.vendas}</td>
        </tr>
      ))}
    </>
  );
}

function Kpi({ titulo, valor, sub, cor, destaque }: { titulo: string; valor: string; sub: string; cor?: string; destaque?: boolean }) {
  return (
    <div className="mk-card" style={{ padding: "12px 14px", ...(destaque ? { borderColor: "var(--mk-accent)" } : {}) }}>
      <div style={{ fontSize: 11, opacity: 0.6, textTransform: "uppercase", letterSpacing: ".04em" }}>{titulo}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: cor || "inherit" }}>{valor}</div>
      <div style={{ fontSize: 11, opacity: 0.5 }}>{sub}</div>
    </div>
  );
}

function StatusEvento({ status, onReenviar }: { status: string; onReenviar: () => void }) {
  if (status === "enviado") return <span style={{ color: "var(--mk-accent)" }}>✓ enviado</span>;
  if (status === "enviando" || status === "pendente") return <span style={{ opacity: 0.6 }}>⏳ {status}</span>;
  return <button className="ghost-btn" style={{ fontSize: 11.5 }} onClick={onReenviar}>Reenviar</button>;
}

function ConectarPixel({ clientes }: { clientes: ClientePixel[] }) {
  const [carregando, setCarregando] = useState<string | null>(null);
  const [pixels, setPixels] = useState<Record<string, { id: string; name: string }[]>>({});

  async function listar(clienteId: string, integracaoId: string) {
    setCarregando(integracaoId);
    try {
      const r = await fetch(`/api/integracoes/meta/pixels?cliente_id=${clienteId}`).then((x) => x.json());
      if (r.pixels) setPixels((s) => ({ ...s, [integracaoId]: r.pixels }));
      else alert(r.error || "Erro ao listar pixels");
    } finally { setCarregando(null); }
  }
  async function salvar(integracaoId: string, pixelId: string, pixelNome: string) {
    await fetch("/api/integracoes/meta/pixels", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ integracao_id: integracaoId, pixel_id: pixelId, pixel_nome: pixelNome }) });
    location.reload();
  }

  return (
    <div className="mk-card" style={{ padding: 14, borderColor: "var(--mk-accent)" }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Conectar Pixel (Meta)</div>
      {clientes.length === 0 && <div style={{ opacity: 0.6, fontSize: 13 }}>Nenhum cliente com integração Meta. Conecte o Meta Ads em Integrações primeiro.</div>}
      {clientes.map((c) => (
        <div key={c.integracao_id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderTop: "1px solid var(--mk-border)", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 180 }}>{c.cliente_nome}</div>
          {c.pixel_id
            ? <span style={{ color: "var(--mk-accent)" }}>✓ Pixel {c.pixel_nome || c.pixel_id}</span>
            : <span style={{ opacity: 0.6 }}>— não conectado</span>}
          {!pixels[c.integracao_id]
            ? <button className="ghost-btn" style={{ fontSize: 11.5 }} disabled={carregando === c.integracao_id} onClick={() => listar(c.cliente_id, c.integracao_id)}>{carregando === c.integracao_id ? "…" : "Escolher pixel"}</button>
            : (
              <select onChange={(e) => { const p = pixels[c.integracao_id].find((x) => x.id === e.target.value); if (p) salvar(c.integracao_id, p.id, p.name); }} defaultValue="" style={inp}>
                <option value="" disabled>Selecione…</option>
                {pixels[c.integracao_id].map((p) => <option key={p.id} value={p.id}>{p.name} ({p.id})</option>)}
              </select>
            )}
        </div>
      ))}
    </div>
  );
}
