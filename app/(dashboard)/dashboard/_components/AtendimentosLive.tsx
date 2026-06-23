"use client";

import { useEffect, useRef, useState } from "react";
import { DashboardAtendimentos } from "./DashboardAtendimentos";
import type { KpisAtendimento, ServicoStat, SerieDiaAtend, SatisfacaoStat, TemposStat } from "@/lib/crm/dashboard-queries";

interface Dados {
  kpis: KpisAtendimento;
  servicos: ServicoStat[];
  serie: SerieDiaAtend[];
  satisfacao: SatisfacaoStat;
  tempos: TemposStat;
  label: string;
}

const PRESETS = [
  { id: "hoje", label: "Hoje" },
  { id: "7d", label: "7 dias" },
  { id: "30d", label: "30 dias" },
] as const;

// Prompt fixo que acompanha o PDF "Baixar análise". Copiar → colar na IA → anexar o PDF.
// IA devolve um HTML standalone (CSS inline, dark theme) que o Roberto salva como
// relatorio.html e abre no navegador — visual + analítico no mesmo arquivo.
const PROMPT_ANALISE = `Você é um especialista em atendimento ao cliente e vendas por WhatsApp.

Em anexo está um PDF com o HISTÓRICO COMPLETO das conversas (atendente ↔ cliente) dos atendimentos fechados de um período, incluindo por ticket: métricas de tempo (1ª resposta e duração), sentimento e valor fechado.

## SUA TAREFA

Gere um RELATÓRIO VISUAL EM HTML, em português, dentro de UM ÚNICO bloco de código \`\`\`html ... \`\`\`. Eu vou salvar como \`relatorio.html\` e abrir no navegador. Por isso o HTML precisa ser **completamente standalone** (CSS inline ou no <style>; SEM Tailwind, SEM CDN, SEM JS externo). Pode usar emojis e SVG inline pra ícones.

## ESTRUTURA OBRIGATÓRIA DO HTML

1. **Header** — título do relatório, período coberto, data de geração.
2. **Visão geral (cards/KPIs)** — nº atendimentos, satisfação %, faturamento R$, tempo médio 1ª resposta, duração média. Cada um num "card" colorido.
3. **Gráficos** — pelo menos 2, feitos com **divs CSS puro** (barras horizontais ou verticais, donut com conic-gradient). Sugestões: distribuição de sentimento (positivo/neutro/negativo), faturamento por dia ou por ticket, tempo de resposta por ticket.
4. **Pontos fortes** — lista com badges verdes. Cite o nº do ticket em cada exemplo.
5. **Pontos a melhorar** — lista com badges vermelhos/amarelos. Cite o nº do ticket. Foque em: demoras, respostas frias, dúvidas mal respondidas, oportunidades de venda perdidas.
6. **Padrões identificados** — tabela ou cards com objeções recorrentes, dúvidas frequentes e gatilhos que travaram a venda.
7. **Scripts sugeridos** — blocos de texto prontos pra copiar (use \`<pre>\` com botão visual de "copiar"; o botão pode ser só decorativo já que não vou ligar JS).
8. **Ações práticas priorizadas** — checklist numerada (1 = mais urgente).

## REGRAS DE ESTILO

- Tema **escuro** elegante: fundo \`#0f0f12\` ou similar, texto claro \`#FFFDF8\`, accent roxo \`#9B7DBF\`.
- Cards com \`border-radius: 12px\`, padding generoso, \`border: 1px solid #2a2a30\`.
- Cores semânticas: verde \`#00E19A\` (positivo), amarelo \`#f59e0b\` (atenção), vermelho \`#C97064\` (problema), azul \`#5B8BA6\` (info).
- Tipografia: \`system-ui, -apple-system, sans-serif\`. Títulos com \`font-weight: 600-700\`.
- Layout responsivo com \`display: grid\` ou \`flex\`. Container \`max-width: 1100px\` centrado.
- Use moeda BR (R$ 1.234,56) e datas pt-BR.

## REGRAS DE CONTEÚDO

- Baseie-se SOMENTE no PDF. NÃO invente números, clientes ou tickets.
- Sempre cite o nº do ticket ao dar um exemplo (ex: "Ticket #42 — cliente perguntou X às 14h e só foi respondido às 16h").
- Seja direto e prático. Foco: vender mais, responder mais rápido, atender com mais cortesia.
- Se um atendimento tiver pouco contexto, ignore. Não especule.
- Antes do bloco HTML pode colocar uma frase curta tipo "Pronto, segue:". Depois do bloco, pode listar 2-3 destaques do relatório em texto puro.

## OUTPUT FINAL

\`\`\`html
<!DOCTYPE html>
<html lang="pt-BR">
<head>...
</html>
\`\`\``;

