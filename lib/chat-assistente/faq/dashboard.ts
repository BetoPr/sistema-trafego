export const DASHBOARD = `# Dashboard

KPIs + graficos + top criativos da agencia.

## O que mostra
- 2 views: **Atendimentos** (vendas/funil CRM) e **Campanhas** (metricas Meta Ads).
- Periodo: Hoje / 7d / 30d (botoes acima dos KPIs).
- KPIs Campanhas: Investido, Faturamento, Lucro, ROAS, CPL, CAC, Impressoes, Cliques, CTR.
- Graficos: Investido x Faturamento diario, Status das campanhas (donut), Top campanhas (barra).
- **Top Criativos**: thumbs dos anuncios Meta. 3 modos (grade/carrossel/lista). Filtro por campanha (checkbox verde) e ordenacao por gasto.

## Filtro cross-aba
- O pill no topo da topbar filtra Dashboard por Pasta/Etiqueta/Campanha. Os KPIs e graficos respeitam.

## Botoes
- **Sincronizar agora** — forca pull Meta Ads na hora (so view Campanhas).
- **CountUp animation** nos KPIs ao carregar.

## Onde vem o dado
- Investido/imp/clicks: \`metricas_diarias\` (sync Meta).
- Faturamento: soma \`tickets.valor_fechado\` no periodo (CRM real, nao Meta).
- ROAS = faturamento / investido.
- CAC = investido / conversoes.

## Problemas comuns
- KPIs zerados: sem integracao Meta ativa OU periodo errado OU filtro cross-aba sem match.
- Thumb de criativo quebrado: URL Meta CDN expirou, proxima sync atualiza.
`;
