# Registro de Atualizações — Sistema Tráfego

Log de mudanças com data e horário (horário de Brasília). Mais recente no topo.
A fonte oficial e automática é o histórico do Git; este arquivo é o resumo legível.

---

## 2026-06-17

- **22:17** — **"Última saída no CRM" no editar acesso (Super Admin).**
  - Migration: coluna `usuarios.ultimo_logout timestamptz`.
  - Carimbada em 3 pontos: signOut explícito (`lib/actions/auth.ts`), heartbeat offline ao fechar aba (`/api/usuarios/heartbeat`), e cron `usuarios-offline` (heartbeat parado > 90s).
  - UI editar acesso: card agora mostra 4 colunas — Criado em · Última entrada · **Última saída** · Status.

- **22:10** — **Fila IA vira ícone de robô na lista + fix navegação Instâncias.**
  - Lista de atendimentos: tickets atendidos pela IA (`ia_perfil_id && !ia_pausada`) mostram ícone de robô verde (`ti-robot`, mesmo do card "IA ativa") ao lado do tempo/olho. Quando humano assume (IA pausada), o ícone some.
  - Filas fixas do sistema (IA Atendendo / Atendimento Humano, `filas.fixa`) não viram mais badge no card nem aparecem no filtro de filas. Aba "Abertos" fica como lista limpa de contatos (humanos sem label; IA marcada só pelo robô).
  - Query de tickets (page + `/api/atendimentos/lista`) agora traz `ia_pausada`, `ia_perfil_id` e `fila.fixa`.
  - Fix bug nav: `/super-admin/instancias` ganhou `loading.tsx`. O fetch nos servidores UAZAPI é lento e, sem boundary de loading, o App Router segurava a navegação (clique parecia não funcionar; só nova aba dava feedback). Agora navega na hora mostrando esqueleto.

- **21:49** — **Aba Tráfego (Ads) restrita a Super Admin + Follow-up: botão único "Salvar tudo" com animação de sucesso.**
  - `AppSidebar.tsx`: seção "Tráfego (Ads)" (Leads Meta, Campanhas, Funil, Criativos, Público, Relatórios, Insights IA, Alertas, Clientes Ads) agora só aparece pra `role === "super_admin"`. Demais roles não veem a aba.
  - `_followup-bloco.tsx`: removidos os botões "Salvar" (meta) e "Salvar etapa" individuais. Estado das etapas elevado pra `SequenciaEditor` (controlado via `updateEtapa`). Um único botão **"Salvar tudo"** no rodapé persiste meta da sequência + todas as etapas de uma vez. Botão "Deletar" movido pro rodapé.
  - Animação de sucesso: `CheckSucesso` (SVG ✅ com brilho/glow pulsante e anéis expansivos, sem emoji) overlay ao concluir; some sozinho após ~1.8s.

## 2026-06-16

- **18:00** — **Meta Leads: webhook leadgen + conciliacao automatica com tickets WA**.
  - Migration `meta_leads`: lead_id, agencia_id, form_id, page_id, campaign_id, adset_id, ad_id, ctwa_clid, telefone, telefone_norm, email, nome, campos_jsonb, raw_jsonb, status enum (novo/conciliado/orfao/erro), motivo_orfao, contato_id, ticket_id, tentativas_conciliacao, proxima_tentativa_em, conciliado_em. RLS + index tel_norm/ctwa/ad/campaign. UNIQUE (lead_id, agencia_id).
  - `lib/meta-ads/leadgen.ts`: `fetchLeadDetails` Graph API, `extrairLeadgenChanges` parser webhook, `parseFieldData` extrai email/telefone/nome, `normalizarTelefoneBR` gera variants com/sem 9 mobile pra match, `resolverPageAccessToken` decripta page token de `integracoes.metadata.pages`.
  - `app/api/webhooks/meta/leadgen/route.ts`: GET verify (hub.challenge + META_WEBHOOK_VERIFY_TOKEN) + POST recebe payload, acks 200 imediato e processa em `after()` (fetch Graph + upsert meta_leads + chama conciliacao).
  - `lib/meta-ads/conciliar.ts`: `conciliarLead(id)` busca contato por telefone_norm variants OU ctwa_clid (cruza com `mensagens.metadata.ad_referral.ctwa_clid` ja captado pelo parser CTWA). Acha ticket aberto/pendente e vincula. `conciliarOrfaosPorContato(contatoId)` reverso pra quando msg WA chega ANTES do lead. `reconciliarOrfaos(50)` cron worker, ate 5 tentativas com backoff 30min.
  - `app/api/cron/conciliar-leads/route.ts` + pg_cron jobid=9 `conciliar-leads-tick */5 * * * *` (bearer CRON_SECRET).
  - UI `/leads-meta` (page server component): KPIs Total/Conciliados/Orfaos/Erros + taxa conciliacao %. Filtros periodo (7/14/30/90d) e status. Tabela: lead_id, nome+tel+email, campanha (resolvida via JOIN com `campanhas.external_id`), badge status com tooltip motivo_orfao, link "Abrir ticket" se conciliado.
  - Item "Leads Meta" no sidebar -> grupo Trafego (Ads), icone ti-target-arrow.
  - Setup pendente: env `META_WEBHOOK_VERIFY_TOKEN` na Vercel + configurar webhook no Meta App apontando pra `/api/webhooks/meta/leadgen` com mesmo token + popular `integracoes.metadata.pages` com page tokens decriptados.

- **17:30** — **Menu de mensagem estilo WhatsApp Web (chevron, reacoes, long-press, confirmacao apagar)**.
  - Novo `_msg-acoes.tsx` (client): substitui botoes soltos (lixo + reagir + responder) por um unico chevron-down sobre a bolha (canto sup direito). Hover na bolha mostra barra de emojis acima (animacao scale-in cubic-bezier).
  - Click chevron: dropdown Responder, Copiar, Reagir, Apagar (animacao msg-menu-in).
  - Mobile long-press 450ms: abre o mesmo dropdown.
  - Apagar abre Balao confirmando "Apagar so pra mim (oculta no CRM)" ou "Apagar pra todos (revogar no WhatsApp)". Cancelar disponivel.
  - Animacoes globais novas em `globals.css`: `@keyframes msg-react-pop`, `@keyframes msg-menu-in`. `.msg-chevron:hover` scale + escurece. `.msg-bubble { position: relative }` pra ancorar overlays.
  - Removido `<ExcluirBtn>` inline + reactPicker inline duplicado em `_chat.tsx`.

