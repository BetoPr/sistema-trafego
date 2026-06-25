export const ATENDIMENTOS = `# Atendimentos — Chat WhatsApp no CRM

Rota: /atendimentos

## 3 abas (status do ticket)
- **Abertos**: você ou equipe está atendendo. Conversa ativa.
- **Pendentes**: cliente mandou msg e ninguém pegou. Tem botão **Atender** verde aparecendo no hover da foto.
- **Fechados**: tickets encerrados (arquivados). Histórico read-only.

Default ao entrar: mostra Abertos + Pendentes juntos.

## Robô verde 🤖 no card
Indica IA respondendo sozinha. Aparece SÓ quando:
1. Perfil IA configurado pro canal E
2. IA não está pausada nesse ticket

**Quando humano manda mensagem, IA pausa automático.** Pra reativar: ticket → painel direito → aba "Atend." → toggle "IA Atendendo".

## Cores do tempo
- 🟢 verde = agora/minutos
- 🟡 amarelo = horas
- 🔴 vermelho = dias+ (urgência)

## Botões topo da lista
- 🔔 **Som de notificação** — toggle (persiste localStorage)
- ➕ **Nova conversa** — abre balão pedindo telefone + canal conectado + nome opcional. Cria ticket em Abertos.
- 📊 **Log de fechamentos** — modal com tabela: contato, ticket, serviço, valor R$, data, quem fechou. Deletar fechamento cancela CAPI no Meta.
- 🔧 **Filtros** — modal com seções: Status, Período, Conexões, Filas, Usuário, Etiqueta. Toggles topo: "Mostrar todos", "Incluir fechados", "Somente não lidos", "Inverter ordem".
- 🔍 **Buscar mensagem** — full-text dentro das mensagens (não só nome contato).
- 📶 **Indicador conexão** — 🟢 connected / 🟡 connecting / 🔴 disconnected. Clica pra alternar visão.
- ♻️ **Refresh** — força pull. Geralmente desnecessário (realtime + polling 15s).

Campo "Buscar nome/número/ticket" filtra **só a lista carregada** (cliente-side), não busca mensagens.

## Pendentes — espiar antes de atender
- Ícone 👁️ olho verde no card → abre balão read-only com mensagens. Tem botão **Atender** no rodapé.
- Hover foto contato → aparece botão verde **Atender** sobreposto.

Atender → ticket vai pra Abertos com você como atendente.

## Chat (mensagens)
Campo de digitar mensagem (rodapé):
- 😀 **Emoji picker** (45+ comuns)
- 📎 **Clipe (anexar)** menu: 🖼️ Imagem, 🎬 Vídeo, 📄 Documento — pode mandar vários de uma vez (thumbnails abaixo do input)
- 🎤 **Microfone** — grava áudio, contador segundos, [Parar e enviar] ou [Cancelar]
- ✨ **IA Assist** — gera resposta sugerida em 4 estilos: **Profissional**, **Simpático**, **Marketing**, **Ortografia** (só corrige). Consome tokens.

Long-press / hover na mensagem → menu:
- **Responder** — modo cita-resposta
- **Copiar** — clipboard
- **Reagir** — barra 6 emojis (👍❤️😂😯😢🙏). Cliente recebe reação no WhatsApp.
- **Apagar** — "Pra mim" (só CRM) ou "Pra todos" (deleta no WhatsApp do cliente também). "Pra todos" só funciona se enviada há pouco.

⬇️ Botão flutuante seta-pra-baixo aparece ao rolar pra cima → volta ao final.

## Cabeçalho do chat
- **Encerrar** — vai pra Fechados. Antes de encerrar registre o fechamento (painel direito > Perfil > Fechamento) pra disparar CAPI.
- **Retornar à fila** — volta pra Pendentes (libera pra outro pegar).
- **Transferir** submenu:
  - **Pra fila** — escolhe fila destino
  - **Pra usuário** — escolhe atendente
  - **Pra canal** — manda pra outro número WhatsApp. Manda msg "Transferindo pra X" pro cliente. Só funciona se canal destino conectado.

## Painel direito (4 abas: Perfil / Atend. / Mídias / Util.)

### Perfil
- Card contato: foto (clica zoom), nome, telefone, DDD/Estado. Botão **Editar** abre balão.
- **Etiquetas** — chips com cor. Botão **+ Adicionar etiqueta** abre picker. Remove com ❌ na chip.
- **Fechamento**: Valor R$, Serviço (dropdown), Quantidade. Botão **Salvar fechamento** → vai pro Log + dispara CAPI Purchase. Pode ter vários fechamentos no mesmo ticket.
- **Cobrança Asaas** ($ Cobrança verde no topo do chat também): balão escolhe PIX ou Cartão, valor, descrição, parcelas. Retorna QR code + copia-cola (PIX) ou link (cartão). Botão "Enviar pro cliente no chat".
- **Notas** — textarea privada. Cliente NÃO vê. Botão "Log de notas" histórico.
- **Log do ticket** — histórico mudanças de status/fila/usuário.

### Atend.
- **Toggle IA Atendendo** — liga/desliga IA nesse ticket. Robô verde ativo / cinza pausada.
- **Análise de Sentimento** — botão ✨ "Analisar sentimento". IA classifica: muito_bom/bom/neutro/ruim com % confiança + trecho. Roda UMA VEZ por ticket (trava 🔒). Reanalisar = comando admin.

### Mídias
Todas as mídias que esse contato já trocou em TODOS os tickets. Sub-abas:
- 📷 Fotos / 🎬 Vídeos / 🎙️ Áudios / 📄 Docs / 🔗 Links
Link "Abrir conversa" pula pro ticket onde apareceu.

### Util.
- **Criar follow-up nesta conversa** — modal com até 3 mensagens em datas/horas específicas. Cancela sozinho se cliente responder.
- **Baixar PDF** — exporta conversa toda.
- **Imprimir** — janela impressão.
- **Remover dados sensíveis** (vermelho 🗑️) — LGPD: apaga nome/telefone/email/CPF. Mensagens ficam. Irreversível.

Painel direito esconde em status=pendente (só mostra mensagens, sem detalhe).

## Multi-número
- Vários WhatsApp = todos caem em /atendimentos unificado.
- Cada ticket mostra badge do canal.
- Filtrar 1 canal: Filtros > Conexões.

## IA pausa quando humano intervém
- IA pausa imediato ao você mandar qualquer msg manual.
- Reativar manual: painel direito > Atend. > toggle "IA Atendendo".
- Ticket muda automático entre filas fixas "IA Atendendo" e "Atendimento Humano".

## Apagar / editar mensagem do lado do cliente
- Se cliente apagar: marca 🗑️ "apagada pelo cliente" mas conteúdo original continua visível no CRM.
- Se cliente editar: ✏️ "editada" com original + nova versão.

## Pagination & realtime
- Carrega 20 tickets inicial. Scroll baixo = +20.
- Atualização em tempo real (Supabase realtime + fallback polling 15s).

## Problemas comuns
- Ticket sumiu: provavelmente foi fechado (aba Fechados) OU filtros ativos. Botão "Mostrar todos" dentro de Filtros zera.
- Mensagens não chegam: canal disconnected. Veja /canais.
- IA não responde: chave Groq quebrada ou IA pausada. /configuracoes/ia + painel direito > Atend.
`;
