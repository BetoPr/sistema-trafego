# Registro de Atualizações — Sistema Tráfego

Log de mudanças com data e horário (horário de Brasília). Mais recente no topo.
A fonte oficial e automática é o histórico do Git; este arquivo é o resumo legível.

---

## 2026-06-14

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