- **17:10** — **Fix alinhamento do botao collapse do sidebar (mobile + desktop)**.
  - Desktop collapsed (`@media min-width 769px`): `.mk-logo` vira flex centralizado com min-height 44px, `.collapse-inline` vira `position: relative` + `margin: 0 auto` (deixa de ficar deslocado pro canto direito quando logo-wrap some).
  - Mobile drawer (`@media max-width 768px`): `.mk-logo` flex align-center + `.collapse-inline` ancorado em right:10px com translateY(-50%).

- **17:00** — **Toggle ferramenta IA agora fluido (sem reload) + 130 tickets movidos**.
  - SQL ad-hoc: 130 tickets da agencia 'aaaa-...' movidos pra fila Atendimento Humano (id 99c17497). Filtrados contatos com numero terminando em 81991594716 ou 8191594716 (Roberto) — preservados.
  - Novo `_ferramenta-toggle.tsx` (client + useTransition + estado otimista). Substitui `<form action={alternarAtivoFerramentaIA}>` que fazia full page reload no clique. UI vira instantaneo, reverte se action falhar.
  - Nova action `toggleFerramentaIA(id, novoAtivo)` em `_actions.ts` — variante sem redirect/revalidatePath de `alternarAtivoFerramentaIA` (mantida pra fallback).

- **16:45** — **Resumo Groq recebe nome+telefone do contato via cabecalho**.
  - `resumo-groq.ts > gerarEEnviarResumo`: busca contato do ticket (nome, wa_id, whatsapp) e prepend bloco "DADOS DO CLIENTE: Nome=..., Telefone=..." antes do historico. IA pode citar diretamente no resumo (ex: `https://wa.me/{telefone}`).
  - `buscarHistoricoSample` faz o mesmo pro modo TESTE (busca contato real do ticket sample).
  - `HISTORICO_FAKE` ganhou cabecalho fake pra previa.
  - Default prompt no balao reescrito com formato pedido pelo Roberto: regras WhatsApp (1 asterisco), bloco "Dados do cliente", "Observacoes", "Interesse direto", link wa.me com placeholder do telefone.

- **16:30** — **Animacoes globais fluidas + top progress bar de navegacao**.
  - `globals.css`: regras universais de transicao pra `button, a, .ghost-btn, .cta-btn, .mk-icon-btn, .pill-tab, .nav-item, .footer-item, .acesso-pill, [role="button"]`. transform/bg/border/color/box-shadow/opacity em 120-180ms easing spring.
  - `:active scale(0.96)` global como feedback de clique (bouncy cubic-bezier).
  - `:disabled` opacity 0.55 + cursor not-allowed + pointer-events:none + grayscale leve.
  - `:focus-visible outline accent` 2px pra acessibilidade.
  - `:hover translateY(-1px)` em CTAs/ghost/icon (lift sutil).
  - Spinner auto pra `i.ti-loader-2` em botoes disabled.
  - `prefers-reduced-motion` respeitado.
  - Novo componente `components/layout/RouteProgress.tsx` (client + Suspense) usa `usePathname`/`useSearchParams` pra mostrar barra fina animada (gradiente acento) no topo quando rota muda. Auto-some 600ms. Renderizado em `app/(dashboard)/layout.tsx`.

- **16:15** — **Follow-up encerrado move ticket pra fila Atendimento Humano**.
  - `followup-worker.ts`: novo `moverParaFilaHumana(sb, prog)` resolve fila tipo='humano' fixa da agencia, faz update no ticket (ia_pausada=true, usuario_id=null, status='aberto', fila_id=fila_humano.id) + insere nota interna "Follow-up encerrado sem resposta".
  - Chamado quando cadencia termina e `seq.finalizar_ticket_ao_fim=false`. Se `finalizar_ticket_ao_fim=true`, mantem fechado.
  - Combina com etiqueta "Follow Up feito" ja aplicada por `aplicarEtiquetaEncerrado`.

- **16:00** — **Botao Testar envio de resumo (simulacao Groq + UAZAPI)**.
  - `lib/ia-atendimento/resumo-groq.ts`: extraido `executarResumoComConfig(args)` aceita config explicita (sem buscar DB). `gerarEEnviarResumo` virou wrapper. Novo `buscarHistoricoSample(agenciaId, perfilId)` retorna ultimas msgs do ticket mais recente (>=3 msgs) ou conversa exemplo (fake) como fallback.
  - `_actions.ts`: action `testarResumoConfig(formData)` le valores do form (sem precisar Salvar), decripta chave Groq do DB se input vazio, gera resumo via Groq + envia pro destino com prefixo "🧪 *Resumo IA (TESTE)*". Auditado.
  - `_resumo-config-balao.tsx`: botao "Testar envio" no footer + preview do texto gerado dentro do balao (com flag origem: ticket_real|conversa_exemplo). Permite ajustar prompt → testar → ajustar de novo.

- **15:30** — **Fix: follow-up IA nao inscrevia ticket reaproveitado**.
  - Guard `respostasBot <= blocosEnviados` em `executor.ts` impedia inscricao quando ticket ja tinha msgs bot antigas (de teste/conversas anteriores). Resultado: progresso vazio mesmo com sequencia ativa.
  - Removida a guard. `inscreverFollowUpIA()` ja dedupica via `jaExiste` (status agendado/executando). Status `finalizado`/`respondido` libera reinscrever no proximo turno IA.
  - **Atencao UX**: editor de etapas tem botao "Salvar etapa" por bloco — trocar valor sem clicar nao persiste. Sequencia 6cf5430e seguia com 3600s embora usuario tenha digitado 1200/1800.

