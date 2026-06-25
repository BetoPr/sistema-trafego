export const DASHBOARD = `# Dashboard — painel principal

Rota: /dashboard (também home após login)

KPIs + gráficos de performance de tráfego + atendimentos/vendas.

## Filtros
- **Período**: botões Hoje / 7 dias / 30 dias. Ou "Período X a Y" abre date inputs custom (De / Até + Aplicar).
- **View toggle**: Atendimentos vs Campanhas
  - Atendimentos — métricas vendas/serviços fechados no CRM
  - Campanhas — métricas de ads (Meta + Google)
- **Plataforma** (Meta / Google) seletor

Selecionou 1 cliente → todos KPIs recalculam pra ele.

## KPIs Financeiros
- **Investido** (R$ gasto em ads)
- **Faturamento** (R$ vendas CRM)
- **Lucro Bruto** (Faturamento - Investido)
- **ROAS Bruto** (retorno múltiplo)

## KPIs Tráfego
- **Impressões** (alcance ads)
- **Cliques** (CTR%)
- **CPL** (custo por lead)
- **CAC** (custo aquisição)

## Gráficos
- **Gasto vs Receita** — line chart série diária
- **Status Donut** — donut campanhas (ativas / pausadas / encerradas)
- **Top Campanhas** — bar top 5 por gasto
- **Criativos Top** — grid 6 melhores ads (imagens + métricas)
- **Atendimentos Live** — vendas em tempo real

## Atualização
- KPIs financeiros: polling 60s
- Atendimentos Live: realtime (Supabase channel)
- Refresh manual: F5

## ROAS "—"?
Cálculo precisa de **Investido > 0** E **Faturamento > 0**. Se um zerou no período, mostra —.

## CountUp animação
KPIs animam contagem 0→valor ao carregar (também em Atendimentos e Análise IAs).
`;
