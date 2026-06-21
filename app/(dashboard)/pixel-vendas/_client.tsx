"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Balao } from "@/components/ui/Balao";
import type { LinhaCampanha, EventoRow, ClientePixel, Saude, Onboarding } from "./page";
import { salvarConfigEventos } from "./_eventos-actions";

interface EventosConfigShape {
  addtocart_ativo: boolean;
  addtocart_palavras: string[];
  lead_ativo: boolean;
}

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
  periodo, clienteFiltro, kpis, linhas, feed, clientesPixel, saude, onboarding, eventosConfig,
}: {
  periodo: string; clienteFiltro: string; kpis: Kpis; linhas: LinhaCampanha[]; feed: EventoRow[]; clientesPixel: ClientePixel[]; saude: Saude; onboarding: Onboarding; eventosConfig: EventosConfigShape;
}) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [aberta, setAberta] = useState<Record<string, boolean>>({});
  const [diagEvento, setDiagEvento] = useState<EventoRow | null>(null);

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

      <BannerSaude saude={saude} />
      <CardOnboarding onboarding={onboarding} />

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
          <div key={e.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "10px 14px", borderTop: "1px solid var(--mk-border)", fontSize: 13 }}>
            <div>{e.contato_nome || "Contato"} · <b>{BRL.format(e.valor)}</b> · {e.campanha_nome || (e.ctwa_clid ? "—" : "sem click-id")} · {new Date(e.created_at).toLocaleString("pt-BR")}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                type="button"
                onClick={() => setDiagEvento(e)}
                title="Por quê?"
                style={{ background: "transparent", border: "1px solid var(--mk-border)", color: "var(--mk-text-muted)", borderRadius: 6, padding: "3px 8px", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}
              >Por quê?</button>
              <StatusEvento status={e.status} onReenviar={() => reenviar(e.id)} />
            </div>
          </div>
        ))}
      </div>

      <CardEventosAutomaticos config={eventosConfig} />

      <DiagEvento evento={diagEvento} onClose={() => setDiagEvento(null)} />
    </div>
  );
}