- **06:00** — **Lote 4 IA Atendimento — Follow-up engine sequencial completo**.
  - **Migration**: 4 tabelas novas:
    - `ia_atendimento_followup_sequencias` (perfil_id, agencia_id, nome, ordem_no_perfil 1-5, ativa, finalizar_ticket_ao_fim bool, etiqueta_em_progresso_id, etiqueta_encerrado_id, janela_inicio/fim, timezone)
    - `ia_atendimento_followup_etapas` (sequencia_id, ordem 1-6, delay_segundos_antes, midia_tipo enum(texto/imagem/video/audio/documento), texto, midia_path/url/mime/filename)
    - `ia_atendimento_followup_progresso` (ticket_id, sequencia_id, etapa_atual, proxima_etapa, agendado_para, status enum, motivo_fim, iniciado_em, finalizado_em)
    - `ia_atendimento_followup_envios` (log de cada envio efetivo)
  - Triggers: limite 5 sequências por perfil + CHECK 1-6 etapas + CHECK conteúdo válido + UNIQUE constraint (ticket_id ativo).
  - **Bucket Supabase Storage `ia-followup`** (20MB, image/video/audio/pdf/docx/xlsx) com policies isolando por agencia_id no path.
  - **RPC `iafp_pickup_devidos`**: pickup atômico com FOR UPDATE SKIP LOCKED — worker idempotente sob concorrência.
  - **Worker `lib/ia-atendimento/followup-worker.ts`**: 3 funções exportadas:
    - `processarFollowUpsIA(limite)` — chamado pelo cron, processa etapas devidas. Respeita janela horária (reagenda fora), cancela se cliente respondeu, finaliza ticket+aplica etiqueta encerrado na última etapa.
    - `cancelarFollowUpsPorRespostaCliente(ticketId)` — chamado pelo webhook via `after()` quando cliente responde.
    - `inscreverFollowUpIA(...)` — chamado pelo executor após primeira resposta IA bem-sucedida.
  - **Cron route** `/api/cron/ia-followup` + pg_cron job `ia-followup-tick` 1/min (curl com Bearer CRON_SECRET).
  - **Executor.ts** inscreve automaticamente após primeira resposta IA (conta blocos enviados).
  - **Webhook UAZAPI**: novo `after()` cancela follow-ups quando cliente responde (latência <1s).
  - **UI `_followup-bloco.tsx`**: fieldset "Follow-up sequencial" no edit perfil. Lista até 5 sequências. Balão de edição com:
    - Meta (nome, ativa, etiqueta progresso, etiqueta encerrado, janela início/fim, finalizar ticket após)
    - Editor de etapas drag-drop reorder + tipo (texto/imagem/video/audio/documento)
    - Drag-drop file upload pra bucket ia-followup
    - 7 server actions: criar/atualizar/deletar sequência, salvar/deletar/reordenar etapa, upload mídia
  - **Limpou** scaffold antigo `ia_atendimento_followups` (F2 órfão).
- **05:35** — **Lote 3 IA Atendimento — tools editáveis + tool `enviar_imagem_galeria`**.
  - **CRUD completo de ferramentas**: lápis ao lado de cada ferramenta abre Balão com `FerramentaForm` pré-preenchido (nome readonly, descrição/ação/parâmetros editáveis). Toggle on/off inline (`alternarAtivoFerramentaIA`). Nome técnico tem unique constraint por perfil.
  - **Migration**: nova tabela `ia_atendimento_galeria (perfil_id, agencia_id, ferramenta_id, nome, descricao, tags[], url_storage, mime, ordem)` com RLS + GIN index em tags. Bucket Supabase Storage `ia-galeria` (privado, max 10MB, image/jpeg|png|webp|gif) com policies que isolam por `agencia_id` no path.
  - **Nova ação `enviar_imagem_galeria`**: ferramenta carrega imagens via drag-drop upload, IA escolhe quais enviar por `indices: [1,2]` OR `tags: ["preço"]` OR `quantidade: N`. Catálogo formatado é injetado na description da tool (LLM enxerga: `"  1. plano_basico — R$29 [tags: preço, plano]"`).
  - **Handler** em `tools-runner.ts` gera signed URL TTL 600s + chama `instanceSendMedia` UAZAPI + registra em `mensagens` (autor=bot, tipo=imagem, midia_url, caption só na primeira).
  - **`buildToolsSchema`** virou async + aceita `{sb, agenciaId}` opcional — galerias vazias são automaticamente skipadas (não poluem schema do LLM).
  - **CtxIA** ganhou `enviarMidiaUazapi` injetado pelo executor (instanceSendMedia bound a baseUrl/token do canal).
- **05:15** — **Lote 2 IA Atendimento — Tokens UI + Etiquetas configuráveis no perfil**.
  - **Card "Uso de tokens"** no edit perfil: KPIs respostas / tokens IN / tokens OUT / custo USD estimado + média por resposta + mini-gráfico de barras dos últimos 7 dias + filtro 24h / 7d / 30d / total. Pricing snapshot 2026-01 em `lib/ia-atendimento/precos.ts` cobre Anthropic (Haiku/Sonnet/Opus + legacy), OpenAI (4o, 4.1, o1, o3-mini), Groq.
  - **Etiquetas configuradas por perfil**: nova migration `ia_atendimento_perfil_etiquetas (perfil_id, etiqueta_id, agencia_id, descricao_uso TEXT, ordem INT)` com RLS multi-tenant. Editor no perfil: dropdown adicionar + textarea descrição de uso por etiqueta + autosave on blur + remover.
  - **executor.ts** injeta bloco `[ETIQUETAS DISPONIVEIS]` no system prompt quando perfil tem etiquetas configuradas — IA é instruída a só aplicar etiquetas dessa whitelist.
  - **tools-runner.ts** tool `aplicar_etiqueta` validando whitelist: aceita `etiqueta_nome` OR `etiqueta_id`. Quando whitelist configurada, rejeita etiqueta de fora. Quando vazia, comportamento legado (busca/cria por nome) preservado.
  - Server actions `salvarEtiquetaPerfil` + `deletarEtiquetaPerfil` em `_actions.ts`.
  - Índices novos em `ia_atendimento_log` (perfil_id + created_at) pra acelerar agregações.
