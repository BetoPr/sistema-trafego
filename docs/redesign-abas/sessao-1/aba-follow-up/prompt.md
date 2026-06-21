# Aba — Follow-up com IA

> Para a IA de Design: redesenhar respeitando este inventário. Tokens em `/docs/redesign-abas/tokens.md`. Stack idêntico ao Atendimentos.

---

## 1. Identidade

- **Nome:** Follow-up com IA
- **Rota:** `/follow-up`
- **Objetivo:** Recuperar conversas paradas — IA lê histórico, resume, sugere a mensagem; admin revisa, aprova e envia.
- **Quem usa:** admin + super_admin — `requireAdmin` em [page.tsx:10](app/(dashboard)/follow-up/page.tsx:10).
- **Prioridade:** **5** — ferramenta diária de revenda/reativação.
- **3 maiores dores hoje:**
  1. **Densidade de filtros** — período, status, etiqueta, conexão, delays, quantidade tudo numa barra só. Cabeçalho extenso.
  2. **Card de candidato é alto** — nome, telefone, parado-há, contadores, motivo IA, resumo, mensagem editável, tom, cadência (msg2+msg3+horários), botões Enviar/Descartar/Espiar/Etiquetar. Não escala bem mobile.
  3. **Janela comercial** (canto direito do header) some/quebra no mobile.

---

## 2. Estrutura visual (cima → baixo)

### Header da página ([page.tsx:44](app/(dashboard)/follow-up/page.tsx:44))
- Esquerda: eyebrow "Atendimentos" + título "Follow-up com IA" + subtítulo explicativo.
- Direita: `<JanelaComercial>` — 2 selects (início × fim) + checkbox "Almoço" que revela 2 selects extras.

### Barra de filtros (mk-card) — [_client.tsx:142](app/(dashboard)/follow-up/_client.tsx:142)
1. **Período (conversas paradas)** — pills `Hoje / 7 dias / 15 dias / Período`. Se `Período`: 2 inputs date.
2. **Status + Quantidade** — pills `Ambos / Abertos / Pendentes` + input numérico (1–500, default 60).
3. **Etiqueta + Conexão** — 2 `MultiDropdown` com chips coloridos.
4. **Delay min / máx** (segundos) — 2 inputs numéricos. Anti-flood.
5. **Ações** (border-top) —
   - `Buscar conversas` (cta-btn verde com loader).
   - `Analisar N com IA` (cta-btn roxo `#9B7DBF`).
   - `Parar` análise (ghost-btn vermelho `#C97064`).
   - `Enviar N aprovado(s)` (ghost-btn).
   - `Ao descartar, some por` — select cooldown (1h / 6h / 12h / 24h / 3d / Não volta).
   - Contador à direita: `N parada(s) · M sem análise`.
6. **Card explicativo "Como funciona"** (info azul `#9B7DBF`).
7. **Linhas de erro** (texto vermelho).

### Filtros em tempo real (segundo mk-card) — [_client.tsx:240](app/(dashboard)/follow-up/_client.tsx:240)
- **Recomendação** — pills com contagem: `Todos · Vale · Não recomendado · Sem análise`.
- **Follow-ups já enviados** — pills: `Todos · 0 · 1 · 2 · 3 · 4 · 5+`.
- Botão "Limpar filtros" aparece quando algum filtro tá ativo.

### Lista de candidatos
Cada `CardCand` ([_client.tsx:298](app/(dashboard)/follow-up/_client.tsx:298)):
1. Cabeçalho: nome + `#numero` · whatsapp · "parado há Xh" · badge follow-ups feitos.
2. Motivo (badge): "✓ Vale follow-up" / "✗ Não recomendado" / "Sem análise".
3. Resumo IA (gerado).
4. Textarea mensagem (editável) + select de tom (`Padrão / Direto / Emocional / Na dor / Contextualizado / Simpático`) + botão "Regenerar tom".
5. Cadência — msg1 (envia agora) + msg2 (gerada IA, agendar Xh) + msg3 (gerada IA, agendar Yd) — todas editáveis, agendadas e canceladas se cliente responder.
6. Toggle "Enviar quando aprovar".
7. Ações: `Enviar agora` · `Descartar` · `Espiar` (balão) · `Etiquetar` (balão).
8. Estado `_sent`: opacidade 60%.

### Empty states
- Após buscar e zero candidatos: `Empty(ti-mood-smile)` — "Nenhuma conversa parada nesse período/filtro. Tudo em dia!"
- Após filtros em tempo real zerarem: `Empty(ti-filter-off)` — "Nenhuma conversa com esse filtro. Ajuste acima."

