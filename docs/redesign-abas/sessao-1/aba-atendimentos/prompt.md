# Aba — Atendimentos

> Para a IA de Design (Claude Design): redesenhar a tela respeitando este inventário. Tokens em `/docs/redesign-abas/tokens.md`. Stack: Next 16 RSC + Supabase + `globals.css` + classes `mk-*` + Recharts + Tabler Icons. **Não** Tailwind/styled-components. Dark default. **Mobile-first** — esta aba é a mais usada e tá bugada no celular.

---

## 1. Identidade

- **Nome:** Atendimentos
- **Rota:** `/atendimentos`
- **Objetivo:** Caixa de entrada do WhatsApp — atendente vê todas as conversas, abre, responde e encerra.
- **Quem usa:** todos (atendente, admin, super_admin) — `requireAuth` em [page.tsx:13](app/(dashboard)/atendimentos/page.tsx:13).
- **Prioridade:** **5** — tela mais usada (day-to-day, todo atendimento passa aqui).
- **3 maiores dores hoje:**
  1. **Mobile quebrado** — layout 3-col desktop não cabe; bolhas vazam, header acumula 8+ botões.
  2. **Densidade de filtros** — barra superior lota com status, canais, filas, usuários, etiquetas, datas, busca.
  3. **Painel direito** abre por cima do chat (slide aside) e cobre tudo no mobile (vira balão de 90vh).

---

## 2. Estrutura visual (cima → baixo · desktop)

Layout **3 colunas em SPA** ([_shell.tsx:171](app/(dashboard)/atendimentos/_shell.tsx:171)):

```
┌──────────────┬──────────────────────────────┬───────────────┐
│  LISTA (340) │  CHAT                        │  PAINEL (340) │
│              │                              │  slide aside  │
└──────────────┴──────────────────────────────┴───────────────┘
```

Divisória entre lista e chat é **arrastável** (estilo WhatsApp), persistida em localStorage `atend_largura_lista` (260–620px). Em mobile (≤768) vira 1 coluna: lista some quando ticket aberto; painel vira `Balao` (bottom-sheet).

### Coluna 1 — Lista (`_lista.tsx`, 853 linhas)
1. **Header da lista** — search bar + sino notif + toggle som + botão de filtros + nova conversa.
2. **Abas de status** — chips `Abertos / Pendentes / Fechados` (multi-select). Default `[aberto, pendente]`.
3. **Toggles** — "Somente não lidos" · "Inverter ordem" · range de datas (`de` / `até`).
4. **Filtros expandíveis** — chips de canais (whatsapp), filas, usuários (atendentes), etiquetas.
5. **Lista** — cards de ticket com: foto/iniciais, nome contato, preview última msg, badge não-lidas, tempo relativo, ícones de canal + fila (cor) + sentimento + IA pausada.
6. **Paginação infinita** — sentinela observa visibilidade (`PAGE_SIZE=20`, [_lista.tsx:97](app/(dashboard)/atendimentos/_lista.tsx:97)).
7. **Botão "Nova conversa"** abre balão `<NovaConversa>` (importa contato + texto inicial).
8. **Botão "Fechamentos"** abre balão com log de vendas fechadas (lista pra excluir).

### Coluna 2 — Chat (`_chat.tsx`, 912 linhas + `_header.tsx`, 395)
1. **Header do ticket** — avatar contato + nome + `#numero` + ícones de ação:
   - `ti-arrow-back-up` Retornar à fila
   - `ti-circle-check` Marcar como resolvido (encerra) `#10b981`
   - `ti-arrows-exchange` Transferir (fila/atendente)
   - `ti-broadcast` Transferir canal
   - `ti-info-circle` Detalhes do contato (abre painel direito)
   - `ti-dots-vertical` Menu (mais ações + Retornar fila + Encerrar)
2. **Thread de mensagens** — scroll vertical, bolhas com:
   - autor (`cliente`/`atendente`/`sistema`/`bot`)
   - reply-to, ad_referral card (anúncio CTWA), mídia (foto/vídeo/áudio/doc/sticker)
   - reações, indicadores edit/delete, transcrição de áudio
