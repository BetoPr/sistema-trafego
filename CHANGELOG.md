# Registro de Atualizações — Sistema Tráfego

Log de mudanças com data e horário (horário de Brasília). Mais recente no topo.
A fonte oficial e automática é o histórico do Git; este arquivo é o resumo legível.

---

## 2026-07-01 (fix — contato @lid mostrava LID no lugar do número + concilia com contato antigo)

- **15:30** — **WhatsApp @lid (privacy identifier) chegava e ficava como número do contato.** Ex.: `191821862948954@lid` virava contato `191821862948954`. Agora no ingest, quando `wa_id` termina em `@lid`, chama `/chat/details` no uazapi pra pegar `phone` real e usa como número + nome (se disponível).
  - `lib/crm/ingest.ts`: helper `resolverLidParaPhone`; novo contato @lid resolve inline antes do insert.
- **15:50** — **Concilia @lid com contato antigo pra preservar etiquetas.** Se phone resolvido do @lid bate com contato já existente na agência (via `@s.whatsapp.net` ou outro @lid), reusa o contato antigo em vez de criar duplicata. Ticket cai no mesmo contato, etiquetas + histórico ficam intactos. Se o antigo era `@s.whatsapp.net`, atualiza `wa_id` pro @lid novo (WhatsApp só entrega em @lid agora pra esse contato).

---

## 2026-07-01 (fix crítico — cadastro quebrado, parte 3: auth user órfão)

- **16:15** — **Signup falhava com "Erro ao criar usuário" quando email já existia em `auth.users` sem `public.usuarios` linkado** (órfão de cadastros anteriores que quebraram no bug do `criada_em`/`slug`). Agora:
  - Se `auth.admin.createUser` retorna "already registered", busca o user em `auth.users` por email e reaproveita, atualizando password/metadata.
  - Órfãos existentes (coringaroboy@gmail.com, lucashaas3@gmail.com) removidos do `auth.users` manualmente pra desbloquear.

---

## 2026-07-01 (fix crítico — cadastro quebrado, parte 2: slug)

- **14:15** — **Signup ainda quebrando por outra coluna:** `slug` (NOT NULL, UNIQUE) não vinha no insert. Erro `null value in column "slug" of relation "agencias" violates not-null constraint`.
  - `app/api/signup/route.ts`: gera `slug` a partir de `slugify(nome)` + sufixo `randomUUID().slice(0,8)` pra garantir unicidade.
  - `app/api/oauth-bootstrap/route.ts`: idem.

---

## 2026-06-30 (fix crítico — cadastro quebrado)

- **14:45** — **Bug pré-existente: `/api/signup` e `/api/oauth-bootstrap` inseriam `criada_em` em `agencias`, coluna que não existe** (a real é `created_at`, com default `now()`). Erro `PGRST204` no PostgREST derrubava todo cadastro novo com 500. Não era causado por nada desta sessão — provavelmente sempre esteve quebrado ou uma migration antiga renomeou a coluna sem atualizar o código.
  - `app/api/signup/route.ts`: removido `criada_em` do insert (created_at já tem default).
  - `app/api/oauth-bootstrap/route.ts`: idem.
  - `lib/onda-zero/boas-vindas.ts`: `.lte("criada_em", ...)` → `.lte("created_at", ...)` (contagem de posição na Onda Zero estava sempre falhando silenciosamente e caindo no fallback `|| 1`).

## 2026-06-30 (continuação — Conciliação Comercial F8-F10)

- **14:15** — **Kanban simplificado pro fluxo real (4 etapas).**
  - Restauração + Ensaio agora: **Lead → Pendente → Concluído → Cliente** (era Lead/Em Atendimento/Proposta Enviada/Pago).
  - Coluna antiga "Aniversário" (13 cards manuais de Roberto) movida pra Pendente, coluna deletada — subtipo agora é etiqueta (Ensaio/Aniversário), não coluna.
  - "Fechamentos" (vazia) removida.
  - Nota em cada etapa explicando o que fazer.

- **14:10** — **Limpeza profunda de etiquetas: 58 → 23.**
  - Reparentado Restauração/Bebê + Restauração/Mofo pro "Restauração" canônico (o antigo pai era um duplicado zerado).
  - Merge: "Ensaio" duplicado (11 contatos) + "Aniversário IA" (1) + "Ensaios IA WhatsApp Cópia" (1) → todos viraram "Ensaio".
  - Deletadas 15 etiquetas órfãs que só existiam pra sustentar o antigo espelhamento Pixel (Capa de Revista IA, Copa do Mundo IA, cidades, Restauração de Fotos IA ×2, vendas ×3, vendas-wpp, vendas—Cópia, Ensaios IA WhatsApp Aprovadas, Ensaio Casal).
  - Restam só etiquetas com uso real: tipo de venda (Restauração/Ensaio + subvariantes), status comercial (Lead/CLIENTE/Em follow-up/etc), origem (Instagram/Indicação/etc).

- **14:05** — **Pixel reestruturado: só Anúncio individual leva etiqueta comercial.**
  - `DELETE FROM etiqueta_campanhas` + `DELETE FROM etiqueta_conjuntos` (backup em `_backup_etiqueta_campanhas_20260630` / `_backup_etiqueta_conjuntos_20260630`). `etiqueta_anuncios` intocada.
  - `salvarEtiquetasDoAlvo` agora recusa `alvo='campanha'|'conjunto'` com mensagem explicando o motivo.
  - Botão **"Espelhar do Meta"** desativado — ele recriava automaticamente Pasta-por-Campanha + Etiqueta-por-Conjunto, exatamente a duplicidade removida. `espelharDoMeta()` agora retorna erro explicativo; função antiga (não usada) deletada.
  - UI: removido o picker de etiqueta nas linhas de Campanha e Conjunto (ficam só como árvore/organização); mantido só no Anúncio.
  - Banner "Como o Sonar etiqueta seus leads" atualizado pra refletir o novo modelo (Campanha→Conjunto→Anúncio, sem Pasta/Etiqueta-filha sintética).

## 2026-06-30

- **13:20** — **Pendentes Kanban: filtros Responsável+Data, Nova Oportunidade, Exportar CSV + fix bug rota antiga.**
  - **Bug corrigido**: `trocarQuadro`/deletar quadro ainda usavam `/kanban?...` (rota pré-Fase-B) — trocado pra `/pipeline/kanban`.
  - Server: `kanban_cards` traz `responsavel_id` + `criado_em`; cruza `tickets.resultado` por contato (não só `status`).
  - Filtros novos: **Responsável** (dropdown usuários) · **Data início/fim** (sobre `criado_em`) · Status agora distingue Ganho/Perdido de verdade (usa `resultado`, não só `fechado`).
  - Botão **Exportar CSV** — baixa oportunidades filtradas (ID/Título/Contato/Etapa/Valor/Status/Data), BOM UTF-8 pra abrir certo no Excel.
  - Botão **+ Nova Oportunidade** no topo — balão com Etapa + 2 modos: Contato existente (busca) ou Manual (título livre, usa a action `criarCard` que ainda existia no backend).
  - "Carteira" não implementado — essa entidade não existe no schema do CRM atual.
  - Paginação não implementada — Kanban é board de colunas, não lista; decidido não forçar paginação artificial por enquanto.

- **13:00** — **D fix: Espiar agora mostra mensagens.**
  - Nova rota `GET /api/contatos/[id]/espiar` retorna último ticket + últimas 80 mensagens.
  - Balão Espiar reescrito: scroll com bolhas (eu/cliente), título com `#numero` ticket, suporta áudio + transcrição. Footer "Atender" abre `/atendimentos?contato=X`.

- **12:50** — **Correções F + G + Etiquetas pós-feedback.**
  - **BUG CRITICO F** — rota `/api/atendimentos/[id]/encerrar` sobrescrevia `resultado` pra 'ganho' por default mesmo se já estava 'perdido'. Fix: só seta `resultado` se body explicitamente passar. Corrigido ticket `fc886c8e` no DB (perdido restaurado).
  - **F** — Tab Perdido agora aceita campo **Serviço** (opcional). Salva no metadata igual ganho. Log mostra "Serviço · Motivo".
  - **G** — Kanban: KPI **Abertos** agora exclui contatos com ticket em status='fechado'. Adicionado KPI **Fechados** ao lado. Server cruza `tickets.status='fechado'` por `contato_id` em paralelo.
  - **Etiquetas** — cada coluna mostra `#abc123` (primeiros 6 chars do uuid) ao lado do nome.

- **12:20** — **Ajustes D+G pós-feedback Roberto.**
  - Etiquetas: dropdown **Ativas/Todas/Inativas** + setas **◀ ▶** pra scroll horizontal das colunas. Server passou a trazer todas (filtro só client).
  - Kanban: barra busca com botão **Filtros ▾** que expande/recolhe. Filtros: Etapa · Etiqueta · Status · Valor min/max · Limpar filtros. Busca casa título OU nome do contato.

- **12:00** — **Fase G: Kanban filtros + KPIs no topo.**
  - 3 KPIs no topo: Oportunidades · Abertos · Valor total.
  - Filtros: busca por título · valor mínimo · valor máximo · botão Limpar.
  - Filtro client-side aplica em `cardsDaCol` de cada coluna.

- **11:45** — **Fase E: Dashboard do Pipeline com KPIs + charts.**
  - Server agrega 5 queries em paralelo: cards/colunas/quadros/tickets/contato_etiquetas.
  - KPIs: Criadas · Abertos · Ganhos · Perdidos · Ticket Médio · Taxa Conv.
  - Banner verde Total Ganho (Vendido).
  - Donut Oportunidades por Status (Recharts).
  - Bar Oportunidades por Etapa (cor da coluna).
  - Bar Oportunidades por Mês (últimos 12).
  - Cards Valor por Etapa com barra de progresso colorida.
  - 3 colunas: Por Etiqueta · Por Kanban · Pipelines Ativos (contador grande).

- **11:30** — **Fase F: botão Perdido + Log com tabs Ganho/Perdido.**
  - Migration `tickets_resultado_ganho_perdido`: coluna `resultado` (ganho|perdido) + `motivo_perdido` + backfill (`valor_fechado IS NOT NULL` vira `ganho`).
  - Routes `/api/atendimentos/[id]/fechamento` (POST+DELETE) + `/api/atendimentos/[id]/encerrar` aceitam `resultado` + `motivo_perdido`.
  - GET `/api/atendimentos/fechamentos?tipo=ganho|perdido` filtra. DELETE limpa marcação.
  - UI painel Atendimentos: 2 tabs "Ganho/Perdido" no card Fechamento. Perdido = só motivo (textarea). Ganho = valor/serviço/qtd como antes.
  - UI Log de fechamentos: tabs Ganhos/Perdidos, ícone vermelho pra perdido, sem valor (mostra motivo), delete funciona pra ambos.

- **11:10** — **Nota da coluna movida do rodapé pro header.** Botão `ti-note` agora ao lado de Conectar Etiquetas (🔗). Fica laranja quando preenchida. Rodapé limpo (só 2 botões: Adicionar contato · Importar por etiqueta).

- **11:00** — **Fase D: sub-aba Etiquetas (Kanban com Etiquetas).**
  - Server fetcha etiquetas + contatos + links `contato_etiquetas` (filtro RLS via join `contatos!inner.agencia_id`).
  - Cada coluna = etiqueta. Cards = contatos da etiqueta.
  - Card botões: 👁 Espiar · 🏷 Editar etiqueta · 💬 Iniciar atendimento (abre `/atendimentos?contato=X` em nova aba).
  - Busca por nome/whatsapp filtra todas as colunas em tempo real.
  - Balão Editar Etiquetas: checkboxes de todas etiquetas, salva via `setEtiquetasContato(contatoId, ids[])` (apaga e re-insere atomicamente).

- **10:45** — **Fase C: Pipelines CRUD.**
  - Migration `kanban_colunas_notificacoes`: `notificar_fila_id` + `notificar_atendente_id` (refs filas/usuarios, ON DELETE SET NULL).
  - Actions `criarPipeline / atualizarPipeline / deletarPipeline` em `pipeline/pipelines/_actions.ts`. Pipeline = quadro. Etapa = coluna.
  - `atualizarPipeline` faz diff (mantém id existentes, deleta removidos, insere novos).
  - UI tabela `#/Nome/Etapas/Ações` + balão Novo/Editar com etapas drag-handle. Cada etapa: nome · cor (paleta) · notificar fila · notificar atendente.
  - Atalhos: refresh + criar.

- **10:25** — **Fase B: nav `/pipeline` com 4 sub-abas.**
  - Nova rota `/pipeline` com layout fixo + `PipelineTabs` (client component que usa `usePathname`).
  - Sub-abas: **Dashboard** · **Kanban** · **Pipelines** · **Etiquetas**.
  - Conteúdo do Kanban movido `app/(dashboard)/kanban/*` → `app/(dashboard)/pipeline/kanban/*` (page+client+actions). Headers duplicados removidos do client (layout cuida). `revalidatePath` atualizado pra `/pipeline/kanban`.
  - 3 stubs "em construção" pras outras sub-abas.
  - `/kanban` antigo agora redireciona pra `/pipeline/kanban` (backward compat).
  - Sidebar: item "Kanban" → "Pipeline" (href `/pipeline`).

- **10:05** — **Fase A: ID global agência + nota da coluna + remove Card avulso.**
  - Migration `kanban_numero_global_por_agencia`: nova tabela `kanban_sequences (agencia_id, ultimo)` + função `next_kanban_numero` + coluna `kanban_cards.numero_global` + trigger BEFORE INSERT. Backfill ordenado por `criado_em`. Mesmo padrão dos tickets — sequencial por agência, nunca reusa após delete.
  - Migration `kanban_colunas_nota`: coluna `nota text` em kanban_colunas.
  - Action `salvarNotaColuna(id, nota)` adicionada.
  - UI: botão "📝 Nota da coluna" substitui "Card avulso" (3º botão do rodapé). Vira laranja quando preenchida. Balão grande com textarea + botão Limpar.
  - Card mostra `#numero_global` (sequencial agência) em vez de `#numero` (sequencial por quadro).

