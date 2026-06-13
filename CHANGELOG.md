# Registro de Atualizações — Sistema Tráfego

Log de mudanças com data e horário (horário de Brasília). Mais recente no topo.
A fonte oficial e automática é o histórico do Git; este arquivo é o resumo legível.

---

## 2026-06-13

- **17:29** — Atendimentos: abas Abertos/Pendentes/Fechados voltaram FIXAS, mas agora funcionam como **toggle** do filtro (clica = inclui/remove aquele status; desmarcado some da lista). `commit pendente`
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