3. **Mensagens do sistema** — separadores (atendente assumiu, transferiu, encerrou).
4. **Composer de entrada** (`_input.tsx`, 731 linhas) — textarea + emoji + anexo + voice rec + atalhos `/comando` (mensagens rápidas) + envio.

### Coluna 3 — Painel direito (`_painel.tsx`, 1081 linhas)
Aside slide-in (desktop) ou Balao (mobile). Cards verticais:
1. **Contato** — Nome, Telefone (copy), Estado (DDD), foto (lightbox), botão "Editar contato".
2. **Etiquetas** — chips coloridos clicáveis (clique remove); botão "+ Etiqueta" abre picker (criar/aplicar/renomear/excluir).
3. **Fechamento** — valor + serviço (select de `servicos` quando habilitado) + quantidade + botão Salvar. Se já fechado, mostra resumo + botão Excluir.
4. **Resumo IA** — bloco gerado por Groq (`resumo` em tickets) + botão "Atualizar" (stream SSE).
5. **Notas** — campo livre `tickets.notas`.
6. **Comunicação** — botão cobrança (`Asaas` integração) abre `<Cobranca>` balão.
7. **IA Atendendo** — toggle pausar/ativar IA pra esse ticket.
8. **Sentimento** — badge atual + botão "Analisar de novo".
9. **Follow-up** — botão "Agendar follow-up" abre balão (1–3 msgs em data/hora).
10. **Exportar conversa** — botão PDF + Imprimir.
11. **Sanitizar contato** — soft delete + LGPD.

### Vista "Pendente" (PendingView, `_shell.tsx:310`)
Quando ticket tá `pendente` (sem atendente): header simples "👁 Espiando — Nome" + botão **Atender** + thread em modo leitura.

---

## 3. Dados (Elemento | Origem | Tipo | Exemplo | Cálculo)

Carga inicial em paralelo no server: [page.tsx:18-44](app/(dashboard)/atendimentos/page.tsx:18).

| Elemento | Campo / Origem | Tipo | Exemplo | Cálculo / Relação |
|---|---|---|---|---|
| Lista de tickets | `tickets` (`agencia_id=ctx`, order `ultima_mensagem_em desc`, limit 300) | row[] | — | `select(id, numero, status, ultima_mensagem_em, ultima_mensagem_preview, sentimento, ia_pausada, contato(...), canal(...), fila(...))` |
| Nome contato | `contatos.nome` | text | "João Silva" | — |
| Foto contato | `contatos.foto_url` | text | URL | — |
| Telefone | `contatos.whatsapp` | text | "5511999999999" | — |
| Estado (DDD) | derivado de `contatos.whatsapp` via `lib/geo/ddd-estado.ts` (snake fallback `contatos.estado`) | text | "SP" | `ufPorTelefone(whatsapp) ?? normalizarUf(estado)` |
| Número ticket | `tickets.numero` | int | 1284 | sequencial por agência |
| Status | `tickets.status` | enum | `aberto/pendente/fechado` | CHECK |
| Última msg | `tickets.ultima_mensagem_em` | timestamptz | "2026-06-21T18:20Z" | atualizado no ingest |
| Preview | `tickets.ultima_mensagem_preview` | text | "Obrigada!" | — |
| Sentimento | `tickets.sentimento` | enum | `ruim/bom/muito_bom` | analisado por IA |
| Não-lidas | `mensagens` where `autor='cliente'` AND `status != 'lida'` | count | 3 | agregado client-side em Map |
| IA pausada | `tickets.ia_pausada` | bool | false | — |
| Canal | `canais` (id, nome, status, instance_id) | row | "WhatsApp Principal" | join |
| Fila | `filas` (id, nome, cor, fixa) | row | "Vendas" #10b981 | join |
| Etiquetas contato | `contato_etiquetas` → `etiquetas` (id, nome, cor, categoria) | row[] | — | — |
| Mensagens (chat) | `mensagens` (carregadas via `/api/atendimentos/[id]/full`) | row[] | — | autor, tipo, conteudo, transcricao, midia_url/mime, status, reply-to em metadata |
| ad_referral CTWA | `mensagens.metadata.ad_referral.ctwaClid` ❗ camelCase | jsonb | — | leitura corrigida em commit recente |
| Resumo IA | `tickets.resumo` + `resumo_atualizado_em` | text | gerado via Groq | stream SSE em `/api/atendimentos/[id]/resumo-stream` |
| Valor fechado | `tickets.valor_fechado` | numeric(12,2) | 49.80 | preenche faturamento Dashboard |
| Serviço | `tickets.metadata.servico` | text (jsonb path) | "Ensaio 10 fotos" | — |
| Quantidade | `tickets.metadata.quantidade` | int (jsonb path) | 10 | — |
| Fechado em | `tickets.fechado_em`, `fechado_por` | timestamptz, uuid | — | — |
| Mensagens rápidas | `mensagens_rapidas` (`global=true OR usuario_id=ctx.userId`) | row[] | "/preco" → "R$24,90" | digitando `/` no composer |
| Etiquetas disponíveis | `etiquetas` (`ativo=true`) | row[] | — | filter `categoria in ('etiqueta','flag')` |
| Serviços | `servicos` (`ativo=true`) | row[] | "Restauração" | usado no Fechamento |
| Serviços habilitados | `agencias.servicos_habilitados` | bool | true | feature flag por agência |
| Notif som | `localStorage.notif_som` | string | "on" | toggle persistido |
| Largura lista | `localStorage.atend_largura_lista` | int | 340 | resize handle |