- **09:35** — **Kanban: modo Mover colunas com X/✓.**
  - Botão "Mover colunas" (ti-arrows-move) ao lado de "+ Novo quadro" (visível só com >=2 colunas).
  - Ao ativar: colunas viram draggable (border dashed laranja + handle ti-grip-vertical), botões 🔗/✏️/🗑️ somem do header, cards param de arrastar.
  - Mini-toolbar laranja "Arraste as colunas" aparece com X (cancelar) e ✓ (salvar).
  - X = descarta + volta ordem original. ✓ = chama `salvarOrdemColunas(ids)` (action nova) que zera em -1000-N e reescreve sequencial 0..N-1 pra escapar da UNIQUE.
  - Removidas as setinhas ← → per-coluna (substituídas pelo novo modo).

- **09:20** — **Otto: ícone interrogação → robô chatbot.** `ti-help` substituído por `ti-message-chatbot` no avatar do header + aba "Otto".

- **09:15** — **Otto FAB sem bola.** Removido círculo verde (border + bg + box-shadow pulsante). Mascote agora 64×64 (era 36×36 dentro de bola 56×56).

- **09:05** — **Sidebar reordenado + "Tráfego (Meta Ads)" → "Tráfego".**
  - Nova ordem: Principal · Atendimento · Recursos · Tráfego · Comunicação · (Super Admin) · Conta.
  - Label do grupo Tráfego encurtado.

- **08:50** — **Kanban: novos botões "Editar coluna" e "Mover coluna" no header.**
  - `app/(dashboard)/kanban/_actions.ts`: `editarColuna(id, nome, cor)` + `moverColuna(id, "esq"|"dir")` — swap de `ordem` em 3 steps pra escapar de UNIQUE constraint.
  - `app/(dashboard)/kanban/_client.tsx`: header de cada coluna agora tem 5 botões → ←(mover-esq) | 🔗(conectar etiquetas) | ✏️(editar) | 🗑️(deletar) | →(mover-dir). Setas desabilitadas nas pontas.
  - Novo Balão "Editar coluna" reusa o picker de cores da paleta padrão.
  - Confirmado: reagendar relatório manual + envio no próximo horário funcionando.

- **08:35** — **Etiquetas movidas de Configurações para Recursos no sidebar.**
  - `components/layout/AppSidebar.tsx`: item `Etiquetas` (icon `ti-tag`, guide `nav-etiquetas`) inserido na seção Recursos logo após Kanban.
  - `app/(dashboard)/configuracoes/page.tsx`: link removido do array `ATALHOS` (Mais configurações).
  - `components/layout/RoboGuia.tsx`: tours `etiqueta_criar`, `pasta_etiqueta`, `etiqueta_auto` atualizados — target `config-etiquetas` (sub-menu Mais configurações) substituído por `nav-etiquetas` (sidebar). Passo intermediário em Configurações eliminado, fluxo ficou 1 clique mais curto.
  - URL `/configuracoes/etiquetas` continua a mesma; só a posição no menu mudou.

---

## 2026-06-26

- **18:55** — **OAuth Google plugado em login + cadastro.**
  - `app/auth/callback/route.ts`: handler do callback OAuth Supabase. Troca code → session. Se usuário novo, cria agência (com tipo_cliente da query `perfil`) + usuarios.admin com trial automático. Bloqueia se agência tiver `acesso_bloqueado`. Redireciona pra `next` (default `/dashboard`).
  - Login `/login`: adicionado componente `BtnGoogle` no topo do form (acima do email/senha). Botão pill claro com SVG oficial. `supabase.auth.signInWithOAuth({provider:'google'})` com `redirectTo = /auth/callback?next=/dashboard`.
  - Cadastro `/cadastro`: mesmo `BtnGoogle` no passo 2, recebe perfil escolhido no passo 1. `redirectTo = /auth/callback?perfil=X&next=/dashboard`.
  - Pendente Roberto: criar OAuth Client no Google Cloud Console + colar Client ID/Secret no Supabase Dashboard (Authentication > Providers > Google). Authorized redirect URI: `https://nnswiakwjvoqwcjscbqq.supabase.co/auth/v1/callback`.

- **18:20** — **Cadastro automático LP→CRM + ciclo de vida de trial completo.**
  - Migration `20260626180000_agencias_tipo_cliente_trial.sql`: agencias ganha `tipo_cliente` (empreendedor/autonomo/agencia), `trial_acaba_em`, `apagar_em`, `trial_avisado_em` + indexes pra cron.
  - `lib/auth/trial.ts`: helpers — `calcularTrialAcabaEm()`, `calcularApagarEm()`, `isTrialExpirado()`, `diasRestantesTrial()`, `tipoClienteLabel()`. Empreendedor/Autônomo = 14d, Agência = 21d, 30d pra apagar.
  - `app/api/signup/route.ts`: endpoint público (CORS LP+localhost) que cria agencia + auth user + usuario.admin. Rollback em falha. Recebe `{nome, email, whatsapp, password, perfil}`.
  - `app/api/cron/trial-vencidos/route.ts`: cron diário (header `X-CRON-SECRET`) — bloqueia agencias com trial_acaba_em < now() + deleta agencias com apagar_em < now().
  - `app/(auth)/cadastro/page.tsx`: tela 3-passos espelhando modal LP. Empreendedor/Agência/Autônomo com badges 14/21 dias.
  - Super Admin Acessos: query agencias agora traz tipo_cliente + trial_acaba_em + apagar_em. Tipo `AgenciaCobranca` atualizado em `_cobrancas.tsx`.
  - LP modal cadastro: JS chama `POST sonarcrm.com.br/api/signup` real, mostra erro do backend, redireciona pra /login?signup=ok.
  - Robô RoboGuia ganhou 4 partículas azuis caindo nos propulsores (igual mascote da LP).

- **17:50** — **Páginas legais /termos e /privacidade + fix login.** Criados `app/termos/page.tsx` e `app/privacidade/page.tsx` usando componente compartilhado `components/legal/LegalShell.tsx` (Server Components, Next 16). Mesma identidade dark premium das páginas estáticas da LP. Conteúdo LGPD completo: dados coletados, finalidade, compartilhamento (Supabase/Asaas/Groq/UAZAPI/WAHA/Meta/Google), direitos do titular, retenção, exclusão (trial expira → 30 dias → deleta). Termos com cláusulas de uso permitido, WhatsApp não oficial, IA, propriedade, foro Recife-PE. Fix login: removido radial-gradient esquisito do background, adicionado footer LGPD com links pra /termos e /privacidade.

- **17:35** — **Página de login refeita no formato do modal de cadastro da LP.** Dark premium centralizado: card #0D1311 com glow verde sutil, logo PNG + wordmark "sonar.", inputs com focus verde, slide-to-verify estilizado, botão verde Sonar pill 10px. Link "Criar grátis →" pra LP (sonarcrm.com.br). Mantém action server `loginAction` intacto.

- **17:20** — **Favicon + ícone do app trocados pelo hexágono verde (logo-verde2).** `app/icon.svg` e `app/apple-icon.svg` substituídos por PNG. `public/icons/logo-s-{180,192,512}.png` atualizados. PWA + tab do browser agora mostram hexágono S verde.

- **17:10** — **Marca/logo refeita no formato aprovado da LP.** SonarLogo.tsx agora renderiza `<img src="/sonar-mark.png">` (S verde sólido) + wordmark "sonar." Poppins bold com ponto verde. Drop-shadow verde sutil. Mesmo formato da landing page `lp.sonarcrm.com.br`.

- **00:10** — **Renomeia "Servidores UAZAPI"/"Instâncias UAZAPI" → "Servidores"/"Instâncias".** Com o suporte multi-provider (UAZAPI + WAHA, futuramente API Oficial/Instagram/Telegram), a seção passa a ser genérica. Sidebar, command palette e títulos de página atualizados.

---

## 2026-06-25

- **17:26** — **RoboGuia spotlight + step explicativo central + drawer 360px.**
  - `public/robo-guia.js`:
    - Novo overlay `#rg-veil` (escurece tela inteira) + `#rg-spot` (recorta o elemento ativo com `box-shadow: 0 0 0 9999px rgba(0,0,0,.72)`).
    - `step()` agora aceita step **sem target**: mostra bubble centralizado + veil escurecido + robô estacionado fora. Botão "Entendi ▸".
    - `#rg-bubble` cresceu (max-width 360px) + `white-space: pre-line` (mantém quebras de linha). Modo central tem max-width 440px e sem seta.
    - `parkPos()` ajustado pra drawer 360px.
    - Tour finaliza limpando veil + spot.
  - `components/layout/RoboGuia.tsx`: tour `etiqueta_auto` reformulado:
    - **Step 1**: clica **Configurações** (sidebar) — spotlight + escuro fora
    - **Step 2**: clica **Etiquetas** (em "Mais configurações") — spotlight + escuro fora
    - **Step 3**: explicação multi-linha centralizada (passos pra adicionar palavra-chave gatilho + Salvar) — só veil escurecido
    - Done: "Pronto. Quando cliente mandar mensagem com a palavra, etiqueta é aplicada automático no contato. ✅"
  - `components/chat-assistente/ChatDrawer.tsx`: largura do drawer 420px → 360px (menos invasivo).

- **16:29** — **Fase 2: Tours RoboGuia expandidos (41 tours cobrindo todo o CRM).**
  - `components/layout/RoboGuia.tsx`: lista de tours cresceu de 20 → 41. Cobertura completa de fluxos do FAQ.
  - Novos tours por área:
    - **Atendimentos**: `transferir_humano`, `pausar_ia_ticket`, `cobranca_chat`, `registrar_fechamento`
    - **IA Atendimento**: `ia_modular` (cápsulas), `ia_whitelist`, `ia_chat_teste`, `ia_ferramentas`, `ia_followup_seq`, `ia_resumo_grupo`
    - **Canais**: `multi_numero`, `reconectar_whatsapp`
    - **Contatos**: `importar_contatos`, `criar_contato`, `followup_avulso`
    - **Grupos**: `listar_grupos`
    - **Pixel & Vendas**: `pixel_vendas` (CTWA + atribuição)
    - **Alertas**: `alertas_criar` (gasto dia/mês + template + testar)
    - **Usuários**: `usuario_criar`, `resetar_senha_outro`
    - **Configurações avançadas**: `chaves_api` (multi-chave), `prompts_ia`, `asaas_setup`, `mcp_token`
  - Intents expandidas em tours existentes — mais sinônimos (ex: "como conecto", "quanto custa", "ver dashboard").
  - Cada tour com `done:` explicativo + cliques exatos via `data-guide`.
  - Aproveitou data-guides já existentes (sidebar nav-X + auto-gerados `config-{slug}` em /configuracoes).
  - Fluxo: usuário pergunta no Suporte CRM → `RoboGuia.ask()` tenta tour primeiro → match → fecha drawer + robô voa apontando botão → senão cai no orquestrador FAQ (Fase 1).

- **16:10** — **FAQ completo do CRM + plugado no bot Suporte (Fase 1).**
  - `docs/FAQ-CRM.md`: tutorial passo-a-passo cobrindo CRM inteiro. ~260 entradas P/R organizadas em 7 sprints (Atendimentos, IA Atendimento, Canais, Contatos/Massa/Rápidas/Grupos, Pixel/Relatórios/Alertas/Filas/Equipes/Usuários, Configurações, Marca/Conta/Plano/Dashboard). Cada entrada tem cliques exatos + ⚠️ pegadinhas + 💡 dicas + 📍 links internos. Fonte canônica do conteúdo.
  - `lib/chat-assistente/faq/*`: KBs por área reescritos a partir do FAQ-CRM.md. 12 arquivos atualizados (atendimentos, ia-atendimento, integracoes, contatos, pixel-vendas, relatorios, alertas, dashboard, config-ia, config-etiquetas, config-mcp, sistema-ux) + 10 novos (envio-massa, mensagens-rapidas, grupos, filas, equipes, usuarios, config-asaas, config-marca, conta-perfil, plano). Cada KB foca em 1 área pra orquestrador rotear barato (~80 tok) + especialista carregar só ~1.5-3k tokens.
  - `lib/chat-assistente/faq/index.ts`: registra 25 áreas (era 15) com keywords expandidas pra matching melhor do roteador Llama 8B.
  - `components/chat-assistente/ChatDrawer.tsx`: SUGESTOES_SUPORTE reformuladas — 12 perguntas cobrindo as áreas principais (WhatsApp, IA, modular, follow-up, PIX, relatório, alerta, usuário, logo, plano, CTWA).
  - Termo "Admins" → "Usuários do CRM" mantido em todo conteúdo (preferência terminológica).
  - Próximo (Fase 2): expandir tours RoboGuia.tsx apontando botões por fluxo.

---

## 2026-06-24

- **08:40** — **Fix MCP page 500 + Meta icon limpo.**
  - `/configuracoes/mcp`: extraiu botão Revogar pra Client Component (`_revogar-btn.tsx`). Server Component não aceita `onSubmit` handler → 500 quando havia pelo menos 1 token na lista. Agora confirm() roda no client.
  - `PlatformSelector`: ícone Meta Ads no topbar virou SVG inline (logo infinito azul brand, gradient `#0064E0 → #00A1F6`), fundo transparente. Era PNG sobre fundo branco `#FFFDF8` — substituído pelo logo oficial sem caixa.

---

## 2026-06-23