- **04:55** — **Fluxo de entrada SONAR — beam no login + slide-in no CRM**.
  - **Beam no login**: `SonarRadarBg` ganhou prop `beam` que dispara feixe de varredura conic-gradient girando 380° uma vez em 1.6s. Aplicado em `app/(auth)/layout.tsx` beamSize 600.
  - **Slide-in CRM**: `.mk-sidebar` desliza da esquerda em 0.55s + `.mk-main` fade-rise 0.5s com delay 0.18s. Ambos respeitam `prefers-reduced-motion`.
- **04:35** — **Radar bg na tela de login + bgRadarSize 520 no header**. Novo componente `SonarRadarBg.tsx` (radar girando standalone pra fundo). Aplicado no `app/(auth)/layout.tsx` atrás do balão de login com size 900 opacity 0.5 spinSeconds 14. Sidebar bgRadarSize 260→520 pra preencher edge-to-edge (mask radial fade cortava cantos antes).
- **04:20** — **Header sidebar mais compacto**. Logo estava cortando radar bg pra baixo + ocupando muita altura. Ajustes: `.mk-logo` padding 18→6 bottom + margin-bottom 14→8; `.logo-text` height 64→52; `bgRadarSize` 162→130. Header total fica ~22px mais curto, radar bg proporcional pra ficar contido no frame.
- **04:10** — **Fix PlaceholderPicker dropdown + template Fotografia IA**.
  - Dropdown não renderizava sólido (transparente sobre textarea). Fix: background sólido `#1a1d1c`, border roxa `#9B7DBF40`, z-index 1000 + overlay backdrop pra fechar ao clicar fora.
  - Lista reduzida pros principais: nome_cliente, data_hoje, hora_atual, dia_semana, periodo_dia, data_amanha, data_depois_amanha, data_proxima_segunda, data_proxima_sexta (9 items vs 17 antes).
  - **Novo template global "Fotografia IA (Comercial Receptivo)"** (id `8ecf9256`, 6703 chars): atendente comercial pra estúdio de ensaios com IA (aniversariante, capa revista, gestante, formatura, estúdio) + restauração + mesclagem. Inclui tabela de preços inviolável (1 a 15 fotos / 1 a 5 restaurações), mensagens iniciais por tipo, passo a passo qualificar→fechar PIX (chave contato@infinitycomercialia.com, Roberto Antunes), uso de ferramentas (aplicar_etiqueta, transferir_para_humano, consultar_data, criar_nota), FAQ. Aparece no Templates Picker ao criar novo perfil.
- **03:50** — **Fix logo SONAR**: ficou achatado top-left porque `.logo-wrap` não tinha `flex:1` (sized by content). Corrigido em `globals.css`: `.logo-wrap{flex:1}` + `.logo-text{height:64px;overflow:hidden}` (frame que recorta radar bg). Removido `frameHeight` redundante do componente — `.logo-text` é o frame agora.
- **03:35** — **Logo SONAR novo no sidebar**. Substituído SVG estático por `<SonarLogo />` (`components/layout/SonarLogo.tsx`): wordmark com a letra "O" como radar nítido (varredura forte) + radar maior de fundo (anéis, crosshair, varredura sutil) girando devagar em 8s. Self-contained, zero deps, respeita `prefers-reduced-motion`. Props: `frameHeight=64`, `fontSize=18`, `bgRadarOpacity=0.85`. CSS antigo de `.logo-radar/.logo-radar-text` permanece (dead) — limpo em futura iteração.
- **03:20** — **Fix dup histórico ↔ buffer**. IA contava 16 onde tinham 10 "Oi". Causa: `ingestMensagem` grava msg em `mensagens` ANTES de cair no buffer, então `processarUm` carregava histórico (incluindo as 10 do buffer) + concatenava as mesmas 10 do buffer no novoTexto = duplicação. Fix em `executor.ts`: histórico filtra `created_at < primeira_msg_do_buffer.recebido_em` e novoTexto sempre PUSH como user msg (em vez de sobrescrever último). Resultado: IA agora vê exatamente N msgs concatenadas, sem repetição.
- **03:00** — **Lote 1 IA Atendimento — fix toggle + filas fixas + contexto temporal + transferir_para_humano configurável**.
  - **Fix toggle IA travado**: clicar "Ativar IA" no painel direito agora estampa `tickets.ia_reset_em = now()`. O guard `pausa_se_humano_responder` no executor passou a usar `baseline = MAX(ultimo_recebido_em, ia_reset_em)`, então mensagens do atendente anteriores à reativação manual deixam de re-pausar. Antes: clicar reativar não funcionava porque a primeira msg do cliente caía no guard e re-pausava silenciosamente.
  - **Sync UI ↔ DB do toggle**: `_painel.tsx` ganhou `useEffect([ticket.ia_pausada])` pra re-sincronizar `iaPausadaLocal` quando prop muda (refresh, navegação SPA), evitando divergência visual.
  - **Filas fixas "Atendimento Humano" + "IA Atendendo"**: migration adiciona `filas.fixa BOOLEAN` + `filas.tipo TEXT CHECK IN ('humano','ia','custom')` com índice único parcial por (agencia_id, tipo) pra tipos fixos. Backfill cria as duas pra cada agência existente. Trigger `seed_filas_fixas_para_agencia` semeia automaticamente em nova agência. Triggers `bloquear_delete_fila_fixa` + `bloquear_update_fila_fixa` impedem deletar fila fixa e renomear/trocar tipo (cor/descrição/ativa permanecem editáveis). UI em `/filas` esconde botão lixeira em filas fixas, mostra badge `<i ti-lock/> humano|ia`, input nome fica `readOnly` ao editar fixa. Server actions também bloqueiam (defesa em camadas).
  - **`transferir_para_humano` configurável**: o tool agora lê `parametros_padrao.{fila_destino_id, status_destino, etiqueta_id}` da row em `ia_atendimento_ferramentas`. Quando IA chama, ticket vai pra fila escolhida + status (default `aberto`) + opcional aplica etiqueta no contato. Fallback automático: se não configurado, busca fila tipo='humano' da agência. Merge logic refatorado: criar ferramenta com nome de tool fixa (`transferir_para_humano`) faz overlay de `parametros_padrao` em vez de duplicar.
  - **Contexto temporal pra IA**: novo `lib/ia-atendimento/contexto-temporal.ts` com `buildContextoTemporal(timezone)` + `aplicarPlaceholders(texto, mapa)` + `resolverReferenciaTemporal(ref)`. Bloco `[CONTEXTO TEMPORAL]` (data de hoje + hora + amanhã + depois de amanhã) auto-prepended em todo system prompt. Placeholders `{{data_hoje}}, {{hora_atual}}, {{dia_semana}}, {{periodo_dia}}, {{data_amanha}}, {{data_proxima_segunda}}` (e todos dias da semana), `{{data_iso}}, {{timestamp_iso}}, {{timezone}}` substituídos no momento da resposta. Tag `SEM_CONTEXTO_TEMPORAL` no topo do prompt suprime o bloco. Migration: `ia_atendimento_perfis.timezone TEXT DEFAULT 'America/Sao_Paulo'`.
  - **Tool fixa `consultar_data`**: IA chama com `referencia: "amanhã"|"próxima quinta"|"daqui a 3 dias"|"22/06/2026"|"2026-06-22"` e recebe data ISO + dia da semana resolvidos deterministicamente (sem chutar ano, sem LLM). Usa timezone do perfil.
  - **UI placeholder picker**: botão "Inserir placeholder" no fieldset Prompt do sistema. Dropdown com 17 placeholders + exemplo de cada. Clicar insere no cursor da textarea.
  - **Form de ferramentas refatorado** (`_ferramenta-form.tsx` client): sub-config dinâmico por ação. Pra `transferir_para_humano|transferir_para_fila` mostra dropdowns de fila/status/etiqueta. Pra `aplicar_etiqueta`, escolhe etiqueta existente OU nome novo. Pra `agendar_followup`, minutos. Pra `marcar_qualificado`, score+obs. Pra `consultar_data`, nenhum input (sem config). JSON `parametros` é construído automaticamente no submit.
  - **Migration `lote1_filas_fixas_timezone_ia_reset`** aplicada (idempotente).