### ❗ Inconsistências conhecidas
- ❗ `tickets.notas` — texto livre, sem schema validado.
- ❗ `mensagens.status` = `entregue/lida/erro` — depende do retorno UAZAPI; alguns providers não atualizam.
- ❗ Polling de 15s ([_shell.tsx:160](app/(dashboard)/atendimentos/_shell.tsx:160)) — não usa realtime do Supabase ainda.
- ❗ Composer não tem upload drag-drop direto no chat (só via botão anexo).

---

## 4. Estados

| Estado | Quando | UI atual |
|---|---|---|
| **Vazio** (sem ticket selecionado) | nenhum ticket clicado | ícone `ti-messages` 48px + "Selecione um ticket à esquerda" |
| **Vazio** (lista sem resultados) | filtros não bateram | (precisa melhorar) — não há empty state explícito |
| **Carregando ticket** | clicou ou deep-link `?t=...` | `ti-loader-2` spinner + "Carregando conversa…" |
| **Carregando lista** | refetch (15s polling) | sem indicador (refresh silent) |
| **Erro** | fetch falhou | catch silencioso ❗ (não mostra) |
| **Sem permissão** | `requireAuth` falha | redirect global `/?erro=permissao_negada` |
| **Sem mensagens** | ticket espiado sem msgs | "Sem mensagens." centralizado |

---

## 5. Filtros / parâmetros

### URL
- `?tab=aberto|pendente|fechado` — pré-seleciona aba (deep-link).
- `?t=<ticketId>` — abre o ticket direto. URL é limpa após carregar ([_shell.tsx:154](app/(dashboard)/atendimentos/_shell.tsx:154)).

### Filtros client-side (lista)
| Filtro | Valores | Default |
|---|---|---|
| Status | multi: `aberto`, `pendente`, `fechado` | `[aberto, pendente]` |
| Somente não lidos | bool | false |
| Inverter ordem | bool | false |
| Range datas | `de` / `até` (YYYY-MM-DD) | vazio |
| Canais | multi-id | [] |
| Filas | multi-id | [] |
| Usuários (atendente) | multi-id | [] |
| Etiquetas | multi-id | [] |
| Tipo conexão | `connected/connecting/disconnected` | `connected` |
| Limite renderizado | int | 20 (cresce sob scroll) |
| Busca local | string | "" |
| Busca em mensagens | (modal) busca server-side | `/api/atendimentos/buscar-mensagens` |

---

## 6. Navegação / deep-links

