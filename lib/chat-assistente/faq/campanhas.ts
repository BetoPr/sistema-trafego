export const CAMPANHAS = `# Campanhas (Tabela de Anuncios)

Tabela estilo Meta Ads Manager. Lista anuncios da agencia agregados por periodo.

## Colunas (esquerda → direita)
1. **Status dot + thumb 40x40 + nome anuncio** + sublabel conjunto.
2. **Resultados** (leads ou conversoes).
3. **Custo / Resultado**.
4. **Valor usado** (gasto agregado periodo, em destaque).
5. **Impressoes**.
6. **Alcance**.
7. **CPM** (custo por mil impressoes).
8. **CTR** (cliques / impressoes em %).
9. **ROAS** (receita / gasto). Verde se >= 1x.
10. **Campanha pai**.

## Tabs / filtros
- **Todos / Ativos / Pausados**: filtro por status.
- **Busca**: pesquisa por nome anuncio ou nome campanha.
- **Periodo**: Hoje / 7d / 30d (botoes acima da tabela).
- **Filtro cross-aba topbar**: Pasta/Etiqueta/Campanha — afeta tabela tambem.

## Sort
- Click no cabecalho de qualquer coluna ordena (toggle asc/desc).

## Footer
- Linha TOTAL agregada (gasto, imp, alc, CPM, CTR, ROAS).

## De onde vem
- \`anuncios.criativo.thumbnail_url\` (sync Meta).
- \`metricas_diarias\` agrupado por anuncio_id.
- \`conjuntos\` e \`campanhas\` pra nomes parent.

## Sincronizar
- Botao "Sincronizar agora" no topo dispara pull Meta Ads imediato.
- Cron automatico roda /api/cron/sync-meta (configurar no pg_cron).

## Empty state
- Sem integracao Meta ativa: CTA pra conectar em /integracoes/meta.

## Problemas
- Thumb quebrado: CDN Meta expirou, proxima sync atualiza.
- Numero diferente do Meta Ads Manager: diferenca de timezone ou attribution window (Meta usa 1d_click+7d_view por padrao, voce ve agregado sem janela).
`;