---

## 2026-06-15

- **20:02** — **IA Atendimento BÁSICA ROODANDO (F3 completo)**. Runtime end-to-end:
  - **Webhook hook**: msg do cliente cai → `adicionarAoBuffer()` → procura perfil ativo da agência que cubra canal/fila → cria/atualiza linha em `ia_atendimento_buffer` com `processar_apos = now + delay_debounce` (default 20s).
  - **Cron `/api/cron/ia-atendimento`** (pg_cron jobid 6, 1/min): trava buffer pendente → carrega perfil/ticket/contato/canal → checa whitelist (modo teste) → checa pausa-humano (qualquer msg do atendente cancela IA daquele ticket) → decripta API key → monta histórico (últimas 20 msgs) + concatena msgs do buffer → chama `lib/ia-atendimento/providers.ts` (wrapper unificado Anthropic/OpenAI/Groq usando seu endpoint nativo respectivo) → recebe `{texto, toolCalls, tokens}` → executa cada `toolCall` via `tools-runner.ts` (server-side validado por agencia_id) → divide texto em blocos via `split.ts` (respeita separador `\n\n` ou regras_split por chars) → envia cada bloco via UAZAPI com delay aleatório `[min,max]`s entre eles.
  - **Whitelist de teste**: `agencias.whatsapp_teste_lista text[]` — se vazio = produção; preenchido = só responde aos números listados. Tudo o resto é logado com motivo `fora_whitelist` (sem custo de tokens).
  - **Tools fixas**: `manda_biscoito` (teste — quando cliente fala "biscoito" IA envia 🍪), `transferir_para_humano` (pausa IA + nota interna), `aplicar_etiqueta` (cria etiqueta se faltar + aplica), `criar_nota`. Tools custom do user mescladas.
  - **Pausa humano**: se atendente envia msg desde último cliente, `ticket.ia_pausada=true` e IA não processa mais ali.
  - **3 templates seed globais** (`eh_template=true, agencia_id=NULL`): "Qualificação de Lead (Receptivo Geral)", "Pós-Disparo (Receptivo de Campanha)", "Suporte Básico" — com prompts maduros. Form de novo perfil mostra picker dos templates como radio cards roxos no topo.
  - **Lista de modelos expandida**: Anthropic (Haiku/Sonnet/Opus/Fable), OpenAI (4o, 4o-mini, **4.1**, 4.1-mini, 4.1-nano, **o1**, o1-mini, **o3-mini**), Groq (Llama 3.3/3.1, Qwen, DeepSeek R1).
  - **Histórico de IA**: card "Histórico (últimas 50 ações)" no fim do form de edição — mostra evento colorido (resposta/tool_call/erro/pausa_humano/encerrado) + modelo + tokens in/out + preview do texto enviado + qual tool foi chamada com resultado.
  - **Tickets ganham campos**: `ia_processando_em`, `ia_pausada`, `ia_perfil_id` (FK).
