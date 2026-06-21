# Redesign das abas — Sonar CRM

Documentação técnica de cada aba pra mandar pra IA de Design (Claude Design) redesenhar **desktop + mobile**.

## Estrutura

```
docs/redesign-abas/
  README.md            ← este arquivo
  tokens.md            ← paleta + tipografia + componentes (referência única)
  sessao-1/            ← P5 — Atendimentos + Follow-up (core day-to-day, bugadas mobile)
    aba-atendimentos/
      prompt.md
      desktop.png      ← você cola
      mobile.png       ← você cola
    aba-follow-up/
      prompt.md
      desktop.png
      mobile.png
  sessao-2/            ← P5/P4 — Contatos + Pixel & Vendas
  sessao-3/            ← P4 — Campanhas + Canais
  sessao-4/            ← P3 — IA + Envio em Massa
  sessao-5/            ← P3 — Filas + Equipes + Usuários
  sessao-6/            ← P2 — Mensagens Rápidas + Grupos
```

## Como usar

1. Abre cada aba do CRM no desktop (1920×1080) → print full-screen → salva como `desktop.png` na pasta da aba.
2. Abre no mobile (375×800, ou DevTools → device toolbar) → print → salva como `mobile.png`.
3. Manda pra IA de Design **3 arquivos por aba** + o `tokens.md` global.
4. IA volta com mockups → você ou eu copiamos pro código.

## Ordem de prioridade

| Sessão | Abas | Prioridade | Por que |
|---|---|---|---|
| 1 | Atendimentos + Follow-up | **P5** | Core day-to-day. Atendimentos tá bugada mobile. |
| 2 | Contatos + Pixel & Vendas | P5/P4 | Contatos = base de dados. Pixel & Vendas = recém-feito. |
| 3 | Campanhas + Canais | P4 | Campanhas = financeiro macro. Canais = sem WhatsApp não roda. |
| 4 | IA + Envio em Massa | P3 | Diferenciador + comunicação outbound. |
| 5 | Filas + Equipes + Usuários | P3 | Admin de time. |
| 6 | Mensagens Rápidas + Grupos | P2 | Apoio. |

## Cada `prompt.md` tem

1. **Identidade** — nome, rota, objetivo, audiência, prioridade, 3 maiores dores.
2. **Estrutura visual** — seções de cima a baixo + ações + (esperado) prints.
3. **Dados** — tabela `Elemento | Campo | Origem | Tipo | Exemplo | Cálculo`; ❗ marca inconsistências.
4. **Estados** — vazio/carregando/erro/sem permissão.
5. **Filtros / parâmetros** — período, busca, multi-select.
6. **Navegação / deep-links** — para onde cada item leva.
7. **Componentes / tokens** — classes mk-*, ícones Tabler, refs.
8. **Brief de redesign mobile** — prioridades pro designer.

## Princípios

- Reaproveitar `mk-card`, `ghost-btn`, `cta-btn`, `Balao`, etc. — não inventar.
- Cores via `var(--mk-*)` (CSS vars), exceto laranja `#F0A35E` (Investido).
- Tabler icons via `ti ti-*`.
- Recharts pros gráficos (não trocar libs).
- Dark mode é default.
- Mobile breakpoint principal: **768px**.
