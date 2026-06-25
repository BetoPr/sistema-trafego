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
          {
            id: "atender",
            intents: ["atender", "chat cliente", "responder cliente", "atendimento"],
            steps: [
              { target: "nav-atendimentos", text: "Clique em **Atendimentos** no menu." },
            ],
            done: "Lista de tickets aparece aqui. ✅",
          },
          {
            id: "etiqueta_criar",
            intents: ["criar etiqueta", "nova etiqueta", "tag", "rotulo"],
            steps: [
              { target: "menu-conta-configuracoes", text: "Clique em **Configurações**." },
              { target: "config-etiquetas", text: "Depois em **Etiquetas**." },
            ],
            done: "Aqui cria, edita e organiza etiquetas. ✅",
          },
          {
            id: "ia_criar",
            intents: ["criar ia", "nova ia", "configurar ia", "perfil ia"],
            steps: [
              { target: "nav-ia-atendimento", text: "Clique em **IA** no menu." },
              { target: "ia-novo-perfil", text: "Clique em **Novo perfil**." },
            ],
            done: "Configure nome + chave + prompt. ✅",
          },
          {
            id: "campanha_pixel",
            intents: ["conectar meta", "meta ads", "pixel", "campanha", "conectar facebook"],
            steps: [
              { target: "menu-conta-configuracoes", text: "Clique em **Configurações**." },
              { target: "config-integracoes", text: "Depois em **Integrações**." },
            ],
            done: "Conecte Meta Ads ou Google Ads. ✅",
          },
          {
            id: "relatorio_novo",
            intents: ["agendar relatorio", "novo relatorio", "relatorio", "report"],
            steps: [
              { target: "nav-relatorios", text: "Clique em **Relatórios** no menu." },
            ],
            done: "Crie e agende relatórios automáticos. ✅",
          },
          {
            id: "marca_logo",
            intents: ["logo", "marca", "trocar logo", "branding", "personalizar"],
            steps: [
              { target: "nav-marca", text: "Clique em **Marca / Logo** no menu." },
            ],
            done: "Personalize logo da agência. ✅",
          },
          {
            id: "chat_teste",
            intents: ["testar ia", "chat teste", "simular ia"],
            steps: [
              { target: "nav-ia-atendimento", text: "Clique em **IA** no menu." },
            ],
            done: "Edite um perfil e abra a aba **Chat de Teste**. ✅",
          },
          {
            id: "canal_whatsapp",
            intents: ["conectar whatsapp", "canal whatsapp", "wpp", "uazapi", "wa"],
            steps: [
              { target: "nav-canais", text: "Clique em **Canais** no menu." },
              { target: "canais-adicionar", text: "Aqui em **Adicionar canal**." },
            ],
            done: "Siga o passo a passo do QR Code. ✅",
          },
          {
            id: "dashboard",
            intents: ["dashboard", "painel", "kpi", "metricas"],
            steps: [
              { target: "nav-dashboard", text: "Clique em **Dashboard** no menu." },
            ],
            done: "Painel com KPIs aparece aqui. ✅",
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
            id: "filas",
            intents: ["filas", "criar fila", "configurar fila"],
            steps: [
              { target: "nav-filas", text: "Clique em **Filas** no menu." },
            ],
            done: "Configure cores e nomes das filas. ✅",
          },
          {
            id: "equipes",
            intents: ["equipe", "time", "usuarios"],
            steps: [
              { target: "nav-usuarios", text: "Clique em **Usuários** no menu." },
            ],
            done: "Adicione usuários da agência. ✅",
          },
          {
            id: "envio_massa",
            intents: ["envio em massa", "disparo", "broadcast", "lista"],
            steps: [
              { target: "nav-envio-massa", text: "Clique em **Envio em Massa**." },
            ],
            done: "Crie lista e dispare em lote. ✅",
          },
          {
            id: "mensagens_rapidas",
            intents: ["mensagens rapidas", "atalhos", "snippet", "templates rapidos"],
            steps: [
              { target: "nav-mensagens-rapidas", text: "Clique em **Mensagens Rápidas**." },
            ],
            done: "Crie atalhos pra responder rápido. ✅",
          },
          {
            id: "alertas",
            intents: ["alertas", "notificacoes", "limite", "alarmes"],
            steps: [
              { target: "nav-alertas", text: "Clique em **Alertas** no menu." },
            ],
            done: "Configure limites e notificações. ✅",
          },
          {
            id: "pasta_etiqueta",
            intents: ["pasta", "pasta vs etiqueta", "hierarquia etiqueta"],
            steps: [
              { target: "menu-conta-configuracoes", text: "Clique em **Configurações**." },
              { target: "config-etiquetas", text: "Depois em **Etiquetas**." },
            ],
            done: "Pasta = mãe. Etiqueta = filha. ✅",
          },
          {
            id: "etiqueta_auto",
            intents: ["etiqueta automatica", "auto etiqueta", "palavra chave", "etiqueta palavra"],
            steps: [
              { target: "nav-ia-atendimento", text: "Clique em **IA** no menu." },
            ],
            done: "Configure cápsulas + etiquetas auto no perfil. ✅",
          },
          {
            id: "configurar_ia_atendente",
            intents: ["configurar ia", "ia atendente", "atendente ia", "setup ia"],
            steps: [
              { target: "nav-ia-atendimento", text: "Clique em **IA** no menu." },
              { target: "ia-novo-perfil", text: "Clique em **Novo perfil**." },
            ],
            done: "Configure prompt, ferramentas e follow-up. ✅",
          },
          {
            id: "plano",
            intents: ["plano", "cobranca", "pagamento", "asaas"],
            steps: [
              { target: "nav-plano", text: "Clique em **Plano Pro** no menu." },
            ],
            done: "Veja plano e pagamentos. ✅",
          },
          {
            id: "perfil",
            intents: ["perfil", "minha conta", "meu perfil"],
            steps: [
              { target: "nav-conta", text: "Clique em **Meu Perfil** no menu." },
            ],
            done: "Edite seu nome e foto. ✅",
          },
        ],
      });
    };
    document.body.appendChild(s);
  }, []);

  return null;
}