- **19:03** — IA Atendimento Básica (F2: schema + CRUD, sem runtime ainda). Migration cria 5 tabelas: `ia_atendimento_perfis` (config completo do agente: BYOK provider/modelo/api_key_encrypted, prompt_sistema, delay_debounce/min/max, formato_resposta JSONB com regras_split, canais/filas ativas, pausa_se_humano, max_tokens/temperatura), `ia_atendimento_ferramentas` (tools customizáveis: aplicar_etiqueta/transferir_fila/transferir_humano/agendar_followup/enviar_template/marcar_qualificado/criar_nota), `ia_atendimento_followups` (msgs de retomada), `ia_atendimento_buffer` (debounce — agrupa msgs do cliente antes de processar), `ia_atendimento_log` (auditoria + métricas tokens/custo). RLS por agência. Nova rota `/ia-atendimento` no sidebar (Atendimento, badge BÁSICA) com: lista de perfis, form CRUD completo (provider + modelo, chave API com criptografia AES-256-GCM, prompt com variáveis `{nome_cliente}`, delays, formato com bullets/separador/max_msgs, picker de canais/filas onde a IA atua, max_tokens/temperatura/pausa-humano), bloco de Ferramentas (cadastra cada tool customizada com JSON de parâmetros). Sem runtime IA ainda — F3 vai construir o worker debounce + chamada com tools.
- **18:41** — Excluir mensagem + sinalização edit/delete cliente. (1) Botão lixeira aparece no hover de cada bolha (antes do emoji reagir), abre popover com 2 opções: **"Apagar só pra mim"** (soft delete CRM) e **"Apagar pra todos"** (chama UAZAPI `/message/delete` com `forEveryone:true`). Cliente só tem "Apagar pra mim" (WhatsApp não deixa apagar msg alheia). Mensagens excluídas viram bolha cinza italic "Mensagem apagada (para todos)" / "ocultada do CRM". (2) Webhook parser detecta `protocolMessage` (revoke/edit) — quando cliente apaga ou edita no WhatsApp, sinaliza na bolha: "Mensagem apagada pelo cliente" + ícone, edit mostra "editada pelo cliente" com tooltip do conteúdo anterior. Migration `mensagens_delete_edit` adiciona `deleted_em/deleted_pra_todos/edited_em/edited_de_conteudo` + index em `wa_message_id`.
- **13:04** — Atendimentos painel direito → Util → Follow-up ganha botão verde **"Criar follow-up nesta conversa"** acima do "Inscrever em sequência ativa" (renomeado). Click abre balão com seletor data/hora, 1/2/3 mensagens, intervalos editáveis (mín 2s). Reusa `/api/contatos/[id]/follow-up-avulso`. Cancela sozinho se cliente responder antes. Diferença explícita entre **avulso ad-hoc** (esse novo) e **sequência reutilizável** (Inscrever, multi-etapa por horas/dias).
- **12:46** — Follow-up IA: campo **"Limite (quantas trazer)"** entre "horas" e "delay" — controla quantas conversas paradas o Buscar devolve. Default 40, mín 1, máx 200. API `/api/follow-up/ia/verificar` aceita `limite` no body (`Math.max(1, Math.min(200, ...))`). Antes era hard-coded em 40, agora você dimensiona ao seu ritmo de análise/envio.
- **12:06** — Cobranças vira balão. Tira o bloco grande do topo de `/super-admin/acessos` (que ficaria gigante com 30+ agências) e move pra modal: botão pill **"Cobranças"** no header abre lista completa; cada linha de usuário ganha **ícone moeda verde** → abre mesmo balão filtrado pela agência daquele usuário (com link "ver todas" pra voltar). Botão do header mostra contador vermelho com nº de agências em pendência (bloqueadas ou vencendo em 3 dias).
- **11:26** — Sistema de cobranças MVP (manual com bloqueio automático). **Super Admin → Acessos** ganha bloco "Cobranças das agências" no topo: tabela com nome, valor mensal (R$29 default), vencimento, status colorido (em dia / X dias / atrasado / bloqueado), último pagamento, última cobrança (status + data). Botões por linha: **Cobrar** (envia WhatsApp pelo número configurado com PIX `61054832000185` no template), **Marcar pago** (avança vencimento 1/2/3/6/12 meses + desbloqueia), **Editar** (valor, vencimento, whatsapp_cobranca, cobranca_ativa, acesso_bloqueado). Modal de **config de envio**: escolhe canal do Roberto + horário + template editável com variáveis `{nome}{valor}{dia}{dias_para_vencer}`. **Cron diário 09:00 BRT** (jobid 5): dispara cobrança 1 dia antes do vencimento (idempotente via UNIQUE agencia+mes), bloqueia acessos vencidos sem pagamento. **Login enforce**: usuários de agência com `acesso_bloqueado=true` recebem msg "Acesso suspenso por mensalidade pendente. Regularize pelo WhatsApp wa.me/5581991594716" — super_admin não é bloqueado, webhooks UAZAPI continuam recebendo leads. **`/plano`** troca "Mudar plano" → **"Pagar plano"** com link wa.me Roberto. FAQ revisada: remove CTWA + Meta (não prontos hoje), entra controle financeiro + mensagens rápidas + retry mídia 3-camadas. Migration: `agencias.ultimo_pagamento_em/vencimento_em/acesso_bloqueado` + template default atualizado com PIX.
- **10:46** — Contatos header: após todos canais importados, botão "Importar do WhatsApp" some e fica badge verde compacto **"✓ Contatos Importados"** (pill com check). Banner grande verde já sumia ao zerar `canaisSemImport` — agora o header fica limpo também.
- **10:30** — Plano Pro reescrito + base cobranças super_admin: (1) `/plano` agora puxa dados reais — canais conectados, usuários ativos, total mensal (R$29 por canal). Mostra próxima cobrança baseado em `agencias.dia_pagamento`. Bloco FAQ com 12 perguntas atrativas sobre features (import contatos, IA, follow-up, CTWA, envio massa, PWA, recuperação de excluídos, etc) em accordion details/summary. Botão "Mudar plano" agora abre WhatsApp. (2) Migration `cobrancas_super_admin`: campos em `agencias` (dia_pagamento 1-31, valor_mensal default 29, whatsapp_cobranca, cobranca_ativa), tabela singleton `super_admin_cobranca_config` (canal_id, horário, template_texto com variáveis {nome}{valor}{dia}{mes}), tabela `super_admin_cobrancas_log` (unique por agência+mes_referencia → idempotência). RLS só super_admin.
- **10:24** — Follow-up avulso por contato + onboarding import: (1) Em **Contatos → Editar**, novo bloco "Follow-up agendado": escolhe data/hora, 1-3 mensagens em rajada, define intervalo customizado (mín 2s) entre cada uma. Salva em `follow_up_avulsos`, cron 1/min processa devidos. **Opt-out automático**: se cliente enviar qualquer mensagem entre criação e disparo, status vira `respondido` e nada é enviado. Lista de agendados com botão Cancelar + histórico (enviado/cancelado/respondido/falha). Canal usado: último ticket do contato. (2) **Onboarding import**: nova coluna `canais.contatos_importados_em` marca a 1ª importação. Banner verde em `/contatos` aparece quando há canal conectado sem import ainda. Card de canal em `/canais` mostra link "Importe seus contatos e etiquetas" enquanto não rodar. Some sozinho após primeiro import. Migration `follow_up_avulsos` (RLS por agência, check 1≤len(mensagens)≤3). Cron jobid 4 agendado.
- **09:51** — Import contatos: **fix check constraint + dedup automático**. (1) Etiquetas novas vinham com `categoria: "wa_import"` e o schema só aceita `"etiqueta"`/`"flag"` → 6 etiquetas bloqueadas (Lead, COMPRA FUTURA, Não Qualificado, RESTAURAÇÃO, FAZER FOLLOW UP) e 26 aplicações puladas. Agora cria como `"etiqueta"`. (2) Antes de importar, passo extra dedupa etiquetas existentes com mesmo nome (case-insensitive) na agência: mantém a mais antiga, migra `contato_etiquetas` da duplicada (onConflict ignora), apaga as duplicadas. Resumo agora mostra `Duplicadas mescladas`. Re-rodar import vai criar as 6 que faltaram + aplicar nos contatos que estavam puladas.