- **13:30** — **R3+R5 + ONBOARDING-TESTE.md.**
  - R3 (Linha manual em /pixel-vendas):
    - `_atribuicoes-actions.ts`: nova action `criarEtiquetaInline(nome, cor, paiId?)` com validação de hierarquia.
    - `_atribuicoes.tsx`: nova barra topo "LINHAS COMERCIAIS" com chips coloridas + form inline "+ Nova Linha".
    - Dentro do dropdown de etiquetas por campanha/conjunto: rodapé "+ Criar nova etiqueta" com mini-form (nome + escolha de Linha-mãe + paleta cor). Etiqueta criada já fica marcada.
  - R5 (foto perfil bug):
    - `/api/contatos/[id]/foto-refresh`: nova rota POST. Busca UAZAPI `GetNameAndImageURL`, baixa foto, sobe pro bucket `crm-media`, salva path em `contatos.foto_url`.
    - `_lista.tsx` `AvatarContato`: detecta se foto é URL externa (http/data) ou path bucket. Path → resolve via `/api/media` (signed URL renovável).
    - `_editar-contato-balao.tsx`: botão **Atualizar foto de perfil** que chama o endpoint.
    - Fix raiz: URL `pps.whatsapp.net` expira em ~6h. Agora persistimos no bucket.
  - **ONBOARDING-TESTE.md**: guia passo a passo (14 blocos) cobrindo brand, sidebar, alertas, /analise-ias fix, Pixel & Campanhas, hierarquia, atribuições, idade, foto, mídia, abas flutuantes verde, spinner verde, relatórios.

- **12:30** — **R1+R2+R4: Pixel & Campanhas + hierarquia etiqueta (Linha/Variante) + idade do contato.**
  - Rename: `Pixel & Vendas` → `Pixel & Campanhas` (sidebar + título da página).
  - Migration `etiquetas.etiqueta_pai_id` (FK self-ref, índice parcial). Hierarquia 2 níveis: **Linha** (mãe) agrupa **Variantes** (filhas). Auto-etiquetagem aplica a mãe junto automaticamente.
  - `_actions.ts`: `criarEtiqueta(nome, cor, etiquetaPaiId?)` + nova `atualizarEtiquetaPai`. Valida hierarquia ≤ 2 níveis e impede ciclos.
  - `/configuracoes/etiquetas`: novo seletor "Etiqueta-mãe" no form de criar + dropdown "Vincular como Variante" em cada linha. Render hierárquico (Linha com filhas + Órfãs).
  - `lib/crm/auto-etiquetar-campanha.ts`: ao aplicar filha, busca `etiqueta_pai_id` e aplica mãe também.
  - Migration `contatos.idade smallint` (0–130, nullable).
  - `/api/contatos/[id]`: novo endpoint `PATCH` aceitando `{ idade, nome }`.
  - Balão Editar contato (`_editar-contato-balao.tsx`): campo **Idade** opcional ao lado de Nome/WhatsApp; PATCH separado pro endpoint novo.
  - `parseFieldData` do leadgen agora extrai `age`/`idade`. Webhook salva em `campos_jsonb._idade`. `conciliarLead` aplica idade no contato (só quando idade ainda for null) ao conciliar.

- **11:45** — **Etiqueta↔Campanha/Conjunto: refatoração de UI + fix bug + suporte conjuntos.**
  - Fix bug: query de campanhas em /configuracoes/etiquetas tentava `select plataforma_id` (não existe). Schema real: `plataforma` text. Por isso "Nenhuma campanha sincronizada" mesmo com 7 campanhas no DB.
  - Migration `etiqueta_conjuntos` (N:M etiqueta ↔ conjunto Meta) com RLS — granularidade fina.
  - `lib/crm/auto-etiquetar-campanha.ts`: agora resolve `ad_id → conjunto + campanha`, junta etiquetas vinculadas em ambas tabelas e aplica.
  - **UI movida pra /pixel-vendas**: novo componente `_atribuicoes.tsx` (tabela expandível campanha → conjuntos, dropdown de etiquetas multi-select por linha).
  - `_atribuicoes-actions.ts`: `salvarEtiquetasDoAlvo(alvo: 'campanha'|'conjunto', alvoId, etiquetaIds)` — replace atômico.
  - `/configuracoes/etiquetas`: Balão Editar voltou a ser apenas CRUD de etiqueta (sem vínculo de campanha).

- **11:05** — **E1+E2: Etiqueta ↔ Campanha (vínculo manual + auto-etiquetagem no ingest).**
  - Migration `etiqueta_campanhas` (N:M etiqueta↔campanha Meta) com RLS por agência.
  - `lib/crm/auto-etiquetar-campanha.ts`: resolve `ad_referral.sourceId` → campanha → etiquetas vinculadas → aplica em `contato_etiquetas` (idempotente).
  - `lib/crm/ingest.ts`: hook fire-and-forget que dispara auto-etiquetagem na 1ª mensagem com click-id de anúncio (independente do master switch do Pixel).
  - `app/(dashboard)/configuracoes/etiquetas/_actions.ts`: nova action `vincularCampanhasEtiqueta(etiquetaId, campanhaIds)`.
  - `_client.tsx`: dentro do Balão Editar etiqueta, novo bloco "Campanhas vinculadas" com filtro + multi-select. Lista de etiquetas mostra badge "🔊 N" indicando quantas campanhas vinculadas.
  - `page.tsx`: server-side puxa campanhas + mapa de vínculos em paralelo (1 query a mais).
  - Estado preservado: UI mantém vínculos em estado local após salvar pra evitar refetch.

- **10:25** — **Pixel & Vendas D1: Lead/ICP/Venda + master switch + remoção de Desempenho/Alarmes.**
  - `capi-palavras.ts`: schema novo (`pixel_ativo` + `lead_ativo` + `icp_ativo` + `icp_palavras`).
    Lê com fallback dos campos antigos `addtocart_*` (zero-downtime). Default da lista de palavras = vazio (deixa de ser nichado em fotografia).
  - `lib/crm/ingest.ts`: respeita master switch — quando `pixel_ativo=false` nenhum evento sai.
  - `_eventos-actions.ts`: aceita os 4 campos novos.
  - `_client.tsx`:
    - Removida seção "Desempenho por campanha" (mesma info no Dashboard, era redundante).
    - Removido bloco "Alarmes" do banner de saúde (a aba **Alertas** assume).
    - Removido componente `FragmentLinha` e busca de campanha.
    - `CardEventosAutomaticos` reescrito: toggle master "Pixel ativado" + Lead + **ICP** (renomeado de AddToCart, palavras-chave configuráveis) + linha informativa "Venda" (automática via Fechamento).
    - Quando Pixel off, os 3 toggles abaixo ficam dim + desabilitados.
  - `page.tsx`: removido cálculo de alarmes (ROAS caiu / sem vendas / match baixo / campanha sem venda). Simplificou interface `Saude`.

- **09:50** — **Mídia: imagens vão pro bucket Supabase (substitui ImgBB rate-limitado).**
  - ImgBB começou a retornar `400 Rate limit reached` -> imagens dos clientes paravam de baixar.
  - `lib/crm/midia-download.ts`: imagem agora segue o mesmo fluxo de audio/video/documento (bucket `crm-media` via `uploadMedia`). UI já resolve path via signed URL.
  - Flag `IMG_STORAGE=imgbb` mantém comportamento antigo se quiser comparar.
  - Imagens antigas armazenadas em `i.ibb.co/...` continuam funcionando (URL externa).

