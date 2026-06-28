"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    RoboGuia?: {
      init: (cfg: unknown) => void;
      start: (id: string) => boolean;
      ask: (text: string) => boolean;
      stop: () => void;
      registerTours: (arr: unknown[]) => void;
      resetOnboarding: () => void;
    };
  }
}

/**
 * Carrega /public/robo-guia.js uma vez no app e configura tours.
 * Renderiza apenas no client (script tag injetado).
 *
 * Marque elementos do CRM com `data-guide="<chave>"`.
 * Use window.RoboGuia.start('id') ou .ask('texto livre') pra abrir.
 */
export function RoboGuia() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (document.getElementById("robo-guia-script")) return;

    const s = document.createElement("script");
    s.id = "robo-guia-script";
    s.src = "/robo-guia.js";
    s.async = true;
    s.onload = () => {
      if (!window.RoboGuia) return;
      window.RoboGuia.init({
        color: "#00E19A",
        chat: false, // chat principal é o ChatDrawer (Assistente IA). RoboGuia só executa tours.
        fallback: "Sou o Otto e ainda não aprendi isso 😅 — manda outra ou pergunta mais específico.",
        tours: [
          // ===== ATENDIMENTOS =====
          {
            id: "atender",
            intents: ["atender", "chat cliente", "responder cliente", "atendimento", "ver atendimentos", "ver conversas", "ver mensagens", "como atender"],
            steps: [
              { target: "nav-atendimentos", text: "Clique em **Atendimentos** no menu. Vê 3 abas: Abertos, Pendentes, Fechados." },
            ],
            done: "Pendentes = ninguém atendeu ainda. Hover na foto → botão **Atender** verde aparece. ✅",
          },
          {
            id: "transferir_humano",
            intents: ["transferir humano", "passar pra humano", "passar pra mim", "tirar ia"],
            steps: [
              { target: "nav-atendimentos", text: "Em **Atendimentos**, abre o ticket → no chat, no cabeçalho clique em **Transferir** → escolha **Pra fila** ou **Pra usuário**." },
            ],
            done: "Ou: IA pausa automático quando você manda mensagem manual. ✅",
          },
          {
            id: "pausar_ia_ticket",
            intents: ["pausar ia", "desligar ia ticket", "ia parar", "ia retomar", "reativar ia"],
            steps: [
              { target: "nav-atendimentos", text: "Abre o ticket → painel direito → aba **Atend.** → toggle **IA Atendendo** (verde = ativa)." },
            ],
            done: "IA pausa sozinha quando você manda mensagem. Pra reativar é manual. ✅",
          },
          {
            id: "cobranca_chat",
            intents: ["cobrar cliente", "pix no chat", "cartao no chat", "gerar cobranca", "asaas chat"],
            steps: [
              { target: "nav-atendimentos", text: "Abre o ticket → painel direito → seção **Cobrança** (ou botão verde **$ Cobrança** no topo do chat). Escolhe PIX ou Cartão, valor, descrição." },
            ],
            done: "Gera QR code (PIX) ou link (cartão). Botão **Enviar pro cliente** manda no chat. Precisa Asaas ativo em Configurações. ✅",
          },
          {
            id: "registrar_fechamento",
            intents: ["registrar venda", "fechamento", "salvar fechamento", "registrar fechamento"],
            steps: [
              { target: "nav-atendimentos", text: "Abre ticket → painel direito → aba **Perfil** → seção **Fechamento** → Valor R$, Serviço, Quantidade → **Salvar fechamento**." },
            ],
            done: "Vai pro Log + dispara evento CAPI Purchase no Meta. ✅",
          },

          // ===== IA ATENDIMENTO =====
          {
            id: "ia_criar",
            intents: ["criar ia", "nova ia", "configurar ia", "perfil ia", "primeira ia", "ativar ia", "ligar ia", "ia comecar"],
            steps: [
              { target: "nav-ia-atendimento", text: "Clique em **IA** no menu." },
              { target: "ia-novo-perfil", text: "Clique em **Novo perfil**. Escolhe template (Vendedor/Suporte/Biscoito) ou em branco." },
            ],
            done: "Preencha Nome, Chave API (Groq/OpenAI/Anthropic), Modelo. Vá em Comportamento configurar prompt. ✅",
          },
          {
            id: "configurar_ia_atendente",
            intents: ["configurar ia atendente", "ia atendente", "atendente ia", "setup ia", "como integrar ia", "tutorial ia", "passo a passo ia", "como configurar ia"],
            steps: [
              { target: "nav-ia-atendimento", text: "Clique em **IA** no menu." },
              { target: "ia-novo-perfil", text: "Agora em **+ Novo perfil**." },
              { text: "Vou te ensinar a configurar a IA do começo ao fim. Tem 4 abas: **Dados / Comportamento / Configurações / Canais**. Vamos uma de cada vez.", btn: "Bora ▸" },
              { text: "**Passo 1: Template.** Se aparecer cards no topo, escolhe um pronto:\n• **Vendedor** — fecha venda\n• **Suporte** — paciente, escala humano\n• **Tráfego pago / Biscoito** — entrega lead magnet\n\nClica em um pra preencher tudo de uma vez. Pode editar depois.", btn: "Próximo ▸" },
              { text: "**Passo 2: Nome + Status.**\n\n• **Nome do perfil** — interno (cliente não vê). Ex: `IA Vendas Loja Centro`.\n• ☑️ **Ativo** — marca pra IA responder em produção.\n• **Descrição** — opcional, lembrete pra você.", btn: "Próximo ▸" },
              { text: "**Passo 3: Chave API.**\n\nCola sua chave do provider escolhido:\n• **Groq** (recomendado começar — grátis): `gsk_...` em console.groq.com\n• **OpenAI**: `sk-...` em platform.openai.com\n• **Anthropic** (Claude): `sk-ant-...` em console.anthropic.com\n\nDepois clica em **Testar chave** pra validar.", btn: "Próximo ▸" },
              { text: "**Passo 4: Modelo.**\n\nDropdown mostra todos os modelos do provider. Cada um tem 4 métricas:\n• **Custo** ⭐ — barato a caro\n• **Velocidade** ⚡ — lenta a rápida\n• **Contexto** — quanto histórico cabe\n• **Suporta ferramentas** — necessário pra tools (etiquetar, transferir, biscoito)\n\nPra começar: **Groq Llama 3.3 70B** (barato + rápido + tools).", btn: "Próximo ▸" },
              { text: "**Passo 5: Aba Comportamento.**\n\nEscreve o **prompt do sistema** — quem ela é, o que faz, regras.\n\nOu liga **modo modular** (cápsulas) pra economizar ~85% de tokens. Modular divide em: Identidade + Objetivo + Regras + Cápsulas (FAQ, Produtos, etc) com palavras-chave.\n\nUse modular quando o prompt ficar muito grande.", btn: "Próximo ▸" },
              { text: "**Passo 6: Aba Configurações.**\n\n• **Debounce (s)** — espera última msg cliente. Recomendado **5-15s**.\n• **Delay min/max (s)** — simula digitação humana. Recomendado **2-10s**.\n• **Max mensagens** — quebra em vários balões. Recomendado **2-3**.\n• **Max tokens** — limite resposta. Recomendado **300-500**.\n• **Temperatura** — criatividade. Recomendado **0.5-0.7**.\n• **Whitelist** — números autorizados pra teste. Vazio = todos.", btn: "Próximo ▸" },
              { text: "**Passo 7: Aba Canais conectados.**\n\nMarca quais WhatsApp essa IA atende. **Vazio = todos**. Selecionado = só os marcados.\n\nÚtil pra ter IAs diferentes por canal (ex: IA Vendas no WhatsApp comercial, IA Suporte no WhatsApp técnico).", btn: "Próximo ▸" },
              { text: "**Passo 8: Salvar + Testar.**\n\nClica em **Salvar** no final.\n\nDepois vai na aba **Chat de Teste** dentro do perfil. Simula cliente sem afetar nada real. Mostra:\n• Tokens consumidos\n• Cápsulas usadas\n• Tool calls\n• Erros\n\nGasta tokens reais mas é a forma certa de validar antes de ativar.", btn: "Fechar ▸" },
            ],
            done: "Pronto. IA configurada do zero. ✅ Testa em Chat de Teste antes de ligar Ativo em produção.",
          },
          {
            id: "ia_modular",
            intents: ["prompt modular", "capsulas", "modular vs unico", "modo modular", "ativar modular"],
            steps: [
              { target: "nav-ia-atendimento", text: "Em **IA** → edita perfil → aba **Comportamento** → toggle **Ativar modo modular**." },
            ],
            done: "Modular economiza ~85% tokens. Divide em Identidade + Objetivo + Regras + Cápsulas (FAQ, Produtos…) com palavras-chave. ✅",
          },
          {
            id: "ia_whitelist",
            intents: ["whitelist", "testar producao", "testar real", "numero autorizado"],
            steps: [
              { target: "nav-ia-atendimento", text: "Edita perfil → aba **Comportamento** → seção **Whitelist produção** → cola números (1 por linha, formato 5581999999999)." },
            ],
            done: "IA só responde números na lista. Vazio = responde todo mundo. ✅",
          },
          {
            id: "ia_chat_teste",
            intents: ["testar ia", "chat teste", "simular ia", "preview ia", "experimentar ia"],
            steps: [
              { target: "nav-ia-atendimento", text: "Edita perfil → aba **Chat de Teste**. Digita mensagem como se fosse cliente." },
            ],
            done: "Mostra tokens, cápsulas usadas, tool calls. Comando **LIMPAR** zera histórico. ✅",
          },
          {
            id: "ia_ferramentas",
            intents: ["ferramenta ia", "tool ia", "biscoito tool", "consultar data", "enviar imagem"],
            steps: [
              { target: "nav-ia-atendimento", text: "Edita perfil → aba **Ferramentas** → **+ Adicionar ferramenta**. Nome, descrição, ação (aplicar etiqueta, transferir humano, consultar data, galeria…)." },
            ],
            done: "Só funciona em modelos com suporte a ferramentas (Claude / GPT-4o / Llama 70B). ✅",
          },
          {
            id: "ia_followup_seq",
            intents: ["sequencia followup", "automatico follow", "follow ia", "follow-up automatico"],
            steps: [
              { target: "nav-ia-atendimento", text: "Edita perfil → aba **Follow-up** → **+ Nova sequência**. Define janela horária + etapas (até 6, com delays + texto/mídia)." },
            ],
            done: "Cancela sozinho se cliente responder. Até 5 sequências/perfil. ✅",
          },
          {
            id: "ia_resumo_grupo",
            intents: ["resumo grupo", "resumo conversa", "enviar resumo time"],
            steps: [
              { target: "nav-ia-atendimento", text: "Edita perfil → aba **Ferramentas** → seção **Envio de resumo** → **Configurar resumo**. Cole JID do grupo (pega em /grupos)." },
            ],
            done: "IA manda resumo quando chama tool transferir_para_humano. Usa Groq separado, sem gastar chave principal. ✅",
          },
          {
            id: "chat_teste",
            intents: ["chat teste"],
            steps: [
              { target: "nav-ia-atendimento", text: "Clique em **IA** → edita um perfil → aba **Chat de Teste**." },
            ],
            done: "Simula cliente. Mostra tool calls + tokens. ✅",
          },

          // ===== CANAIS / WHATSAPP =====
          {
            id: "canal_whatsapp",
            intents: ["conectar whatsapp", "canal whatsapp", "wpp", "uazapi", "wa", "qr code", "conectar zap", "como conecto"],
            steps: [
              { target: "nav-canais", text: "Clique em **Canais** no menu." },
              { target: "canais-adicionar", text: "Clique em **Adicionar canal**. Vai gerar QR Code." },
            ],
            done: "No celular: WhatsApp → ⋮ → Aparelhos conectados → Conectar aparelho → escaneia QR. ✅",
          },
          {
            id: "multi_numero",
            intents: ["mais de um numero", "multi whatsapp", "varios numeros", "dois numeros"],
            steps: [
              { target: "nav-canais", text: "Clique em **Canais** → **+ Adicionar canal** pra cada número novo. Plano padrão = 1 sessão. Extras: R$19 cada (2-7)." },
            ],
            done: "Mensagens de todos os números caem unificadas em Atendimentos com badge do canal. ✅",
          },
          {
            id: "reconectar_whatsapp",
            intents: ["reconectar", "whatsapp caiu", "desconectou", "voltar online"],
            steps: [
              { target: "nav-canais", text: "Clique em **Canais** → no card → ícone ♻️ **Reconectar**." },
            ],
            done: "Se WhatsApp ainda logado no celular → só sincroniza. Caiu de vez → gera QR novo. ✅",
          },

          // ===== CONTATOS =====
          {
            id: "importar_contatos",
            intents: ["importar contato", "trazer contatos", "puxar contatos", "importar whatsapp"],
            steps: [
              { target: "nav-contatos", text: "Clique em **Contatos** → botão **Importar do WhatsApp** (ícone verde)." },
            ],
            done: "Escolhe canal → ☑️ Pular etiquetas nativas → Importar agora. Só puxa contatos, não mensagens (WhatsApp não dá API pra histórico). ✅",
          },
          {
            id: "criar_contato",
            intents: ["novo contato", "adicionar contato", "criar contato manual"],
            steps: [
              { target: "nav-contatos", text: "Clique em **Contatos** → **+ Adicionar contato**. Nome obrigatório, WhatsApp opcional." },
            ],
            done: "Pode registrar fechamento na criação. ✅",
          },
          {
            id: "followup_avulso",
            intents: ["follow contato", "agendar mensagem", "follow avulso", "mensagem futura"],
            steps: [
              { target: "nav-contatos", text: "Clique em **Contatos** → linha → ✏️ Editar → seção **Follow-up** → escolhe data+hora, 1-3 mensagens." },
            ],
            done: "Cancela sozinho se cliente responder. Status: Agendado / Enviado / Cancelado / Respondido. ✅",
          },

          // ===== ENVIO MASSA / RÁPIDAS / GRUPOS =====
          {
            id: "envio_massa",
            intents: ["envio em massa", "disparo", "broadcast", "lista", "disparar massa"],
            steps: [
              { target: "nav-envio-massa", text: "Clique em **Envio em Massa**. Hoje só aba Texto." },
            ],
            done: "Escolhe canal, delays 20-45s, cola números 1 por linha. Limite plano: LITE 100/dia, PRO 300/dia. ✅",
          },
          {
            id: "mensagens_rapidas",
            intents: ["mensagens rapidas", "atalhos", "snippet", "templates rapidos", "criar atalho", "shortcut"],
            steps: [
              { target: "nav-mensagens-rapidas", text: "Clique em **Mensagens Rápidas** → **+ Novo atalho**." },
            ],
            done: "Comando vira /comando (sem espaços). Marca **Global** pra toda equipe usar. ✅",
          },
          {
            id: "listar_grupos",
            intents: ["listar grupo", "grupos whatsapp", "jid grupo", "participantes grupo", "ver grupos"],
            steps: [
              { target: "nav-grupos", text: "Clique em **Grupos** → escolhe **Conexão** → **Listar IDs dos Grupos**." },
            ],
            done: "JID copiável. Use no Resumo IA pra grupo. **Listar Participantes** → membros + admins. ✅",
          },

          // ===== TRÁFEGO / ADS — em fase de testes =====
          {
            id: "trafego_beta",
            intents: ["pixel vendas", "pixel", "capi", "ctwa", "atribuicao venda", "conversao", "pixel campanhas", "campanha pixel", "campanhas", "ads", "anuncios", "creativos", "meta ads", "google ads", "conectar meta", "conectar facebook", "conectar google", "agendar relatorio", "novo relatorio", "relatorio", "report", "alertas", "notificacoes ads", "alarmes", "criar alerta", "gasto alerta", "alerta gasto", "limite gasto", "roas", "cpl", "cac", "impressoes"],
            steps: [
              { text: "Essa área (**Tráfego / Ads** — Pixel, Campanhas Meta/Google, Relatórios automáticos, Alertas de gasto, ROAS, CPL) ainda está em **fase de testes** e não está liberada pra acesso geral.\n\nEm breve será adicionada.\n\nPor enquanto foca em: **Atendimentos, IA, Contatos, WhatsApp, Etiquetas, Cobrança Asaas, Plano.**", btn: "Entendi ▸" },
            ],
            done: "Tráfego/Ads em beta — em breve disponível. ✅",
          },

          // ===== FILAS / EQUIPES / USUÁRIOS =====
          {
            id: "filas",
            intents: ["filas", "criar fila", "configurar fila", "cor fila"],
            steps: [
              { target: "nav-filas", text: "Clique em **Filas** → preencha Nome, Cor (color picker), Descrição → **Criar**." },
            ],
            done: "Filas com cadeado (IA Atendendo / Atendimento Humano) são fixas — só edita cor. ✅",
          },
          {
            id: "equipes",
            intents: ["equipe", "time", "criar equipe", "grupo time"],
            steps: [
              { target: "nav-equipes", text: "Clique em **Equipes** → preencha Nome + Descrição → **Criar**." },
            ],
            done: "Atribui usuários em /usuarios > edita > Equipes (checkboxes). Um usuário pode estar em várias. ✅",
          },
          {
            id: "usuario_criar",
            intents: ["criar usuario", "novo usuario", "convidar usuario", "adicionar admin", "novo admin"],
            steps: [
              { target: "nav-usuarios", text: "Clique em **Usuários** → **+ Novo usuário**. Nome, Email, Senha, Telefone, Perfil (Atendente/Administrador/Super Admin)." },
            ],
            done: "Marque **Habilitado (vê só próprios tickets)** pra restringir. Permissões de Menu fine-grained. ✅",
          },
          {
            id: "resetar_senha_outro",
            intents: ["resetar senha outro", "trocar senha usuario", "senha admin"],
            steps: [
              { target: "nav-usuarios", text: "Clique em **Usuários** → edita usuário → campo **Nova senha (deixe em branco para manter)** → preenche → Salvar." },
            ],
            done: "Próximo login do usuário pede a nova senha. ✅",
          },

          // ===== ETIQUETAS =====
          {
            id: "etiqueta_criar",
            intents: ["criar etiqueta", "nova etiqueta", "tag", "rotulo"],
            steps: [
              { target: "menu-conta-configuracoes", text: "Clique em **Configurações**." },
              { target: "config-etiquetas", text: "Depois em **Etiquetas**. Preencha Nome, Pai (pasta), Cor (paleta + picker)." },
            ],
            done: "Aqui cria, edita e organiza etiquetas. ✅",
          },
          {
            id: "pasta_etiqueta",
            intents: ["pasta", "pasta vs etiqueta", "hierarquia etiqueta"],
            steps: [
              { target: "menu-conta-configuracoes", text: "Clique em **Configurações**." },
              { target: "config-etiquetas", text: "Em **Etiquetas**. Pasta = etiqueta-mãe. Etiqueta filha vai dentro." },
            ],
            done: "Pasta = mãe. Etiqueta = filha. Não tem tipo 'pasta' no banco — é etiqueta normal que outras apontam pra ela. ✅",
          },
          {
            id: "etiqueta_criar",
            intents: ["criar etiqueta", "nova etiqueta", "tag", "rotulo", "como crio etiqueta", "criar pasta etiqueta", "criar tag", "criar pasta"],
            steps: [
              { target: "menu-conta-configuracoes", text: "Clique em **Configurações** no menu." },
              { target: "config-etiquetas", text: "Agora em **Etiquetas**." },
              { text: "Aqui você cria **etiquetas e pastas** pra organizar contatos. Vou te ensinar.", btn: "Bora ▸" },
              { target: "etiqueta-nome-input", requireClick: false, text: "Aqui digita o **nome**. Ex: `Cliente VIP`." },
              { target: "etiqueta-pai-select", requireClick: false, text: "Aqui vincula a uma **pasta-mãe** (opcional). Deixa em branco se for etiqueta solta." },
              { target: "etiqueta-cor-picker", requireClick: false, text: "Escolhe uma **cor**." },
              { target: "etiqueta-criar-btn", text: "Clica em **Criar** pra salvar." },
              { text: "**Criar pasta:** mesmo form, deixa o seletor de pasta-mãe em branco. Pasta = etiqueta que agrupa outras.", btn: "Entendi ▸" },
              { text: "**Vincular etiqueta à pasta:** no seletor de pasta-mãe, escolhe a pasta antes de criar. A etiqueta vira **Variante** dela.", btn: "Próximo ▸" },
              { text: "**Bônus etiqueta automática:** clica no ✏️ da etiqueta criada, vai em **Palavras-chave gatilho**, digita palavras (ex: `desconto`). Quando cliente mandar a palavra, aplica sozinho.", btn: "Fechar ▸" },
            ],
            done: "Pronto. Já sabe criar etiqueta, pasta e auto. ✅",
          },
          {
            id: "atribuir_etiqueta_contato",
            intents: ["aplicar etiqueta contato", "atribuir etiqueta", "marcar contato etiqueta", "colocar tag no contato", "etiquetar contato"],
            steps: [
              { target: "nav-contatos", text: "Clique em **Contatos** no menu." },
              { text: "Aqui ficam todos contatos. Pra aplicar etiqueta num contato:", btn: "Continuar ▸" },
              { text: "1) Acha o contato na lista\n2) Clica no ✏️ pra editar\n3) Rola até a seção **Etiquetas**\n4) Marca os checkboxes das etiquetas\n5) Salvar", btn: "Entendi ▸" },
              { text: "Dica: aplicar **Variante** (filha) já marca a **Pasta-mãe** junto, automático.", btn: "Fechar ▸" },
            ],
            done: "Etiqueta no contato organiza filtros + atribuições. ✅",
          },
          {
            id: "atendimentos_overview",
            intents: ["aba atendimentos", "tela atendimentos", "botoes atendimentos", "topo atendimentos", "explicar atendimentos", "primeira vez atendimentos"],
            steps: [
              { target: "nav-atendimentos", text: "Clique em **Atendimentos** no menu." },
              { text: "Vou te mostrar os botões do topo da lista.", btn: "Bora ▸" },
              { target: "atd-btn-som", requireClick: false, text: "🔔 **Som de notificação** — liga/desliga som quando chega ticket novo." },
              { target: "atd-btn-nova-conversa", requireClick: false, text: "➕ **Nova conversa** — inicia ticket avulso. Cola telefone + escolhe canal + opcional nome." },
              { target: "atd-btn-log-fechamentos", requireClick: false, text: "📊 **Log de fechamentos** — vê todas as vendas fechadas com valor, serviço, data e quem fechou." },
              { target: "atd-btn-filtros", requireClick: false, text: "🔧 **Filtros** — por canal, fila, etiqueta, período, usuário, não lidos. Badge mostra quantos ativos." },
              { target: "atd-busca-contato", requireClick: false, text: "🔍 **Buscar** nome, número ou ticket (#142). Filtra a lista carregada." },
              { target: "atd-btn-buscar-msg", requireClick: false, text: "💬 **Buscar mensagem** — full-text dentro das conversas, não só nome." },
              { target: "atd-btn-conexao", requireClick: false, text: "📶 **Status conexão** — verde = conectado, vermelho = caiu. Clica pra alternar visão dos canais." },
              { target: "atd-btn-refresh", requireClick: false, text: "♻️ **Refresh** — atualiza lista. Geralmente nem precisa (atualiza sozinho via tempo real)." },
              { target: "atd-abas-status", requireClick: false, text: "**Abas:** Abertos = você atendendo. Pendentes = ninguém pegou ainda (botão **Atender** verde aparece no hover). Fechados = arquivado." },
              { text: "Pronto! Esse é o overview de Atendimentos.\n\n💡 Você ainda não tem tickets pra testar. Conecta um WhatsApp em **Canais** primeiro pra começar.", btn: "Fechar ▸" },
            ],
            done: "Atendimentos mapeados. Vai em /canais conectar o primeiro número. ✅",
          },
          {
            id: "etiqueta_auto",
            intents: ["etiqueta automatica", "auto etiqueta", "palavra chave", "etiqueta palavra", "gatilho etiqueta", "como crio etiqueta automatica"],
            steps: [
              { target: "menu-conta-configuracoes", text: "Primeiro clique em **Configurações** no menu lateral." },
              { target: "config-etiquetas", text: "Agora clique em **Etiquetas** dentro de Mais configurações." },
              { text: "**Como criar etiqueta automática por palavra-chave:**\n\n1) Clique no ícone ✏️ pra **editar uma etiqueta existente** (ou crie nova no topo).\n\n2) No balão de edição, role até a seção **Palavras-chave gatilho**.\n\n3) Digite uma palavra que dispare a etiqueta (ex: `desconto`, `cancelar`, `reclamação`).\n\n4) Clique **+ Adicionar mais** pra incluir mais palavras. Aceita regex simples como `(desc|promo)`.\n\n5) Marque ☑️ **Ativo** e clique em **Salvar**." },
            ],
            done: "Pronto. Quando cliente mandar mensagem com a palavra, etiqueta é aplicada automático no contato. ✅",
          },

          // ===== CONFIGURAÇÕES AVANÇADAS =====
          {
            id: "chaves_api",
            intents: ["chave api", "chave groq", "chave openai", "chave anthropic", "claude key", "multi-chave", "rotacao chave"],
            steps: [
              { target: "menu-conta-configuracoes", text: "Clique em **Configurações**." },
              { target: "config-ia", text: "Depois em **API IA**. Cards por provider: Groq, OpenAI, Anthropic. **+ Adicionar chave** com apelido + key." },
            ],
            done: "Várias chaves = rotação + fallback. Cada chave tem limite/dia configurável. **Testar** valida + **Revelar** mostra. ✅",
          },
          {
            id: "prompts_ia",
            intents: ["prompts ia", "prompt sentimento", "prompt resumo", "prompt sugestao", "customizar prompt"],
            steps: [
              { target: "menu-conta-configuracoes", text: "Clique em **Configurações**." },
              { target: "config-ia-prompts", text: "Depois em **Prompts IA**. 3 prompts: Sentimento, Resumo, Sugestão. Customize conteúdo e modelo." },
            ],
            done: "**Voltar ao default** remove override agência. Escopo agência ou global (super_admin). ✅",
          },
          {
            id: "asaas_setup",
            intents: ["configurar asaas", "ativar asaas", "asaas chave", "pix configurar", "integrar pagamento"],
            steps: [
              { target: "menu-conta-configuracoes", text: "Clique em **Configurações**." },
              { target: "config-asaas", text: "Depois em **Asaas**. Cole API Key, escolhe Ambiente (Produção/Sandbox), ☑️ Ativo." },
            ],
            done: "Configure chave PIX padrão + CPF/CNPJ + Mensagem auto pós-pagamento. Agora dá pra cobrar pelo chat. ✅",
          },
          {
            id: "mcp_avancado",
            intents: ["mcp", "claude desktop", "claude code", "token api", "cursor crm", "programatico"],
            steps: [
              { text: "**MCP / Token de API programática** é um recurso avançado disponível só pra contas com permissão especial.\n\nSe você precisa integrar o CRM com Claude / Cursor / outros LLMs externos, fale com o suporte que a gente avalia liberar.", btn: "Entendi ▸" },
            ],
            done: "MCP é recurso avançado. ✅",
          },

          // ===== MARCA / PERFIL / PLANO / DASHBOARD =====
          {
            id: "marca_logo",
            intents: ["logo", "marca", "trocar logo", "branding", "personalizar"],
            steps: [
              { target: "nav-marca", text: "Clique em **Marca / Logo**. Upload arquivo (PNG/JPEG/WebP/SVG)." },
            ],
            done: "Escolhe modo (texto / logo / logo+texto), tamanho (slider 24-200px), orientação H/V. ✅",
          },
          {
            id: "perfil",
            intents: ["perfil", "minha conta", "meu perfil", "trocar foto", "trocar senha"],
            steps: [
              { target: "nav-conta", text: "Clique em **Meu Perfil**. Avatar (trocar/remover), Nome, Telefone, Trocar senha." },
            ],
            done: "Senha nova mínimo 6 chars. Próximo login pede a nova. ✅",
          },
          {
            id: "plano",
            intents: ["plano", "cobranca", "pagamento mensal", "quanto custa", "preco crm", "asaas mensal"],
            steps: [
              { target: "nav-plano", text: "Clique em **Plano Pro**. Veja R$29/mês por conexão, KPIs (canais, usuários, total mensal), FAQ accordion." },
            ],
            done: "Link **Pagar plano** abre WhatsApp do admin. LITE R$138 (100 msg/dia), PRO R$195 (300/dia). ✅",
          },
          {
            id: "dashboard",
            intents: ["dashboard", "painel", "kpi", "metricas", "ver dashboard", "visao geral"],
            steps: [
              { target: "nav-dashboard", text: "Clique em **Dashboard**. Toggle Atendimentos vs Campanhas. Período Hoje/7d/30d/custom." },
            ],
            done: "KPIs Financeiros (Investido, Faturamento, ROAS) + Tráfego (Impressões, CPL, CAC) + gráficos + criativos top + atendimentos live. ✅",
          },
        ],
      });
    };
    document.body.appendChild(s);
  }, []);

  return null;
}
