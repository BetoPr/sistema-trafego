# Brief de Design — Dashboard / Campanhas (Sonar CRM)

> **Objetivo deste documento:** servir como brief completo para uma IA de Design (ou designer humano) propor o redesign da aba **"Campanhas"** dentro do Dashboard do Sonar. Tudo que a IA precisa pra entregar mockups/protótipos coerentes com o sistema está aqui dentro.

---

## 1. Contexto do produto

**Sonar** é um CRM brasileiro multi-tenant para agências de tráfego pago + atendimento WhatsApp. Roda Meta Ads + UAZAPI (WhatsApp Business). Construído em Next.js 16 + Supabase.

O Dashboard do Sonar tem **duas abas** ("Atendimentos" e "Campanhas"). Este brief é só da aba **Campanhas**.

Existe uma página separada chamada **"Pixel & Vendas"** (em Tráfego/Ads, super-admin), que é **complementar mas com propósito distinto** — ver Seção 4.

---

## 2. Propósito da aba "Campanhas" no Dashboard

**Pergunta-mãe que a aba responde:**
> *"Como meu tráfego pago tá rodando? Quanto investi, quanto faturei no geral, e qual a saúde das campanhas?"*

**Audiência:** todos os admins (não é restrita a super-admin).

**Visão:** **macro / consolidada / da operação inteira do tráfego no período.**

**O que ela mostra:**
- Investimento (gasto Meta) no período
- Faturamento real total (do CRM, todos os fechamentos do período — não só os atribuídos)
- Lucro bruto e ROAS bruto (macro)
- Métricas operacionais de Meta Ads (impressões, cliques, CTR, CPL, CAC, leads)
- Performance ao longo do tempo
- Lista das campanhas com seu estado

**O que ela NÃO mostra (responsabilidade do Pixel & Vendas):**
- "Qual campanha individualmente vendeu" (atribuição CTWA → venda)
- ROAS por campanha (atribuído)
- Saúde do tracking / diagnóstico de cada Purchase
- Vendas atribuídas (faturamento atribuído)

---

## 3. Regra de ouro — sem redundância com Pixel & Vendas

| Métrica | Dashboard/Campanhas | Pixel & Vendas |
|---|---|---|
| **Investido / Gasto** | ✅ (fonte) | ✅ (reusa, contexto de ROAS atribuído) |
| **Impressões, Cliques, CTR, CPL, CAC** | ✅ exclusivo | ❌ |
| **Leads (leadgen)** | ✅ exclusivo | ❌ |
| **Status das campanhas (Active/Paused)** | ✅ exclusivo | ❌ |
| **Faturamento TOTAL** (somatório de fechamentos no período, do CRM) | ✅ exclusivo | ❌ |
| **Lucro bruto / ROAS bruto** (macro) | ✅ exclusivo | ❌ |
| **Faturamento ATRIBUÍDO** (só vendas com cadeia CTWA→campanha) | ❌ | ✅ exclusivo |
| **ROAS por campanha (atribuído)** | ❌ | ✅ exclusivo |
| **Diagnóstico de atribuição evento-a-evento** | ❌ | ✅ exclusivo |

---

## 4. KPIs propostos (numa ordem sugestiva)

### Grupo A — "Performance financeira" (linha 1, principal)
1. **Investido** — soma de `metricas_diarias.gasto` no período. Cor de destaque: laranja `#F0A35E`. Sub-texto: "investido em ads".
2. **Faturamento** — soma de `tickets.valor_fechado` no período (`fechado_em` dentro da janela). **Fonte = CRM, não Meta.** Cor: neutra. Sub-texto: "N vendas fechadas".
3. **Lucro bruto** — Faturamento − Investido. Cor: verde do CRM (`--mk-accent`) quando positivo, vermelho quando negativo. Destacado (borda colorida).
4. **ROAS bruto** — Faturamento ÷ Investido (mostrar "—" quando Investido = 0). Sub-texto: "retorno sobre investimento".

### Grupo B — "Tráfego" (linha 2, operacional)
5. **Impressões** — soma.
6. **Cliques** — soma. Sub-texto com CTR.
7. **CPL** — Investido ÷ Leads (ou "—" se 0 leads).
8. **CAC** — Investido ÷ Conversões (ou "—").

