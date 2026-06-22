# Prompt de handoff — Redesign da aba "Campanhas" (Sonar CRM)

> Cole o texto abaixo na sua IA de código (Cursor/Claude Code/etc.), anexando os arquivos desta pasta.

---

Use este documento e as fotos como **referência + instruções** para mudar o design da aba **"Campanhas"** do Dashboard do nosso CRM (Sonar).

**Arquivos anexados:**
- `referencias/brief-campanhas.md` — brief completo do produto, métricas, fontes de dados e tokens de design (a fonte da verdade).
- `referencias/atual-1..4.png` — como a aba Campanhas está HOJE (o que vamos substituir).
- `Sonar Dashboard.dc.html` (+ `support.js`) — **mockup-alvo**: abra no navegador para ver exatamente o visual e as interações que queremos. É a referência visual final. (É um protótipo em HTML/JS puro; **reimplemente em Next.js**, não copie o runtime.)
- `Contatos por Estado - Variações.dc.html` — variações exploradas da seção de mapa (apenas contexto).
- `icone-dashboard.svg` / `.png` — ícone verde do item Dashboard.

**Stack / regras (não fugir disso — está detalhado no brief):**
- Next.js 16 (App Router, RSC por padrão; `"use client"` só onde houver estado/eventos).
- Estilo: `globals.css` + `style={{}}` inline + classes utilitárias existentes (`mk-page`, `mk-card`, `mk-eyebrow`, `label-tiny`, `mk-badge`, etc.). **Nada de Tailwind, styled-components ou CSS-in-JS.**
- Cores SEMPRE via `var(--mk-*)` (exceção: laranja `#F0A35E` do "Investido"). Dark mode é o padrão — testar primeiro no escuro.
- Charts: **Recharts** (já instalado). Tipografia: **Inter** (`var(--font-inter)`). pt-BR puro (`Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'})`, datas com `date-fns`).
- Responsivo: breakpoint 768px → grids viram 1 coluna.

**O que construir na aba Campanhas (espelhando o mockup):**
1. **KPIs financeiros (linha principal, em destaque):** Investido (laranja) · Faturamento · **Lucro Bruto** (card destacado, verde/vermelho) · ROAS Bruto.
2. **KPIs de tráfego (linha secundária, menores):** Impressões · Cliques (com CTR) · CPL · CAC.
3. **Gráfico "Investido × Faturamento (diário)"** — área dupla, laranja vs verde, com legenda.
4. **Donut "Status das campanhas"** (Ativas / Pausadas / Outras).
5. **TOP 5 campanhas (por gasto)** — barras horizontais.
6. **Seção "Contatos por Estado"** (nova): mapa do Brasil com bolhas proporcionais por estado (hover mostra o nº de contatos e %), **ranking Top 10** ao lado e **distribuição por região** (barras tipo marimekko) abaixo.

**Fontes de dados (críticas — corrige os bugs atuais):**
- **Faturamento** = soma de `tickets.valor_fechado` no período (CRM real). **NÃO** usar `metricas_diarias.receita` (vem 0).
- **ROAS / Lucro** recalculados com a fonte acima.
- Investido/Impressões/Cliques/CTR/CPL/CAC/Leads/Status vêm de `metricas_diarias` + `campanhas` (Meta).
- **Sem redundância** com a tela "Pixel & Vendas" (ver tabela no brief, seção 3).

**Aceite (resumo — detalhes no brief, seção 10):** sem KPI fantasma/zerado; hierarquia visual clara (financeiro > tráfego); empty states (sem integração / conta nova sem fechamentos); loading skeletons; mobile-first; consistência com o restante do Sonar; cada campanha da lista com handoff (link) para "Pixel & Vendas" filtrado.

Comece propondo a estrutura de componentes e os hooks/queries Supabase, depois implemente seção por seção. Pergunte se algum dado/coluna não existir no schema.
