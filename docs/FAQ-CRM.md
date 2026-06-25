# FAQ Sonar CRM — Tutorial Completo

> Tutorial passo-a-passo de TODAS as áreas do CRM. Cada entrada tem **P** (pergunta como usuário pensaria) e **R** (resposta com cliques exatos + observações importantes).
>
> Este FAQ alimenta:
> 1. **Suporte CRM** no Assistente IA (botão flutuante 🤖) — busca semântica nas perguntas
> 2. **Robô guia** que aponta botões via tour multi-step
>
> Convenções:
> - `[Botão]` = clique exato
> - `→` = próximo passo
> - `📍` = link interno clicável (rota do CRM)
> - `⚠️` = pegadinha comum / atenção
> - `💡` = dica útil
> - `🔗` = link externo (só quando inevitável, ex: criar chave OpenAI)

---

## Índice

1. [Atendimentos](#1-atendimentos) — chat, filas, tabs, IA pausa, cobrança
2. [IA Atendimento](#2-ia-atendimento) — *próxima sprint*
3. [Canais (WhatsApp)](#3-canais) — *próxima sprint*
4. [Contatos / Envio Massa / Mensagens Rápidas / Grupos](#4-contatos) — *próxima sprint*
5. [Pixel & Vendas / Relatórios / Alertas / Filas / Equipes / Usuários](#5-pixel-relatorios) — *próxima sprint*
6. [Configurações (Etiquetas, API IA, Prompts IA, Asaas, MCP)](#6-configuracoes) — *próxima sprint*
7. [Marca / Meu Perfil / Plano / Dashboard](#7-marca-perfil-plano-dashboard) — *próxima sprint*

---

<a id="1-atendimentos"></a>
## 1. Atendimentos

### 1.1 Geral

#### P: Onde vejo todas as conversas do WhatsApp?
**R:** Clique em **Atendimentos** no menu lateral. 📍 `/atendimentos`
Você verá 3 abas: **Abertos**, **Pendentes**, **Fechados**.
- **Abertos**: você ou alguém da equipe está atendendo
- **Pendentes**: cliente mandou mensagem e ninguém pegou ainda
- **Fechados**: conversas finalizadas (arquivadas)

💡 Por padrão, o CRM já mostra **Abertos + Pendentes** juntos (inbox ativo).

---

#### P: Como funcionam as 3 abas Abertos / Pendentes / Fechados?
**R:**
- **Pendentes** 🟡: mensagem chegou, **ninguém atendeu**. Aqui você decide se a IA responde sozinha (se configurada) ou se entra um humano. Tem botão **[Atender]** (verde) que aparece passando o mouse na foto do contato — clica e o ticket vai pra **Abertos** com você como responsável.
- **Abertos** 🟢: você (ou equipe) está atendendo. Conversa ativa.
- **Fechados** 🔴: ticket encerrado. Histórico arquivado, read-only.

⚠️ Quando você envia uma mensagem em **Pendentes**, o ticket vai automaticamente pra **Abertos** com você como atendente.

---

#### P: Por que tem um ícone de robô verde 🤖 do lado de algumas conversas?
**R:** Indica que a **IA está respondendo** o cliente automaticamente.
O ícone aparece **só quando**:
1. Tem perfil de IA configurado pra esse canal, **E**
2. A IA não está pausada nesse ticket

⚠️ Quando você **manda qualquer mensagem**, o robô some imediatamente — a IA pausa sozinha pra não atrapalhar o atendimento humano. Pra reativar: abre o ticket → painel direito → aba **Atend.** → liga o toggle **IA Atendendo**.

---

#### P: O que é o número que aparece no card do ticket (ex: #142)?
**R:** É o **número do ticket** (ID único da conversa). Use pra referenciar uma conversa em logs, suporte ou relatórios.

---

#### P: O que significa a cor da hora (verde / amarelo / vermelho)?
**R:** Tempo desde a última mensagem do cliente:
- 🟢 **Verde** = agora / minutos
- 🟡 **Amarelo** = horas
- 🔴 **Vermelho** = dias ou semanas (cliente abandonado)

💡 Vermelho = urgência. Ataque esses primeiro.

---

#### P: Tem um balãozinho com número (ex: 3) ao lado do nome. Que é?
**R:** Mensagens **não lidas**. Some quando você abre o ticket.

---

### 1.2 Botões do topo da lista

#### P: Como ativo/desativo o som de notificação?
**R:** Topo da lista de Atendimentos → ícone **🔔 (Som de notificação)**. Clique pra alternar. Fica salvo no navegador (persiste entre logins).

---

#### P: Como inicio uma conversa do zero (sem o cliente ter mandado mensagem)?
**R:** Topo da lista → **[Nova conversa]** (ícone de mensagem com +).
Balão abre pedindo:
1. **Telefone** (com DDD, mínimo 10 dígitos — só números, pode colar com `()`/`-`/espaços que a gente limpa)
2. **Canal** (dropdown — só aparecem canais **conectados**)
3. Nome do contato (opcional)

Clique **[Iniciar]** → cria ticket novo em **Abertos** e abre o chat.

⚠️ Se o canal estiver desconectado, ele não aparece no dropdown — vai em **Canais** primeiro reconectar.

---

#### P: Onde vejo as vendas / fechamentos que fechei?
**R:** Topo da lista → **[Log de fechamentos]** (ícone de gráfico/log).
Modal abre com tabela:
- Contato (foto + nome)
- Nº ticket
- Serviço + quantidade
- Valor (R$)
- Data + hora
- Quem fechou

Tem **total acumulado** no topo. Cada linha tem 🗑️ pra deletar fechamento (atualiza Dashboard automático).

⚠️ Deletar fechamento também cancela evento CAPI no Meta (atribui o lucro pra trás corretamente).

---

#### P: Como filtro por canal, fila, etiqueta, período?
**R:** Topo da lista → **[Filtros]** (ícone funil). Badge mostra quantos filtros tem ativos.
Modal abre com seções:
- **Status**: Abertos / Pendentes / Fechados (multiselect)
- **Período**: data inicial + final
- **Conexões** (canais)
- **Filas**
- **Usuário** (atendente)
- **Etiqueta**

Toggles auxiliares no topo:
- **Mostrar todos** — abre as 3 abas + zera todos filtros
- **Incluir fechados** — adiciona aba Fechados ao filtro atual
- **Somente não lidos** — só tickets com mensagens não lidas
- **Inverter ordem** — mais antigo primeiro (padrão é mais recente primeiro)

Tem **[Limpar]** que volta tudo ao padrão.

---

#### P: Como busco uma palavra dentro das mensagens (não só nome do contato)?
**R:** Topo da lista → **[Buscar mensagem]** (lupa com texto).
Modal abre. Digita a palavra → **[Buscar]**.
Resultado mostra: ticket nº, contato, trecho da mensagem com a palavra destacada, hora.
Clica no resultado → abre o ticket direto naquela mensagem.

---

#### P: Pra que serve a busca normal (campo "Buscar nome, número, ticket…")?
**R:** Filtra a **lista em tempo real** (não busca mensagens). Procura por:
- Nome do contato
- Número de WhatsApp
- Nº do ticket (#142)

⚠️ É local — só filtra o que já carregou. Pra buscar dentro de mensagens use **[Buscar mensagem]** (acima).

---

#### P: O que é o indicador de conexão (📶 com número)?
**R:** Mostra status das suas conexões de WhatsApp.
- 🟢 = conectado
- 🟡 = conectando
- 🔴 = desconectado

Clique pra alternar entre status. Passa o mouse pra ver lista de canais por status.

💡 Se ficar 🔴 e nada chegar, vai em **Canais** e reconecta (QR code).

---

#### P: Como atualizo a lista sem recarregar a página?
**R:** Topo da lista → **[Refresh]** (seta circular). Puxa tickets + mensagens novas sem F5.
💡 Não precisa clicar geralmente — o CRM já atualiza em **tempo real** (Supabase realtime + fallback de polling 15s).

---

### 1.3 Pendentes — espiar antes de atender

#### P: Posso ver mensagens de um cliente sem assumir o ticket?
**R:** Sim. Aba **Pendentes** → no card do contato, ícone de **👁️ olho verde** ao lado da hora. Clique.
Abre um **balão "Espiando"** (read-only) com todas as mensagens daquele ticket. Tem botão **[Atender]** no rodapé caso decida pegar.

💡 Útil pra fila com vários atendentes — você vê o conteúdo antes de assumir, evita pegar ticket fora do seu nicho.

---

#### P: Como assumo um ticket Pendente?
**R:** Duas formas:
1. Passa o mouse na **foto do contato** → aparece botão verde **[Atender]** por cima → clica direto da lista
2. Clica no ticket → abre painel limitado → cabeçalho tem **[Atender]**

Em ambos casos o ticket vai pra **Abertos** com você como atendente. Redireciona pro chat.

---

### 1.4 Chat (mensagens)

#### P: Como respondo o cliente?
**R:** Abre o ticket (clica no card) → campo de digitação no rodapé → digita → **Enter** (ou ícone de avião 🚀).

⚠️ Quando você manda a primeira mensagem, a **IA pausa automaticamente** nesse ticket.

---

#### P: Como mando emoji?
**R:** Campo de digitação → ícone **😀**. Picker abre com 45+ emojis comuns (😀❤️✅💰…). Clica → insere no cursor → fecha picker.

---

#### P: Como anexo foto / vídeo / documento / PDF?
**R:** Campo de digitação → ícone **📎 (clipe)**. Menu abre com:
- 🖼️ **Imagem** (JPG/PNG/WebP)
- 🎬 **Vídeo** (MP4/MOV)
- 📄 **Documento** (PDF/Word/Excel/qualquer)

Escolhe → seletor de arquivos abre. Pode mandar vários de uma vez (aparece thumbnail abaixo do input). Texto opcional na mesma mensagem.

---

#### P: Como mando áudio?
**R:** Campo de digitação → ícone **🎤 (microfone)**. Grava → contador de segundos aparece. Botão muda pra **[Parar e enviar]** ou **[Cancelar]**.

---

#### P: O que é o botão de IA que aparece em cima do campo de digitação?
**R:** **IA Assist** — gera resposta sugerida no estilo que você escolher:
- **Profissional** — formal, sério
- **Simpático** — amigável, próximo
- **Marketing** — persuasivo, com call-to-action
- **Ortografia** — só corrige erros do que você já escreveu

Clique no estilo → IA gera → você aceita (entra no campo) ou descarta.

💡 Custa tokens. Veja consumo em [Configurações > API IA](#6-configuracoes).

---

#### P: Como respondo / cito uma mensagem específica?
**R:** Passa o mouse (ou **segura o dedo** no mobile, ~0.5s) sobre a mensagem → menu aparece com:
- **Responder** — entra modo cita-resposta
- **Copiar** — copia texto pra clipboard
- **Reagir** — abre barra de 6 emojis quick (👍❤️😂😯😢🙏)
- **Apagar** — submenu: "Só pra mim" (esconde local) ou "Pra todos" (notifica cliente)

---

#### P: Como reajo com emoji em uma mensagem?
**R:** Mesma ação (hover / long-press) → **Reagir** → escolhe emoji da barra. Cliente recebe a reação no WhatsApp dele.

---

#### P: Como apago uma mensagem que mandei errado?
**R:** Long-press / hover → **Apagar**:
- **Pra mim** — só some do CRM, cliente continua vendo
- **Pra todos** — deleta no WhatsApp do cliente também (igual deletar no WhatsApp normal)

⚠️ "Pra todos" só funciona se foi enviada há pouco tempo (regra do WhatsApp).

---

#### P: Como volto pra última mensagem quando rolei pra cima?
**R:** Botão flutuante **⬇️ (seta pra baixo)** aparece no canto do chat quando você rola pra cima. Clica → vai pro final.

---

### 1.5 Cabeçalho do chat (encerrar, transferir, retornar)

#### P: Como encerro o atendimento?
**R:** Cabeçalho do chat → ícone de menu **⋯** ou botão **[Encerrar]** → confirmação.
Ticket vai pra **Fechados**. Redireciona pra `/atendimentos`.

💡 Antes de encerrar: registre o **fechamento** (valor + serviço) no painel direito → aba **Perfil** → seção **Fechamento** → **[Salvar fechamento]**.

---

#### P: Quero passar esse ticket pra outra fila / outro atendente. Como?
**R:** Cabeçalho do chat → **[Transferir]**. Submenu:
- **Pra fila** — escolhe fila destino
- **Pra usuário** — escolhe atendente
- **Pra canal** — manda pra outro WhatsApp (só funciona se canal destino estiver conectado; envia mensagem ao cliente: "Transferindo pra X")

Tem campo opcional de **mensagem de transferência** (vira mensagem "sistema" no chat).

⚠️ Só funciona em **Abertos**. Em Pendentes não tem atendente humano ainda — não há o que transferir.

---

#### P: Devolvi por engano. Como volto o ticket pra Pendentes?
**R:** Cabeçalho → menu **⋯** → **[Retornar à fila]** → confirmação. Ticket volta pra Pendentes (sem atendente atribuído). Outros do time podem pegar.

---

### 1.6 Painel direito (Perfil / Atend. / Mídias / Util.)

#### P: Pra que serve o painel da direita?
**R:** Detalhes do contato e do ticket. 4 abas:
- **Perfil** — dados do contato + etiquetas + notas + fechamento + cobrança Asaas
- **Atend.** — controles IA (toggle, sentimento, log do ticket)
- **Mídias** — todas as fotos/vídeos/áudios/docs/links que esse contato já trocou (de qualquer ticket)
- **Util.** — ferramentas: follow-up agendado, exportar conversa (PDF), sanitizar contato (LGPD)

💡 No mobile esse painel vira **bottom sheet** (sobe de baixo).

---

#### P: Como edito o nome / telefone do contato?
**R:** Painel direito → aba **Perfil** → botão **[Editar]** no card do contato.
Balão abre com:
- Nome
- Telefone
- DDD / Estado

Salva → atualiza o contato pra **todos os tickets** dele.

---

#### P: Como adiciono / removo etiqueta no contato?
**R:** Painel direito → aba **Perfil** → seção **Etiquetas** → **[+ Adicionar etiqueta]**.
Picker abre. Escolhe etiqueta existente ou cria nova.
Pra **remover**: clica no ❌ ao lado da etiqueta no card.

💡 Etiquetas servem pra filtrar tickets, agrupar contatos, segmentar envio em massa.

---

#### P: Onde anoto observações privadas sobre o contato?
**R:** Painel direito → aba **Perfil** → seção **Notas** → escreve no textarea → **[Salvar nota]**.
Cliente **NÃO vê** essas notas. É histórico interno.
Botão **[Log de notas]** mostra tudo que foi anotado por quem e quando.

---

#### P: Onde registro a venda fechada (valor + serviço)?
**R:** Painel direito → aba **Perfil** → seção **Fechamento**:
- **Valor (R$)** — quanto fechou
- **Serviço** — dropdown (ex: tráfego pago, social media...)
- **Quantidade** — geralmente 1

**[Salvar fechamento]** → fica no **Log de fechamentos** + dispara evento CAPI no Meta (atribui venda à campanha que trouxe esse lead).

⚠️ Pode salvar **mais de um** fechamento no mesmo ticket (cliente comprou 2 serviços).

---

#### P: Como cobro o cliente direto pelo chat (PIX ou cartão)?
**R:** Painel direito → aba **Perfil** → seção **Cobrança** → **[💰 Cobrança]** (no topo do chat também tem botão verde "$ Cobrança").
Balão abre:
- **Tipo**: PIX ou Cartão
- **Valor** (R$)
- **Descrição**
- **Parcelas** (só pra cartão)

**[Gerar]** → retorna:
- **PIX**: QR code + código copia-cola
- **Cartão**: link clicável

Botão **[Enviar pro cliente no chat]** manda mensagem com tudo.

⚠️ Precisa ter Asaas conectado em **Configurações > Integrações > Asaas**. Veja [Sprint 6](#6-configuracoes).

---

#### P: Como pauso / ativo a IA nesse ticket específico?
**R:** Painel direito → aba **Atend.** → toggle **IA Atendendo** (🤖 verde = ativa / 🤖 cinza = pausada).
- **Ativa**: IA responde sozinha as próximas mensagens do cliente
- **Pausada**: IA fica em silêncio, você atende manual

⚠️ Quando você manda mensagem, pausa automaticamente. Reativar é **manual**.

---

#### P: O que é Análise de Sentimento?
**R:** Painel direito → aba **Atend.** → botão **[✨ Analisar sentimento]**.
IA lê a conversa toda e classifica o humor do cliente:
- 😊 **Muito bom** — feliz, satisfeito
- 🙂 **Bom** — neutro positivo
- 😐 **Neutro**
- 😠 **Ruim** — irritado, frustrado

Mostra % de confiança + trecho que justifica.

⚠️ Roda **uma vez por ticket** (resultado fica travado 🔒). Pra reanalisar precisa rodar comando admin.
💡 Usa IA → consome tokens. Custom em **Configurações > Prompts IA > Análise de Sentimento**.

---

#### P: Onde vejo as fotos / vídeos / áudios / documentos que esse contato já mandou?
**R:** Painel direito → aba **Mídias**. Sub-abas:
- 📷 **Fotos**
- 🎬 **Vídeos**
- 🎙️ **Áudios**
- 📄 **Docs**
- 🔗 **Links** (URLs detectadas em mensagens)

Mostra de **TODOS os tickets** desse contato (mesmo fechados). Clica → zoom / preview / download. Tem link **[Abrir conversa]** pra pular pro ticket onde apareceu.

---

#### P: Como agendo um follow-up automático pra esse cliente?
**R:** Painel direito → aba **Util.** → **[Criar follow-up nesta conversa]**.
Balão abre permitindo até **3 mensagens** com data + hora cada.
Ex: "Lembra de mim?" amanhã 10h → "Tudo certo aí?" daqui 3 dias → "Última chance" daqui 1 semana.

💡 Quando o cliente responder, follow-up cancela sozinho (não fica chato).
💡 Pra follow-up de **toda IA** (não só esse ticket), configure em [IA Atendimento → Follow-up](#2-ia-atendimento).

---

#### P: Como exporto / baixo essa conversa (pra usar em processo, contrato)?
**R:** Painel direito → aba **Util.**:
- **[Baixar PDF]** — gera PDF com todas as mensagens
- **[Imprimir]** — abre janela de impressão do navegador

---

#### P: Cliente pediu pra excluir os dados dele (LGPD). Como?
**R:** Painel direito → aba **Util.** → **[Remover dados sensíveis]** (botão vermelho 🗑️).
Apaga **nome, telefone, e-mail, CPF**. Mensagens ficam (texto da conversa permanece pra histórico interno).

⚠️ **Irreversível**. Confirmação obrigatória.

---

### 1.7 Outras dúvidas comuns

#### P: Posso conectar mais de um número de WhatsApp?
**R:** Sim. Em **Canais** → **[+ Adicionar canal]** pra cada número. Mensagens de todos os números caem nesse mesmo CRM, em **Atendimentos** unificado.
Cada ticket mostra **badge do canal** (qual número o cliente mandou).
💡 Pra filtrar só um número: **Filtros** → **Conexões** → seleciona.

---

#### P: Posso colocar a mesma IA pra responder em mais de um número?
**R:** Sim. Em **IA Atendimento** → edita perfil → seção **Canais conectados** → seleciona quantos quiser. A mesma IA vai responder em todos.
💡 Pode ter **IAs diferentes** por canal também (ex: WhatsApp vendas usa IA "Vendedor", WhatsApp suporte usa IA "Suporte").

---

#### P: A IA continua respondendo se eu intervir manualmente?
**R:** **Não.** Quando você manda qualquer mensagem, a IA pausa automaticamente nesse ticket.
Pra reativar: painel direito → aba **Atend.** → toggle **IA Atendendo**.

---

#### P: O que vai pra fila "Atendimento Humano" e o que vai pra "IA Atendendo"?
**R:** São **filas fixas do sistema** (não dá pra editar/deletar):
- **IA Atendendo** — ticket onde a IA tá respondendo sozinha
- **Atendimento Humano** — ticket onde algum atendente assumiu (ou cliente foi transferido manualmente)

⚠️ Ticket muda de fila **sozinho** quando humano intervém. Vai voltar pra "IA Atendendo" se você reativar o toggle IA.

---

#### P: Quando a aba "Fechados" é útil?
**R:**
- Auditoria (revisar venda já fechada)
- Reabrir conversa (se cliente voltar): clica no ticket fechado → cabeçalho → **[Reabrir]**
- Histórico pra exportar (PDF, dados pra contabilidade)
- Filtrar fechamentos por período pra ver vendas do mês

---

#### P: Se cliente apagar mensagem do lado dele, eu vejo no CRM?
**R:** Sim. Mensagem fica marcada como **🗑️ apagada pelo cliente** mas o conteúdo original continua visível no CRM (histórico não se perde).
Mesma coisa pra **edição**: aparece **✏️ editada** com original + nova versão.

---

#### P: Tem limite de quantos tickets vejo na lista?
**R:** Carrega 20 inicialmente. Scroll pra baixo → carrega +20 automaticamente (infinite scroll). Sem limite total.

---

#### P: Por que ticket sumiu da lista de repente?
**R:** Provavelmente foi **fechado** (passou pra aba Fechados). Verifica:
1. Aba **Fechados** — tá lá?
2. Filtros ativos (badge no botão Filtros tem número?) — pode estar ocultando

💡 Botão **[Mostrar todos]** dentro de Filtros zera tudo e mostra os 3 status.

---

> **Fim da Sprint 1 (Atendimentos).** Próxima: **IA Atendimento** (perfis, prompt único vs modular, ferramentas, follow-up, whitelist).

---

<a id="2-ia-atendimento"></a>
## 2. IA Atendimento

### 2.1 Conceito geral

#### P: O que é "IA Atendimento" no Sonar CRM?
**R:** Robô que responde seu cliente sozinho no WhatsApp 24/7. Você cria um **perfil de IA** (ex: "Atendente Vendas"), conecta uma chave de API (OpenAI / Groq / Anthropic), escolhe quais canais ela atende e configura como ela conversa.
📍 `/ia-atendimento`

💡 Pode ter **vários perfis** (ex: IA pra vendas, IA pra suporte, IA pra agendamento) e ligar/desligar cada um.

---

#### P: Como faço pra IA começar a rodar no meu WhatsApp?
**R:** Passo a passo completo:
1. **Canais** → conecta WhatsApp via QR code (se ainda não fez). 📍 `/canais`
2. **IA Atendimento** → **[+ Novo perfil]**. 📍 `/ia-atendimento?novo=1`
3. Escolhe **template pronto** (Vendedor / Suporte / Tráfego pago…) ou **branco** pra montar do zero
4. Preenche:
   - **Nome do perfil** (interno, ex: "IA Vendas Loja A")
   - **Ativo** ☑️
   - **Descrição** (opcional, pra você lembrar)
   - **Chave API** (cola sua key OpenAI/Groq/Anthropic) → **[Testar chave]**
   - **Modelo** (escolhe LLM, ver pergunta abaixo)
5. Aba **Comportamento** → decide: **Prompt único** OU **Modular** (cápsulas)
6. Aba **Configurações** → debounce, max msg, tokens, whitelist
7. Aba **Canais conectados** → seleciona qual(is) WhatsApp essa IA atende (vazio = todos)
8. **[Salvar]**

Pronto — qualquer mensagem que chegar no canal selecionado, IA responde sozinha.

⚠️ Teste antes na aba **Chat de Teste** sem custo de tokens reais (usa contexto fake).

---

### 2.2 Lista de perfis

#### P: Como vejo todos os perfis de IA que criei?
**R:** Menu lateral → **IA Atendimento**. 📍 `/ia-atendimento`. Lista com card por perfil mostrando nome, modelo, canais conectados, status (ativo/inativo).

---

#### P: Como crio um perfil novo?
**R:** Botão **[+ Novo perfil]** (canto superior direito da lista). Abre tela em branco com:
- Cards de **templates pré-feitos** no topo (clique pra preencher tudo de uma vez)
- Ou ignora templates e preenche do zero

---

#### P: Como ativo / desativo um perfil sem deletar?
**R:** No card do perfil na lista → **toggle Ativo** (verde = on, cinza = off). Salva sozinho.
💡 Desativar = IA para de responder mas mantém configuração intacta.

---

#### P: Como edito um perfil existente?
**R:** Card do perfil → ícone ✏️ ou clica no nome. Carrega form pré-preenchido.

---

#### P: Como duplico um perfil pra criar variante?
**R:** Card → ícone 📋 **[Duplicar]**. Cria cópia **sem chave API** e marcada como **inativa** (você revisa antes de ativar).

---

#### P: Como deleto um perfil?
**R:** Card → ícone 🗑️ → confirma.
⚠️ Apaga **perfil + ferramentas + logs + cápsulas + sequências follow-up**. Irreversível. Considere só desativar.

---

### 2.3 Templates pré-feitos

#### P: O que tem nos templates prontos?
**R:** Vêm com prompt + modelo + delays + ferramentas pré-configurados. Hoje tem:
- **Vendedor** — foco conversão, qualificação, fechamento
- **Suporte** — paciente, técnico, escala pra humano fácil
- **Tráfego pago / Biscoito** — IA que entrega "biscoito" (lead magnet) automaticamente quando cliente pede

Clica no card → preenche o form. Pode editar depois normalmente.

💡 Templates são **globais** (não da sua agência) — não dá pra editar/deletar, só usar como ponto de partida.

---

### 2.4 Identidade básica do perfil

#### P: O que coloco em "Nome do perfil"?
**R:** Nome **interno** pra você identificar (cliente final nunca vê). Ex: "IA Vendas Loja Centro", "Suporte WhatsApp Plano Pro".

---

#### P: O que é o checkbox "Ativo"?
**R:** Liga/desliga IA em **produção**. Desativado = ela não responde ninguém (mesmo que canal tenha mensagens chegando).
💡 Útil pra pausar IA durante manutenção sem perder config.

---

#### P: Pra que serve a "Descrição"?
**R:** Texto interno (só admin vê). Ex: "IA testada com prompt v3, foco upsell mensagens 6-15h". Ajuda quando você tem várias IAs.

---

#### P: Onde colo minha chave API?
**R:** Campo **Chave API** abaixo do nome.
- Cola a key (sk-... pra OpenAI, gsk_... pra Groq, sk-ant-... pra Anthropic)
- Botão 👁️ pra ver/ocultar
- Botão **[🔄 Trocar]** pra substituir chave salva

⚠️ Sistema valida prefixo (sk-, gsk_, sk-ant-) ao salvar pra evitar chave do provider errado.

---

#### P: Como criar uma chave de API gratuita?
**R:** Opções gratuitas (mais econômicas):
- **Groq** (recomendado pra começar — rápido + grátis): 🔗 https://console.groq.com → "API Keys" → "Create"
- **OpenAI** (paga, mas com $5 grátis inicial): 🔗 https://platform.openai.com → "API keys"
- **Anthropic Claude** (paga, melhor qualidade): 🔗 https://console.anthropic.com → "API keys"

Cola a chave aqui no CRM.

---

#### P: Como testo se minha chave está funcionando?
**R:** Depois de colar → botão **[Testar chave]**. Envia uma mensagem fake pro provider, retorna:
- ✅ Resposta + tokens consumidos + latência (ms)
- ❌ Erro (chave inválida, limite excedido, modelo não suportado…)

---

#### P: Como escolho o modelo de IA (Claude / GPT / Llama)?
**R:** Campo **Modelo** → dropdown com provider + modelo. Cada modelo mostra:
- **Custo** ⭐⭐⭐⭐ (1 = barato, 4 = caro)
- **Velocidade** ⚡⚡⚡ (1 = lenta, 3 = rápida)
- **Contexto** (tokens — quanto histórico cabe)
- **Suporta ferramentas** ☑️ (necessário pra IA chamar tools como aplicar etiqueta, transferir, biscoito…)
- **Melhor pra** / **Evitar** — bullets explicativos

💡 Recomendação por caso de uso:
- **Começar barato** → Groq Llama 3.3 70B (~$0.59/M tokens)
- **Qualidade média** → GPT-4o mini (~$0.15 in / $0.60 out)
- **Alta qualidade** → Claude Haiku 4.5 ou Sonnet 4.6
- **Top conversa** → Claude Opus 4.8 (caro mas excelente)

⚠️ Modelos legados sem "suporta ferramentas" não conseguem chamar tools — IA só responde texto puro.

---

#### P: Como ligo essa IA em qual WhatsApp ela atende?
**R:** Form → seção **Canais conectados** → chips picker (multi-select). Vazio = atende **todos** os canais. Selecionado = só os marcados.

💡 Use pra ter IAs diferentes por canal (ex: IA "Vendas" no WhatsApp comercial, IA "Suporte" no WhatsApp técnico).

---

#### P: Como ligo essa IA em quais filas?
**R:** Mesma lógica — chips picker **Filas**. Vazio = todas. Selecionado = só essas.
💡 IA não responde em fila **Atendimento Humano** (fixa do sistema) por padrão.

---

### 2.5 Comportamento: Prompt Único vs Modular

#### P: Qual a diferença entre prompt único e modular?
**R:**
- **Único** = você escreve **um prompt gigante** com tudo (quem ela é, o que fala, regras, FAQ, produtos…). Simples mas gasta tokens em cada resposta (manda o prompt inteiro toda vez).
- **Modular** = você divide em **cápsulas** (FAQ, Produtos, Horários…) com **palavras-chave**. IA só injeta a cápsula relevante na resposta. **Economiza ~85% dos tokens.**

💡 Comece com **único** pra testar rápido. Depois migra pra **modular** quando o prompt ficar grande.

---

#### P: Como ligo o modo Modular?
**R:** Aba **Comportamento** → seção **Cápsulas modulares** → toggle **Ativar modo modular** (ON/OFF). Salva sozinho ao clicar (autoSalvar).

Quando ON, aparecem 4 blocos:
1. **Identidade** — quem é a IA (1 parágrafo)
2. **Objetivo** — o que ela quer alcançar (vender, qualificar, atender…)
3. **Regras globais** — sempre aplicam (tom, idioma, não falar de concorrente…)
4. **Cápsulas** — lista de blocos que IA injeta quando keyword bater

Cada bloco **autoSalva** ao sair do textarea (blur).

---

#### P: Como escrevo o prompt único (modo clássico)?
**R:** Aba **Comportamento** → textarea grande. Estrutura recomendada:
```
Você é [NOME], atendente de [EMPRESA].

OBJETIVO: [vender / qualificar / agendar / etc]

REGRAS:
- Tom: [profissional / amigável / casual]
- Idioma: PT-BR
- Nunca: falar de concorrente, prometer prazo

FAQ:
- Pergunta X → resposta Y
- Pergunta Z → resposta W

PRODUTOS:
- Plano A: R$X, inclui...
- Plano B: R$Y, inclui...
```

💡 Use o **placeholder picker** (botão `{...}` acima do textarea) pra inserir `{nome_cliente}`, `{hora_atual}`, `{nome_agencia}` dinamicamente.

---

#### P: O que são placeholders dinâmicos?
**R:** Variáveis que IA substitui em tempo real. Exemplos:
- `{nome_cliente}` → "João"
- `{hora_atual}` → "14:32"
- `{data_hoje}` → "25/06/2026"
- `{saudacao}` → "Boa tarde"
- `{nome_agencia}` → sua agência

Clica botão **{...}** acima do textarea → picker mostra todos. Clica → insere no cursor.

---

### 2.6 Cápsulas Modulares

#### P: Como crio uma cápsula nova?
**R:** Modular ON → seção **Cápsulas** → botão **[+ Adicionar cápsula]**. Picker abre com 7 templates pré-feitos:
- 📋 **FAQ** — perguntas frequentes
- 📦 **Produtos** — catálogo
- 🕐 **Horários** — atendimento
- 📜 **Políticas** — devolução, garantia
- 📍 **Endereços** — localização
- 🎁 **Promoções** — ofertas
- 💳 **Pagamento** — formas

Clica template → cria cápsula vazia com **slug + nome + cor + keywords** padrão. Edita conteúdo + keywords.

---

#### P: O que são "keywords" da cápsula?
**R:** Palavras-chave que **disparam** a cápsula. Quando cliente manda mensagem contendo qualquer palavra da lista, IA injeta o conteúdo dessa cápsula no contexto.

Ex: cápsula FAQ com keywords `[preço, valor, custa, quanto]` → cliente manda "quanto custa?" → IA injeta FAQ → responde com info correta.

⚠️ Match é **local** (sem IA, custo zero). Acontece **antes** de chamar o LLM.

---

#### P: Como ativo / desativo uma cápsula?
**R:** Card da cápsula → toggle 🟢/⚫. Cápsula desativada não entra no contexto mesmo se palavra-chave bater.

---

#### P: Como deleto uma cápsula?
**R:** Card → 🗑️ → confirma. Apaga só a cápsula desse perfil (não afeta outros perfis).

---

#### P: O que acontece se nenhuma cápsula bater?
**R:** IA recebe só **Identidade + Objetivo + Regras globais** + **fallback** (lista resumida de todas cápsulas disponíveis: "tem FAQ, tem Produtos, tem Horários…"). IA escolhe responder do conhecimento geral ou pedir esclarecimento.

---

### 2.7 Configurações IA (debounce, max msg, tokens, whitelist)

#### P: O que é "Debounce"?
**R:** Tempo de **espera** antes da IA responder, contado da **última mensagem** do cliente.
Ex: debounce = 5s → cliente manda 3 mensagens em sequência → IA espera 5s sem nada chegar → responde **uma vez** considerando as 3.

💡 Sem debounce, IA responderia cada mensagem isoladamente (ruim). Recomendado: **5-15s**.

---

#### P: O que são "delay mínimo / máximo de resposta"?
**R:** Simula tempo de digitação humano. IA responde em algum momento entre `min` e `max` segundos depois do debounce.
Ex: min=2, max=8 → IA responde entre 2 e 8s depois.

💡 Recomendado: min=2, max=10. Evita parecer robô instantâneo.

---

#### P: O que é "Máximo de mensagens" (max_msgs)?
**R:** Quantas mensagens IA pode mandar em **uma resposta** (quebrando texto longo em vários balões).
- 1 = sempre balão único
- 3 = pode quebrar em até 3
- 5 = quebra livre

💡 Recomendado: 2-3. Vira papo mais natural.

---

#### P: O que é "Separador de blocos"?
**R:** Como IA divide texto em mensagens separadas:
- **Quebra de linha (`\n`)** — divide a cada parágrafo
- **Traço (`---`)** — divide em `---` explícito
- **Linha em branco** — divide em parágrafos com linha vazia

💡 Padrão: **Quebra de linha**.

---

#### P: Pra que serve o checkbox "Bullets"?
**R:** Permite IA usar listas com `•` ou `-` nas respostas. Quando off, força texto corrido (mais natural pra WhatsApp).

---

#### P: O que é "Max tokens por resposta"?
**R:** Limite **superior** de tamanho da resposta da IA (em tokens). Recomendado: **300-500**.
- < 200 = respostas curtas demais (interrompe meio frase)
- > 800 = textos longos demais (cliente não lê)

💡 Pra LLM "raciocinar" mais antes de responder use 800-1500. Pra economizar use 200-400.

---

#### P: O que é "Temperatura"?
**R:** Criatividade da IA. Valor entre **0 e 2**:
- **0.0-0.3** = previsível, robótico, sempre mesma resposta
- **0.4-0.7** = balanceado (recomendado pra atendimento)
- **0.8-1.5** = criativo, varia mais
- **> 1.5** = aleatório demais, pode delirar

💡 Recomendado: **0.5-0.7**.

---

#### P: O que faz "Pausar se humano responder"?
**R:** Checkbox que liga/desliga o comportamento de **auto-pausa quando atendente intervém**.
- ☑️ ON = manda mensagem manual → IA pausa nesse ticket (padrão)
- ☐ OFF = IA continua respondendo mesmo após humano falar

💡 Mantenha ON. Desligar dá sobreposição confusa pro cliente.

---

#### P: Pra que serve o "Timezone"?
**R:** Define fuso horário que IA usa pra `{hora_atual}`, `{data_hoje}`, `{saudacao}` e tool `consultar_data`. Padrão: **America/Sao_Paulo (BRT)**.

💡 Mude se cliente está em outro fuso (ex: nordeste sem horário verão, ou WhatsApp internacional).

---

### 2.8 Whitelist Produção (teste no WhatsApp real)

#### P: O que é a "Whitelist produção"?
**R:** Lista de **números autorizados** pra IA responder. Quando preenchida, IA **só responde quem está na lista** (resto vê mensagem mas IA ignora — vira fila humano).

📍 Aba **Comportamento** → seção **Whitelist produção — testar no WhatsApp real** → textarea (1 número por linha).

Formato aceito:
```
5581999999999
(81) 99999-9999
+55 81 9 9999-9999
```
(Sistema normaliza pra `5581999999999`.)

---

#### P: Quando uso whitelist?
**R:**
- **Testar IA em produção** sem afetar clientes reais (lista só seu número + da equipe)
- **Lançamento controlado** (começa com 10 clientes selecionados antes de liberar geral)

⚠️ Lista **vazia** = IA responde **todo mundo** (modo produção total).

---

#### P: Coloquei meu número mas a IA não responde. Por quê?
**R:** Cheque:
1. Número incluiu **DDD** (81, 11, 21…) com **9** inicial pra celular
2. Salvou a configuração depois de editar a lista
3. Canal está **conectado** em **Canais**
4. Perfil de IA está **Ativo**
5. Canal selecionado nas **Conexões** desse perfil (ou vazio = todos)

---

### 2.9 Ferramentas (tools que IA pode chamar)

#### P: O que são "Ferramentas" da IA?
**R:** Ações que IA pode executar **além de responder texto**. Ex:
- Aplicar etiqueta no contato ("interessado", "qualificado")
- Transferir pro humano
- Marcar qualificado
- Criar nota interna
- Consultar data/hora atual
- Enviar imagem da galeria
- Ferramentas **custom** (ex: "manda biscoito" — você define)

📍 Aba **Ferramentas** dentro do edit perfil.

⚠️ **Só funciona** se modelo escolhido **suporta ferramentas** (Claude/GPT-4o/Llama 70B sim, modelos antigos não).

---

#### P: Como adiciono uma ferramenta?
**R:** Aba **Ferramentas** → **[+ Adicionar ferramenta]**. Form abre com:
- **Nome** (ex: "Manda biscoito")
- **Descrição** (quando IA deve chamar — IA lê isso pra decidir)
- **Ação** (dropdown):
  - Aplicar etiqueta
  - Transferir pra fila
  - Transferir pra humano
  - Marcar qualificado
  - Criar nota
  - Consultar data
  - Enviar imagem galeria
- **Parâmetros** (JSON, varia por ação)

**[Salvar]**.

---

#### P: Como funciona a ferramenta "Transferir pra humano"?
**R:** IA chama quando cliente pede atendente ou IA não consegue ajudar. Ao chamar:
1. Ticket muda pra fila **Atendimento Humano**
2. IA fica em silêncio (`ia_pausada = true`)
3. Se configurado **Resumo pra grupo** → IA envia resumo da conversa pro grupo da equipe (ver 2.11)
4. Aplica etiquetas pré-configuradas (ex: "Aguardando humano")

💡 Você configura **fila destino, etiqueta auto, mensagem de despedida** nos parâmetros.

---

#### P: Como funciona "Consultar data"?
**R:** IA chama quando precisa saber **agora**. Retorna:
- Data atual (formato BR)
- Dia da semana
- Hora atual
- Período do dia (manhã/tarde/noite)

Usa o **timezone** configurado no perfil.

💡 Útil pra "Hoje é segunda? Estamos abertos?", "Que dia da semana é?", "Bom dia ou boa noite?".

---

#### P: Como funciona "Enviar imagem da galeria"?
**R:** Cria ferramenta de **catálogo de imagens** que IA escolhe e manda. Ex: cardápio, fotos de produto, mapa do salão.

Setup:
1. Cria ferramenta → ação **"Enviar imagem galeria"**
2. **Upload** das imagens (drag-drop no uploader) → cada uma com **tag** + **descrição** que IA lê pra decidir qual mandar
3. Salva

Cliente pergunta "tem foto do prato X?" → IA escolhe imagem com tag/descrição que casa → manda no chat.

---

#### P: Posso criar ferramenta totalmente custom (ex: "manda biscoito")?
**R:** Sim. Template **Tráfego pago / Biscoito** já vem com ferramenta "Mandar Biscoito" pronta — envia PDF/imagem de lead magnet quando cliente demonstra interesse.

Pra criar do zero: aba **Ferramentas** → escolhe ação base (ex: "Enviar imagem galeria" pra anexo, "Criar nota" pra log) → customiza nome + descrição.

---

#### P: Como edito uma ferramenta existente?
**R:** Card da ferramenta → ícone ✏️. Form abre pré-preenchido.

---

#### P: Como ligo / desligo ferramenta sem deletar?
**R:** Card → toggle 🟢/⚫.

---

### 2.10 Follow-up (sequência automática)

#### P: O que é Follow-up automático?
**R:** Mensagens **agendadas** que IA dispara sozinha quando cliente para de responder. Ex:
- Cliente parou de responder → 1h depois: "Tá aí?" → 1 dia depois: "Lembra de mim?" → 3 dias: "Última chance"

📍 Aba **Follow-up** no edit perfil.

⚠️ Diferente do follow-up de **um ticket** (Sprint 1) que você cria manual. Esse é **automático pra toda IA**.

---

#### P: Como crio uma sequência de follow-up?
**R:** Aba **Follow-up** → **[+ Nova sequência]**. Define:
- **Nome** (ex: "Reativação 7 dias")
- **Descrição** (interna)
- **Etiqueta em progresso** (aplica no contato quando sequência começa, ex: "Em follow-up")
- **Etiqueta encerrado** (aplica ao terminar)
- **Janela de envio** (HH:MM-HH:MM, ex: "09:00-18:00" — só dispara nesse horário)
- **Finalizar ticket ao terminar** ☑️ (encerra automaticamente)

Depois adiciona **etapas** (até 6 por sequência):
- **Delay antes** (ex: "3600s" = 1h)
- **Tipo**: texto / imagem / vídeo / áudio / documento
- **Conteúdo** (texto ou upload da mídia)

Drag-drop reordena etapas.

---

#### P: Quando a sequência começa?
**R:** **Quando IA manda a primeira resposta** num ticket. A partir daí o relógio dispara: 1ª etapa em `delay_antes` segundos, 2ª em `delay_antes` depois da 1ª, etc.

---

#### P: O que cancela a sequência?
**R:** Cliente respondendo. Webhook detecta resposta → marca progresso como `cancelado_por_resposta` → para envio das próximas etapas. Etiqueta "Em follow-up" é removida.

💡 Comportamento esperado: cliente respondeu = pegou. Follow-up pra alguém que respondeu vira spam.

---

#### P: Posso ter várias sequências por perfil?
**R:** Sim. Até **5 sequências por perfil**, **6 etapas cada**. Pode usar:
- Sequência A: reativação curta (24h)
- Sequência B: reativação longa (7 dias)

⚠️ Atualmente sequência usada é a **primeira ativa** (ordem definida em "ordem_no_perfil"). Lógica de "qual sequência usar quando" é roadmap futuro.

---

### 2.11 Resumo pra grupo (transferência pra humano)

#### P: Quando IA transfere pra humano, dá pra mandar um resumo da conversa pro time?
**R:** Sim. Aba **Ferramentas** → seção **Envio de resumo** → **[Configurar resumo]**. Balão abre com:
- ☑️ **Ativo**
- **Modelo** (Groq llama-3.3-70b por padrão — rápido + barato)
- **Destino**: 
  - **Grupo WhatsApp** (cola JID do grupo)
  - **Privado** (cola telefone)
- **Canal** (qual WhatsApp manda)
- **Prompt do resumo** (customizável, padrão: "Resuma a conversa em 3 bullets: o que cliente quer, status, próxima ação")
- **Disparar em**:
  - Quando IA chama `transferir_para_humano` (auto)
  - Manual (admin clica botão)

**[Testar]** — gera resumo fake + envia amostra pro destino.
**[Salvar]**.

---

#### P: Onde pego o JID do grupo de WhatsApp?
**R:** Em **Grupos** (Sprint 4) → lista mostra grupos detectados → cada um tem botão **[Copiar JID]** (formato `5511999999999-1234567890@g.us`).

---

#### P: O resumo gasta tokens da IA principal?
**R:** Não. Resumo usa **chave Groq separada** (ou padrão da agência) — modelo barato. Não conta no consumo do perfil.

---

### 2.12 Etiquetas automáticas (IA aplica sozinha)

#### P: Como faço a IA aplicar etiquetas sozinha?
**R:** Aba **Etiquetas** (dentro do perfil) → seção **Etiquetas disponíveis pra IA**. Pra cada etiqueta:
- **[+ Adicionar]** → escolhe etiqueta criada em Configurações → Etiquetas
- **Descrição de uso** (textarea — explica pra IA **quando aplicar**, ex: "Cliente pediu desconto", "Reclamou de prazo", "Mostrou interesse alto")

IA lê descrição + decide se aplica baseado na conversa.

⚠️ **Só funciona** com modelo que suporta ferramentas. Etiquetas que IA aplica entram como tool `aplicar_etiqueta` no contexto.

---

#### P: IA pode criar etiqueta nova que não existe?
**R:** Sim. Quando IA chama `aplicar_etiqueta` com nome que não existe ainda, sistema cria a etiqueta automaticamente (cor cinza padrão). Você pode renomear / mudar cor depois em **Configurações > Etiquetas**.

---

### 2.13 Chat de Teste

#### P: Como testo a IA sem ela responder cliente real?
**R:** Aba **Chat de Teste** dentro do edit perfil. Tem um chat completo onde você simula ser cliente.

Funciona assim:
1. Digita mensagem no input → **[Enviar]**
2. IA responde considerando **toda configuração atual** (prompt, cápsulas, ferramentas, modelo)
3. Resposta mostra:
   - **Tokens IN / OUT** consumidos
   - **Cápsulas usadas** (modular)
   - **Tool calls** (cards roxos com nome da tool + argumentos JSON)
   - **Erro** (se algo falhou)

Histórico fica no localStorage (não envia pra DB). Comando **`LIMPAR`** zera tudo.

---

#### P: Chat de Teste consome tokens reais?
**R:** **Sim** — chama API do provider de verdade (OpenAI/Groq/Anthropic). Custo aparece no card de **Uso de Tokens** depois de salvar.

💡 Pra testar de graça use modelo Groq (limites generosos sem cobrança até X tokens/dia).

---

#### P: Tool call apareceu mas não executou nada real. Por quê?
**R:** Chat de Teste **mostra** quais tools IA chamou mas **não executa** (não aplica etiqueta no DB, não transfere pra fila, não manda imagem). É preview. Pra ver tool funcionando de verdade precisa ser em ticket real.

---

### 2.14 Uso de Tokens (consumo + custo)

#### P: Como vejo quanto IA está gastando?
**R:** Aba **Análise** dentro do perfil. Mostra:
- **Card KPI** (topo): respostas, tokens IN, tokens OUT, custo total (USD)
- **Filtro intervalo**: 24h / 7 dias / 30 dias / total
- **Mini-gráfico** últimos 7 dias
- **Uso por ticket** (tabela): conversa | respostas | tokens | custo (top 20 mais caros)
- **Logs** (últimas 50 ações): evento (resposta/tool_call/erro/pausa_humano), timestamp, modelo, tokens, payload completo

📍 dentro de `/ia-atendimento?editar={id}` aba **Análise**

---

#### P: Como sei se a chave da IA tá perto do limite?
**R:** Configurações > API IA permite definir **limite/dia** por chave. Gateway pula chave que excedeu + usa próxima (multi-chave) — ver Sprint 6.
💡 Card KPI mostra consumo do dia. Compara com limite configurado.

---

#### P: Custo em USD ou BRL?
**R:** Custo IA é **USD** (todos providers cobram em dólar). Pra estimar BRL multiplica por cotação atual.

---

### 2.15 Modelos suportados — guia rápido

#### P: Lista completa dos modelos?
**R:** **20+ modelos** organizados por provider:

**Anthropic:**
- Claude Haiku 4.5 (rápido + bom, ~$1/$5 por 1M)
- Claude Sonnet 4.6 (recomendado, ~$3/$15)
- Claude Opus 4.8 (top qualidade, ~$15/$75)

**OpenAI:**
- GPT-4o mini (econômico, ~$0.15/$0.60)
- GPT-4o (balanceado, ~$2.50/$10)
- GPT-4.1 (recente)
- o1 / o3 (reasoning, mais caros)

**Groq (rápido + barato):**
- Llama 3.3 70B (~$0.59/$0.79)
- Llama 3.1 8B (mais barato, ~$0.05/$0.08)
- DeepSeek

⚠️ Cada modelo mostra ⭐ **suporta_ferramentas**. Sem isso, IA não chama tools (só responde texto).

---

#### P: Modelo bom + barato pra começar?
**R:** **Groq Llama 3.3 70B** — rápido, suporta tools, ~$0.59 por 1M tokens (1 atendimento típico = 2-5k tokens = R$0.01-0.05). Cabe orçamento apertado.

Quer qualidade melhor sem explodir custo: **GPT-4o mini** ou **Claude Haiku 4.5**.

---

### 2.16 FAQ geral

#### P: Posso ter a mesma IA respondendo em 2 números?
**R:** Sim. Form do perfil → **Canais conectados** → seleciona ambos.

---

#### P: Posso ter 2 IAs diferentes, uma em cada número?
**R:** Sim. Cria 2 perfis. Cada um seleciona **seu canal** em Conexões. Sistema roteia mensagem do canal pra IA correta.

---

#### P: IA pausa quando intervenho. Como ela retoma?
**R:** **Não retoma sozinha.** Você precisa ligar manual: **Atendimentos** → ticket → painel direito → aba **Atend.** → toggle **IA Atendendo**.
💡 Isso é proteção pra você não ser interrompido durante atendimento humano.

---

#### P: O que acontece se eu mudar o prompt enquanto IA tá rodando?
**R:** Próxima mensagem que chegar já usa o novo prompt. IA não tem "memória de longo prazo" — cada resposta é nova.
⚠️ Conversas em andamento podem ficar incoerentes se você mudar muito o tom. Recomendado mudar quando ninguém está conectado.

---

#### P: IA esqueceu contexto da conversa?
**R:** Modelos têm **janela de contexto** (ex: 8k tokens = ~6k palavras). Conversa muito longa = mensagens antigas saem da janela. Solução:
- Usar modelo com **contexto maior** (Claude 200k, GPT-4o 128k)
- Limitar histórico no executor (config futura)

---

#### P: Como sei se IA tá usando cápsula certa?
**R:** **Chat de Teste** mostra **cápsulas_usadas** na resposta. Se cápsula errada aparecer, ajusta **keywords** dela.

---

#### P: IA responde muito rápido (parece robô). Como deixo mais natural?
**R:** Aumenta delay min/max (ex: min=4, max=15). Aumenta debounce (ex: 10s) pra IA esperar cliente "terminar de digitar". Reduz max_msgs pra 1 (não quebra em vários balões).

---

#### P: IA responde devagar demais. Como acelero?
**R:**
- Modelo mais rápido (Groq Llama, GPT-4o mini)
- Reduz delay min/max
- Reduz max_tokens (resposta menor = gera mais rápido)

---

#### P: IA tá inventando informação (alucinação). Como evito?
**R:**
- **Reduz temperatura** (0.3 ou menos)
- Adiciona regra: "Se não souber, fale 'vou verificar' e chama `transferir_para_humano`"
- Usa **modo modular** (IA só fala do que tá nas cápsulas)
- Adiciona FAQ explícito no prompt cobrindo casos comuns

---

#### P: Cliente xinga IA. O que fazer?
**R:** Configure regra global: "Se cliente for hostil, chame `transferir_para_humano` com motivo 'cliente irritado'." IA passa pro humano automático.

---

> **Fim da Sprint 2 (IA Atendimento).** Próxima: **Canais (conectar WhatsApp via UAZAPI)**.

---

<a id="3-canais"></a>
## 3. Canais (WhatsApp)

### 3.1 Conceito geral

#### P: O que são "Canais" no CRM?
**R:** Cada **canal = um número de WhatsApp conectado** ao CRM. Quando alguém manda mensagem nesse número, vira ticket em **Atendimentos**.
📍 `/canais`

⚠️ Apenas **Usuários CRM com permissão admin** (ou super_admin) acessam. Operador comum não vê essa página.

---

#### P: Como conecto meu primeiro WhatsApp?
**R:** Passo a passo:
1. Menu lateral → **Canais**. 📍 `/canais`
2. **[+ Adicionar canal]** (canto superior direito)
3. Preenche form:
   - **Nome** (interno — ex: "WhatsApp Comercial")
   - **Padrão** ☑️ (se quer que esse seja o canal padrão pra novas conversas)
   - **Fila** (opcional — qual fila mensagens caem)
   - **Usuário responsável** (opcional)
   - **Mensagem de despedida** (opcional — manda ao desconectar)
4. **[Criar]** → CRM cria instância no servidor UAZAPI + gera **QR Code**
5. Abre app WhatsApp no celular → ⋮ → **Aparelhos conectados** → **[Conectar aparelho]** → escaneia QR
6. Status muda pra ✅ **CONECTADO**

⚠️ Tudo automático — não precisa criar instância manual em outro lugar.

---

### 3.2 QR Code

#### P: O QR Code expirou. Como gero novo?
**R:** QR dura **30 segundos**. CRM gera novo **automaticamente** enquanto a tela do QR estiver aberta (você vê contador regressivo).
Se fechou a janela: card do canal → **[Ver QR Code]** → reabre QR fresh.

💡 Contador fica **vermelho** quando < 5 segundos. Espera novo gerar automático.

---

#### P: Escaneei o QR mas nada acontece. O que faço?
**R:** Status é verificado a **cada 4 segundos** automaticamente. Verifica:
1. **Celular tem internet** — QR exige conexão dos 2 lados
2. **Câmera focada** no QR inteiro
3. **WhatsApp no celular atualizado** (versão antiga não conecta)
4. **Tempo do QR** — se passou de 30s gera novo (botão **[Ver QR Code]** de novo)
5. **Status do servidor UAZAPI** (peça pra super_admin checar)

---

#### P: Tem como conectar sem QR (por número/código)?
**R:** Tecnicamente sim (sistema suporta no `lib/uazapi/client.ts`), mas **interface ainda não expõe**. Hoje é só QR.
💡 Quando disponível: você digita seu número WhatsApp → recebe **código de 8 dígitos** → digita no WhatsApp do celular (⋮ → Aparelhos conectados → **Conectar com número**).

---

### 3.3 Lista de canais

#### P: O que vejo nos cards de cada canal?
**R:** Card mostra:
- 🖼️ Foto de perfil do WhatsApp
- **Nome do canal** (interno)
- **Nome do perfil WhatsApp** + número conectado
- Badge de status: 🟢 CONECTADO / 🟡 QR Code / 🟠 connecting / ⚫ disconnected
- Fila + usuário responsável (se atribuído)
- Plataforma (iOS / Android / Web)
- Ícone ⭐ se é o canal **padrão**

E ações por card (ícones na parte inferior):
- ⭐ **Definir como padrão**
- 🔗 **Revalidar webhook**
- 🔄 **Transferir tickets**
- ♻️ **Reconectar**
- 🔌 **Desconectar**
- 🗑️ **Deletar** (vermelho)

---

#### P: Por que recebo alerta sobre "iOS"?
**R:** Quando CRM detecta WhatsApp conectado em **iPhone**, mostra aviso pedindo pra **desativar notificações nativas do WhatsApp Business no iPhone**. Razão: iOS pausa o WhatsApp em segundo plano → mensagens podem demorar.
💡 Solução: **mantém notificações só no CRM** (recebe alerta em todo dispositivo + atendentes não miss nada).

---

#### P: Como sei se o WhatsApp tá em iOS / Android / Web?
**R:** Plataforma é detectada **automaticamente** ao conectar. Aparece no card. Sistema chama API UAZAPI uma vez no carregamento (primeira visita após conectar) pra puxar.

---

### 3.4 Múltiplos canais

#### P: Posso conectar mais de um WhatsApp?
**R:** Plano padrão: **1 sessão WhatsApp por conta**.
- Super_admin = ilimitado
- Conta admin comum: 1
- Pra adicionar extras: fala com suporte (custo adicional)

Pricing (segundo planos):
- **R$29/mês** padrão (1 conexão)
- **R$19** cada conexão extra (2-7 dispositivos)
- **R$138** plano LITE (até 100 mensagens/dia)
- **R$195** plano PRO (até 300/dia)

---

#### P: Mensagens dos 2 (ou mais) números caem no mesmo CRM?
**R:** Sim. Tudo unificado em **Atendimentos**. Cada ticket mostra badge do canal pra você saber qual número o cliente mandou.
💡 Pra ver só mensagens de **um canal**: **Filtros** → **Conexões** → seleciona.

---

#### P: Como troco qual canal é o padrão?
**R:** Card → ícone ⭐ **[Definir como padrão]**. Confirma. Outros canais perdem o status padrão automático.
💡 Canal padrão = usado em "Nova conversa" quando não escolhe canal explícito.

---

### 3.5 Reconectar / Desconectar / Deletar

#### P: WhatsApp caiu (status virou disconnected). Como reconecto?
**R:** Card → ícone ♻️ **[Reconectar]**.
- Se WhatsApp ainda está logado no celular → **só sincroniza** (sem novo QR)
- Se caiu de vez → **gera QR novo**, você escaneia de novo

---

#### P: Como desconecto um canal sem deletar?
**R:** Card → 🔌 **[Desconectar]** → confirma.
- Status muda pra ⚫ **disconnected**
- WhatsApp do celular continua intacto
- Histórico de tickets/mensagens permanece
- Pra voltar: ♻️ **[Reconectar]**

💡 Mais rápido que deletar. Útil pra trocar de número temporariamente.

---

#### P: Como deleto um canal de vez?
**R:** Card → 🗑️ **[Deletar]** (vermelho) → confirma 2 vezes.
- Apaga registro do CRM
- Remove instância do servidor UAZAPI também
- Tickets antigos permanecem (sem canal associado)

⚠️ **Não dá pra desfazer.** Se ainda tem tickets ativos, considere **Transferir tickets** primeiro (próxima pergunta).

---

### 3.6 Transferir tickets entre canais

#### P: Vou trocar de número. Como movo conversas pro novo?
**R:** 1. Adiciona o **canal novo** primeiro (passa **3.1**)
2. Card do **canal antigo** → ícone 🔄 **[Transferir tickets]**
3. Modal abre → seleciona **canal destino** (verde = conectado, vermelho = não)
4. Confirma

Todos tickets, mensagens, transcrições e fechamentos do canal antigo migram pro novo. Histórico íntegro.

⚠️ **Irreversível.** Movimentação em massa. Faça quando não tiver atendimentos em andamento.

---

#### P: Posso transferir só um ticket específico?
**R:** Sim — pela tela de **Atendimentos**, dentro do chat → cabeçalho → **[Transferir]** → **Transferir canal** (ver Sprint 1, seção 1.5).
💡 Use essa opção pra **um ticket**. A opção **Canais → Transferir tickets** é pra **TODOS de uma vez**.

---

### 3.7 Webhook

#### P: O que é "Revalidar webhook"?
**R:** Webhook = URL que recebe mensagens do UAZAPI e empurra pro CRM. Cada canal tem o seu.

Card → 🔗 **[Revalidar webhook]** → reconfigura URL no servidor UAZAPI.

Use quando:
- Mensagens param de chegar de repente
- Mudou domínio do CRM (NEXT_PUBLIC_APP_URL)
- Suporte pediu

💡 Configurado **automaticamente** ao criar canal. Só revalida se desconfigurar.

---

### 3.8 Mídias pendentes (backfill)

#### P: Algumas fotos / áudios aparecem como "pendente" no chat. Como baixo?
**R:** Topo da página **Canais** → **[Baixar mídias pendentes]**. CRM busca todas mídias com falha de download e tenta de novo em lotes de 30.

Progresso aparece em tempo real:
- ✅ X baixadas
- ⚠️ Y falhas
- ⏳ Z restantes

Para automaticamente após 2 falhas seguidas (UAZAPI não consegue mais).

💡 Mídias antigas (> 7 dias) geralmente não dá pra recuperar — WhatsApp expira no servidor.

---

### 3.9 FAQ geral

#### P: Posso conectar WhatsApp Business e WhatsApp comum?
**R:** Sim — qualquer um. UAZAPI funciona com ambos. CRM trata igual.

---

#### P: WhatsApp do celular vai parar de funcionar?
**R:** Não. Você continua usando WhatsApp normal no celular. O CRM **espelha** as mensagens (igual WhatsApp Web). Pode atender pelo CRM **OU** pelo celular — chega nos dois lados.

---

#### P: O número vai aparecer "online" se eu não estiver no celular?
**R:** Sim — quando CRM está conectado, WhatsApp considera o "aparelho" como online. Pra evitar isso desligue WhatsApp do celular antes de conectar no CRM (não recomendado normalmente).

---

#### P: WhatsApp pode banir meu número por usar UAZAPI?
**R:** Risco baixo se usar com bom senso:
- ✅ Velocidade humana (debounce IA, delays)
- ✅ Não fazer envio em massa pra estranhos
- ❌ NÃO mandar 1000 mensagens em 1 minuto
- ❌ NÃO contatar números que não te deram permissão

💡 Envio em Massa do CRM tem **rate limit** automático pra reduzir risco. Veja [Sprint 4](#4-contatos).

---

#### P: Conectei mas não chegam mensagens. O que verificar?
**R:** Checklist:
1. Status do canal = 🟢 **CONECTADO**
2. **Revalidar webhook** (3.7)
3. Teste mandando mensagem **de outro número** pro número conectado
4. Aguarda 10s e atualiza **Atendimentos**
5. Se nada: super_admin verifica servidor UAZAPI ativo em `/super-admin/servidores`

---

#### P: Quem pode acessar Canais?
**R:** Apenas **Usuários CRM com role admin** ou super_admin. Operador comum **não vê** essa página. Pra mudar permissão: **Configurações > Usuários** (Sprint 5).

---

#### P: Importar contatos do WhatsApp pro CRM?
**R:** Após conectar canal, banner aparece: **"Importe seus contatos e etiquetas"** → leva pra `/contatos` onde tem botão dedicado. Ver Sprint 4.

---

> **Fim da Sprint 3 (Canais).** Próxima: **Contatos + Envio Massa + Mensagens Rápidas + Grupos**.

---

<a id="4-contatos"></a>
## 4. Contatos / Envio Massa / Mensagens Rápidas / Grupos

### 4.1 Contatos — conceito

#### P: O que é a aba "Contatos"?
**R:** Banco de dados unificado de todas pessoas que já conversaram com você (ou que você importou). Cada contato tem nome, número WhatsApp, etiquetas, histórico de fechamentos, follow-ups agendados.
📍 `/contatos`

⚠️ Diferente de **Atendimentos** (que é a conversa ativa). Contatos = pessoa em si, persiste mesmo sem ticket aberto.

---

#### P: Como vejo todos os meus contatos?
**R:** Menu lateral → **Contatos**. Tabela mostra nome + número + etiquetas + ações por linha. Header mostra **Contatos ({total})**.

💡 Carrega 300 contatos por vez (chunked). Scroll → carrega mais.

---

#### P: Como busco um contato?
**R:** Topo da tabela → campo **Buscar nome ou número…** (busca em tempo real, filtra enquanto digita).

---

### 4.2 Importar contatos do WhatsApp

#### P: Como importo todos os contatos que já tenho no WhatsApp?
**R:**
1. Página **Contatos** → **[Importar do WhatsApp]** (ícone WhatsApp verde)
2. Modal abre. Escolhe:
   - **Canal** — qual WhatsApp puxar (precisa estar conectado)
   - ☑️ **Pular etiquetas nativas do WhatsApp** (Não lidas, Grupos, Favoritos…) — recomendado on (evita poluir suas etiquetas)
3. **[Importar agora]**
4. Aguarda. Resumo aparece:
   - Contatos totais
   - Contatos novos
   - Etiquetas criadas
   - Duração (segundos)

⚠️ Botão **só aparece** se tem canal conectado sem importação ainda. Após importar, some.

💡 Importa contatos + etiquetas nativas do WhatsApp (se você marcou etiquetas no app). Mensagens **não** vêm — só dados de contato.

---

#### P: Posso importar de planilha CSV ou Excel?
**R:** Atualmente **não pela UI**. Importação é só via WhatsApp conectado. Pra importar via planilha: peça pro suporte (rota admin).

💡 Workaround: salva os números num WhatsApp do celular, importa de lá.

---

#### P: Importei várias vezes — vai duplicar contato?
**R:** Não. Sistema usa **número WhatsApp como chave**. Se já existe, atualiza dados (nome, foto) sem duplicar.

---

### 4.3 Criar / editar contato manual

#### P: Como crio contato manual (sem ele ter mandado mensagem)?
**R:** **Contatos** → **[Adicionar contato]** (canto superior direito).
Form:
- **Nome** (obrigatório)
- **WhatsApp** (opcional — qualquer formato, sistema limpa pra só dígitos)
- **Estado (DDD)** — preenche sozinho com base no número

Opcional na mesma tela — **Fechamento inicial**:
- **Valor (R$)**
- **Serviço** (dropdown ou texto livre)
- **Quantidade**

(Cria ticket fechado já com fechamento associado.)

**[Criar]** → contato salvo.

---

#### P: Como edito contato existente?
**R:** Tabela → linha do contato → ícone ✏️ **[Editar]**. Mesmo form abre pré-preenchido + seções extras (etiquetas + histórico fechamentos).

---

#### P: Como aplico/removo etiquetas em um contato?
**R:** Edita contato → seção **Etiquetas** → checkboxes (cada etiqueta com cor). Marca/desmarca → **[Salvar]**.

💡 Pra criar etiqueta nova → link **"Crie em /etiquetas"** no rodapé do form. Veja Sprint 6.

---

#### P: Onde vejo histórico de vendas/fechamentos desse contato?
**R:** Edita contato → seção **Histórico de Fechamentos**:
- **Total** (R$)
- **Fechamentos** (count)
- **Serviços (qtd)**
- **Último** (data)
- Breakdown por serviço (pílulas: "Tráfego × 2 · R$2.000")

---

#### P: Como deleto contato?
**R:** Tabela → linha → ícone 🗑️ → confirma.
⚠️ Soft-delete (não some do banco mas some da UI). Histórico de tickets continua acessível.

---

### 4.4 Follow-up avulso (no contato)

#### P: Como agendo mensagem futura pra um contato?
**R:** Edita contato → seção **Follow-up** (ou ícone 📅 na linha da tabela). Form:
- **Quando disparar** (data + hora — mínimo 2 minutos no futuro)
- **Quantas mensagens** (botões: 1 / 2 / 3)
- Pra cada mensagem:
  - Texto
  - **Aguardar X segundos** entre uma e outra (mínimo 2)

**[Agendar follow-up]**.

💡 Pode ter vários follow-ups agendados por contato. Lista mostra status:
- 🟡 Agendado
- ✅ Enviado
- 🚫 Cancelado
- 💬 Respondido (cliente respondeu → cancela auto)
- ⚠️ Falha

⚠️ Diferente do follow-up **automático da IA** (Sprint 2). Esse é **manual e único**.

---

#### P: Como cancelo follow-up agendado?
**R:** Lista de follow-ups do contato → card com status **Agendado** → botão **[Cancelar]**.
⚠️ **Enviado** e **Respondido** não dá pra cancelar (já passou).

---

### 4.5 Envio em Massa

#### P: Como mando mensagem em massa pra várias pessoas?
**R:** Menu lateral → **Envio em Massa**. 📍 `/envio-massa`

Hoje só funciona aba **Texto**. (Template / Variável / Relatório = em breve, grayed).

Form:
- **Canal** — qual WhatsApp dispara
- **Delay min (seg)** — padrão 20
- **Delay max (seg)** — padrão 45
- **Mensagem** — texto (suporta `[nome]` mas hoje não substitui ainda)
- **Números** — 1 por linha (formato `5511999999999`)

**[Disparar envio]**.

⚠️ Banner de aviso aparece com **risco de bloqueio**. Recomenda:
- Delays 20-45s entre disparos
- Máximo **50 números por lote**
- Evitar enviar pra quem não te conhece

💡 Sistema dispara **direto via UAZAPI** (MVP — sem fila persistente). Não fecha a aba durante envio.

---

#### P: Quais limites por plano no Envio Massa?
**R:**
- **LITE** (R$138/mês): até **100 mensagens/dia**
- **PRO** (R$195/mês): até **300 mensagens/dia**
- Plano básico R$29: limite muito baixo (não recomendado pra disparo)

Limite é **diário** — zera meia-noite.

---

#### P: Como dispargo pra todos contatos com uma etiqueta?
**R:** Hoje precisa exportar manualmente:
1. **Contatos** → filtra por etiqueta (em desenvolvimento) ou cola números na mão
2. Copia números → **Envio em Massa** → cola no campo Números

💡 Filtro por etiqueta em massa = roadmap próximo.

---

#### P: Posso cancelar envio em andamento?
**R:** Hoje **não** (envio direto sem fila persistente). Pra parar: fecha a aba (interrompe loop no front).
💡 Versão futura terá fila (BullMQ) que permite pausar/cancelar/retomar.

---

#### P: Posso usar variáveis tipo `[nome]` na mensagem?
**R:** Suporta sintaxe `[nome]` mas hoje **não substitui** (placeholder no MVP). Versão futura: `[nome]`, `[saudacao]`, `[empresa]`.

---

#### P: Posso mandar **mídia** (foto/vídeo/PDF) em massa?
**R:** Hoje só **texto** (aba Texto). Mídia em massa = roadmap (aba Template virá com isso).

---

### 4.6 Mensagens Rápidas (atalhos)

#### P: O que são "Mensagens Rápidas"?
**R:** Atalhos pra **reutilizar texto** no chat sem digitar tudo de novo. Ex: comando `/precos` cola tabela de preços. Comando `/horario` cola horário de atendimento.
📍 `/mensagens-rapidas`

💡 Acelera atendimento humano. Útil pra equipes grandes (padroniza respostas).

---

#### P: Como crio uma mensagem rápida?
**R:** **Mensagens Rápidas** → **[Novo atalho]**. Form:
- **Comando (sem espaços)** — texto curto, sistema normaliza pra `/lowercase_underscore`. Ex: digita "Tabela de Preços" → vira `tabela_de_precos`
- **Conteúdo** — texto que vai ser colado quando comando for usado
- ☑️ **Compartilhar com toda agência (global)** — só admin pode marcar. Quando on: todos atendentes da agência usam.

**[Criar]**.

---

#### P: Como uso atalho no chat?
**R:** No campo de digitar mensagem (ver Sprint 1.4), digita `/comando` → ícone ⚡ no input → escolhe atalho → cola conteúdo direto.

Lista de atalhos visíveis: na própria página **Mensagens Rápidas**, cada card mostra comando + conteúdo + botão **[Inserir]** (válido só dentro do iframe do CRM embed).

---

#### P: Como edito ou deleto atalho?
**R:** Card do atalho → ✏️ **[Editar]** ou 🗑️ **[Deletar]**.
⚠️ Só dono do atalho (ou admin) pode editar. Globais só admin edita.

---

#### P: Atalhos globais vs pessoais?
**R:**
- **Pessoais** — só você usa
- **Globais** (marcado pelo admin) — toda equipe usa

💡 Padronize com globais pra mensagens institucionais (horário, política, preços). Pessoais pra anotações próprias do atendente.

---

### 4.7 Grupos

#### P: Para que serve a aba "Grupos"?
**R:** Mostra todos os **grupos de WhatsApp** que o número conectado participa. Você pode:
- Listar JIDs (IDs únicos dos grupos)
- Ver participantes de um grupo
- Exportar planilha XLS

📍 `/grupos`

⚠️ Útil pra: pegar JID pra **Resumo IA** (Sprint 2.11), exportar lista de membros pra envio em massa, gestão.

---

#### P: Como listo os grupos do meu WhatsApp?
**R:**
1. **Grupos** → escolhe **Conexão** (canal WhatsApp)
2. **[Listar IDs dos Grupos]**
3. Tabela aparece com:
   - **ID (JID)** — formato `12345-67890@g.us` (clica pra copiar)
   - **Nome** do grupo
   - **Membros** (count)

---

#### P: Como vejo quem está num grupo específico?
**R:**
1. Lista os grupos primeiro (acima)
2. Dropdown **Grupos** populated → escolhe grupo
3. **[Listar Participantes]**
4. Tabela mostra:
   - Número (formato WhatsApp)
   - **Admin** (badge 🛡️ se for admin do grupo)

---

#### P: Como exporto lista de membros pra Excel?
**R:** Com grupo selecionado → **[Exportar para XLS]**. Baixa `.xlsx` com todos números + status admin.

💡 Sem grupo selecionado, exporta **lista de grupos** (não os participantes).

---

#### P: Pego JID do grupo pra usar onde?
**R:** Principalmente pra **Resumo de Conversa pra Grupo** na IA (Sprint 2.11). Cola JID no campo "JID do grupo" na config de resumo → IA manda resumo automático quando transferir pra humano.

Também pode usar JID em ferramentas custom (IA mandar mensagem direto no grupo).

---

#### P: Preciso ser admin do grupo pra ver/listar?
**R:** **Não** pra listar/exportar. **Sim** se quiser **enviar mensagem como bot do grupo** (depende de regra do grupo — alguns só admin posta).

---

#### P: Quantos grupos consigo listar?
**R:** Sem limite. UAZAPI retorna todos visíveis pelo número. Tabela mostra todos sem paginação (assume < 500).

---

#### P: Como mando mensagem direto pra um grupo (sem ser atendimento)?
**R:** Hoje **não tem botão direto na UI de Grupos**. Workaround:
- Configura ferramenta IA "enviar pro grupo" (Sprint 2.9 custom tool)
- OU **Nova conversa** (Sprint 1.2) → cola JID no campo telefone → cria ticket direto pro grupo

---

### 4.8 FAQ geral

#### P: Diferença entre Contato e Atendimento?
**R:**
- **Contato** = pessoa (nome + número + etiquetas + histórico). Persiste sempre.
- **Atendimento (ticket)** = uma conversa específica. Aberto, pendente ou fechado.

Um contato pode ter **vários tickets** ao longo do tempo (cada vez que abrir conversa).

---

#### P: Importei mas só veio nome — sem mensagens. Por quê?
**R:** Importação **só puxa contatos** (nome, número, etiquetas nativas). Mensagens **vêm em tempo real** quando alguém escreve depois.
💡 WhatsApp **não dá API pra puxar histórico** (só mensagens novas chegam via webhook).

---

#### P: Posso filtrar contatos por etiqueta?
**R:** Hoje **busca** simples (nome / número). Filtro avançado por etiqueta = roadmap.
💡 Workaround: usa **Atendimentos** → Filtros → Etiqueta. Vê todos tickets do contato com etiqueta X.

---

#### P: Quantos contatos cabem no banco?
**R:** Sem limite explícito por plano (só limites de **envio em massa/dia**). Plano padrão suporta dezenas de milhares.

---

#### P: Como exporto contatos pra Excel/CSV?
**R:** Hoje **não tem botão na UI**. Workaround pra exportar:
- Grupos → exportar XLS (se contato tá num grupo)
- Pede pro suporte (rota admin disponível)

---

> **Fim da Sprint 4 (Contatos / Envio Massa / Mensagens Rápidas / Grupos).** Próxima: **Pixel & Vendas + Relatórios + Alertas + Filas + Equipes + Usuários**.

---

<a id="5-pixel-relatorios"></a>
## 5. Pixel & Vendas / Relatórios / Alertas / Filas / Equipes / Usuários

### 5.1 Pixel & Vendas

#### P: O que é "Pixel & Vendas"?
**R:** Sistema que conecta **vendas fechadas no CRM** com **campanhas do Meta Ads** via **CAPI** (Conversion API). Quando você fecha venda no chat (registra fechamento), CRM dispara evento **Purchase** pro Meta indicando qual campanha trouxe esse lead. Resultado: anúncios aprendem e otimizam pra trazer mais leads parecidos.
📍 `/pixel-vendas`

⚠️ **Apenas super_admin** acessa essa página atualmente.

---

#### P: Quais KPIs aparecem aqui?
**R:** Topo da página mostra cards:
- **Gasto em ads** (R$ que você investiu)
- **Faturamento bruto** (R$ que clientes pagaram)
- **Faturamento líquido** (deduz fees Asaas etc)
- **ROAS** (retorno — quantas vezes recuperou o investido)

Filtros:
- **Cliente** (dropdown — filtra por cliente específico)
- **Período** (7 / 14 / 30 / 90 dias)

---

#### P: Como vejo eventos enviados pro Meta?
**R:** Seção **"Vendas enviadas ao Meta (Purchase)"** mostra feed das últimas 50 vendas:
- Status: ✅ enviado / ❌ erro / ⚠️ sem atribuição
- Botão **[Por quê?]** → diagnóstico mostrando: CTWA click-id, pixel usado, campanha original, erros
- Botão **[Reenviar]** se falhou

---

#### P: Quais eventos CAPI são disparados automaticamente?
**R:**
- **Lead** — quando primeira mensagem do cliente chega via anúncio (ad_referral detectado)
- **AddToCart** — quando cliente demonstra interesse (etiqueta "interessado" aplicada)
- **Purchase** — quando fechamento é salvo no painel direito do ticket
- **Refund** — quando você deleta um fechamento (cancela a venda)

---

#### P: Como sei se a venda foi atribuída a uma campanha?
**R:** Cada lead vindo do WhatsApp via clique no anúncio traz **CTWA click-id** (Click-to-WhatsApp). Sistema captura isso no webhook e amarra ao ticket. Quando venda fecha, evento Purchase leva o click-id → Meta reconhece e atribui ao anúncio correto.

⚠️ Se cliente veio via **link compartilhado** (não clicou no anúncio), evento vai sem atribuição → marca **⚠️ sem_atribuicao**.

---

#### P: O que são "Etiquetas por campanha / conjunto" (Atribuições)?
**R:** Mapeamento manual: **etiqueta CRM** ↔ **campanha Meta**. Útil pra atribuir vendas mesmo sem CTWA click-id.

Ex: você cria pasta-mãe "Tráfego Loja A" → etiquetas filhas "Camp Verão", "Camp Inverno" → quando aplica etiqueta no contato, Pixel & Vendas usa pra atribuir venda à campanha certa.

Botão **[Nova Linha]** adiciona etiqueta inline com cor.

---

#### P: O que tem na seção "Pastas" da página Pixel?
**R:** Lista etiquetas-mãe (pastas) que organizam tráfego/campanhas. Hierarquia: **Pasta → Etiquetas filhas**.

Ex:
```
📁 Loja Centro (pasta)
  🏷️ Verão 2026 (etiqueta — campanha)
  🏷️ Inverno 2026
📁 Loja Norte
  🏷️ Black Friday
```

---

### 5.2 Relatórios

#### P: O que são "Relatórios" no CRM?
**R:** Mensagens automáticas que CRM envia em horários definidos pra você (ou pro cliente) com KPIs de campanhas Meta/Google. Ex: "Toda segunda 9h manda performance da semana pro WhatsApp do cliente Fulano".
📍 `/relatorios`

---

#### P: Como crio um relatório agendado?
**R:** **Relatórios** → **[Criar Relatório]**. Form abre:
- **Nome** (ex: "Relatório Felipe Boulanger")
- **Cliente cadastrado** (dropdown) **OU** **Telefone destino** (`+55 11 99999-9999`)
- **Plataforma** (Meta Ads / Google Ads)
- **Canal WhatsApp** ("Qualquer ativo" ou específico)
- **Frequência** (Diário / Semanal / Mensal)
  - Se Semanal → **Dia da Semana** (dropdown)
  - Se Mensal → **Dia do Mês** (1-31)
- **Hora** (HH:MM)
- **Formato** (PDF / Imagem / Texto)
- **Período (dias)** — lookback (1-90)

**[Salvar]**.

---

#### P: Como envio relatório agora (sem esperar o horário)?
**R:** Linha do relatório → botão **[Enviar]**. Dispara imediatamente. Botão **desativa** se `ativo=false`.

---

#### P: Como pauso um relatório sem deletar?
**R:** Toggle 🟢/⚫ na linha. Pausado = não dispara no horário agendado.

---

#### P: Diferença entre formatos PDF / Imagem / Texto?
**R:**
- **PDF** — relatório completo com gráficos + tabelas. Anexo no WhatsApp.
- **Imagem** — captura visual (PNG) com KPIs. Aparece direto no chat.
- **Texto** — só texto formatado (sem mídia). Mais leve, chega instant.

💡 PDF e Imagem usam Puppeteer pra renderizar — gera mais lento.

---

#### P: Posso filtrar relatórios por cliente?
**R:** Topo da lista → campo **Buscar relatório…** filtra por nome ou destinatário. Chips **Todos / Ativos / Inativos** filtram por status.

---

#### P: Quem pode criar relatório?
**R:** Qualquer **Usuário CRM** com `agencia_id` (não exige admin). Cada um vê os próprios + os da agência.

---

### 5.3 Alertas

#### P: Pra que servem "Alertas inteligentes"?
**R:** Notificam você (via WhatsApp) quando algo importante acontece em campanhas. Ex: gasto diário ultrapassou R$500 → manda mensagem pro seu WhatsApp.
📍 `/alertas`

---

#### P: Que tipos de alerta existem?
**R:** Hoje:
- **Gasto do dia** — dispara quando gasto do dia ≥ valor configurado
- **Gasto do mês** — dispara quando gasto do mês ≥ valor

💡 Futuro: alertas de leads sem resposta, queda de CPL, etc.

---

#### P: Como crio alerta novo?
**R:** **[Novo]**. Form:
- **Nome** (ex: "Gasto diário Studios Festas")
- **Tipo** (Gasto do dia / mês)
- **Limite (R$)** — valor decimal, vírgula BR
- **Conta Meta Ads** (dropdown — vem das integrações)
- **Cliente** (opcional — organização)
- **WhatsApp destino** (`5511999990000` — DDI+DDD+número)
- **Canal de envio** (qual WhatsApp dispara)
- **Mensagem** (template com placeholders):
  - `{{conta}}` — nome da conta Meta
  - `{{gasto}}` — valor atual gasto
  - `{{limite}}` — limite configurado
  - `{{tipo}}` — dia/mês

Preview WhatsApp em tempo real ao lado do form.

**[Salvar]**.

---

#### P: Como testo se o alerta dispara?
**R:** Linha do alerta → **[Testar agora]**. Força dispatch sem esperar threshold ser atingido.

---

#### P: Como pauso alerta?
**R:** Toggle 🟢/⚫ na linha.

---

#### P: Onde vejo histórico de quando alertas dispararam?
**R:** Linha do alerta mostra "**último disparo / observado**" — última vez que rodou + último valor observado.

---

### 5.4 Filas

#### P: O que são Filas?
**R:** Categorias pra organizar tickets em **Atendimentos**. Ex: "Vendas", "Suporte", "Cobrança". Ticket pode ser transferido entre filas.
📍 `/filas`

⚠️ Apenas **admin** acessa.

---

#### P: Como crio fila?
**R:** **Filas** → form lateral:
- **Nome** (ex: "Vendas")
- **Cor** (color picker — padrão roxo #9B7DBF)
- **Descrição** (opcional)

**[Criar]**.

---

#### P: O que são as filas com **cadeado** (fixas)?
**R:** Filas do sistema que **não podem ser deletadas/renomeadas**:
- **🤖 IA Atendendo** — tickets onde IA tá respondendo sozinha
- **👤 Atendimento Humano** — tickets onde alguém da equipe assumiu

⚠️ Você pode editar **cor e descrição** delas, mas não nome nem deletar.

---

#### P: Como troco a cor de uma fila?
**R:** Linha → ✏️ **[Editar]** → color picker abre → salva. Funciona até pra filas fixas.

---

#### P: Como deleto fila?
**R:** Linha → 🗑️ **[Deletar]** → confirma. ⚠️ Filas fixas **não tem** botão deletar.

---

#### P: Tickets na fila deletada vão pra onde?
**R:** Volta pra **Atendimento Humano** (fila padrão fixa). Sem perder histórico.

---

### 5.5 Equipes

#### P: O que são "Equipes"?
**R:** Agrupamento lógico de usuários. Ex: "Equipe Vendas", "Equipe Suporte". Útil pra atribuir tickets ou organizar permissões.
📍 `/equipes`

⚠️ Apenas **admin** acessa.

---

#### P: Como crio equipe?
**R:** Form lateral:
- **Nome** (ex: "Equipe Suporte")
- **Descrição** (opcional)

**[Criar]**. Depois você atribui usuários em **Usuários > Equipes** (5.6).

---

#### P: Como atribuo usuários à equipe?
**R:** Em **Usuários** → edita usuário → seção **Equipes** → marca checkboxes. Um usuário pode estar em **várias equipes**.

---

### 5.6 Usuários (do CRM)

#### P: Quem são os "Usuários" do CRM?
**R:** Pessoas que **logam no painel** pra atender clientes. Cada uma tem nome, email, telefone, foto, perfil (role) e equipes.
📍 `/usuarios`

⚠️ Apenas **admin** ou **super_admin** acessa.

💡 Antes essa categoria chamava "Admins". Agora se chama **Usuários do CRM**.

---

#### P: Como crio Usuário CRM novo?
**R:** **Usuários** → **[Novo usuário]**. Form:
- **Nome**
- **Email** (login)
- **Senha**
- **Telefone** `(00) 00000-0000`
- **Perfil**:
  - **Atendente** — vê atendimentos, sem admin
  - **Administrador** — gere canais, IA, equipes, usuários
  - **Super Admin** — tudo (só aparece se você for super_admin)
- ☑️ **Habilitado (vê só próprios tickets)** — usuário restrito
- **Equipes** (checkbox múltiplas)
- **Permissões de Menu** (collapsible) — fine-grained acesso por menu (Dashboard, Atendimentos, IA, etc)
- **Config SIP (em breve)** — VoIP futuro
- **Horário de Atendimento** — tabela Dia/Status/1º período/2º período

**[Criar usuário]**.

---

#### P: Qual a diferença entre Atendente / Administrador / Super Admin?
**R:**
- **Atendente** (role=`atendente`/`operador`)
  - Acessa Atendimentos, Contatos, Mensagens Rápidas
  - Vê tickets atribuídos ou todos (config)
  - Não cria canal, não muda IA, não convida usuários
- **Administrador** (role=`admin`)
  - Tudo do atendente +
  - Cria/edita canais, IA, filas, equipes, usuários
  - Configura etiquetas, prompts IA, alertas, relatórios
- **Super Admin** (role=`super_admin`)
  - Tudo do admin +
  - Acessa Pixel & Vendas, gerencia servidores UAZAPI globais, multi-agência, MCP tokens

---

#### P: O que faz "Habilitado (vê só próprios tickets)"?
**R:** Restringe atendente a **ver só os tickets atribuídos a ele**. Outros tickets ficam invisíveis. Útil pra equipes grandes com regras de privacidade.

⚠️ Quando off (padrão): atendente vê **todos** tickets da agência.

---

#### P: O que são "Permissões de Menu"?
**R:** Fine-grained: marca exatamente quais itens de menu lateral cada usuário vê. Ex: Atendente padrão NÃO vê Pixel & Vendas, mas você pode marcar pra liberar.

Grid 3 colunas com todos os 20+ itens de menu.

---

#### P: O que faz "Horário de Atendimento"?
**R:** Define horário em que **usuário aparece como Online** automaticamente. Tabela com:
- **Dia** (Seg, Ter…)
- **Status** (Aberto / Fechado)
- **1º período** (HH:MM-HH:MM)
- **2º período** (intervalo almoço, opcional)

⚠️ Roadmap: roteamento de tickets respeita horário (só dá pra usuário online).

---

#### P: Como desativo um usuário sem deletar?
**R:** Tabela → toggle 🟢/⚫ na linha. Desativado:
- Não consegue logar
- Não recebe tickets novos
- Histórico preservado

Tooltip do toggle muda entre "Desativar usuário" / "Ativar usuário".

---

#### P: Como deleto usuário?
**R:** Tabela → 🗑️ → confirma. **Soft-delete** (registro fica no banco mas some da UI).
💡 Use **desativar** sempre que possível — mais reversível.

---

#### P: Como mudo perfil de usuário existente?
**R:** Tabela → ✏️ → form pré-preenchido → muda **Perfil** dropdown → **[Salvar]**.

---

#### P: Como mudo a senha de outro usuário (admin reset)?
**R:** Edita usuário → campo **"Nova senha (deixe em branco para manter)"** → preenche → salva. Usuário precisa logar com nova senha.

---

#### P: Posso ver quem está online agora?
**R:** Tabela tem indicador verde 🟢 **Online** / cinza ⚫ **Offline** por linha. Atualiza em tempo real.

---

#### P: Existe limite de usuários por plano?
**R:** Veja **Plano** (Sprint 7) — KPI "Usuários ativos". Plano cobra por **conexão WhatsApp**, não por usuário. Mas pode ter mudanças futuras.

---

> **Fim da Sprint 5 (Pixel / Relatórios / Alertas / Filas / Equipes / Usuários).** Próxima: **Configurações + Integrações**.

---

<a id="6-configuracoes"></a>
## 6. Configurações + Integrações

### 6.1 Etiquetas

#### P: Onde gerencio etiquetas?
**R:** Menu lateral → ⚙️ **Configurações** → **Etiquetas**. 📍 `/configuracoes/etiquetas`

---

#### P: Diferença entre **Pasta** e **Etiqueta**?
**R:**
- **Pasta** (etiqueta-mãe) — agrupa etiquetas similares. Ex: "Tráfego Pago"
- **Etiqueta** (filha) — vai dentro da pasta. Ex: "Camp Verão", "Camp Inverno"

Hierarquia visual:
```
📁 Tráfego Pago (pasta)
  🏷️ Camp Verão 2026
  🏷️ Camp Inverno 2026
📁 Suporte
  🏷️ Cliente irritado
  🏷️ Bug reportado
```

⚠️ Pasta = etiqueta-mãe sem ser filha de ninguém. Não tem tipo "pasta" no banco — é só uma etiqueta normal que outras apontam pra ela.

---

#### P: Como crio etiqueta?
**R:** Topo: **NOVA ETIQUETA** form:
- **Nome** (input texto)
- **Pai** (dropdown — escolhe pasta ou deixa raiz)
- **Cor** — paleta de 6 swatches + color picker custom

**[Criar]**.

---

#### P: Como faço etiqueta automática (palavra-chave)?
**R:** Edita etiqueta → seção **Palavras-chave gatilho**:
- Input pra cada palavra/regex (ex: `desconto`, `reclamação`, `cancelar`)
- Botão **[+ Adicionar mais]** pra novas
- Botão **[Remover]** por linha

Quando cliente mandar mensagem contendo qualquer palavra/regex, etiqueta é aplicada **automaticamente** no contato.

💡 Aceita **regex simples**. Ex: `(desc|promo)` casa "desconto" ou "promoção".

---

#### P: Posso definir mensagem auto-resposta por etiqueta?
**R:** Sim. Edita etiqueta → seção **Mensagem automática** (textarea). Quando etiqueta for aplicada (manual ou auto), IA pode usar essa mensagem como resposta padrão.

⚠️ Hoje serve mais como **referência interna** — IA só dispara automático em fluxos configurados em ferramentas (Sprint 2.9).

---

#### P: Como movo etiqueta pra outra pasta?
**R:** Linha → dropdown **Pasta** → escolhe destino → salva.

---

#### P: Como desativo etiqueta sem deletar?
**R:** Edita → checkbox **Ativo** → desmarca. Etiqueta some da UI mas tickets antigos preservam.

---

### 6.2 API IA (multi-chave)

#### P: Onde gerencio chaves de API?
**R:** **Configurações > API (IA)**. 📍 `/configuracoes/ia`

Cards separados por provider: **Groq / OpenAI / Anthropic**.

---

#### P: Por que ter várias chaves do mesmo provider?
**R:** **Rotação + fallback**. Se 1 chave atingir limite diário, sistema usa a próxima da fila. Aumenta capacidade total + reduz risco de IA parar.

💡 Útil pra Groq (limite gratuito generoso por chave — várias chaves multiplicam).

---

#### P: Como adiciono uma chave?
**R:** Card do provider → **[+ Adicionar chave]** (expande form):
- **Apelido** (opcional — ex: "Groq pessoal", "OpenAI agência")
- **Chave** (campo password)

**[Adicionar chave]**.

---

#### P: Como testo se chave está válida?
**R:** Linha da chave → **[Testar]**. Faz chamada dummy ao provider → retorna OK ou erro.

---

#### P: Como vejo a chave em texto puro?
**R:** Linha → **[Revelar]** (toggle). Mostra até clicar de novo.

---

#### P: Como defino limite diário de follow-ups por chave?
**R:** Linha → campo **Máx. follow-ups/dia** → digita número → **[Salvar]**.
- 0 = ilimitado
- 100 = para de usar depois de 100 follow-ups/dia

⚠️ Não conta atendimentos normais — só follow-ups automáticos.

---

#### P: Como deleto chave?
**R:** Linha → 🗑️ → confirma. Sistema usa próxima da fila automático.

---

#### P: Como escolho qual provider é o padrão pra chat / transcrição?
**R:** Topo da página → **Provider Card** com selects:
- **Provider chat** (padrão pra IA conversar) — Groq / OpenAI / Anthropic
- **Provider transcrição** (padrão pra transcrever áudio) — geralmente OpenAI Whisper

---

### 6.3 Prompts IA

#### P: O que são "Prompts IA" configuráveis?
**R:** Prompts dos 3 sistemas internos:
- **Sentimento** — analisa humor do cliente (painel direito > Atend. > Analisar sentimento, Sprint 1.6)
- **Resumo** — gera resumo de conversa (Resumo pra grupo, Sprint 2.11)
- **Sugestão** — IA Assist pra atendente (Sprint 1.4)

📍 `/configuracoes/ia-prompts`

---

#### P: Como edito um prompt?
**R:** Card do prompt → muda **conteúdo** (textarea) → **[Salvar]**.

Cada prompt tem:
- **Escopo** — agência (só sua) ou global (super_admin)
- **Modelo Groq** — modelo padrão (llama-3.3-70b)
- **Conteúdo** — texto do prompt

---

#### P: Como volto pro prompt padrão?
**R:** **[Voltar ao default]** — remove override da agência, usa global.

---

### 6.4 Asaas (Pagamentos)

#### P: Como conecto Asaas?
**R:** **Configurações > Asaas**. 📍 `/configuracoes/asaas`

Form:
- **API Key** (campo password — pega no painel Asaas)
- **Ambiente** (Produção / Sandbox)
- ☑️ **Ativo**

**[Salvar]**.

---

#### P: Como configuro chave PIX padrão?
**R:** Mesma página, seção **Configuração PIX**:
- **Tipo de chave** (EVP / CPF / CNPJ / E-mail / Telefone)
- **Chave PIX**
- **Nome recebedor**
- **Mensagem padrão** (descrição que aparece na cobrança)

---

#### P: Como configuro CPF/CNPJ padrão pra cobrança nominal?
**R:** Seção **CPF/CNPJ padrão**:
- **CPF/CNPJ** (fallback titular)
- **Nome padrão** (fallback nome)

Usado quando cobrança não tem dados do cliente.

---

#### P: Como mando mensagem auto após pagamento?
**R:** Campo **Mensagem auto pós-pagamento**. Quando Asaas notifica pagamento confirmado, CRM manda essa mensagem pro cliente no chat.

Ex: "Pagamento recebido! Bem-vindo(a). Em breve nossa equipe entra em contato."

---

#### P: Como cobro cliente pelo chat?
**R:** Vá pra **Atendimentos** → ticket → painel direito → seção **Cobrança** (ver Sprint 1.6). Asaas precisa estar **ativo** aqui pra funcionar.

---

### 6.5 Integrações Meta Ads / Google Ads

#### P: Como conecto Meta Ads?
**R:** **Integrações** → **Meta Ads** → **[Conectar Meta Ads]** → fluxo OAuth Facebook abre → autoriza → seleciona ad accounts.

📍 `/integracoes/meta`

---

#### P: Como sincronizo campanhas Meta?
**R:** Card do cliente → **[Sincronizar]**. Puxa: campanhas, ad sets, ads, métricas (gasto, impressões, cliques, conversões).

---

#### P: O que faz "Sincronizar Pages"?
**R:** Puxa **fanpages** vinculadas à conta (usado pra targeting + analytics).

---

#### P: Como desconecto Meta?
**R:** Card → **[Desconectar]**. Revoga OAuth. Métricas antigas ficam.

---

#### P: Google Ads também?
**R:** Tela `/integracoes/google` existe mas é **wizard pré-OAuth** (não conecta de verdade ainda). Roadmap futuro.

---

### 6.6 MCP (acesso programático)

#### P: O que é "MCP"?
**R:** Model Context Protocol — tokens pra integrar CRM com **Claude / Cursor / outros LLMs externos** via API. Útil pra automação avançada (ex: Claude na sua máquina ler tickets do CRM).
📍 `/configuracoes/mcp`

⚠️ Geralmente uso interno super_admin.

---

#### P: Como gero token MCP?
**R:**
- **Nome** (rótulo)
- **Dias expiração** (TTL)

**[Gerar token]** → copia token (mostrado uma única vez).

---

#### P: Como revogo token MCP?
**R:** Tabela → **[Revogar]** → invalida imediatamente.

---

> **Fim da Sprint 6 (Configurações + Integrações).** Próxima: **Marca + Conta + Plano + Dashboard**.

---

<a id="7-marca-perfil-plano-dashboard"></a>
## 7. Marca / Meu Perfil / Plano / Dashboard

### 7.1 Marca / Logo

#### P: Como personalizo logo da agência?
**R:** **Configurações > Marca**. 📍 `/configuracoes/marca`

Upload arquivo (PNG / JPEG / WebP / SVG) → seção **EXIBIÇÃO** → escolhe modo:
- 🅰️ **Só texto** — mostra nome da agência
- 🖼️ **Só logo** — mostra só logo
- 🅰️🖼️ **Logo + texto** — ambos

---

#### P: Como ajusto tamanho do logo?
**R:** Slider **Tamanho logo** (24px - 200px). Preview ao lado atualiza tempo real.

⚠️ Sidebar do CRM cresce verticalmente se logo grande. Veja preview antes de salvar.

---

#### P: Logo + texto fica horizontal ou vertical?
**R:** Quando modo **Logo + texto**, escolhe **ORIENTAÇÃO**:
- ↔️ **Horizontal** (lado a lado)
- ↕️ **Vertical** (logo em cima, texto embaixo)

---

#### P: Como removo logo (voltar pro padrão)?
**R:** ☑️ **Remover logo** → **[Salvar]**. Volta pra "Só texto" com nome da agência.

---

#### P: Onde aparece a marca personalizada?
**R:**
- **Sidebar** (topo, marca da agência)
- **Login** (página inicial)
- **Relatórios** (PDF gerado)

---

### 7.2 Meu Perfil

#### P: Como mudo minha foto?
**R:** Menu superior direito (avatar) → **Meu Perfil**. 📍 `/conta`

Seção **Avatar** → **[Trocar foto]** → escolhe arquivo → upload.
Ou **[Remover]** pra voltar pra inicial gerada.

---

#### P: Como troco meu nome / telefone?
**R:** Mesma página → seção **Perfil**:
- **Nome** (input)
- **Telefone** (formato tel)

**[Salvar perfil]**.

---

#### P: Como troco minha senha?
**R:** Seção **Alterar senha**:
- **Nova senha** (mínimo 6 chars)
- **Confirmar**

**[Trocar senha]**.

⚠️ Próximo login pede a nova.

---

#### P: Esqueci a senha. Como reseto?
**R:** Tela login → **[Esqueci a senha]** → digita email → recebe link de reset.
💡 Se for super_admin / admin, qualquer admin pode resetar de outro usuário em **Usuários** (Sprint 5.6).

---

### 7.3 Plano

#### P: Onde vejo meu plano atual?
**R:** Menu lateral → **Plano Pro**. 📍 `/plano`

Mostra:
- **Valor mensal** (R$29/mês por conexão)
- KPIs:
  - **Canais conectados**
  - **Usuários ativos**
  - **Total mensal** (R$ calculado)

---

#### P: Como pago o plano?
**R:** Link **[Pagar plano]** → abre WhatsApp do admin do sistema. Pagamento via Asaas, fluxo manual.
💡 Roadmap: integração direta Asaas + cobrança automática mensal (em breve).

---

#### P: Quanto custa adicionar conexão extra?
**R:** Hoje pricing fixo: **R$29 por conexão** (1ª inclusa no plano básico, próximas custam extra).

Para volumes maiores:
- **LITE** R$138/mês — até **100 mensagens/dia**
- **PRO** R$195/mês — até **300 mensagens/dia**

Múltiplas conexões (2-7) podem ter desconto R$19 cada extra. Fala com admin pra detalhar.

---

#### P: Onde estão as Perguntas Frequentes do Plano?
**R:** Mesma página → seção **Perguntas frequentes** → accordion expandível com 12+ perguntas: cobrança, cancelamento, mudança de plano, suporte, etc.

---

#### P: Como cancelo plano?
**R:** Pelo link de pagamento (mesmo WhatsApp). Suporte processa baixa. Dados ficam preservados 30 dias antes de purge.

---

### 7.4 Dashboard

#### P: O que mostra o Dashboard?
**R:** Painel principal com KPIs e gráficos de **performance de tráfego** + **atendimentos / vendas**.
📍 `/dashboard` (também é a home após login)

---

#### P: Como filtro por período?
**R:** Topo → botões **[Hoje] [7 dias] [30 dias]**. Ou **[Período X a Y]** abre date inputs custom (De / Até + **[Aplicar]**).

---

#### P: Tem 2 visões (Campanhas vs Atendimentos)?
**R:** Sim. Toggle **[Atendimentos] [Campanhas]** no topo:
- **Atendimentos** — métricas de vendas/serviços fechados no CRM
- **Campanhas** — métricas de ads (Meta + Google)

---

#### P: Quais KPIs Financeiros aparecem?
**R:**
- **Investido** (R$ gasto em ads)
- **Faturamento** (R$ vendas CRM)
- **Lucro Bruto** (Faturamento - Investido)
- **ROAS Bruto** (retorno múltiplo)

---

#### P: Quais KPIs de Tráfego?
**R:**
- **Impressões** (alcance dos ads)
- **Cliques** (CTR%)
- **CPL** (custo por lead)
- **CAC** (custo de aquisição)

---

#### P: Quais gráficos tem no Dashboard?
**R:**
- **Gasto vs Receita** (line chart, série diária)
- **Status Donut** (donut com status campanhas: ativas / pausadas / encerradas)
- **Top Campanhas** (bar chart top 5 por gasto)
- **Criativos Top** (grid 6 melhores ads — imagens + métricas)
- **Atendimentos Live** (vendas em tempo real)

---

#### P: Posso filtrar por cliente / campanha específica?
**R:** Topo → **Plataforma selector** (Meta / Google) + filtros específicos. Quando seleciona 1 cliente, todos KPIs e gráficos recalculam pra ele.

---

#### P: Dashboard atualiza em tempo real?
**R:** KPIs financeiros = polling 60s. Atendimentos Live = realtime (Supabase channel). Refresh manual (F5) pra forçar tudo.

---

#### P: Por que ROAS aparece como "—"?
**R:** Cálculo precisa de **Investido > 0** E **Faturamento > 0**. Se um deles zerou no período, mostra `—`.

---

### 7.5 FAQ geral final

#### P: Como faço logout?
**R:** Avatar canto superior direito → **Sair**.

---

#### P: Posso ter várias agências numa conta?
**R:** Hoje 1 conta = 1 agência. Super_admin acessa várias agências num mesmo painel administrativo (uso interno).

---

#### P: Como mudo tema (claro/escuro)?
**R:** Avatar → ⚙️ → tema. Padrão: escuro.

---

#### P: Tem app mobile nativo?
**R:** Não. CRM é **web responsivo** — funciona perfeito no celular pelo navegador.
💡 Pode "Adicionar à tela inicial" no Chrome/Safari pra virar quase nativo (PWA).

---

#### P: Funciona offline?
**R:** Não. CRM precisa de internet pra sincronizar com Supabase + UAZAPI.

---

#### P: Posso integrar com outras ferramentas (Notion / Sheets / Zapier)?
**R:** Roadmap. Hoje integração avançada só via **MCP tokens** (Sprint 6.6) pra LLMs externos.

---

> **Fim do Tutorial FAQ Sonar CRM.**
>
> **Próximas fases (após revisão):**
> - **Fase 1** — Plugar FAQ no Assistente IA (botão 🤖 Suporte CRM) com busca + links clicáveis internos
> - **Fase 2** — Expandir Robô Guia (RoboGuia) com tours apontando botão a botão pra cada fluxo aqui mapeado