### Visualizações (abaixo dos KPIs)
- **Curva temporal "Investido × Faturamento"** — área dupla, eixo X = data, eixo Y = R$. Mostra correlação visual entre o que entrou e o que saiu.
- **TOP 5 campanhas (por gasto)** — barras horizontais.
- **Status das campanhas** — donut Active/Paused/Outras.
- **Lista de campanhas** — tabela: nome, status (badge), gasto, leads, CTR, CPM, ação (link pra Pixel & Vendas filtrado por essa campanha — handoff entre as duas telas).

---

## 5. Inventário de dados disponíveis (esquema)

### Tabelas / colunas relevantes (Supabase)

```
metricas_diarias  (grão: 1 linha por anúncio por dia)
  ├ anuncio_id, conjunto_id, campanha_id, cliente_id, agencia_id
  ├ data (date)
  ├ impressoes, alcance, cliques, gasto, conversoes
  ├ receita ← SEMPRE 0 (Meta não retorna; NÃO USAR)
  ├ leads, frequencia, visualizacoes_video, engajamento

campanhas          (id, nome, objetivo, status, orcamento_diario, orcamento_total, data_inicio, data_fim)
conjuntos          (id, nome, campanha_id, ...)
anuncios           (id, nome, conjunto_id, ...)

tickets            (id, contato_id, agencia_id, valor_fechado, fechado_em,
                    metadata.servico, metadata.quantidade)
  └ FONTE OFICIAL do faturamento real (NÃO usar metricas_diarias.receita)

meta_leads         (leads do leadgen do Meta — campaign_id, adset_id, ad_id, ctwa_clid)

clientes           (id, nome)  — agência atende N clientes
agencias           (id, nome)  — tenant
usuarios           (id, agencia_id, role: super_admin/admin/atendente)
```

### Filtros já existentes a manter
- **Período:** Hoje · 7 dias · 30 dias · Customizado (range de/até)
- Toggle entre as abas "Atendimentos" e "Campanhas" no topo
- (Futuro, fora do escopo deste brief) Filtro por cliente

---

## 6. Sistema de Design — paleta e tokens

O Sonar usa CSS variables (light + dark). **Sempre referenciar via `var(--mk-*)`**, nunca colocar hex direto (com exceção do laranja de "investido").

### Light mode
```
--mk-bg: #F7F9F6
--mk-bg-deep: #EEF2EC
--mk-surface: rgba(255,255,255,0.78)
--mk-surface-2: #EAF0EC
--mk-text: #0D1F17
--mk-text-secondary: #5A6862
--mk-text-muted: #7A8A82
--mk-border: rgba(16,185,129,0.16)
--mk-border-soft: rgba(16,185,129,0.08)
--mk-accent: #059669        ← verde principal (CRM)
--mk-accent-2: #10B981
--mk-icon-green: #059669
--mk-icon-blue: #0D9488
--mk-icon-purple: #7C3AED
--mk-icon-pink: #E11D48
--mk-icon-amber: #D97706
```

### Dark mode
```
--mk-bg: #080808
--mk-bg-deep: #050505
--mk-surface: rgba(0,0,0,0.50)
--mk-surface-2: rgba(255,255,255,0.05)
--mk-text: #FFFFFF
--mk-text-secondary: #999999
--mk-text-muted: #666666
--mk-border: rgba(255,255,255,0.08)
--mk-border-soft: rgba(255,255,255,0.05)
--mk-accent: #10B981        ← verde principal (CRM, dark)
--mk-accent-2: #34D399
--mk-icon-green: #34D399
```

### Cores de status (consistentes em ambos modos)
- **Investido** (gasto): `#F0A35E` (laranja queimado, único hex permitido fora dos tokens)
- **Faturamento positivo** / sucesso: `var(--mk-accent)` (verde)
- **Negativo** / erro: `#FB7185` (rosa-vermelho)
- **Atenção** / warning: `#FBBF24` (âmbar) ou `#F0A35E`
- **Neutro** / info: `var(--mk-text-secondary)`

### Tipografia
- Font principal: **Inter** (via `var(--font-inter)`)
- Mono: `var(--font-geist-mono)`
- Heading: `var(--font-inter)` (mesmo, peso 600-700)
- Letter-spacing levemente negativo em títulos grandes (`-0.5px`)

### Tamanhos típicos do design system
- KPI valor grande: **22-32px** font-weight 700
- KPI título (eyebrow): **10-11px** uppercase letter-spacing 0.7px
- Body padrão: **12.5-13px**
- Sub-texto: **10.5-11px** muted
- Page title: **24-26px** weight 700
- Section title (label-tiny): **10.5px** uppercase muted

