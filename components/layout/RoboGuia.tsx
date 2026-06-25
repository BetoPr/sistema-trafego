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
        fallback: "Hmm, ainda não sei te ensinar isso 😅",
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
            intents: ["configurar ia atendente", "ia atendente", "atendente ia", "setup ia", "como integrar ia"],
            steps: [
              { target: "nav-ia-atendimento", text: "Clique em **IA**." },
              { target: "ia-novo-perfil", text: "**+ Novo perfil**. Cole chave API, escolhe modelo. Aba **Comportamento** define prompt." },
            ],
            done: "Aba **Configurações** ajusta debounce/delays. Aba **Canais conectados** define quais WhatsApp ela atende. ✅",
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

          // ===== PIXEL & VENDAS / RELATÓRIOS / ALERTAS =====
          {
            id: "campanha_pixel",
            intents: ["conectar meta", "meta ads", "conectar facebook"],
            steps: [
              { target: "menu-conta-configuracoes", text: "Clique em **Configurações**." },
              { target: "config-integracoes", text: "Depois em **Integrações**." },
            ],
            done: "Conecte Meta Ads via OAuth, escolhe ad accounts. ✅",
          },
          {
            id: "pixel_vendas",
            intents: ["pixel vendas", "capi", "ctwa", "atribuicao venda", "conversao"],
            steps: [
              { target: "nav-pixel", text: "Clique em **Pixel & Campanhas**. KPIs: gasto, faturamento, ROAS. Feed de Purchase enviados ao Meta." },
            ],
            done: "Só super_admin acessa. Sem CTWA click-id, venda fica sem atribuição. Use Etiquetas por campanha como fallback. ✅",
          },
          {
            id: "campanhas",
            intents: ["campanhas", "ads", "anuncios", "creativos"],
            steps: [
              { target: "nav-pixel", text: "Clique em **Pixel & Campanhas**." },
            ],
            done: "Campanhas Meta + Google aparecem aqui. ✅",
          },
          {
            id: "relatorio_novo",
            intents: ["agendar relatorio", "novo relatorio", "relatorio", "report"],
            steps: [
              { target: "nav-relatorios", text: "Clique em **Relatórios** → **Criar Relatório**." },
            ],
            done: "Frequência diário/semanal/mensal, hora, formato PDF/Imagem/Texto, destinatário (cliente ou telefone direto). ✅",
          },
          {
            id: "alertas_criar",
            intents: ["alertas", "notificacoes", "limite", "alarmes", "criar alerta", "gasto alerta"],
            steps: [
              { target: "nav-alertas", text: "Clique em **Alertas** → **Novo**. Tipo (Gasto dia/mês), limite R$, conta Meta, WhatsApp destino." },
            ],
            done: "Template com placeholders {{gasto}} {{limite}} {{conta}}. Preview tempo real. Botão **Testar agora** força disparo. ✅",
          },
          {
            id: "alertas",
            intents: ["alerta"],
            steps: [
              { target: "nav-alertas", text: "Clique em **Alertas** no menu." },
            ],
            done: "Configure limites e notificações via WhatsApp. ✅",
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
            id: "etiqueta_auto",
            intents: ["etiqueta automatica", "auto etiqueta", "palavra chave", "etiqueta palavra", "gatilho etiqueta"],
            steps: [
              { target: "menu-conta-configuracoes", text: "Clique em **Configurações**." },
              { target: "config-etiquetas", text: "Em **Etiquetas** → edita uma → seção **Palavras-chave gatilho** → adiciona palavras/regex." },
            ],
            done: "Cliente manda msg com a palavra → etiqueta aplicada automático no contato. Aceita regex simples. ✅",
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
            id: "mcp_token",
            intents: ["mcp", "claude desktop", "claude code", "token api", "cursor crm", "programatico"],
            steps: [
              { target: "menu-conta-configuracoes", text: "Clique em **Configurações**." },
              { target: "config-mcp", text: "Depois em **MCP / API**. Preencha Nome + Dias expiração → **Gerar token**." },
            ],
            done: "Copia token uma única vez (não mostra de novo). Use em Claude Desktop/Cursor pra ler tickets do CRM. ✅",
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