### Balões
- `<EspiarBalao>` — mostra mensagens em modo leitura.
- `<EtiquetarBalao>` — aplica etiqueta no contato.

---

## 3. Dados (Elemento | Origem | Tipo | Exemplo | Cálculo)

| Elemento | Origem | Tipo | Exemplo | Cálculo |
|---|---|---|---|---|
| Lista etiquetas | `etiquetas` (`ativo=true` AND categoria etiqueta/null) | row[] | "Pediu preço" | filtro |
| Lista canais | `canais` (todos da agência) | row[] | "WhatsApp Principal" | — |
| Janela comercial | `configuracoes_agencia.ia.followup_janela` (jsonb) | obj | `{inicio:"08:00", fim:"18:00", almocoAtivo:true, almocoInicio:"12:00", almocoFim:"13:00"}` | `parseJanela()` em `lib/crm/janela-comercial.ts` |
| Candidatos | POST `/api/follow-up/ia/verificar` body `{janela, de, ate, limite, status, etiquetaIds, canalIds}` | row[] | — | server agrega tickets com última msg `cliente` mais antiga que X |
| Cada candidato | derivado | obj | — | `{ticketId, contatoId, numero, nome, whatsapp, ultima_mensagem_em, followups_enviados, enviar, motivo, resumo, mensagem, tom, cadencia, msg2, msg3, _analisado, _sent}` |
| `followups_enviados` | count `mensagens` autor `atendente` `metadata.follow_up_ia=true` por ticket | int | 2 | — |
| Análise IA (motivo+resumo+msg1) | POST `/api/follow-up/ia/analisar/[id]` | obj | — | resumo via Groq llama-3.3-70b, sugestão de tom |
| Geração msg2/msg3 | POST `/api/follow-up/ia/gerar-extra` | text | "Oi João, ainda…" | — |
| Envio | POST `/api/follow-up/ia/enviar` body `{ticketId, mensagem, cadencia, msg2, msg3}` | — | — | grava em `follow_up_avulsos` (status `agendado`) |
| Descarte | POST `/api/follow-up/ia/descartar` body `{ticketId, horas|nunca, fechar}` | — | — | aplica cooldown via `descarte_ate` em metadata do contato/ticket |
| `delayMin/Max` | localStorage do componente (não persiste server) | int | 30/60 | passados pro fn `enviarTodos` |
| Cadência padrão | `CADENCIA_PADRAO` em `_crm-overlays.ts` | obj | `{cadencia:1, t2_horas:24, t3_dias:3}` | — |
| Conversas paradas server | query: `tickets` + última `mensagens.autor='cliente'` há > janela | — | — | regra em `app/api/follow-up/ia/verificar/route.ts` |

### Tabelas relacionadas
- `follow_up_avulsos` — fila de envios (status `agendado/enviando/enviado/cancelado`). Worker em `lib/crm/follow-up-avulso.ts`.
- `follow_up_inscricoes` — sequências automáticas por etiqueta.
- `ia_atendimento_followup_sequencias` — config de sequências (admin).
- `mensagens.metadata.follow_up_ia` `true` — marca msg como originada da IA.

### ❗ Inconsistências
- ❗ Janela comercial salva em `ia.followup_janela`, mas `worker` lê e aplica em `lib/crm/janela-comercial.ts`. Janela respeitada só no envio do worker — não no agendamento do UI.
- ❗ `descarte_ate` não tem campo dedicado — usa metadata. Fica difícil de query.
- ❗ Cadência avançada (msg2/msg3) gera no momento + edita; se cliente responder antes, o worker cancela (lib/crm/follow-up-avulso.ts).
- ❗ Custos Groq — análise pesa. Existe rate-limit interno (`porMinuto=12`).

---

## 4. Estados

| Estado | Quando | UI |
|---|---|---|
| **Inicial** | sem busca | nada renderizado, só barra de filtros |
| **Buscando** | clicou Buscar | botão com spinner `Buscando…` |
| **Vazio (zero candidatos)** | resposta com 0 | `<Empty ti-mood-smile>` "Tudo em dia!" |
| **Filtros zeram** | rec+fu não casam nada | `<Empty ti-filter-off>` "Ajuste filtros acima" |
| **Analisando** | clicou Analisar | botão com loader + progresso `feitos/total` |
| **Parar análise** | botão `ti-player-stop` | retoma manual |
| **Erro busca** | catch | div vermelha `setErro("Falha")` |
| **Enviando** | clicou Enviar todos | botão com `Enviando…` |
| **Card enviado** | `_sent=true` | opacidade 60% |
| **Sem permissão** | `requireAdmin` falha | redirect global |

---

## 5. Filtros / parâmetros