### Espaçamento (escala usada)
- Padding card padrão: **16px** (compacto) ou **18px** (grande)
- Gap entre KPIs: **12-14px**
- Margin entre seções: **14-20px**
- Border radius: **8-12px** em cards, **6-8px** em chips/badges, **50%** em avatares

### Bordas e elevação
- Border padrão: **0.5px** solid `var(--mk-border)` (não usar 1px — fica grosso demais no sistema)
- Cards não têm sombra forte — destaque vem da cor de borda
- Cards "destacados" usam `border-color: var(--mk-accent)` ou um glow leve

---

## 7. Componentes / classes utilitárias já existentes

A IA deve **reutilizar essas classes** quando possível, não inventar nomes novos:

```
.mk-page              container raiz da página (padding + fade-in)
.mk-page-head         bloco do título da página
.mk-eyebrow           label pequena uppercase verde em cima do título
.mk-page-title        h1 (24-26px, peso 700)
.mk-page-sub          parágrafo subtítulo (13px muted)
.mk-card              card padrão (surface + border)
.mk-card-lg           variante com padding maior
.label-tiny           label de seção (10.5px uppercase)
.mk-table             tabela do sistema (header uppercase, linhas com border-top soft)
.mk-table-card        modificador pra usar mk-table dentro de mk-card com padding interno
.ghost-btn            botão fantasma (transparente + border)
.cta-btn              botão primário verde (accent)
.mk-badge             chip pequeno (status, etiquetas)
   .b-green / .b-amber  variantes de cor
.mk-icon-btn          botão só com ícone (search, refresh, etc.)
.search-input         input de busca padrão
.dash-2col            grid 2 colunas (2fr 1fr) que vira 1col no mobile
.row-meta / .row-sub  metadata de linhas em tabelas
.funnel-side / .funnel-metrics  (usados em outras telas, podem ou não reusar)
.balao-overlay        overlay do modal Balão
```

### Componentes React reusáveis (já implementados)

```tsx
<Balao open={...} onClose={...} titulo="..." icone="ti-...">  // modal padrão (portal, blur)
```

### Ícones
**Tabler Icons** (via classe CSS `ti ti-<name>`). Exemplos usados no Sonar:
- `ti-speakerphone` (Campanhas, Tráfego)
- `ti-target-arrow` (Leads, Pixel & Vendas)
- `ti-chart-histogram` (Análises)
- `ti-rocket` (Massa)
- `ti-bolt` (Rápidas)
- `ti-clock-bolt` (Follow-up)
- `ti-credit-card` (Plano)
- `ti-brain` (IA)
- `ti-photo-square-rounded` (Criativos)
- `ti-filter` (Funil)
- `ti-users-group` (Equipes/Público)
- `ti-shield-lock` (Admin/Segurança)
- `ti-refresh` (Sincronizar)

---

## 8. Layout existente atual (referência do que substituir)

A versão atual da aba Campanhas tem:

1. Header: título "Bom dia, {nome}", subtítulo "N integração(ões) ativa(s)", botão "Sincronizar agora" no canto direito.
2. ViewToggle (Atendimentos / Campanhas) embaixo do título.
3. PeriodoToggle (Hoje / 7 dias / 30 dias).
4. **8 KPIs em grid 4×2:** Investido, Faturamento (mostra R$ 0 — bug, vai sair), ROAS (0x — bug, vai sair), Leads, CPL, CAC, Conversões, CTR.
5. Grid 2 colunas: gráfico "Investido × Faturamento (diário)" + donut "Status das campanhas".
6. Gráfico horizontal "TOP 5 campanhas (por gasto)".

**Problemas conhecidos a corrigir no redesign:**
- O KPI "Faturamento" sempre mostra R$ 0,00 porque a fonte (`metricas_diarias.receita`) é hardcoded 0 — **trocar fonte para `tickets.valor_fechado`** (CRM real).
- Consequentemente, "ROAS" também está sempre 0x — **será recalculado com a nova fonte**.
- "Conversões" mostra o número que o Meta classifica como "conversa iniciada" (CTWA messaging) — **manter, mas explicar no tooltip**.
- KPI grid 4×2 é meio denso. Avaliar se vira 4×1 (mais respiro) + grupo separado de "tráfego" embaixo.