function BannerSaude({ saude }: { saude: Saude }) {
  if (saude.tudoOk) {
    return (
      <div className="mk-card" style={{ padding: "10px 14px", marginBottom: 14, borderColor: "var(--mk-accent)", background: "rgba(16,185,129,0.06)", display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
        <span style={{ color: "var(--mk-accent)" }}>✓</span>
        <span><b>Tudo conectado.</b> Pixels OK, tokens válidos, sem erros nos últimos eventos.</span>
      </div>
    );
  }
  const itens: string[] = [];
  if (saude.tokenExpirado.length) itens.push(`🔴 Token expirado: ${saude.tokenExpirado.map((t) => t.cliente_nome).join(", ")} — reconectar em Integrações.`);
  if (saude.tokenExpirando.length) itens.push(`🟡 Token expira em breve: ${saude.tokenExpirando.map((t) => `${t.cliente_nome} (${t.dias}d)`).join(", ")}.`);
  if (saude.eventosErro) itens.push(`🔴 ${saude.eventosErro} evento(s) com erro — abre cada um em "Por quê?".`);
  if (saude.eventosSemAtribuicao) itens.push(`⚪ ${saude.eventosSemAtribuicao} venda(s) sem atribuição (sem click-id ou anúncio não sincronizado).`);
  const semNada = itens.length === 0 && saude.alarmes.length === 0;
  if (semNada) return null;
  const temDanger = saude.alarmes.some((a) => a.severidade === "danger") || saude.tokenExpirado.length > 0 || saude.eventosErro > 0;
  return (
    <div className="mk-card" style={{ padding: "12px 14px", marginBottom: 14, borderColor: temDanger ? "rgba(251,113,133,0.5)" : "rgba(240,163,94,0.5)", background: temDanger ? "rgba(251,113,133,0.06)" : "rgba(240,163,94,0.06)", display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
      {itens.length > 0 && (
        <>
          <div style={{ fontWeight: 600 }}>Tem coisa pra ajustar:</div>
          {itens.map((t, i) => <div key={i}>{t}</div>)}
        </>
      )}
      {saude.alarmes.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: itens.length ? 4 : 0 }}>
          {itens.length > 0 && <div style={{ height: 1, background: "var(--mk-border)", margin: "2px 0" }} />}
          <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
            <i className="ti ti-bell-ringing" style={{ fontSize: 14 }} /> Alarmes:
          </div>
          {saude.alarmes.map((a, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: 2, padding: "6px 8px", borderRadius: 6, background: a.severidade === "danger" ? "rgba(251,113,133,0.08)" : "rgba(240,163,94,0.08)" }}>
              <div style={{ fontWeight: 600, fontSize: 12.5 }}>
                {a.severidade === "danger" ? "🔴" : "🟡"} {a.titulo}
              </div>
              <div style={{ fontSize: 11.5, opacity: 0.85 }}>{a.descricao}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface PassoDiag { ok: boolean; titulo: string; descricao: string }

function diagnosticar(e: EventoRow): PassoDiag[] {
  const passos: PassoDiag[] = [];
  const temClid = !!e.ctwa_clid;
  const temAnuncio = !!e.anuncio_id;
  const temIntegracao = !!e.integracao_id;
  const temPixel = !!e.pixel_id;

  passos.push({
    ok: temClid,
    titulo: "Contato veio de anúncio (CTWA)",
    descricao: temClid
      ? `click-id capturado: ${e.ctwa_clid?.slice(0, 16)}…`
      : "Sem click-id no histórico do contato. Provavelmente entrou organicamente, por link direto ou via importação. Sem isso o Meta não atribui à campanha.",
  });

  passos.push({
    ok: temAnuncio,
    titulo: "Anúncio do clique está sincronizado",
    descricao: temAnuncio
      ? `anúncio resolvido (campanha + conjunto identificados)`
      : temClid
        ? `O ad_id do referral (${e.source_id || "—"}) não casou com nenhum anúncio sincronizado. Clica "Sincronizar agora" no Dashboard pra puxar a hierarquia do Meta.`
        : "Pulado — sem click-id não há anúncio pra casar.",
  });

  passos.push({
    ok: temIntegracao && temPixel,
    titulo: "Pixel está conectado no cliente",
    descricao: !temIntegracao
      ? "Sem integração Meta associada (consequência das etapas anteriores)."
      : temPixel
        ? `Pixel: ${e.pixel_nome || e.pixel_id}`
        : "A integração existe mas falta escolher o Pixel. Card 'Conectar Pixel (Meta)' embaixo → 'Escolher pixel'.",
  });

  passos.push({
    ok: e.status === "enviado",
    titulo: "Resultado do envio ao Meta",
    descricao: e.status === "enviado"
      ? "✓ Meta aceitou o evento. Deve aparecer no Events Manager com o ctwa_clid."
      : e.status === "sem_atribuicao"
        ? "Não enviado — sem cadeia completa de atribuição. Corrige as etapas acima e clica Reenviar."
        : e.status === "erro"
          ? `Erro do Meta (${e.tentativas} tentativa(s)): ${e.erro || "—"}`
          : e.status === "pendente"
            ? `Aguardando próximo ciclo do cron. ${e.erro ? `Última msg: ${e.erro}` : ""}`
            : `Status atual: ${e.status}`,
  });

  return passos;
}

function CardEventosAutomaticos({ config }: { config: EventosConfigShape }) {
  const [leadAtivo, setLeadAtivo] = useState(config.lead_ativo);
  const [addAtivo, setAddAtivo] = useState(config.addtocart_ativo);
  const [palavras, setPalavras] = useState<string[]>(config.addtocart_palavras);
  const [nova, setNova] = useState("");
  const [salvando, setSalvando] = useState(false);

  function adicionar() {
    const p = nova.trim().toLowerCase();
    if (!p) return;
    if (palavras.includes(p)) { setNova(""); return; }
    setPalavras([...palavras, p]);
    setNova("");
  }
  function remover(p: string) {
    setPalavras(palavras.filter((x) => x !== p));
  }
  async function salvar() {
    setSalvando(true);
    try {
      const fd = new FormData();
      fd.set("palavras", palavras.join(","));
      fd.set("lead_ativo", leadAtivo ? "1" : "0");
      fd.set("addtocart_ativo", addAtivo ? "1" : "0");
      const r = await salvarConfigEventos(fd);
      if (!r.ok) alert(r.error || "Erro ao salvar");
    } finally { setSalvando(false); }
  }

  return (
    <div className="mk-card" style={{ padding: 16, marginTop: 16, borderRadius: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <i className="ti ti-target-arrow" style={{ fontSize: 16, color: "var(--mk-accent)" }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--mk-text)" }}>Eventos automáticos pro Meta</span>
      </div>

      <p style={{ fontSize: 12, color: "var(--mk-text-muted)", margin: "0 0 14px", lineHeight: 1.5 }}>
        Manda eventos extras pro Meta otimizar os anúncios pra perfis mais quentes — sem você fazer nada manual.
      </p>

      {/* Lead toggle */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, background: "var(--mk-surface-2)", marginBottom: 8 }}>
        <input type="checkbox" checked={leadAtivo} onChange={(e) => setLeadAtivo(e.target.checked)} id="cap_lead" />
        <label htmlFor="cap_lead" style={{ flex: 1, cursor: "pointer", fontSize: 12.5 }}>
          <b>Lead</b> — manda quando contato envia 1ª mensagem com click-id de anúncio (contato chegou)
        </label>
      </div>

      {/* AddToCart toggle + palavras */}
      <div style={{ padding: "10px 12px", borderRadius: 8, background: "var(--mk-surface-2)", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <input type="checkbox" checked={addAtivo} onChange={(e) => setAddAtivo(e.target.checked)} id="cap_atc" />
          <label htmlFor="cap_atc" style={{ flex: 1, cursor: "pointer", fontSize: 12.5 }}>
            <b>AddToCart</b> — manda quando mensagem do cliente bate uma das palavras abaixo (demonstrou intenção)
          </label>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8, paddingLeft: 24 }}>
          {palavras.map((p) => (
            <span key={p} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 8px", background: "var(--mk-surface)", border: "0.5px solid var(--mk-border)", borderRadius: 6, fontSize: 11 }}>
              {p}
              <button type="button" onClick={() => remover(p)} style={{ background: "transparent", border: 0, cursor: "pointer", color: "var(--mk-text-muted)", padding: 0, fontSize: 13, lineHeight: 1 }} aria-label={`Remover ${p}`}>×</button>
            </span>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6, paddingLeft: 24 }}>
          <input
            type="text"
            value={nova}
            onChange={(e) => setNova(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); adicionar(); } }}
            placeholder="Adicionar palavra-chave (Enter)"
            style={{ flex: 1, padding: "5px 10px", borderRadius: 6, border: "0.5px solid var(--mk-border)", background: "var(--mk-surface)", color: "var(--mk-text)", fontSize: 11.5 }}
          />
          <button type="button" onClick={adicionar} disabled={!nova.trim()} className="ghost-btn" style={{ fontSize: 11 }}>+ Adicionar</button>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button onClick={salvar} disabled={salvando} className="ghost-btn" style={{ fontSize: 11.5 }}>
          {salvando ? "Salvando…" : "Salvar configuração"}
        </button>
      </div>
    </div>
  );
}

function DiagEvento({ evento, onClose }: { evento: EventoRow | null; onClose: () => void }) {
  const passos = evento ? diagnosticar(evento) : [];
  return (
    <Balao open={!!evento} onClose={onClose} titulo="Por que essa venda foi (ou não foi) atribuída?" icone="ti-target-arrow" largura={520}>
      {evento && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13 }}>
          <div style={{ padding: "8px 10px", background: "var(--mk-surface-2)", border: "1px solid var(--mk-border)", borderRadius: 8, fontSize: 12 }}>
            <b>{evento.contato_nome || "Contato"}</b> · {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(evento.valor)} · {new Date(evento.created_at).toLocaleString("pt-BR")}
            <br />
            Campanha: {evento.campanha_nome || "—"}
          </div>
          {passos.map((p, i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--mk-border)", background: p.ok ? "rgba(16,185,129,0.05)" : "rgba(240,163,94,0.05)" }}>
              <div style={{ fontSize: 16, color: p.ok ? "var(--mk-accent)" : "#f0a35e", lineHeight: 1 }}>{p.ok ? "✓" : "✗"}</div>
              <div>
                <div style={{ fontWeight: 600 }}>{p.titulo}</div>
                <div style={{ opacity: 0.75, marginTop: 2 }}>{p.descricao}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Balao>
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

function CardOnboarding({ onboarding }: { onboarding: Onboarding }) {
  const [carregando, setCarregando] = useState<string | null>(null);
  const [pixels, setPixels] = useState<Record<string, { id: string; name: string }[]>>({});

  if (onboarding.semIntegracao) {
    return (
      <div className="mk-card" style={{ padding: 14, marginBottom: 14, borderColor: "var(--mk-accent)" }}>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Setup — Conecte sua primeira conta Meta</div>
        <div style={{ fontSize: 12.5, opacity: 0.75, marginBottom: 10 }}>Pra mandar vendas pro Meta, conecte um cliente em Integrações → Meta Ads. Depois você escolhe o Pixel aqui.</div>
        <a href="/integracoes/meta" className="ghost-btn" style={{ textDecoration: "none", display: "inline-block", fontSize: 11.5 }}>Ir pra Integrações</a>
      </div>
    );
  }
  if (onboarding.tudoPronto) return null;

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
    <div className="mk-card" style={{ padding: 14, marginBottom: 14, borderColor: "var(--mk-accent)" }}>
      <div style={{ fontWeight: 600, marginBottom: 10 }}>Setup — termina de configurar pra começar a enviar vendas</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {onboarding.passos.map((p) => {
          const prox = !p.pixel_id ? "pixel" : !p.temVenda ? "venda" : "ok";
          return (
            <div key={p.integracao_id} style={{ display: "flex", flexDirection: "column", gap: 6, padding: "10px 12px", borderRadius: 8, border: "1px solid var(--mk-border)", background: "var(--mk-surface-2)" }}>
              <div style={{ fontWeight: 600 }}>{p.cliente_nome}</div>
              <div style={{ display: "flex", gap: 14, fontSize: 12, flexWrap: "wrap" }}>
                <span style={{ color: "var(--mk-accent)" }}>✓ Meta conectado</span>
                <span style={{ color: p.pixel_id ? "var(--mk-accent)" : "var(--mk-text-muted)" }}>{p.pixel_id ? `✓ Pixel ${p.pixel_nome || p.pixel_id}` : "⏳ Pixel não escolhido"}</span>
                <span style={{ color: p.temVenda ? "var(--mk-accent)" : "var(--mk-text-muted)" }}>{p.temVenda ? "✓ 1ª venda enviada" : "⏳ Aguardando 1ª venda"}</span>
              </div>
              {prox === "pixel" && (
                !pixels[p.integracao_id] ? (
                  <button className="ghost-btn" style={{ alignSelf: "flex-start", fontSize: 11.5 }} disabled={carregando === p.integracao_id} onClick={() => listar(p.cliente_id, p.integracao_id)}>
                    {carregando === p.integracao_id ? "Listando…" : "Escolher pixel"}
                  </button>
                ) : (
                  <select style={{ ...inp, alignSelf: "flex-start", minWidth: 240 }} defaultValue="" onChange={(e) => { const x = pixels[p.integracao_id].find((y) => y.id === e.target.value); if (x) salvar(p.integracao_id, x.id, x.name); }}>
                    <option value="" disabled>Selecione um pixel…</option>
                    {pixels[p.integracao_id].map((x) => <option key={x.id} value={x.id}>{x.name} ({x.id})</option>)}
                  </select>
                )
              )}
              {prox === "venda" && (
                <div style={{ fontSize: 12, opacity: 0.7 }}>Próximo passo: registrar um Fechamento real num contato que veio de CTWA — o sistema dispara automaticamente o Purchase pro Meta. Resultado aparece no feed abaixo (✓ enviado) e no Events Manager.</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