| Origem | Destino |
|---|---|
| Card de ticket | abre detalhe na coluna 2 (SPA, sem nav) |
| `?t=<id>` URL externa | abre ticket direto |
| Botão "Detalhes" (header chat) | toggle painel direito |
| Botão "Atender" (Pending) | POST `/api/atendimentos/[id]/atender` → assume; carrega como `aberto` |
| Botão "Transferir" | abre modal → POST `/api/atendimentos/[id]/transferir` |
| Botão "Transferir canal" | POST `/api/atendimentos/[id]/transferir-canal` |
| Botão "Encerrar" | POST `/api/atendimentos/[id]/encerrar` |
| Botão "Retornar à fila" | POST `/api/atendimentos/[id]/retornar-fila` |
| Botão "Excluir mensagem" (msg-acoes) | POST `/api/atendimentos/[id]/excluir-mensagem` |
| Salvar Fechamento | POST `/api/atendimentos/[id]/fechamento` → também dispara CAPI Purchase via `after()` |
| Excluir Fechamento | DELETE `/api/atendimentos/[id]/fechamento` → CAPI Refund |
| Editar contato | abre `<EditarContatoBalao>` |
| Mídias do contato | abre tab dedicada `<MidiasContato>` |
| Cobrança (Asaas) | abre `<Cobranca>` → POST `/api/atendimentos/[id]/cobranca` |
| Resumo IA (stream) | GET SSE `/api/atendimentos/[id]/resumo-stream` |
| Pausar/ativar IA | POST `/api/atendimentos/[id]/ia-toggle` |
| Exportar PDF | GET `/api/atendimentos/[id]/export-pdf-file` |
| Logs do ticket | GET `/api/atendimentos/[id]/logs` |

---

## 7. Componentes / classes reusadas

- **Modais:** `<Balao>` (8+ usos: nova conversa, fechamentos, editar contato, picker etiqueta, follow-up agendar, mídias, cobrança).
- **Classes:** `.mk-card`, `.cta-btn`, `.ghost-btn`, `.mk-badge`, `.mk-icon-btn`, `.chat-scroll`, `.mk-page`, `.mk-page-head` (não aplicada aqui, layout custom), `.search-input`.
- **Tokens locais usados inline:** `var(--mk-border)`, `var(--mk-surface)`, `var(--mk-surface-2)`, `var(--mk-text)`, `var(--mk-text-secondary)`, `var(--mk-text-muted)`, `var(--mk-accent)` (verde), `var(--mk-bg)`.
- **Ícones Tabler** principais: `ti-messages`, `ti-message`, `ti-info-circle`, `ti-dots-vertical`, `ti-circle-check`, `ti-arrow-back-up`, `ti-arrows-exchange`, `ti-broadcast`, `ti-arrow-left`, `ti-eye`, `ti-loader-2`, `ti-x`, `ti-user`, `ti-phone`, `ti-map-pin`, `ti-bell`, `ti-volume`, `ti-volume-off`, `ti-search`.
- **Animações:** `@keyframes spin` (loading), slide do painel `cubic-bezier(0.4, 0, 0.2, 1)` 280ms.

---

## 8. Brief de redesign — mobile

Prioridades de UX:
1. **Bottom-tabs no mobile**: Lista / Chat / Detalhes (substituem o slide aside).
2. **Header do chat compacto**: avatar+nome+`#`, demais ações em menu `ti-dots-vertical` único.
3. **Composer fixed bottom** com mic ao lado (não esconder por teclado).
4. **Filtros**: drawer/bottom-sheet inteiro (não fica espalhado).
5. **Cards de ticket**: 2 linhas (nome + tempo · preview + badges).
6. **Empty/loading states** explícitos pra cada coluna.
7. Reaproveitar **classes existentes** (`mk-card`, `ghost-btn`, etc.) — só ajustar layout.
8. **Não** quebrar o desktop (já funciona com 3 colunas + resize handle).

Entregáveis esperados: mockup desktop, mockup mobile (lista, chat, detalhes), empty/loading, header compactado.