---

## 9. Constraints técnicos

- **Framework:** Next.js 16 (App Router, RSC por padrão; `"use client"` só quando necessário).
- **Estilo:** CSS Modules NÃO usado; é tudo `globals.css` + `style={{}}` inline + className utilitárias. **Não propor Tailwind, styled-components ou CSS-in-JS** — sair do padrão quebra o projeto.
- **Charts:** **Recharts** (já instalado). Não propor D3, Chart.js, Visx, etc.
- **Modal:** **componente `Balao`** existente (portal, overlay com blur). Não criar modal novo.
- **Renderização:** preferir Server Components; só usar Client quando precisar de estado/eventos.
- **i18n:** **pt-BR puro** (sem framework de i18n). Datas em pt-BR via `date-fns` + `Intl.NumberFormat("pt-BR", {style:"currency", currency:"BRL"})`.
- **Responsivo:** breakpoint principal **768px** (mobile), grids viram 1 coluna. **Sidebar** ocupa ~240px em desktop.
- **Acessibilidade:** contraste mínimo 4.5:1, foco visível em todos os interativos, semântica HTML correta.
- **Dark mode é padrão** — testar primeiro no escuro.

---

## 10. Critérios de aceite do redesign

Pra o design entregue ser considerado pronto:

1. **Sem KPI fantasma:** todo KPI mostrado tem dado real e não-zero estruturalmente (ex.: nada de "Receita" vindo de fonte zerada).
2. **Sem redundância** com Pixel & Vendas (ver Seção 3).
3. **Faturamento vem do CRM** (`tickets.valor_fechado`), não do Meta.
4. **Hierarquia visual clara:** KPIs financeiros (investido/faturamento/lucro/ROAS) em destaque maior; KPIs de tráfego (impressões/cliques/CTR/CPL) em destaque secundário.
5. **Curva "Investido × Faturamento"** com cores distintas e claras (laranja vs verde), legenda visível.
6. **Empty states** elegantes para: sem integração ativa, sem dados no período, conta nova sem histórico.
7. **Loading states** explícitos (skeleton) onde aplicável.
8. **Mobile-first responsivo** — KPIs reordenam em 2×N, gráficos ocupam largura inteira.
9. **Padrão visual consistente** com o resto do Sonar (cards `mk-card`, classes `mk-page-*`, tipografia Inter, cores via vars).
10. **Handoff pra Pixel & Vendas:** cada campanha na lista deve ter um link/ação que abre Pixel & Vendas filtrado por aquela campanha (continuação natural do fluxo "macro → detalhe").

---

## 11. Entregáveis esperados da IA de Design

1. **Mockup do estado padrão** (com dados — usar valores fictícios coerentes: investido ~R$ 3.500, faturamento ~R$ 12.000, etc.).
2. **Mockup do estado mobile** (≤768px).
3. **Mockup do empty state** (sem integração ativa).
4. **Mockup do estado "conta nova"** (com integração mas sem fechamentos ainda — só Meta, sem Faturamento).
5. **Variações de hover/foco** dos elementos interativos principais.
6. **Anotações** dos componentes/classes do design system que cada elemento reusa.

---

## 12. O que NÃO está no escopo deste brief

- Redesign do menu lateral (sidebar) ou topbar.
- Redesign de outras abas (Atendimentos, Pixel & Vendas, Análise de IAs, etc.).
- Mudança de paleta global ou tipografia base.
- Sistema de notificações.
- Editor de campanhas (criar/editar campanha pelo CRM) — fica pra fase futura.

---

## 13. Referências cruzadas (pra contexto da IA)

- **Atendimentos** (aba irmã): mostra vendas/serviços fechados no período, ticket médio, por serviço, por dia. Estética similar (cards verdes, KPIs grandes, gráficos Recharts). **A aba Campanhas deve dialogar visualmente com essa.**
- **Pixel & Vendas:** painel super-admin, com banner de saúde no topo, KPIs Gasto/Bruto/Líquido/ROAS, tabela expansível campanha→conjunto, feed de Purchases enviados ao Meta com botão "Por quê?". Visual: ícones SVG inline + verde do CRM + cards verdes.

**Pista visual:** o Sonar tem identidade orgânica/natural — paleta de verdes profundos, cinzas-azuis, off-whites. Evitar acentos muito frios (azul puro, magenta) ou neons. Aurora background em algumas telas dá um brilho sutil.