| Filtro | Valores | Default |
|---|---|---|
| Janela | `hoje / 7d / 15d / periodo` | `7d` |
| Período custom | `de`+`até` (YYYY-MM-DD) | vazio |
| Status | `ambos / aberto / pendente` | `ambos` |
| Quantidade | 1–500 | 60 |
| Etiquetas | multi-id | [] |
| Canais | multi-id | [] |
| Delay envio mínimo | seg ≥0 | 30 |
| Delay envio máximo | seg ≥0 | 60 |
| Filtro recomendação | `todos / vale / nao / sem` | `todos` |
| Filtro follow-ups feitos | `todos / 0 / 1 / 2 / 3 / 4 / 5+` | `todos` |
| Descarte cooldown | `1h / 6h / 12h / 24h / 3d / nunca` | `12h` |
| Janela comercial (server) | `inicio`, `fim`, `almoco*` | 08–18 sem almoço |

Não usa URL params — tudo client state.

---

## 6. Navegação / deep-links

| Ação | Destino |
|---|---|
| Card "Espiar" | abre `<EspiarBalao>` (lê `mensagens` via balão) |
| Card "Etiquetar" | abre `<EtiquetarBalao>` (aplica etiqueta no contato) |
| Card "Enviar agora" | POST `/api/follow-up/ia/enviar` |
| Card "Descartar" | POST `/api/follow-up/ia/descartar` |
| Card "Regenerar tom" | POST `/api/follow-up/ia/analisar/[id]?tom=...` |
| Card "Gerar msg2/msg3" | POST `/api/follow-up/ia/gerar-extra` |
| "Buscar conversas" | POST `/api/follow-up/ia/verificar` |
| "Analisar N" | loop POST `/api/follow-up/ia/analisar/[id]` (rate-limited interno) |
| "Enviar N aprovado(s)" | loop POST envio com delay aleatório `[delayMin, delayMax]`s entre cada |
| Janela comercial salvar | server action `salvarJanelaComercial` em `_actions.ts` |

---

## 7. Componentes / classes reusadas

- **Componentes locais:** `<JanelaComercial>` (header) + `<FollowUpClient>` (corpo) + `<CardCand>` (cada candidato) + `<EspiarBalao>`, `<EtiquetarBalao>`, `<BolhaEspiada>`, `<MultiDropdown>`, `<Pill>`, `<FiltroLinha>`, `<Empty>`, `<Label>`, `<Campo>`.
- **Provider global:** `useFollowUpRun()` em `app/(dashboard)/_crm-overlays.tsx` — sobrevive a navegar fora da aba e mantém o widget flutuante de progresso.
- **Classes:** `.mk-card`, `.cta-btn`, `.ghost-btn`, `.mk-page`, `.mk-page-head`, `.mk-eyebrow`, `.mk-page-title`, `.mk-page-sub`.
- **Estilo inline `inp`:** padrão dos inputs (`padding 8px 12px`, `border 0.5px var(--mk-border)`, `bg var(--mk-surface-2)`, `radius 8px`).
- **Cores especiais:** roxo `#9B7DBF` (IA), vermelho `#C97064` (parar/descartar), verde `#10b981` (sucesso/conectado).
- **Animações inline:** `@keyframes fu-pop`, `@keyframes fu-spin`.
- **Ícones Tabler:** `ti-clock`, `ti-calendar`, `ti-tag`, `ti-plug`, `ti-loader-2`, `ti-search`, `ti-sparkles` (IA), `ti-player-stop`, `ti-send`, `ti-clock-pause`, `ti-message-2`, `ti-info-circle`, `ti-mood-smile`, `ti-filter-off`, `ti-eye` (espiar), `ti-tag` (etiquetar).

---

## 8. Brief de redesign — mobile

Prioridades:
1. **Barra de filtros vira drawer/accordion** — só "Período" + "Buscar" visíveis. Resto colapsado.
2. **Janela comercial** vira ícone `ti-clock` que abre balão (não fica no header solto).
3. **Cards de candidato** com seções colapsáveis (resumo / mensagem / cadência). Padrão = mensagem aberta, cadência fechada.
4. **Ações por card**: 2 botões grandes (Enviar / Descartar) + menu `ti-dots-vertical` (Espiar / Etiquetar / Regenerar).
5. **Filtros tempo real** (recomendação + nº FUs) ficam em uma única linha de chips horizontalmente scrollável.
6. **Contadores** (parada(s), sem análise) fixos como sticky no topo após scroll.
7. Reusar classes/cores existentes. Não inventar nova paleta.

Entregáveis: mockup desktop, mockup mobile (barra filtros expandida + colapsada, card de candidato colapsado/expandido, empty state).