- **09:06** — **Quick wins B: abas flutuantes verde, sidebar Clientes, Copiar prompt menu.**
  - `_floating-tabs.tsx`: cor roxa (#9B7DBF / rgba(155,125,191)) → verde `var(--mk-accent-2)` / `rgba(0,225,154,…)`.
  - `_crm-overlays.tsx`: spinner/badge da análise IA também migrado pro verde.
  - `AppSidebar.tsx`: item **Clientes** (`/clientes`, ícone `ti-building-store`) adicionado em Administração — permite editar/excluir Teste01.
  - `AtendimentosLive.tsx`: botão **Copiar prompt** agora abre menu com ChatGPT / Claude — clicar copia o prompt e abre a IA escolhida em nova aba (`chatgpt.com` / `claude.ai/new`).

- **00:28** — **Alertas: fix integrações Meta + sidebar.**
  - Query `integracoes` corrigida: `plataforma='meta_ads'` (era `meta`) e `status='ativa'` (era `conectado`) — alinhado com schema real.
  - `meta-worker.ts`: mesmo fix no guard de status.
  - Sidebar: adicionado item **Alertas** dentro de **Tráfego (Ads)** (`ti-bell-ringing`).

## 2026-06-22

- **23:49** — **Alertas inteligentes: backend completo (gasto Meta Ads → WhatsApp).**
  - Migration `alertas_meta` + `alertas_meta_disparos` com RLS por agência.
  - `lib/alertas/meta-spend.ts`: busca gasto via Graph API (today/this_month).
  - `lib/alertas/meta-worker.ts`: itera alertas ativos, compara contra limite, dispara WhatsApp via UAZAPI, registra disparo. Anti-spam 24h.
  - `/api/cron/alertas-meta`: endpoint protegido por CRON_SECRET.
  - pg_cron `alertas-meta-tick` (a cada hora, minuto 7) apontando pra https://sonarcrm.com.br.
  - `pg_cron relatorios-tick` migrado de Vercel → sonarcrm.com.br.
  - `_actions.ts`: criar / editar / toggle / deletar / testar agora.
  - `_shell.tsx`: lista real com toggle, edit, deletar, testar; Balão Novo com form (nome, tipo, limite, conta Meta, cliente opcional, telefone destino, canal opcional, template msg com {{conta}}, {{gasto}}, {{limite}}, {{tipo}}).
  - EmptyState quando não há integração Meta (CTA pra conectar).
  - `page.tsx`: server-side carrega alertas + integrações + canais + clientes.

- **23:01** — **Alertas: redesign UI mobile/desktop (cards 1col, head rico, alerta destacado, Balão Novo).**
  - `app/(dashboard)/alertas/page.tsx` agora delega pra `_shell.tsx` (client component).
  - `_shell.tsx`: head com ícone bell + contador "N ativos · X disparados hoje" + botão Novo (Balão).
  - EmptyState polido com CTA "Criar primeiro alerta".
  - Card destacado quando há alerta disparado (saldo baixo etc.) com gradient verde + ações Reabastecer/Detalhes.
  - Lista cards-1col com toggle ativo/inativo + badge plataforma (Meta/Google) + msg preview.
  - Balão Novo mostra 4 tipos: Saldo baixo, Queda ROAS, CPL alto, Fadiga criativo.
  - Backend (cron Meta Ads + sender WhatsApp) entra na próxima onda — UI ja preparada.

- **22:31** — **Brand Sonar oficial: hexágono + S verde + accent #00E19A.**
  - `SonarLogo.tsx` reescrito: símbolo hexágono outline + letra S italic bold + bolhinhas decorativas verde `#00E19A`.
  - Wordmark `so` branco · `nar.` verde mantido.
  - `app/icon.svg`, `app/apple-icon.svg`: favicon novo (hex+S sobre `#0a0f10`).
  - `public/manifest.json`, `app/layout.tsx`: `theme_color`/`themeColor` → `#00E19A`.
  - `app/globals.css`: tokens `--mk-accent` → `#00E19A` (dark) / `#00B27A` (light); `--mk-accent-2` → `#4DECB3` / `#00E19A`.
  - Replace global em `app/**`, `components/**`, `lib/relatorios/pdf.tsx`, `lib/ia-atendimento/tools-runner.ts`, `lib/geo/brasil.ts`: `#10b981`/`#10B981` → `#00E19A`, `#34d399`/`#34D399` → `#4DECB3`, `#059669` → `#00B27A`.

- **04:00** — **Relatorios: mobile (cards 1col) + envio PDF real.**
  - `_client.tsx`: hook useIsMobile; em <=768px, tabela vira cards stack 1col com toggle ativo no topo, nome+recebedor, chips Meta/Google + frequencia + proximo envio, e botoes "Enviar" full-width + editar + deletar lado a lado.
  - `lib/relatorios/pdf.tsx`: Document @react-pdf/renderer (A4 dark theme) com header titulo + periodo, secao Financeiro (Investido laranja + Faturamento + Lucro verde + ROAS verde) + secao Trafego (impressoes, cliques+CTR, leads, CPL, conversoes).
  - Worker atualizado: se formato='pdf', gera PDF -> upload bucket `relatorios` -> URL assinada 24h -> `instanceSendMedia` type=document com docName `<nome>.pdf` + caption resumo. Fallback automatico pra texto se PDF falhar.
  - Texto formato continua para formato='texto'. Imagem ainda envia texto (proxima fase).

- **03:35** — **Relatorios: worker + envio UAZAPI + cron a cada 2 min + botao "Enviar agora".**
  - `lib/relatorios/worker.ts`: `processarRelatoriosPendentes` pega relatorios ativos com proximo_envio <= now(), faz claim atomico (ultimo_status='enviando'), monta texto formatado (KPIs financeiro + trafego, igual Dashboard — usa tickets.valor_fechado + metricas_diarias), pega canal WhatsApp connected, envia via instanceSendText, recalcula proximo_envio. Em caso de erro: marca ultimo_status='falhou' + ultimo_erro.
  - `/api/cron/relatorios/route.ts`: GET protegido por CRON_SECRET.
  - pg_cron job `relatorios-tick` agendado `*/2 * * * *` chamando o endpoint.
  - `/api/relatorios/[id]/enviar-agora/route.ts`: POST autenticado, marca proximo_envio=now() + roda worker imediato (botao "Enviar agora" no painel).
  - `_client.tsx`: botao paper-plane ao lado de editar/deletar — confirma + dispara fetch + alerta resultado.

- **03:15** — **Nova aba Relatorios: agendamento automatico de envio (UI + persistencia).**
  - Migration `relatorios_agendados` (id, agencia_id, nome, cliente_id/telefone_destino, canal_id, plataforma, frequencia diario/semanal/mensal, dia_semana, dia_mes, hora_envio, timezone, formato pdf/imagem/texto, periodo_dias, ativo, proximo_envio, ultimo_envio/status/erro, soft delete). RLS multi-tenant.
  - `/relatorios/page.tsx` reescrita: server component lendo agenda, badge "N REGISTROS · M ATIVOS", banner sucesso/erro.
  - `_actions.ts`: criarRelatorio, atualizarRelatorio, alternarAtivoRelatorio, deletarRelatorio. Calcula `proximo_envio` automaticamente (diario/semanal/mensal).
  - `_client.tsx`: toolbar (busca + chips status Todos/Ativos/Inativos + botao Criar). Tabela com toggle ativo inline, edit, delete.
  - `_form-balao.tsx`: Balao com nome, destinatario (cliente OR telefone livre), plataforma, canal, frequencia (chips), dia/hora, formato, periodo.
  - Sidebar: novo item "Relatorios" em Trafego (Ads).

  **Pendente** (proxima fase): worker pg_cron que dispara envio + geracao de PDF/imagem/texto + integracao UAZAPI.

- **00:35** — **Aurora background no Dashboard (decorativo animado).**
  - Novo `components/layout/AuroraBg.tsx` — 2 esferas radiais (verde-accent) com blur, respiram lentamente (18s/22s ease-in-out). `position: fixed`, `pointer-events: none`, atras do conteudo. Respeita prefers-reduced-motion.
  - Aplicado em `app/(dashboard)/dashboard/page.tsx` na view principal (atendimentos+campanhas).

- **00:25** — **CountUp: KPIs animam de 0 ate valor final.**
  - Componente `components/ui/CountUp.tsx` (client) — usa requestAnimationFrame com ease-out cubic, duracao 900ms padrao. Respeita prefers-reduced-motion. Aceita number|null (null → fallback "—"). Helpers: fmtCountBRL, fmtCountMultX, fmtCountPct.
  - DashboardKPIs.tsx: Investido / Faturamento / Lucro / ROAS / Impressoes / Cliques / CPL / CAC animam.
  - DashboardAtendimentos.tsx: Faturamento / Tickets fechados / Servicos vendidos / Ticket medio animam.
  - analise-ias/page.tsx: Tokens / Custo / Chamadas / Sucesso% / Audio min / Medias animam.

## 2026-06-21

- **00:05** — **Desktop polish: KPI hover + tooltip do gráfico.**
  - `globals.css`: `.kpi-card:hover` ganha translateY(-2px) + borda glow accent (só hover:hover, não toca em mobile). Lucro hero amplifica o glow.
  - `DashboardCharts.tsx`: Tooltip do AreaChart "Investido × Faturamento" ganha visual dark/glass com border accent + shadow forte (igual aos demais tooltips do CRM).

- **23:50** — **Mobile polish global + Dashboard KPIs com Lucro hero.**
  - `globals.css` ≤768px:
    - `.dashboard-kpis-financeiros` reorganiza no mobile: Lucro vira hero full-width no topo, Investido + Faturamento em 2 colunas abaixo, ROAS isolado embaixo (grid-areas).
    - `.dashboard-kpis-trafego` força 2x2 mobile (Impressões/Cliques/CPL/CAC).
    - Inputs com min-height 42px + font-size 15px (evita zoom iOS).
    - CTAs ganharam min-height 40px (alvo tátil).
    - `.chip-strip` / `[data-chip-strip]`: rola horizontalmente em vez de quebrar.
    - Balão respeita `env(safe-area-inset-bottom)`.
  - `DashboardKPIs.tsx`: classes `kpi-lucro-hero` / `kpi-invest` / `kpi-fat` / `kpi-roas` no Grupo A + `dashboard-kpis-trafego` no Grupo B.
  - Filtro Serviço×Idade no mapa marcado como `data-chip-strip` (rola horizontal no mobile).

- **23:30** — **Dashboard/Campanhas: filtro Serviço × Idade no mapa de contatos.**
  - Migration `contatos.faixa_etaria` (text + check 18-24/25-34/35-44/45-54/55+).
  - `lib/crm/faixas-tipos.ts` — tipos + constante `FAIXAS_ETARIAS` (compartilhado server/client).
  - `lib/crm/contatos-geo.ts` — nova função `dadosGeoCompletos` retorna lista de pontos enriquecidos (uf + serviço do ticket mais recente + faixa etária). Mantém `contatosPorEstado` como wrapper.
  - `_mapa-client.tsx` reescrito: 2 trilhos de chips (Serviço + Idade) acima do mapa; bolinhas, ranking Top 10 e marimekko regiões recalculam reativamente; "Limpar filtro"; varredura visual ao trocar; rótulo do filtro ativo no header.

- **22:55** — **Redesign docs sessão 1 (Atendimentos + Follow-up) + tokens globais.**
  - `docs/redesign-abas/tokens.md` — paleta light+dark, tipografia, espaçamento, classes mk-*, ícones Tabler. Referência única.
  - `docs/redesign-abas/sessao-1/aba-atendimentos/prompt.md` — inventário técnico (estrutura 3-col, dados por elemento, estados, filtros, deep-links, componentes). 9.6KB, exhaustivo.
  - `docs/redesign-abas/sessao-1/aba-follow-up/prompt.md` — inventário técnico (barra de filtros, cards de candidato, IA, cadência). 11.1KB.
  - README com ordem de prioridades (6 sessões). Placeholders pra prints (Roberto cola desktop.png+mobile.png).

- **22:20** — **Pixel & Vendas (refino #4): alarmes acionáveis.**
  - Banner de saúde agora calcula alarmes comparando período atual vs anterior (mesma janela imediatamente antes):
    - 🔴/🟡 **ROAS caiu >30%** vs período anterior (>50% = danger).
    - 🔴 **Período sem vendas** — gastou em ads mas nenhum Fechamento.
    - 🟡 **Campanha gastou >20% do total sem vender** — sugestão de pausa/ajuste.
    - 🟡 **Taxa de match de click-id <50%** com ≥5 vendas — investiga atribuição.
  - Alarmes vêm com descrição acionável (cor laranja se warn, vermelho se danger).

- **22:12** — **Pixel & Vendas (refino #3): Lead + AddToCart automáticos.**
  - **Lead** dispara na 1ª mensagem do contato com `ctwa_clid` (chegou). Dedup 1 vez/contato pra sempre.
  - **AddToCart** dispara quando msg do cliente bate palavra-chave da lista editável (default: preço, quanto, valor, pix, pacote, cobrança, orçamento). Dedup 1/contato/dia.
  - **UI no Pixel & Vendas**: card "Eventos automáticos pro Meta" com 2 toggles + chips editáveis das palavras (adiciona/remove + salvar). Salvo em `configuracoes_agencia.ia.capi`.
  - Combinação: **Lead** (chegou) + **AddToCart** (perguntou preço) + **Purchase** (Fechamento). Meta otimiza muito melhor com 3 sinais.

- **18:20** — **CAPI: ao excluir um Fechamento, cancela e estorna no Meta.**
  - Quando você exclui um Fechamento (rota DELETE), o `capi_eventos` original é marcado como `cancelado` E um evento **Refund** é enfileirado pro Meta (se o Purchase original já tinha sido enviado). Dedup por `event_id=refund:fechamento:{ticket_id}` — reexcluir não duplica.
  - `enviarPurchase` ganhou `eventName` customizável; worker lê `event_name` do banco. Mesma rota CAPI serve Purchase/Refund/Lead/AddToCart no futuro.
  - Migration `capi_eventos_status_check` aceita `cancelado`.

- **13:26** — **Mapa: filtra só contatos com ticket ativo (Aberto / Pendente / Fechado).**
  - Mapa "Contatos por estado" agora ignora base fria e mostra apenas contatos com pelo menos 1 ticket em (aberto / pendente / fechado). Antes contava todos os 221; agora 8 contatos relevantes (3 abertos + 5 pendentes hoje).
  - Mesma regra do CRM — quem não interagiu via ticket some do mapa.

- **13:16** — **Dashboard / Campanhas — redesign (lote C): mapa de contatos por estado.**
  - Nova seção **"Contatos por estado"** abaixo do TOP 5: mapa do Brasil com bolhas proporcionais (hover destaca + mostra tooltip), ranking Top 10 com barras e %, distribuição por região (marimekko), card-resumo total/maior concentração.
  - Localização derivada do DDD do telefone — 185 dos 221 contatos da base entram no mapa hoje (84%); `contatos.estado` quando preenchido manualmente tem prioridade.
  - Empty state quando 0 contatos com geo. Layout inspirado no mockup IA.

- **13:08** — **Dashboard / Campanhas — redesign (lote A+B): geo helpers + KPIs + charts conforme mockup IA.**
  - **Geo helpers:** `lib/geo/brasil.ts` (contorno + 27 UFs + projeção) e `lib/geo/ddd-estado.ts` (mapeamento DDD→UF e helpers); `lib/crm/contatos-geo.ts` agrega contatos por UF priorizando `contatos.estado` manual e caindo no DDD do whatsapp/wa_id/telefone.
  - **KPIs reescritos:** 2 grupos — financeiro (Investido com top-border laranja, Faturamento, **Lucro Bruto destacado em verde/vermelho**, ROAS Bruto) + tráfego menor (Impressões/Cliques/CPL/CAC). Layout do mockup IA.
  - **Charts refinados:** Área dupla `Investido × Faturamento` com cores laranja `#F0A35E` + verde `#10B981` e legenda; Top 5 reescrito com barras gradient teal→verde e valor dentro da barra; Donut Status com nº no centro e cores `#34D399`/`#FBBF24`.

- **05:53** — **Pixel & Vendas (refino #2): onboarding zero-fricção.**
  - Card "Setup" no topo lista cada cliente Meta com checklist visual: **✓ Meta conectado · ✓/⏳ Pixel escolhido · ✓/⏳ 1ª venda enviada**. CTA contextual ("Escolher pixel" pra quem não tem, dica de fluxo pra quem só falta a 1ª venda).
  - Some quando tudo está 100% configurado (não polui mais a tela).
  - Empty state quando nenhuma conta Meta foi conectada: leva direto pra `/integracoes/meta`.
  - Banner de saúde foi enxugado (não duplica "Falta pixel" — fica só com token expirando/expirado + eventos com erro).

- **05:18** — **Dashboard / Campanhas: faturamento real (sem KPI falso).**
  - FATURAMENTO e ROAS agora vêm de `tickets.valor_fechado` (fechamentos reais do CRM) em vez de `metricas_diarias.receita` (Meta retorna zerado — KPI estava sempre R$ 0,00 / 0x). Mesma fonte usada pelo Dashboard de Atendimentos — agora os números batem.
  - Vale tanto pros KPIs quanto pra curva diária "Investido × Faturamento".
  - **Importante:** Faturamento aqui é **macro** (todos fechamentos do período). Para faturamento **atribuído por campanha** (cadeia CTWA→venda), a fonte continua sendo o Pixel & Vendas — sem redundância.

- **05:13** — **Brief de design para o Dashboard / Campanhas.**
  - Documento [docs/design-briefs/2026-06-20-dashboard-campanhas.md](docs/design-briefs/2026-06-21-dashboard-campanhas.md) com propósito (visão MACRO, faturamento real do CRM, sem redundância com Pixel & Vendas), paleta CSS vars light+dark, tipografia/espaçamento, inventário de dados, KPIs propostos, constraints técnicos e critérios de aceite — pronto pra mandar pra uma IA de Design produzir mockups.

- **05:04** — **Pixel & Vendas (refino #1): visibilidade + diagnóstico.**
  - **Banner de saúde** no topo (verde "Tudo conectado" ou laranja com os pontos a ajustar): pixel faltando por cliente, token Meta expirando (≤7d) ou expirado, contagem de eventos com erro/sem atribuição.
  - **Botão "Por quê?"** em cada Purchase do feed → abre balão que destrincha a cadeia de atribuição em 4 passos (CTWA → anúncio sincronizado → pixel conectado → resposta do Meta) com ✓/✗ e a explicação de cada falha.

- **04:49** — **Fix Dashboard TOP 5 + tabela Pixel & Vendas.**
  - **TOP 5 Campanhas** mostrava 2 quando havia 3 com gasto. Causa: o chart usa `nome` no eixo Y e o Meta permite 2 campanhas com **mesmo nome** — o Recharts colapsava as duplicatas em 1 barra. Agora desambigua com sufixo (`· #1`, `· #2`). YAxis também ganhou largura (120→160) pra acomodar nomes longos.
  - **Tabela "Desempenho por campanha"** (Pixel & Vendas) com colunas grudadas na borda do card: criada classe utilitária `mk-table-card` no globals.css (padding lateral interno) e aplicada na tabela. Indentação do conjunto subiu pra 32px.

- **04:43** — **Dashboard: removido badge "BREVE" da aba Campanhas.**

- **04:33** — **Fix Dashboard: investido/gasto vinha incompleto (sync só puxava 7 dias).**
  - O sync de insights do Meta puxava `last_7d` ([sync.ts](lib/meta-ads/sync.ts)), então o Dashboard no filtro **"30 dias"** mostrava só ~7 dias de gasto (ex.: **R$ 266,56** em vez dos **R$ 414,06** que o Meta reporta no período). Passou pra **`last_30d`**.
  - ⚠️ Pra corrigir os dados **já gravados**: clicar **"Sincronizar agora"** no Dashboard — não há cron de sync-meta (é manual), então o backfill dos 30 dias só acontece no próximo sync.

- **04:22** — **Pixel & Vendas (build 4): aba no ar + Tráfego (Ads) enxuto.**
  - Página `/pixel-vendas` (super_admin): KPIs **Gasto / Bruto / Líquido / ROAS**, tabela **campanha→conjunto** (expansível, com busca e filtro de cliente/período), feed de **Purchases** (status + reenviar) e card **Conectar Pixel** (OAuth + escolher pixel).
  - **Tráfego (Ads) agora mostra só Pixel & Vendas** — os 9 itens antigos saíram do menu (rotas preservadas; ver `docs/parking-trafego.md`).
  - ⚠️ Pra enviar venda ao Meta: reconectar a integração Meta (novo scope `ads_management`) e escolher o Pixel na aba. `ads_management` precisa de App Review pra clientes não-tester.

- **04:04** — **Pixel & Vendas (build 3): cron + hook no Fechamento + endpoints.**
  - Rota cron `/api/cron/capi-eventos` (Bearer CRON_SECRET) processa a fila de Purchase.
  - Hook no Fechamento: ao gravar `valor_fechado`, dispara `enfileirarPurchase` via `after()` do Next 16 (não bloqueia a resposta, idempotente por ticket). DELETE intacto.
  - Endpoints `/api/integracoes/meta/pixels` (listar/salvar o Pixel do cliente) + `/api/pixel-vendas/reenviar`. Helper `requireSuperAdminApi` (retorna JSON 401/403 em rotas de API, não redirect).

- **03:53** — **Pixel & Vendas (build 2): libs da Conversions API.**
  - `lib/meta-ads/capi.ts` — `enviarPurchase()` (evento Purchase: `action_source=business_messaging`, `ctwa_clid` cru + telefone com hash SHA-256, `value`/moeda, dedup por `event_id`) + `hashSHA256`.
  - `lib/meta-ads/api.ts` — scope OAuth subiu pra `ads_read,ads_management` + `listPixels()` (descobre o Pixel da ad account).
  - `lib/crm/capi-eventos.ts` — atribuição (contato → `ctwa_clid`/anúncio → campanha → integração/pixel) + `enfileirarPurchase` (dedup por ticket) + worker `processarCapiEventosPendentes` (claim atômico + reaper; estoura 5 tentativas → `erro` reenviável).

- **03:39** — **Pixel & Vendas (build 1): fix do `ctwa_clid` + migration `capi_eventos`.**
  - Corrigida a chave do click-id na conciliação (`ctwa_clid` → `ctwaClid`, camelCase) — a atribuição por CTWA voltou a casar (estava falhando calada). `lib/meta-ads/conciliar.ts`.
  - Migration `capi_eventos` (ledger dos eventos enviados ao Meta) + colunas `pixel_id`/`pixel_nome` em `integracoes`. Aplicada em produção via MCP.

- **03:06** — **Plano de implementação do "Pixel & Vendas" escrito.**
  - Plano detalhado (11 tasks, com código real) em `docs/superpowers/plans/2026-06-20-pixel-e-vendas.md`. Ainda **sem código de produção**. Cobre: parquear os 9 itens, fix do bug `ctwa_clid` (camelCase), migration `capi_eventos` + pixel no `integracoes`, cliente CAPI (`enviarPurchase`), worker com **claim atômico + reaper**, cron, hook no Fechamento (`after()`), OAuth `ads_management` + descoberta de pixel, painel KPIs + tabela campanha→conjunto + feed + conectar.

- **02:49** — **Design fechado: "Pixel & Vendas" (rastreio Meta + Conversions API).**
  - Spec de implementação salvo em `docs/superpowers/specs/2026-06-20-pixel-e-vendas-design.md` (brainstorming aprovado). Ainda **sem código de produção** — próximo passo é o plano de implementação.
  - Resumo: nova aba **única** em **Tráfego (Ads)** (super_admin); os 9 itens atuais saem do menu (rotas preservadas). Envia evento **Purchase** ao Meta via **Conversions API** quando há **Fechamento** — atribuição pelo `ctwa_clid` da CTWA, dedup por `event_id=fechamento:{ticket_id}`. Painel **Gasto / Bruto / Líquido / ROAS** por campanha→conjunto, busca e filtro. Conexão de **Pixel via OAuth** (scope `ads_management`). Inclui **fix do bug** de chave `ctwa_clid` (camelCase vs snake_case). Globo de leads por estado fica pra **Fase 2**.

## 2026-06-20

- **23:49** — **Análise de IAs: Provedor vira botões + cores verdes do CRM.**
  - O seletor de **Provedor** (Todos / GroqCloud / OpenAI / Anthropic) agora são **botões** (pills), iguais ao Escopo e Período — clica e filtra na hora. (Antes era dropdown; como todo o uso é Groq, parecia que "não fazia nada" — agora fica óbvio. OpenAI/Anthropic ficam vazios só porque ainda não há uso nesses provedores.)
  - Trocadas as **cores roxas por verde do CRM** (#10b981) no hub: barras das tabelas, gráfico "Tokens por dia" e cards.

- **22:25** — **Análise de IAs: "Todos os clientes" e "Por tipo de cliente" passam a mostrar o roster completo.**
  - Antes só apareciam clientes/tipos que tinham uso de IA — como só o super-admin usou IA, os botões pareciam "não funcionar". Agora, no modo cross-cliente (super-admin), **semeia TODOS** os clientes (agências), admins e **tipos de cliente** mesmo com **0 uso**, lendo dos acessos.
  - Assim o super-admin vê **todos os tipos de cliente que preencheu** (ex: "Empreendedor"), mesmo sem uso de IA. A tabela "Por Admin / usuário" agora mostra o tipo junto do nome (ex: "Guilherme Paulo · Empreendedor"). Vale também no PDF (mesma fonte).
  - Confirmado: a visão cross-cliente continua **exclusiva do super-admin**.

- **18:11** — **Horário comercial + almoço no Follow-up (não envia fora do expediente).**
  - **Header do Follow-up com IA** (canto direito): 2 dropdowns de **horário comercial** (início × fim) + checkbox **"Horário de almoço"** que revela 2 dropdowns (início × volta). Salva por agência em `configuracoes_agencia.ia.followup_janela`. Componente `_janela-comercial.tsx` + action `salvarJanelaComercial`.
  - **Worker** (`lib/crm/janela-comercial.ts` + avulso): se o follow-up agendado cair **fora do comercial** ou **dentro do almoço**, **não envia — adia** (reagenda) pro próximo instante válido: antes de abrir → na abertura de hoje; no almoço → na volta; depois de fechar → abertura de amanhã. Fuso SP. Sem janela configurada = envia a qualquer hora (compatível com o atual).
  - Ex.: comercial 08:00–18:00, almoço 12:00→13:00. Follow-up que cairia 12:30 sai às 13:00; o que cairia 22:00 sai amanhã 08:00.

- **17:53** — **Regra: contato que já interagiu não recebe follow-up.**
  - Se a **última mensagem do ticket for do cliente** (ele respondeu / está aguardando atendimento), o follow-up **não é enviado**. Vale pros 2 workers (avulso + sequências, status `respondido`) e pro **envio imediato** (rota retorna 409 "cliente já interagiu"). Helper `clienteFoiOUltimoAResponder` em `lib/crm/anti-flood.ts`.
  - Complementa o opt-out que já existia (cancelava se o cliente respondesse depois do agendamento) — agora cobre também quem já estava com a bola do nosso lado.

- **17:18** — **Blindagem sistêmica anti-reenvio (depois do incidente do avulso).**
  - **Auditei todos os workers que enviam WhatsApp por cron.** Achei o **mesmo bug** em `lib/crm/follow-up.ts` (sequências por etiqueta-gatilho, cron 1×/min ativo): enviava a etapa e só depois avançava `proximo_envio_em` → timeout reenviaria a etapa em loop. **Corrigido com claim atômico** (`ativo → processando` antes de enviar; todos os caminhos resetam o status; migration `fui_status_processando`). Hoje tinha 0 inscrições, então nunca chegou a estourar — mas era bomba latente.
  - `lib/ia-atendimento/followup-worker.ts` (follow-up da IA de atendimento) **já era seguro** (claim atômico via `UPDATE…RETURNING`). `lib/super-admin/cobrancas.ts` é **idempotente por mês** (cron diário) — baixo risco.
  - **Rede de segurança permanente (`lib/crm/anti-flood.ts`):** antes de QUALQUER envio automático de follow-up, conta as mensagens automáticas já enviadas ao ticket nas últimas 24h; acima de **10**, pula. Limita o estrago de qualquer reenvio futuro, mesmo que escape do claim. Aplicado nos 2 workers de follow-up.
  - **Contagem de follow-up corrigida:** "dividir em 2" marcava as 2 partes como follow-up → o card mostrava "2" pra 1 follow-up. Agora só a 1ª parte conta (1 follow-up lógico = 1 na contagem).

- **17:09** — **🔴 FIX CRÍTICO — follow-up avulso reenviando em loop (cliente recebeu 12 msgs).**
  - **Causa:** o worker (`lib/crm/follow-up-avulso.ts`) enviava as mensagens e **só depois** marcava `enviado`. Com envio lento (UAZAPI), a função serverless estourava o `maxDuration` (60s) **antes** de marcar → a linha ficava `agendado` → o cron (1×/min) reprocessava e **reenviava a mesma mensagem em loop**. 1 contato (final 8320) recebeu 12 mensagens.
  - **Correção:** **claim atômico** — o worker move a linha `agendado → enviando` num UPDATE rápido **antes** de enviar; só processa quem conseguiu claimar. Se o envio depois falhar/timeoutar, a linha já saiu de `agendado` e **nunca é reprocessada**. `marcar()` agora nunca lança (erro só loga, não aborta o lote). Novo status `enviando` no CHECK (migration `fua_status_enviando`).
  - **Mitigação aplicada:** cron pausado, **31 follow-ups agendados pendentes cancelados** em massa, depois cron religado já com o fix.

- **15:27** — **IA — Fase 3: limites por chave (TPD + follow-ups/dia) + skip proativo + rastreio por chave.**
  - **Migration** `ia_limites_por_chave`: `ia_uso += chave_id` (registra QUAL chave foi usada em cada chamada) + `ia_chaves += limite_tpd (100k) / limite_tpm (12k) / limite_followup_dia (80)`.
  - **`lib/ai/limites.ts`** (`usoHojePorChave`): soma o uso de hoje (fuso SP) por chave a partir de `ia_uso`.
  - **Gateway** (`lib/ai/gateway.ts`): antes de tentar, **pula proativamente** as chaves Groq que já bateram o teto diário de tokens (TPD) ou o limite de follow-ups/dia → vai pra próxima chave → OpenAI. O 429 do Groq segue como rede de segurança. Cada tentativa loga o `chave_id` usado. Quando todas as chaves Groq estouram, lança mensagem amigável com "(TPD)" — a UI do Follow-up já detecta e pausa com aviso (não cospe erro cru).
  - **`keys.ts`** resolve as chaves como objetos (`id` + limites), não mais só strings. Chaves legadas/env (sem id) não são limitadas proativamente.
  - **UI** (Configurações de API → Groq): cada chave Groq tem campo **"Máx. follow-ups/dia"** editável (0 = sem limite), com explicação de que ao bater o teto cai pra próxima chave/OpenAI.

- **01:43** — **Teste por chave de IA + filtros em tempo real no Follow-up + descarte configurável.**
  - **Botão "Testar" em cada chave** (Configurações de API → IA): valida uma de cada vez (Groq/OpenAI/Anthropic via `/models`, sem gastar token) e mostra ✓/✗ com a mensagem — dá pra achar logo qual chave está com problema.
  - **Follow-up — filtros em tempo real** (sobre a lista já buscada, sem rebuscar): por **recomendação** (Vale follow-up / Não recomendado / Sem análise) e por **nº de follow-ups já enviados** (Todos/0/1/2/3/4/5+). Cada filtro mostra a **contagem** ao lado e a lista + o total no topo respeitam o filtro. Assim dá pra esconder quem já recebeu, ou focar só nos recomendados (ou eliminar os não-recomendados).
  - **Descarte configurável:** seletor **"Ao descartar, some por"** (1h/6h/12h/24h/3 dias/**Não volta**). Antes era fixo em 12h. "Não volta" mantém fora da lista até o cliente mandar mensagem nova. "Fechar ticket" continua encerrando de vez.

- **00:53** — **IA — Fase 2: várias chaves Groq (rotação) + fallback OpenAI + botão "usar OpenAI em tudo".**
  - Nova tabela **`ia_chaves`**: dá pra cadastrar **várias chaves por provider**. Com 3 chaves Groq o sistema reveza entre elas → **~300 mil tokens/dia** (cada chave = ~100k/dia). Chaves antigas migradas automaticamente.
  - **Rotação + fallback automático:** quando uma chave Groq bate o limite (429), pula pra próxima; esgotadas as Groq, **cai pro OpenAI** sozinho (se houver chave). Vale pra **resumo, sentimento, follow-up e transcrição**.
  - **Botão "usar OpenAI em tudo"** (e "voltar tudo pro Groq") na tela **Configurações de API (IA)** — troca o provider de chat + transcrição num clique. Dá pra escolher provider **por tarefa** também (chat e transcrição separados).
  - Modelos OpenAI: chat **gpt-4o-mini**, transcrição **gpt-4o-transcribe**. Tela de chaves redesenhada (gerenciador add/remover por provider, criptografia AES-256-GCM mantida). O hub **Análise de IAs** já reflete o nº de chaves no limite diário.
  - **Próximo:** Fase 3 (teto por chave TPM 12k / TPD 100k + ~80 follow-ups/dia/chave configurável + cadência) · streaming do resumo e "reescrever" ainda usam 1 chave (migrar pro gateway depois).

## 2026-06-19

- **23:48** — **Análise de IAs v2: escopo (Meu CRM / Todos os clientes / Por tipo) + mais métricas.**
  - **Escopo** (super-admin): **Meu CRM** (sua agência) · **Todos os clientes** (todas as agências, agrupado por cliente) · **Por tipo de cliente** (usa `usuarios.tipo_cliente`). Admin normal vê só o próprio CRM.
  - **"Por usuário" = "Por Admin / usuário"** (Usuário = Admin). Novas tabelas: **Por modelo**, **Por cliente (agência)**, **Por tipo de cliente**.
  - KPIs agora com **delta vs período anterior** (▲/▼ %). Médias: **por conversa** (+ custo/conversa), **por ticket**, **por chamada**. **Eficiência prompt × resposta** (proporção entrada/saída).
  - Export CSV/PDF respeitam o escopo (PDF inclui as tabelas por cliente/tipo). Métricas escolhidas com base em pesquisa de boas práticas (Helicone/Langfuse/Portkey/FinOps).

- **23:11** — **IA — Fase 4: aba "Análise de IAs" (hub de uso de tokens + export PDF/CSV).**
  - Nova aba no sidebar (**Configuração → Análise de IAs**). Dropdown de **provedor** (Todos/GroqCloud/OpenAI/Anthropic) + período (Hoje/7d/30d).
  - Cards: **tokens, custo estimado (USD), chamadas, % sucesso, áudio transcrito**. Barra **"limite diário de chat (Groq)"** = usado hoje / 100k por chave.
  - Tabelas **por sessão** (Transcrição/Resumo/Sentimento/Follow-up), **por provedor**, **por usuário/atendente** + **médias por cliente e por ticket**. Gráfico de **tokens por dia**.
  - **Log** das últimas chamadas + **export CSV** e **export PDF** (pra mandar pro Claude analisar performance). `lib/ai/relatorio.ts` (agregação) + `/api/ia/uso/pdf`.

- **22:08** — **IA — Fase 1: rastreio de uso de tokens (base do hub "Análise de IAs").**
  - Nova tabela **`ia_uso`**: cada chamada de IA registra **provider, modelo, tokens (prompt/saída/total), segundos de áudio, custo estimado (USD), status (ok/erro/limite)** e o contexto **por usuário, contato e ticket**.
  - Instrumentadas as 4 sessões: **Transcrição · Resumo · Análise de Sentimento · Follow-up com IA**. O follow-up grava **qual usuário** disparou (base pra ver uso por admin/atendente depois).
  - Logger **fire-and-forget** (`lib/ai/uso.ts`) — nunca quebra o fluxo. Limites reais do Groq confirmados: **TPM 12k · TPD 100k** (chat) / **20 RPM · 28.800s áudio/dia** (Whisper); não há limite semanal/mensal (vou projetar ×7/×30).
  - **Próximo:** Fase 2 (várias chaves Groq + botão "usar OpenAI em tudo") · Fase 3 (limites TPM/TPD + 80/dia) · Fase 4 (aba **Análise de IAs** com gráficos, por usuário/atendente/cliente/ticket + **export PDF**).

- **21:42** — **Follow-up: botão Parar + limite diário do Groq tratado; dropdown de modelos sem campos em branco.**
  - **Botão "Parar"** na aba Follow-up (além do que já tinha no balãozinho). Ao parar, as conversas que faltam continuam aparecendo pra analisar depois.
  - **Limite diário de tokens do Groq (TPD/429):** quando estoura, a análise **pausa** e o card mostra uma mensagem clara ("limite diário atingido — tente em alguns minutos ou troque/adicione chave") em vez do erro técnico 429 cru.
  - **Dropdown de modelos (IA):** sumiram os **campos em branco** (os títulos de grupo ficavam invisíveis no tema escuro). Agora é uma lista única, ordenada, com o selo de cada modelo — todos continuam.

- **20:50** — **Abas flutuantes: + Envio em Massa + layout enxuto de Contatos/Grupos.**
  - Nova aba **Envio em Massa** no balão (são 4 abas agora: Mensagens Rápidas · Contatos · Grupos · Envio em Massa).
  - **Contatos** no balão virou **lista enxuta** (avatar + nome + número + estado + total fechado + etiquetas + editar/excluir) no lugar da tabela larga que espremia tudo.
  - **Grupos** e **Envio em Massa** no balão: os campos lado a lado **empilham** (1 coluna) e o ID longo do grupo (JID) quebra direito — nada vaza.

- **20:34** — **Abas flutuantes: redimensionável + conteúdo menos espremido.**
  - O balão agora é **redimensionável** — arraste as **bordas laterais, a base ou os cantos de baixo** pra aumentar/diminuir (o topo continua sendo a barra de arrastar). Abre **maior por padrão** (460px).
  - **Mensagens Rápidas** dentro do balão: a mensagem agora ocupa a **linha inteira** em vez de ser espremida ao lado do comando + botões (acabou aquela quebra de 1 letra por linha).
  - Durante arrastar/redimensionar, o iframe não "engole" mais o mouse (fica fluido). Cards mais compactos dentro do balão pra Contatos/Grupos respirarem.

- **20:12** — **Configurações de API (IA) unificadas + ajustes visuais no Atendimento.**
  - A tela **"Chaves IA (Groq)"** virou **"Configurações de API (IA)"** e agora tem **tudo num lugar só**: chaves (Groq/OpenAI/Anthropic) **+ a transcrição de áudio**. Sumiu o card/tela **GroqCloud** duplicado (a rota antiga redireciona pra cá).
  - **Uma única chave Groq faz tudo:** transcrição com **Whisper Large v3** e resumo/análise com **Llama 3.3 70B**. Não tem mais aquele segundo campo de chave só pra transcrever (era a mesma chave, confundia).
  - **Atendimento — Filtros não vaza mais:** quando você encolhe a coluna de conversas, o botão **Filtros vira só ícone** (igual as abas), e o título corta com "…" em vez de empurrar.
  - **Ícone "Nova conversa"** agora é **verde**, igual os outros do cabeçalho.

- **20:02** — **Ajustes (feedback): cadência por card, canais com número+foto, fundo do chat, empty-state.**
  - **Follow-up com IA:** tirei a barra "Cadência padrão / Aplicar a todos" (confusa e não funcionava). Agora a cadência fica **dentro de cada card**: dividir a 1ª em 2 envios, escolher **1/2/3 follow-ups**, e ao escolher 2 ou 3 a **IA já sugere o texto do 2º/3º** (editável) com **Regenerar** e o **tempo de cada um**. Instruções do topo reescritas (mais legíveis, sem aquele texto apagado).
  - **Canais:** o card agora mostra o **número conectado e a foto de perfil** do WhatsApp (sincroniza via `/instance/all` quando faltam — antes só aparecia o id da instância).
  - **Fundo do chat:** troquei o cinza chapado por uma **colagem sutil de ícones** (bolha, avião, etiqueta, coração, gráfico…) em tamanhos variados, bem leve.
  - **"Selecione um ticket à esquerda":** não pisca mais ao abrir uma conversa por link (`?t=`) — entra direto em "Carregando".

- **19:42** — **D — Abas flutuantes (ON/OFF) no Atendimento.**
  - Botão **launcher** flutuante (arrastável; no celular gruda no canto mais próximo) abre um **painel flutuante com abas**: **Mensagens Rápidas · Contatos · Grupos**. Cada aba é a **página real** embutida → todas as funções (criar/editar/excluir) funcionam dentro do balão. Minimiza pra botão, fecha, arrasta livre.
  - **Inserir no chat:** na aba Mensagens Rápidas (dentro do balão) cada atalho ganha **"Inserir"** → joga o texto direto na barra da conversa aberta.
  - **Aviso "aba alterada" agora SÓ aparece quando a aba está aberta como balão** (vem do próprio balão via mensagem segura pra tela do Atendimento). Mexer na página normal de Mensagens Rápidas não dispara mais o aviso.
  - Dentro do balão o **menu lateral/topo** some e **som/notificação/heartbeat não duplicam**.

- **19:20** — **Atendimentos: Nova conversa, pílula de data no scroll, menu 3-pontos limpo.**
  - **Nova conversa (avulsa):** botão de balãozinho ao lado do sino. Digita o número (com DDD; sem DDI assume Brasil +55), nome opcional e o canal (se houver mais de um conectado) → abre direto o chat. Se já existir conversa aberta com o contato, **reaproveita** o ticket. Cria o contato se não existir.
  - **Pílula de data flutuante no chat** (estilo WhatsApp): ao rolar, mostra no topo **Hoje / Ontem / dia-da-semana / dd/mm/aaaa** das mensagens à vista; aparece/some com animação e **desaparece 4s** após parar de rolar.
  - **Menu 3-pontinhos do chat limpo:** removidos os itens que não fazem nada ainda (Transferir p/ Chatbot, Agendar mensagem, Mídias/links/docs, Compartilhar ticket, Parar rolagem automática). Sobrou só o que funciona: Detalhes, Transferir, Transferir Canal, Retornar à fila, Encerrar.

- **18:54** — **Follow-up com IA: cadência (1/2/3 follow-ups + tempos) + dividir em 2 mensagens.**
  - Em cada conversa (e com **"Cadência padrão → Aplicar a todos"**): escolha **1, 2 ou 3 follow-ups**. O 1º vai na hora; o 2º/3º são **gerados pela IA e agendados** com o tempo que você definir (ex: 2º após 1h, 3º após 3 dias). Cancelam sozinhos se o cliente responder antes (reusa o follow-up avulso).
  - **"Dividir em 2 mensagens"**: quebra a mensagem em duas e envia com intervalo (mais humano).
  - Card mostra **"+N agendado(s)"** após enviar.
  - Balão de editar contato: **ÚLTIMO** voltou pra dentro do quadrado verde (TOTAL · SERVIÇOS · FECHAMENTOS · ÚLTIMO).

- **18:32** — **Widget flutuante: drag livre (sem salto ao fechar).**
  - Removido o "gruda no canto": agora arrasta e **fica exatamente onde você soltar**, com margem de 8px pra não sair da tela.
  - Ao **minimizar/fechar** o painel vira botão **sem mudar de lugar** (ancorado pela borda direita, onde fica o X).

- **18:02** — **Ajustes (feedback): widget sem "chiclete", spinners, docs, abas-ícone, ordem dos fechamentos.**
  - **Widget flutuante** agora é **portal no body** (corrige o bug de ele rolar junto com a página) e virou **botão launcher** (liga/desliga): minimiza/fecha = vira botão redondo; clique abre; **arrasta e gruda em 1 dos 4 cantos** (bom no mobile). Badge com progresso.
  - **"Carregando" com animação** que gira de verdade (fechamentos do contato + espiar) — `.anim-spin` global.
  - **Documentos baixáveis** no chat **e** no espiar (link de download com URL assinada).
  - **Abas Abertos/Pendentes/Fechados** viram **só ícone + contador** quando a coluna de conversas fica estreita (as 3 cabem).
  - **Balão de editar contato**: ordem dos totais agora **TOTAL · SERVIÇOS (QTD) · FECHAMENTOS**, e **"Último fechamento"** foi pra cima da lista, alinhado à direita.

- **14:54** — **Onda 4: widget flutuante do Follow-up (entre abas) + aviso "aba alterada".**
  - **#6 — Balão flutuante arrastável (global):** o motor da análise do Follow-up com IA subiu pro layout do dashboard. Agora ao clicar "Analisar N com IA" você pode **sair pra outra aba** (Atendimentos, Contatos, Mensagens Rápidas, Grupos, Envio em Massa, etc.) que a análise **continua** — e um **widget flutuante arrastável** mostra o progresso (X/Y), "valem follow-up" e botão "Abrir Follow-up". Antes, sair cancelava.
  - **Auto-etiqueta "Em follow-up"** ao enviar agora é **find-or-create** (não duplica a etiqueta).
  - **#7 — Aviso "aba alterada":** ao adicionar/remover uma **Mensagem Rápida**, aparece um balãozinho amarelo no topo avisando pra atualizar Atendimentos (que carrega esses dados uma vez no load). Mecanismo global, dá pra estender pra outras abas.

- **14:20** — **Onda 3: divisória de conversas redimensionável (estilo WhatsApp desktop).**
  - Em Atendimentos, dá pra **arrastar a linha** entre a lista de conversas e o chat pra aumentar/diminuir cada lado. Largura salva no navegador (volta igual). 2 cliques na linha = reset (340px).

- **14:10** — **Onda 2: editar contato em balão, espiar com mídia, modo teste não marca IA.**
  - **Editar contato** (no painel de detalhes) virou **balão** (fundo embaçado) com só os campos editáveis (nome + WhatsApp) — não navega mais pra /contatos e **sem follow-up**. O follow-up também saiu do form de edição em /contatos (continua disponível em Util → "Criar follow-up nesta conversa").
  - **Espiar** agora mostra **imagens** (com lightbox), **áudio tocável** + **transcrição** — nos 3 lugares (cards do Follow-up com IA, balão da lista e ao abrir um pendente).
  - **Modo teste da IA:** clientes que chegam em pendentes e **não estão na whitelist** não recebem mais o carimbo da IA — não aparece "IA ativa" nem o ícone do robô pra quem a IA ignora (antes marcava e só barrava no processamento).

- **13:55** — **Limpeza de UI (onda 1): atendimentos, follow-up e IA.**
  - Removidas as abas **Privados/Grupos** do topo de Atendimentos (não recortavam nada).
  - **Follow-up IA → "Follow-up com IA"**. O campo "Análises por minuto" virou **interno** (some da tela) — protege o teto TPM do Groq sem você precisar mexer.
  - Painel do contato: removido **"Inscrever em sequência ativa"** (sem uso) e o **"Log do ticket"** foi pra aba **Perfil** (antes ficava em Util).
  - IA de Atendimento: removido o banner "Modo teste ativo…" (o status **TESTE** no card já diz isso).

- **12:40** — **Contatos: liberado o limite de 500 (mostrava só 500 de 1074).**
  - A página de Contatos puxava no máximo 500 registros — quem tinha mais não via o resto. Subido pra 5000 (cobre as bases atuais com folga).
  - Pra não pesar o navegador com milhares de linhas, a tabela agora renderiza em blocos de 300 com botão **"Carregar mais"**. A busca continua varrendo **todos** os contatos, não só os exibidos.
  - Confirmado na agência Teste: 1074 contatos (antes 574 ficavam escondidos).

- **12:28** — **Detector de plataforma do aparelho (iOS / Android / Web) por canal.**
  - O CRM agora capta o `plataform` do UAZAPI por conexão e mostra **badge** no card do canal: 🍎 iPhone (iOS), 🤖 Android ou 💻 Web/Desktop.
  - **Aviso de notificação agora é por plataforma:** só aparece **dentro do card iOS** (desligar notificação do WhatsApp Business, deixar só a do CRM, por causa da sync chata do iOS). Android e Web não mostram nada.
  - Captura: no sync de status do canal + ação admin `/instance/all` (fonte confiável), disparada 1x ao abrir Canais quando algum canal conectado ainda não tem plataforma. Coluna nova `canais.wa_plataforma`.
  - Detectado hoje: Restauração e Innova = Android Business (`smba`).

---

## 2026-06-18

- **22:19** — **Contatos mais limpo + avisos de import (etiqueta/iOS) + validação do import.**
  - **Removida a caixa grande "Primeiro passo"** de Contatos (texto demais e redundante — o import já vive no botão do topo e na aba Canais). Tela limpa.
  - **Aviso de etiqueta** dentro do botão "Importar do WhatsApp" (vale em Contatos e Canais): os contatos importam 100%, mas a marcação etiqueta↔contato depende do aparelho — alguns celulares não deixam o WhatsApp exportar isso (restrição do próprio WhatsApp), então etiquetas podem vir parciais. Não é erro do sistema.
  - **Aviso iOS** na aba Canais: quem usa iPhone deve desligar as notificações do app WhatsApp Business e deixar só as do CRM, pra não receber a notificação de sincronização do WhatsApp (chata no iOS).
  - **Validação do import** (conexão Guilherme): 1270 contatos (1269 com número real, 0 @lid visível, 0 duplicados), histórico ligado (292 msgs/23 conversas), 7 etiquetas — confirmando que a marcação etiqueta↔contato veio parcial (4 contatos), exatamente a restrição do WhatsApp avisada agora.

- **22:06** — **Follow-up reformulado: só "Follow-up IA" (Sequências e Fila removidas) + muito mais controle.**
  - **Removidas as abas Sequências e Fila** — a página abre direto no Follow-up IA. O cron de sequências manuais foi desligado (no-op reversível); o follow-up automático da IA de atendimento (outro sistema) segue intacto.
  - **Busca com presets de período:** Hoje · 7 dias · 15 dias · Período (X→Y). Acaba com o teto invisível de 30 dias que limitava a ~28 conversas. **Quantidade** configurável até 500. **Status** Abertos/Pendentes/Ambos. **Filtros** por etiqueta e por conexão.
  - **Ritmo de IA:** campo "análises por minuto" controla o gasto/limite do Groq ao analisar em lote.
  - **Cada conversa:** botão **olho** (balão espiando o histórico real antes de mandar), **abrir no atendimento**, **contador de follow-ups já enviados** (a IA é avisada e não repete; mensagem sempre termina com pergunta).
  - **Regenerar com tom:** Direto · Emocional · Na dor · Contextualizado com histórico · Simpático.
  - **Etiquetar:** balão com busca + multi-seleção animada + botão "Marcar"; cria "Em follow-up" e "Follow-up feito" se não existirem. Ao **Enviar**, marca "Em follow-up" automaticamente.
  - **Descartar:** caixa "fechar ticket" → descarta e encerra; sem marcar → cooldown de 12h (some da busca pra não poluir a próxima leva). Migration: coluna `tickets.follow_up_ia_snooze_ate`.

- **20:30** — **Filtros de atendimentos: corrigidas incoerências e o "Mostrar todos".**
  - **Badge fantasma "1 filtro ativo" no load:** o status padrão era calculado de 3 formas diferentes (carga abria só `aberto`, mas `Limpar` e o contador de filtros assumiam `aberto + pendente`). Resultado: o inbox abria escondendo Pendentes e marcando "1 filtro" sem ninguém ter filtrado. Agora abre em `aberto + pendente` (intenção original, alinhado ao resto do código) e o badge começa em 0. Deep-links `?tab=aberto|pendente|fechado` continuam abrindo só aquele status.
  - **"Mostrar todos" agora mostra todos de verdade:** antes só marcava os 3 status mas mantinha conexão/fila/usuário/etiqueta/período ainda filtrando (e exibia ✓ mesmo com a lista recortada). Agora zera todos os recortes e o ✓ só acende quando nada está filtrando.
  - Conhecido (não alterado nesta leva): abas Privados/Grupos ainda não recortam a lista; counts/lista limitados aos 300 tickets mais recentes (impacta só agências grandes).

- **17:52** — **Correção dos 6 bugs CRÍTICOS da auditoria (vazamento entre agências + duplicação + race da IA).**
  - **IDOR cross-tenant (vazava conversa/resumo entre clientes):** `resumo-stream` e `resumo` agora validam dono do ticket + escopam `agencia_id`; raiz `lib/crm/ia.ts` blindada (escopa `agencia_id` em fetchMensagens + selects/updates de ticket).
  - **Token Meta entre agências:** `sincronizarPagesMeta` valida que a integração é da agência antes de descriptografar/usar o token.
  - **Etiquetas cross-tenant:** `contatos/[id]/etiquetas` valida dono do contato (e da etiqueta) antes de inserir/remover.
  - **Mensagem duplicada + IA re-disparada:** índice único `uq_mensagens_agencia_wamsg` + ingest idempotente (re-entrega do webhook vira no-op, não reprocessa).
  - **Race do buffer da IA (perdia msg / respondia 2x):** `finalizarBuffer` mantém só msgs que chegaram durante o processamento (não apaga a row inteira) + preserva a trava no append (cron não pega 2x).
  - Pendente: pull do schema (migrations) + os 🟠 altos. Detalhes em `docs/AUDITORIA-CRM.md`.

- **15:02** — **Importar do WhatsApp: 1 botão faz tudo (etiquetas + contatos nome/número + conversas + dedup).**
  - O botão "Importar do WhatsApp" (em /contatos) agora roda o fluxo completo num clique: etiquetas (se houver) → contatos com **nome e número real** (via `/contacts` + resolve `@lid` por `/chat/details`) → histórico de conversas → **dedup automático** (junta o registro @lid com histórico ao da agenda, sem duplicar).
  - Nova função SQL `dedup_contatos_agencia` (migration) chamada no fim do import. Resolver de número com teto de tempo (resto continua numa 2ª importação, idempotente — avisa na tela se sobrar).
  - Validado em Restauração: estado final 1268 contatos com número, **0 duplicados**, histórico ligado. UI mostra números resolvidos + duplicados juntados.

- **14:02** — **Healthcheck dos endpoints UAZAPI + relatório consultável.**
  - `scripts/uazapi-healthcheck.ts`: testa ao vivo os endpoints de LEITURA que o CRM usa (status HTTP, com retry pra evitar falso negativo) e documenta os mutáveis sem disparar. Grava `docs/UAZAPI-STATUS.md` (tabela legível) + `docs/uazapi-health.json` (snapshot pra comparar via git).
  - Rodada (instância Restauração): **9/9 leitura OK** — instance/status, webhook, labels, contacts, chat/find, group/list, chat/details, message/find, GetNameAndImageURL.
  - Etiquetas Guilherme: re-checado, **/labels = 0** (segue sem sincronizar pra UAZAPI — precisa reconectar o WhatsApp dele).

- **13:37** — **Resolve número real dos contatos `@lid` via `/chat/details`.**
  - `/chat/details` traz o campo `phone` com o número real mesmo pra chats `@lid` (que `/chat/find` e `/contacts` escondem). Nova `instanceChatDetails` + `resolverNumerosLid` (1 chamada por contato, bounded).
  - Integrado no import (resolve até 120 por vez, o resto na próxima) + backfill do Guilherme: **273/276 @lid resolvidos**.
  - Resultado Guilherme: **1414/1417 contatos com número real** (só 3 seguem mascarados pelo próprio WhatsApp).

- **13:23** — **Import de contatos puxa NÚMERO REAL via `/contacts` (resolve o `@lid`).**
  - Causa: `/chat/find` devolve `@lid` (privacidade do WhatsApp, sem telefone). O endpoint `/contacts?contactScope=all` devolve o `jid` real (`@s.whatsapp.net`).
  - `instanceListContacts` novo + passo no `importarContatosUazapi`: importa todos os contatos com número real. `@lid` (sem telefone) deixa de gravar número falso — campo fica vazio (decisão: manter contato, sem número).
  - Backfill Guilherme: **12 → 1141 contatos com número real** (+ 276 @lid sem número falso). Vale pra qualquer import futuro (dele ou de outro).
  - Obs: 179 contatos no WhatsApp seguem `@lid` mesmo no /contacts (mascarados pelo WhatsApp) — esses o número não existe pra ninguém.

- **13:15** — **Fix: permissões de menu (quadrados em branco) + escopo por role.**
  - Causa: `/usuarios` renderizava a lista legada `PERMISSOES_MENU` (22 chaves antigas tipo kanban/protocolos) e só 6 tinham rótulo → resto aparecia como quadrado vazio.
  - Nova fonte única `MENU_PERMISSOES` em `lib/crm/permissions.ts` com os menus REAIS do CRM (todos rotulados). `menusVisiveis(role)`: admin vê 12 quadros; super_admin vê 15 (Relatórios Ads, Cobranças, Webhooks só pra super). `parsePermissoes` passou a iterar a mesma lista. (Tela de Acessos do super já estava correta.)

- **12:33** — **Fix: import de histórico de conversas ignorava chats `@lid` (novo id do WhatsApp).**
  - Causa: o filtro de histórico só aceitava `@s.whatsapp.net`; hoje o WhatsApp entrega a maioria dos chats como `@lid`. No canal do Guilherme, 286 chats individuais → só 10 batiam → histórico não importava (contatos importavam porque não têm esse filtro).
  - Fix em `lib/crm/import-mensagens.ts`: filtro aceita `@s.whatsapp.net` E `@lid` (grupos saem por `wa_isGroup`). Validado: 10 → 286 chats elegíveis.
  - Backfill rodado pro canal do Guilherme: 197 mensagens / 16 tickets importados.
  - Etiquetas: o import já funciona (lê `/labels`, cria e aplica). A conta do Guilherme retornou 0 labels — só vêm se o WhatsApp Business tiver etiquetas configuradas; não é bug.

- **07:04** — **Fix: botão de recolher (ao lado do SONAR) não desce mais.**
  - O ajuste anterior do radar subiu a altura do header (52→64px); como o botão é centralizado na vertical, a caixa mais alta empurrava ele pra baixo.
  - Header compacto de volta (54px) + máscara do radar ajustada (some sem corte). Botão volta a alinhar ao lado do wordmark.

- **06:56** — **Foto de perfil do usuário (avatar) — trocar/remover em Conta → Meu Perfil.**
  - Qualquer usuário logado (inclusive admin) troca a própria foto. Sobe em `/conta`, comprime no navegador (recorta quadrado central, 400px, JPEG 0.85) e salva em bucket público `avatares`.
  - Aparece no topo (avatar do menu do usuário) e na página Conta. Sem foto = iniciais como antes.
  - `usuarios.avatar_url` (já existia) populado; foto antiga é apagada do storage ao trocar. Actions `salvarAvatar`/`removerAvatar` em `conta/_actions.ts`; `Topbar` e `lib/auth` passam a ler `avatar_url`.

- **06:48** — **Logo SONAR na sidebar: radar não fica mais cortado num retângulo.**
  - Causa: `.logo-text` tinha `height:52px; overflow:hidden` → cortava o radar de fundo (520px) numa caixa retangular visível ao redor.
  - Fix: máscara radial elíptica no `.logo-text` (fade suave nas bordas, núcleo opaco preserva o wordmark) + radar de fundo reduzido (520→220) e altura 52→64. Agora o radar esvanece em vez de cortar.

- **06:24** — **Editor de IA reorganizado em abas (Dados / Comportamento / Ferramentas / Follow-up / Análise de Comportamento).**
  - **"Identidade" → "Dados":** só nome do perfil, descrição, **Chave API** (alterar + testar) e checkbox de Status. O **"🧪 Modo teste — Whitelist"** foi movido pra cá.
  - **"Modelo IA"** movido pra aba **Comportamento** (junto do prompt e ajustes de resposta).
  - **"Envio de resumo"** movido pra aba **Ferramentas** (antes ficava em Follow-up).
  - **"Teste" → "Análise de Comportamento":** Uso de tokens (geral) + **novo "Gasto por conversa"** (tokens in/out e custo estimado por ticket/conversa, ordenado por gasto, com total do período) + Histórico (últimas 50). Novo `carregarUsoPorTicket` em `uso-tokens.ts`.
  - Novo perfil (ainda não salvo) mostra só Dados + Comportamento; abas de análise/ferramentas/follow-up aparecem após salvar.

- **06:13** — **Galeria: estrutura de envio (texto → imagens limpas → CTA) + fix do "nao_encontrada" no chat.**
  - **Bug do display:** imagens da galeria apareciam como balões "nao_encontrada" no CRM. Causa: a msg salvava o path do bucket `ia-galeria`, mas `/api/media` (que o chat usa) só assina `crm-media` → 404. Imagens chegavam no WhatsApp normalmente; só quebravam na exibição interna. Fix: cada imagem enviada é copiada pro `crm-media` (path por ticket) e a msg aponta pra lá → chat exibe como qualquer mídia. Validado por teste seco (`test-galeria-display.ts`).
  - **Estrutura de mensagens:** a ferramenta agora manda **1) texto de abertura → 2) cada imagem como mensagem separada e SEM legenda (na ordem) → 3) texto de fechamento (CTA)**. Novos parâmetros `texto_antes`/`texto_depois` (a IA preenche por contexto; fallback configurável em `texto_antes_padrao`/`texto_depois_padrao`). Executor não duplica o texto da IA quando a ferramenta já mandou a moldura (`suprimirTextoIA`).
  - **Default = galeria inteira na ordem:** `escolherImagens` sem filtro agora envia TODAS as imagens (antes mandava só a 1ª). IA ainda pode limitar via `indices`/`tags`/`quantidade`.
  - Defaults de texto setados nas 7 ferramentas-galeria (estoque_restauracao + 6 ensaio_*).

- **05:56** — **Galeria: número de posição editável por imagem (ordem de envio clara).**
  - Cada imagem mostra o nº da posição (1º, 2º…) no canto + campo de número editável: digita o número e tecla Enter → vai pra aquela posição. Estrela removida (redundante: posição 1 = capa).
  - Confirmado: a IA envia EXATAMENTE nesta ordem (`carregarGaleria` ordena por `ordem`; seleção preserva). Ordem do estoque_restauracao normalizada (1→4).

- **05:38** — **Fix upload de imagem da galeria (413 ao subir fotos grandes/várias).**
  - Causa: upload via Server Action tinha limite de 1MB (padrão Next) → fotos >1MB davam 413/400.
  - `next.config.ts`: `experimental.serverActions.bodySizeLimit = "12mb"`.
  - `_galeria-uploader.tsx`: **compressão no navegador** antes de subir (redimensiona p/ máx 1600px, JPEG 0.85) — fotos grandes (restauração) passam a caber. Erro claro se ainda ficar >4MB (teto da Vercel).

- **05:27** — **Galeria de imagens: drag-drop com feedback + múltiplas + regra de 1ª imagem (capa).**
  - Dropzone agora destaca (borda/fundo verde + "Solte aqui") ao arrastar — antes o drag funcionava mas sem feedback, parecia que não. Texto deixa claro "uma ou VÁRIAS".
  - Múltiplas imagens já funcionavam (input multiple + loop); reforçado o hint "pode soltar várias".
  - Regra de sequência: badge **"1ª · CAPA"** na primeira imagem + botão ⭐ "tornar primeira" (1 clique manda pro topo). A IA já envia na ordem definida (`carregarGaleria` ordena por `ordem`; 1ª = capa/principal).

- **05:20** — **Regra de ferramentas imperativa GLOBAL (todos os agentes/templates disparam tools).**
  - `executor.ts`: bloco `[FERRAMENTAS / AÇÕES — OBRIGATÓRIO]` reforçado — "assim que a situação se encaixar, CHAME a função NA MESMA resposta, antes de conversar; é ação interna". Vale pra TODOS os agentes em runtime (incluindo os 5 templates e novos perfis), sem editar prompt de cada um.
  - Validado direto na OpenAI (gpt-4.1) com prompt LIMPO (sem regra manual): "quero ensaio aniversário" → `marcar_lead_ensaio`; "quero restaurar" → `marcar_lead_restauracao`. Antes não disparava (modelo tratava etiqueta como tag de fundo).

- **05:08** — **Importação do histórico recente de conversas do WhatsApp (migração).**
  - Novo `lib/uazapi/client.ts#instanceFindMessages` (POST /message/find) + `lib/crm/import-mensagens.ts`: ao importar contatos/etiquetas, também puxa as últimas ~20 mensagens dos ~60 chats mais recentes e grava no CRM. **Não passa pelo webhook → NÃO aciona a IA.**
  - Idempotente (dedup por wa_message_id — testado: 2ª rodada = 0 novas). 1 ticket por contato (reaproveita o existente; conversa recente com cliente esperando vira "pendente", resto "fechado"). Re-aponta ticket pro canal atual.
  - Rota `/api/contatos/importar-uazapi` aceita `incluirMensagens` (default ligado) e retorna o resumo do histórico. UI mostra "Mensagens do histórico". Testado ao vivo: 45 msgs / 3 chats, 0 erros.

- **04:47** — **Catálogo central de modelos de IA + seletor amigável + fallback automático.**
  - `lib/ia-atendimento/modelos-catalogo.ts`: fonte única dos modelos (OpenAI/Anthropic/Groq) com nome amigável, categoria, custo, velocidade, contexto, o que suporta, melhor-para, evitar e fallback. Inclui família GPT-5.x (gpt-5.4-mini/nano, gpt-5.4, gpt-5.5, gpt-5.5-pro) marcada como experimental (disponibilidade incerta).
  - `_modelo-picker.tsx`: seletor por categoria (Recomendados/Econômicos/Contexto longo/Avançados) com cartão explicando custo/velocidade/contexto/ferramentas/melhor-para/evitar/fallback + aviso em modelos caros/experimentais. Substitui os 2 selects crus na aba Identidade.
  - **Fallback automático no executor:** se o modelo escolhido falhar (ex: GPT-5.x não liberado na conta), tenta o fallback do catálogo (modelo real). A IA nunca quebra por escolha de modelo. Novo evento de log `fallback_modelo`.
  - Padrão de modelo por provider (gpt-4.1 / claude-sonnet-4-6 / llama-3.3-70b) — todos REAIS.
  - Escopo: aplicado o núcleo simples (catálogo + seletor + fallback). Partes enterprise da spec (roteador automático multi-campo, multiagentes, Responses API, observability dashboard, idempotência) deliberadamente fora — "não tão técnico".

- **04:39** — **Conexão do canal: status real, aviso no chat e continuidade ao trocar/recriar canal.**
  - **Auto-cura de status:** webhook marca o canal `connected` ao receber mensagem; envio que falha marca `disconnected`. Acaba o status defasado (mostrava desconectado mas recebia / mostrava conectado mas não enviava).
  - **Aviso no chat:** banner vermelho "Canal desconectado — não é possível enviar" no topo do atendimento quando o canal cai; envio falho não some mais num alerta, fica visível.
  - **Continuidade ao recriar canal:** `ingest` re-aponta o ticket aberto pro canal atual quando chega mensagem (antes o ticket ficava preso ao canal deletado). Histórico continua no mesmo ticket, dá pra responder pelo canal novo. Re-apontados 105 tickets abertos pro canal novo (one-off).
  - Diagnóstico UAZAPI: servidor estava no limite de instâncias (172 criadas, 0 conectadas) → instância hibernava. Script `scripts/test-uazapi.ts` pra checar status/webhook/envio ao vivo.

- **03:59** — **Auditoria das ferramentas de chamada + remoção de "Etiquetas configuradas".**
  - **Bug achado:** `transferir_para_fila`, `agendar_followup` e `enviar_template` estavam no dropdown mas SEM handler no `executarTool` (caíam no default "ação desconhecida"). 3 de 9 ações não funcionavam.
  - Implementado `transferir_para_fila` (FK-safe: valida fila antes de setar, pausa IA). `agendar_followup` e `enviar_template` removidos do dropdown (não implementados — evita criar tool quebrada).
  - `transferir_para_humano` agora valida `fila_destino_id` antes de aplicar (fila deletada quebrava FK e travava a resposta).
  - `aplicar_etiqueta` reescrito: trata `etiqueta_id` PRIMEIRO, independente da whitelist do perfil (só exige etiqueta real da agência). Assim as ferramentas `marcar_lead_*` funcionam mesmo sem etiquetas configuradas.
  - Removida a seção "Etiquetas configuradas" da aba Comportamento — etiquetas agora só via ferramentas de chamada.

- **03:47** — **IA: cliente nunca fica sem resposta + etiqueta configurada na ferramenta é aceita.**
  - `aplicar_etiqueta`: se o admin configurou um `etiqueta_id` na própria ferramenta (ex: marcar_lead_restauracao) e ele não está na lista de etiquetas do perfil, agora aceita desde que seja uma etiqueta real da agência (antes rejeitava com "nao esta na lista permitida" e o cliente ficava sem resposta).
  - Rede de segurança no executor: se a IA só chamou ferramenta (ou a tool falhou) e não mandou texto, e não é transferência, faz um 2º call SEM ferramentas pra gerar resposta natural; último recurso = mensagem genérica. Cliente sempre recebe algo.
  - `providers.ts`: omite o campo `tools` quando vazio (OpenAI/Groq dão 400 com `tools:[]`) — necessário pro 2º call.

- **03:34** — **Log de chamadas de ferramenta no histórico do chat + reforço pra IA chamar tools.**
  - Toda vez que a IA executa uma ferramenta, insere uma nota `autor=sistema` no ticket ("IA usou a ferramenta X — resultado"). `_chat.tsx` renderiza autor `sistema` como pílula central (antes ia como bolha à direita).
  - `executor.ts`: injeta bloco `[FERRAMENTAS / ACOES DISPONIVEIS]` no system prompt (gerado da lista de tools) — reforça pra modelos fracos (gpt-4o-mini) de fato CHAMAREM a função, não só responderem texto. Diagnóstico: todos os `resposta` vinham com `tool_calls:0`.
  - Nota: galerias vazias continuam sendo puladas (IA não enxerga até subir fotos).

- **03:06** — **Página de IA reorganizada em abas (menos técnica, mais respirável).**
  - Novo `_perfil-tabs.tsx`: editor do perfil dividido em **Identidade · Comportamento · Ferramentas · Follow-up · Teste**. Wrapper client com painéis em `display:none` (form único intacto — submete todos os campos mesmo de abas escondidas).
  - Identidade: nome, status, descrição, modelo + chave. Comportamento: prompt, tempo, formato, onde atua, avançado, etiquetas. Ferramentas: galerias + tools. Follow-up: sequências + envio de resumo. Teste: whitelist + uso de tokens + logs.
  - Nenhuma funcionalidade alterada — só agrupamento/layout. Barra de salvar visível nas abas do formulário.

- **02:55** — **Bug raiz das ferramentas galeria/consultar_data + 7 galerias por situação criadas.**
  - Causa: check constraint `ia_atendimento_ferramentas_acao_check` não incluía `enviar_imagem_galeria` nem `consultar_data` — criar essas no dropdown falhava no insert, mas `criarFerramentaIA` engolia o erro e redirecionava como "criada" → ferramenta sumia. Constraint atualizada com as 9 ações; `criarFerramentaIA` agora mostra o erro real do banco.
  - Criadas 7 ferramentas-galeria no perfil Ana: ensaio_geral, ensaio_aniversario, ensaio_revista, ensaio_formatura, ensaio_gestante, ensaio_profissional, estoque_restauracao (vazias, com descrição pra IA). A IA já filtra fotos por descrição/tags via catálogo (`formatCatalogoParaIA`).

## 2026-06-17

- **22:45** — **Fix: ativar IA quebrava com FK `tickets_fila_id_fkey`.**
  - Causa: toggle de IA, executor e retornar-à-fila setavam `fila_id = perfil.filas_ativas[0]`, mas essa fila (fixa, aposentada) não existe mais → violação de FK ao ativar IA.
  - Como o ícone de robô agora é dirigido por `ia_perfil_id && !ia_pausada` (não por fila), os 3 caminhos pararam de mexer em `fila_id`. Só marcam `ia_perfil_id` + `ia_pausada`. Ativar IA num contato volta a funcionar.
  - `transferir_para_humano` não afetado (usa fila `tipo=humano` real do DB).

- **22:38** — **Apresentação + tutorial: narrativa de transformação (vender o resultado, não a configuração).**
  - Tutorial (`/apresentacao/tutorial`): títulos vendedores ("Conecte seu WhatsApp em menos de 1 minuto", "Crie sua primeira atendente de IA"...), subtítulo de valor, e novo bloco **Resultado/Benefício** por passo (🟢✅✨🛡️🚀🎯). Kicker mostra a trilha da jornada (Conecte → Traga base → Crie IA → Teste → 1ª conversa → Ative → Escale). Passo 7 vira "Recursos" (operação de vendas).
  - Deck (`/apresentacao`): copy reescrita pra foco em transformação — capa "Seu vendedor de IA no WhatsApp"; problema "Cada lead sem resposta é dinheiro indo embora"; slides de IA/follow-up/leads/dashboard com bullets de benefício em vez de feature técnica. Mockups e screenshots mantidos.

- **22:32** — **Manoel isolado da Waléria + fix criação de agência (slug).**
  - Acesso do Manoel movido pra agência própria vazia (antes dividia "Cliente Teste" com a Waléria, vendo conversas/fechamentos/IA dela). Dados da Waléria intactos; Manoel zerado.
  - Fix crítico: `criarAcesso` inseria `agencias { nome, ativa: true }`, mas a tabela não tem `ativa` e exige `slug` (NOT NULL) — criação de acesso estava quebrada. Agora gera `slug` único (nome normalizado + sufixo) e insere `{ nome, slug }`.

- **22:27** — **Acesso: agência compartilhada → "Tipo de cliente" + isolamento garantido.**
  - Removido o seletor de agência ao criar/editar acesso (atribuir agência existente vazava dashboard + conversas entre clientes). Componente `_agencia-picker.tsx` deletado.
  - Cada novo acesso **sempre cria uma agência própria e isolada** automaticamente (RLS por `agencia_id` continua sendo o limite; a agência fica interna, some da tela).
  - Migration: coluna `usuarios.tipo_cliente text`. Novo campo "Tipo de cliente" (input + datalist: escolhe um existente OU digita um novo) marca o acesso. Tabela de acessos mostra a coluna "Tipo de cliente" (badge) no lugar de "Agência".
  - `atualizarAcesso` não troca mais de agência (evita re-vazamento); só edita o rótulo.
  - **Bulk IA off:** desligada a IA em todas as 137 conversas ativas (`ia_pausada=true`); ícone de robô some. Contatos novos chegam sem IA/ícone, salvo quando um perfil ativo assume.

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