---

## 2026-06-14

- **19:50** — Branding: **favicon + ícone PWA** trocados pelo S verde do login (logo serpentino #10b981 com fundo dark `#0f1410`). `app/icon.svg` e `app/apple-icon.svg` pra navegador/iOS; PNGs 192/512px gerados via sharp pra Android PWA. Manifest atualizado com cores certas (`theme_color #10b981`). `commit 3642216`

- **18:00** — Atendimentos: **bolinha verde com contagem** de mensagens não lidas no card do ticket (estilo WhatsApp). Auto-some quando você entra na conversa (600ms após mount → marca todas como lidas + reload da lista). `commit de1636e`

- **17:30** — Contatos: **Importar do WhatsApp** — botão ao lado do "Adicionar contato" abre um balão que puxa todos os contatos da linha conectada + etiquetas marcadas no WhatsApp Business (direct mapping UAZAPI `/labels` + `/chat/find` paginado). Idempotente: não duplica contatos nem etiquetas. Resumo final com KPIs (novos, existentes, etiquetas criadas, aplicações). `commit 51dd7f3`

- **16:10** — Chat: **imagem corrompida no ImgBB** (ERR_HTTP2_PROTOCOL_ERROR / 206 Partial) agora mostra balão "Imagem corrompida no servidor" com botão **Re-baixar do WhatsApp**. Click → zera midia_url + força tentativa nova via UAZAPI (parâmetro `forcar:true` no /api/atendimentos/midia-retry). `commit 0572a4d`

- **15:50** — Dashboard: **filtro por Serviços** ao lado dos presets de período. Dropdown com checkbox por serviço (vem da tabela `servicos` + nomes ad-hoc dos tickets dos últimos 6 meses). Aplica em todos os KPIs, série, satisfação e tempos, e também no PDF "Baixar análise". `commit 60654a6`

- **15:30** — Contatos: editar contato agora mostra **bloco de etiquetas** (chips clicáveis com cor de cada uma). Marca/desmarca pra aplicar. Action faz diff: insere as novas, remove as desmarcadas. `commit caf715a`
- **15:30** — Usuários: **toggle switch animado** (deslizante verde quando ligado) no lugar dos ícones estáticos. Coluna **Online** ganhou indicador pulsante "Online"/"Offline" claro. Heartbeat client a cada 30s + cron 1min marca offline quem some por > 90s. `commit caf715a`

- **15:00** — Atendimentos: **foto de perfil do contato** agora aparece no header do chat e no painel "Detalhes do contato" (antes só rendia iniciais "44"). API `/full` passou a retornar `foto_url`; props `contatoFotoUrl` propagada via _shell → _chat → _header e _painel. Fallback pra iniciais se foto não carrega. `commit 7960c7c`

- **14:50** — Chat: **fix 413 Content Too Large** ao enviar foto grande (PNG/JPG). Cliente agora redimensiona imagens pro lado maior ≤ 2000px e re-comprime JPEG até ≤ 3MB (qualidade adaptativa 0.88 → 0.75 → 0.6). Antes só convertia AVIF/HEIC; agora aplica a TODA imagem. Vercel serverless tem limite de 4.5MB no body — base64 cresce ~33% → PNGs originais de 4MB+ estouravam. `commit 0b6e8cf`

- **14:25** — Chat: **AVIF/HEIC convertem automático pra JPG** ao anexar (WhatsApp rejeita esses formatos). Pipeline: pick/drop/paste → detecta formato → desenha no canvas → toBlob JPEG 92% → renomeia `.jpg` → entra na fila normalmente. HEIC fora de Safari avisa "salve como JPG e tente de novo". `commit 983056a`

- **12:35** — Dashboard: **prompt "Copiar prompt" reescrito** — IA agora retorna um **relatório HTML standalone** (dark theme, KPIs, gráficos em CSS puro, badges, scripts prontos, checklist priorizado) em vez de só texto corrido. Cola na IA, anexa o PDF, recebe HTML completo, salva como `relatorio.html` e abre no navegador. `commit 03c3eea`

- **12:10** — Mídia: **auto-retry** + **botão re-baixar por mensagem**. (1) Webhook tenta 1x; se falhar, cron `midia-retry` re-tenta em +5min e +30min (até 3 tentativas auto). (2) Balão da mensagem mostra "X/3 tentativas" + botão **Tentar agora** — força tentativa imediata sem limite. (3) Após 3 falhas vira **"indisponível"** mas botão **Forçar tentativa** continua. Lib unificada `lib/crm/midia-download.ts`. `commit 4d996b2`

- **11:35** — Atendimentos: **card do anúncio** (Instagram/Facebook Ads) acima da 1ª mensagem do lead — capa, título, copy e badge com a plataforma de origem (igual o card que aparece no WhatsApp do cliente). Webhook agora captura `contextInfo.externalAdReply` da UAZAPI. `commit eb3dcad`
- **11:30** — Canais: botão **N mídias pendentes · re-baixar** — re-tenta o `/message/download` em lotes pra todas as mídias que ficaram sem download (imagem vai pro ImgBB, áudio/vídeo/doc pro bucket); mostra progresso live. `commit eb3dcad`

## 2026-06-13

- **18:40** — Atendimentos: **som de notificação** ao chegar mensagem do cliente (toca mesmo com a aba aberta; beep sintetizado, destrava no 1º clique) + botão **sino** pra mutar/ligar (lembra a escolha). `commit fee18e6`
- **17:29** — Atendimentos: abas Abertos/Pendentes/Fechados voltaram FIXAS, mas agora funcionam como **toggle** do filtro (clica = inclui/remove aquele status; desmarcado some da lista). `commit 72d0f3d`
- **17:20** — Atendimentos: **animação de hover** no card + **cor do tempo** do último contato (agora=verde claro, minutos=verde, horas=amarelo, dias=vermelho) + **notificação do navegador** (estilo WhatsApp Web) ao chegar mensagem com a aba fora de foco. `commit f8066ec`
- **17:09** — Atendimentos: **painel de filtros completo** — status vira checkbox multi; novas seções Período, Conexões, Filas, Usuário, Etiqueta + toggles (mostrar todos, incluir fechados, somente não lidos, inverter ordem); badge de filtros ativos. `commit 0fdb254`
- **16:34** — Filtro de etiquetas vira **multi-seleção (checkbox)**: marca Frio+Morno+Quente etc. e mostra quem tiver qualquer uma; vários chips ativos. Corrigido bug visual das etiquetas saindo do balão (corpo do modal agora rola). `commit c43d745`
- **14:35** — Etiquetas: **múltiplas palavras-chave gatilho** por etiqueta (botão "+ Adicionar mais"); o ingest dispara se QUALQUER uma aparecer na mensagem. `commit e7883a2`
- **14:26** — Chat: áudio que VOCÊ envia não é mais transcrito (transcrição só do áudio do cliente) e sobe pro bucket na hora (toca sem ficar "baixando"). Botão **Responder** saiu de cima do texto — agora fica ao lado do balão e aparece no hover. `commit 4dc5159`

## 2026-06-12

- **20:08** — Atendimentos: **filtro por Etiqueta** no painel de Filtros (lista as etiquetas em uso, chip de filtro ativo, contadores respeitam). `commit db99a9b`
- **19:46** — Canais: botão **Reconectar** no canal conectado — checa a sessão real e, se caiu, gera QR novo na mesma instância (não precisa mais desconectar manual; não derruba sessão ativa). `commit 948fa0e`
- **19:40** — Follow-up IA: **Buscar** mostra quantas conversas em aberto paradas existem ANTES de analisar; **Analisar** (todas ou 1 a 1) roda a IA depois, com contagem de pendentes. `commit ce9bbbb`
- **17:58** — Follow-up IA: análise **1 por vez** (escala com a quantidade, sem estourar) + **retry no rate limit (429)** do Groq + conversa cortada (últimas msgs) pra gastar menos token. Card mostra "Analisando…" e progresso. `commit f9b4653`
- **15:21** — Chat: **Responder/citar mensagem** (balão citado igual ao WhatsApp) + **Visualização única** pra mídia. `commit e559bf1`
- **10:32** — Follow-up com IA (3C): aba "Follow-up IA" → botão *Verificar* acha conversas paradas, a IA resume e sugere a mensagem; você edita/regenera e envia (individual ou todos com delay). `commit 10a1a1f`
- **10:20** — Servidores: **Sistema Tráfego** como padrão global + override por agência (sua usa o Infinity Teste). Etiqueta-gatilho (3B): marcar etiqueta inscreve o ticket no follow-up. `commit a3de27d`
- **10:1x** — (dados) Acesso criado para guilhermepaulomarketing@gmail.com (agência nova, conecta no servidor padrão).
- **07:36** — Follow-up: upload de mídia (imagem/vídeo/doc/áudio) no editor + variações de texto anti-robô. `commit b0eceda`
- **02:05** — Follow-up sem IA (3A): sequências (até 3 etapas, mídia, cadência), fila, opt-out automático, janela de envio, delay, teto/dia, cron a cada minuto. `commit 526f6b6`
- **01:48** — Log do ticket agora cobre todas as ações (cobrança, sentimento, resumo, etiqueta). Nova página **GroqCloud** (transcrição: liga/desliga, idioma, modelo Whisper Large v3, chave com olho). `commit 4bf308e`
- **01:32** — Dashboard: card de **tempos** (1ª resposta, resposta ao cliente, até fechamento). PDF de análise com **histórico completo** das conversas. Botão **Copiar prompt**. **Emoji** no chat. Texto do aviso de sentimento reorganizado. `commit ce0e4d7`

## 2026-06-11

- **18:40** — Dashboard de satisfação + resumo automático ao fechar atendimento + PDF do período. `commit f38b522`
- **16:17** — Ícone colorido da etiqueta no card do contato (lista de atendimentos). `commit b5b3c00`
- **15:58** — Etiquetas: balão de edição com cor, palavra-chave gatilho e ativar/desativar. `commit b861692`
- **15:48** — Análise de sentimento: trava de 1x por atendimento + avisos. `commit 6c0380c`
- **15:38** — Etiquetas: painel só com Etiquetas (sem Flags) + página de configuração de cores. `commit 3b4e728`
- **15:23** — Exportar conversa: botão Baixar PDF (real) + Imprimir. `commit 4902428`