/**
 * Dashboard de Atendimentos SPA: filtros são estado local + fetch — sem
 * navegação, URL parada em /dashboard. Dados iniciais vêm do server.
 */
export function AtendimentosLive({ inicial, servicosDisponiveis = [] }: { inicial: Dados; servicosDisponiveis?: string[] }) {
  const [periodo, setPeriodo] = useState<string>("30d");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [custom, setCustom] = useState(false);
  const [dados, setDados] = useState<Dados>(inicial);
  const [loading, setLoading] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [servicosSel, setServicosSel] = useState<Set<string>>(new Set());
  const [menuServ, setMenuServ] = useState(false);
  const reqRef = useRef(0);

  function qsParaBuscar(extra?: Partial<{ periodo: string; de: string; ate: string; servicos: Set<string> }>): string {
    const p = new URLSearchParams();
    const per = extra?.periodo ?? periodo;
    const dde = extra?.de ?? de;
    const aate = extra?.ate ?? ate;
    const serv = extra?.servicos ?? servicosSel;
    if (per) p.set("periodo", per);
    else if (dde && aate) { p.set("de", dde); p.set("ate", aate); }
    if (serv.size > 0) p.set("servicos", Array.from(serv).map(encodeURIComponent).join(","));
    return p.toString();
  }

  async function copiarPrompt() {
    try {
      await navigator.clipboard.writeText(PROMPT_ANALISE);
    } catch {
      // Fallback p/ navegadores sem clipboard API
      const ta = document.createElement("textarea");
      ta.value = PROMPT_ANALISE;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  async function buscar(qs: string) {
    const req = ++reqRef.current;
    setLoading(true);
    try {
      const r = await fetch(`/api/dashboard/atendimentos?${qs}`);
      const j = await r.json();
      if (req === reqRef.current && r.ok) setDados(j);
    } finally {
      if (req === reqRef.current) setLoading(false);
    }
  }

  function preset(id: string) {
    setPeriodo(id);
    setCustom(false);
    buscar(qsParaBuscar({ periodo: id }));
  }

  function aplicarCustom() {
    if (!de || !ate) return;
    setPeriodo("");
    buscar(qsParaBuscar({ periodo: "" }));
  }

  function toggleServico(nome: string) {
    setServicosSel((prev) => {
      const novo = new Set(prev);
      if (novo.has(nome)) novo.delete(nome);
      else novo.add(nome);
      buscar(qsParaBuscar({ servicos: novo }));
      return novo;
    });
  }

  function limparServicos() {
    setServicosSel(new Set());
    buscar(qsParaBuscar({ servicos: new Set() }));
  }

  // Auto-refresh leve a cada 60s no período ativo
  useEffect(() => {
    const iv = setInterval(() => {
      buscar(qsParaBuscar());
    }, 60000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodo, de, ate, servicosSel]);

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 4, padding: 4, background: "var(--mk-surface)", borderRadius: 10, border: "0.5px solid var(--mk-border)" }}>
          {PRESETS.map((p) => {
            const active = !custom && p.id === periodo;
            return (
              <button
                key={p.id}
                onClick={() => preset(p.id)}
                style={{ padding: "5px 12px", fontSize: 12, borderRadius: 6, border: 0, background: active ? "var(--mk-surface-2)" : "transparent", color: active ? "var(--mk-text)" : "var(--mk-text-muted)", fontWeight: active ? 600 : 400, cursor: "pointer" }}
              >
                {p.label}
              </button>
            );
          })}
          <button
            onClick={() => setCustom((s) => !s)}
            style={{ padding: "5px 12px", fontSize: 12, borderRadius: 6, border: 0, background: custom ? "var(--mk-surface-2)" : "transparent", color: custom ? "var(--mk-text)" : "var(--mk-text-muted)", fontWeight: custom ? 600 : 400, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
          >
            <i className="ti ti-calendar" /> Período X a Y
          </button>
        </div>

        {custom && (
          <div style={{ display: "flex", gap: 6, alignItems: "center", padding: 4, background: "var(--mk-surface)", borderRadius: 10, border: "0.5px solid var(--mk-border)" }}>
            <input type="date" value={de} onChange={(e) => setDe(e.target.value)} style={dateInp} />
            <span style={{ fontSize: 11, color: "var(--mk-text-muted)" }}>até</span>
            <input type="date" value={ate} onChange={(e) => setAte(e.target.value)} style={dateInp} />
            <button onClick={aplicarCustom} disabled={!de || !ate} style={{ padding: "5px 10px", fontSize: 11, borderRadius: 6, border: "0.5px solid var(--mk-accent)", background: "var(--mk-accent)", color: "#1a1a1a", cursor: de && ate ? "pointer" : "not-allowed", opacity: de && ate ? 1 : 0.5, fontWeight: 600 }}>
              Aplicar
            </button>
          </div>
        )}

        {/* Filtro de serviços */}
        {servicosDisponiveis.length > 0 && (
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setMenuServ((s) => !s)}
              style={{ padding: "5px 12px", fontSize: 12, borderRadius: 8, border: `0.5px solid ${servicosSel.size > 0 ? "var(--mk-accent)" : "var(--mk-border)"}`, background: "var(--mk-surface)", color: servicosSel.size > 0 ? "var(--mk-accent)" : "var(--mk-text-secondary)", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 }}
            >
              <i className="ti ti-tag" />
              {servicosSel.size === 0 ? "Todos os serviços" : `${servicosSel.size} serviço${servicosSel.size > 1 ? "s" : ""}`}
              <i className={`ti ti-chevron-${menuServ ? "up" : "down"}`} />
            </button>
            {menuServ && (
              <>
                <div onClick={() => setMenuServ(false)} style={{ position: "fixed", inset: 0, zIndex: 10 }} />
                <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, minWidth: 220, maxHeight: 320, overflowY: "auto", background: "var(--mk-surface)", border: "0.5px solid var(--mk-border)", borderRadius: 10, padding: 6, zIndex: 11, boxShadow: "0 6px 18px rgba(0,0,0,0.35)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 8px", borderBottom: "0.5px solid var(--mk-border)", marginBottom: 4 }}>
                    <span style={{ fontSize: 10.5, color: "var(--mk-text-muted)", textTransform: "uppercase", letterSpacing: 0.4 }}>Serviços</span>
                    {servicosSel.size > 0 && (
                      <button onClick={limparServicos} style={{ background: "transparent", border: 0, color: "var(--mk-accent)", fontSize: 10.5, cursor: "pointer", padding: 0 }}>limpar</button>
                    )}
                  </div>
                  {servicosDisponiveis.map((nome) => {
                    const marcado = servicosSel.has(nome);
                    return (
                      <label key={nome} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 6, cursor: "pointer", background: marcado ? "rgba(155,125,191,0.12)" : "transparent", fontSize: 12, color: "var(--mk-text)" }}>
                        <input type="checkbox" checked={marcado} onChange={() => toggleServico(nome)} style={{ accentColor: "var(--mk-accent)" }} />
                        {nome}
                      </label>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {loading && (
          <span style={{ fontSize: 11, color: "var(--mk-text-muted)", display: "inline-flex", alignItems: "center", gap: 5 }}>
            <i className="ti ti-loader-2" style={{ animation: "spin 0.8s linear infinite", display: "inline-block" }} /> atualizando…
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </span>
        )}

        <button
          onClick={copiarPrompt}
          style={{ marginLeft: "auto", fontSize: 12, color: copiado ? "#00E19A" : "var(--mk-text-secondary)", background: "transparent", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 12px", border: `0.5px solid ${copiado ? "#00E19A" : "var(--mk-border)"}`, borderRadius: 8 }}
          title="Copia o prompt de análise. Cole na IA (Claude/ChatGPT) e anexe o PDF abaixo."
        >
          <i className={`ti ${copiado ? "ti-check" : "ti-clipboard-text"}`} /> {copiado ? "Copiado!" : "Copiar prompt"}
        </button>

        <a
          href={`/api/relatorios/atendimentos-pdf?${qsParaBuscar()}`}
          style={{ fontSize: 12, color: "var(--mk-accent)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 12px", border: "0.5px solid var(--mk-border)", borderRadius: 8 }}
          title="Baixa um PDF com o histórico completo das conversas do período (pra análise no Claude/ChatGPT)"
        >
          <i className="ti ti-file-download" /> Baixar análise (PDF)
        </a>
      </div>

      <div style={{ opacity: loading ? 0.6 : 1, transition: "opacity 0.15s ease" }}>
        <DashboardAtendimentos kpis={dados.kpis} servicos={dados.servicos} serie={dados.serie} satisfacao={dados.satisfacao} tempos={dados.tempos} periodoLabel={dados.label} />
      </div>
    </>
  );
}

const dateInp: React.CSSProperties = { background: "var(--mk-surface-2)", border: "0.5px solid var(--mk-border)", borderRadius: 6, padding: "5px 8px", color: "var(--mk-text)", fontSize: 11.5, colorScheme: "dark" };
