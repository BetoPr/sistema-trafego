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
              { target: "nav-atendimentos", text: "Abra **Atendimentos** 👇" },
            ],
            done: "Pronto! Lista de tickets abertos aparece aqui. ✅",
          },
          {
            id: "etiqueta_criar",
            intents: ["criar etiqueta", "nova etiqueta", "tag", "rotulo"],
            steps: [
              { target: "menu-conta-configuracoes", text: "Vai em **Configurações** primeiro." },
              { target: "config-etiquetas", text: "Depois clica em **Etiquetas** 🏷️" },
            ],
            done: "Aqui você cria, edita e organiza etiquetas. 🎉",
          },
          {
            id: "ia_criar",
            intents: ["criar ia", "nova ia", "configurar ia", "perfil ia"],
            steps: [
              { target: "nav-ia-atendimento", text: "Vai em **IA** 🤖" },
              { target: "ia-novo-perfil", text: "Clica em **Novo perfil** ➕" },
            ],
            done: "IA criada. Configure prompt + ferramentas. ✨",
          },
          {
            id: "campanha_pixel",
            intents: ["conectar meta", "meta ads", "pixel", "campanha", "conectar facebook"],
            steps: [
              { target: "menu-conta-configuracoes", text: "Abra **Configurações** primeiro." },
              { target: "config-integracoes", text: "Clica em **Integrações** 🔌" },
            ],
            done: "Aqui conecta Meta Ads, Google Ads, etc. 🎯",
          },
          {
            id: "relatorio_novo",
            intents: ["agendar relatorio", "novo relatorio", "relatorio", "report"],
            steps: [
              { target: "nav-relatorios", text: "Abre **Relatórios** 📊" },
            ],
            done: "Aqui cria e agenda relatórios automáticos. 📈",
          },
          {
            id: "marca_logo",
            intents: ["logo", "marca", "trocar logo", "branding", "personalizar"],
            steps: [
              { target: "nav-marca", text: "Abre **Marca / Logo** 🎨" },
            ],
            done: "Personalize logo, tamanho e layout. ✅",
          },
          {
            id: "chat_teste",
            intents: ["testar ia", "chat teste", "simular ia"],
            steps: [
              { target: "nav-ia-atendimento", text: "Abre **IA** 🤖" },
              { target: "ia-editar-primeiro", text: "Edita um perfil." },
            ],
            done: "Dentro do edit tem aba **Chat de Teste**. 💬",
          },
          {
            id: "canal_whatsapp",
            intents: ["conectar whatsapp", "canal whatsapp", "wpp", "uazapi", "wa"],
            steps: [
              { target: "nav-canais", text: "Abre **Canais** 📱" },
            ],
            done: "Aqui conecta WhatsApp via UAZAPI ou Meta. ✅",
          },
          {
            id: "dashboard",
            intents: ["dashboard", "painel", "kpi", "metricas"],
            steps: [
              { target: "nav-dashboard", text: "Vai pro **Dashboard** 📊" },
            ],
            done: "Painel com KPIs financeiro + tráfego. ✨",
          },
          {
            id: "campanhas",
            intents: ["campanhas", "ads", "anuncios", "creativos"],
            steps: [
              { target: "nav-pixel", text: "Abre **Pixel & Campanhas** 🎯" },
            ],
            done: "Lista de campanhas Meta + Google. ✅",
          },
          {
            id: "filas",
            intents: ["filas", "criar fila", "configurar fila"],
            steps: [
              { target: "nav-filas", text: "Abre **Filas** 📋" },
            ],
            done: "Configure cores + nomes de filas. ✅",
          },
          {
            id: "equipes",
            intents: ["equipe", "time", "usuarios"],
            steps: [
              { target: "nav-usuarios", text: "Abre **Usuários** 👥" },
            ],
            done: "Adicione usuários da agência. ✅",
          },
          {
            id: "envio_massa",
            intents: ["envio em massa", "disparo", "broadcast", "lista"],
            steps: [
              { target: "nav-envio-massa", text: "Abre **Envio em Massa** 🚀" },
            ],
            done: "Crie lista + dispare mensagem em lote. ✅",
          },
          {
            id: "mensagens_rapidas",
            intents: ["mensagens rapidas", "atalhos", "snippet", "templates rapidos"],
            steps: [
              { target: "nav-mensagens-rapidas", text: "Abre **Mensagens Rápidas** ⚡" },
            ],
            done: "Atalhos /comando pra responder rápido. ✅",
          },
          {
            id: "alertas",
            intents: ["alertas", "notificacoes", "limite", "alarmes"],
            steps: [
              { target: "nav-alertas", text: "Abre **Alertas** 🔔" },
            ],
            done: "Configure limites + notificações. ✅",
          },
          {
            id: "pasta_etiqueta",
            intents: ["pasta", "pasta vs etiqueta", "hierarquia etiqueta"],
            steps: [
              { target: "menu-conta-configuracoes", text: "Abre **Configurações** primeiro." },
              { target: "config-etiquetas", text: "Vai em **Etiquetas** 🏷️" },
            ],
            done: "Pasta = mãe / Etiqueta = filha. Crie a hierarquia. ✅",
          },
          {
            id: "etiqueta_auto",
            intents: ["etiqueta automatica", "auto etiqueta", "palavra chave", "etiqueta palavra"],
            steps: [
              { target: "nav-ia-atendimento", text: "Abre **IA** 🤖" },
            ],
            done: "Dentro do perfil tem aba Cápsulas + Etiquetas auto. ✅",
          },
          {
            id: "configurar_ia_atendente",
            intents: ["configurar ia", "ia atendente", "atendente ia", "setup ia"],
            steps: [
              { target: "nav-ia-atendimento", text: "Abre **IA** 🤖" },
              { target: "ia-novo-perfil", text: "**Novo perfil** ➕ ou edite existente." },
            ],
            done: "Configure prompt, ferramentas, follow-up. ✨",
          },
          {
            id: "plano",
            intents: ["plano", "cobranca", "pagamento", "asaas"],
            steps: [
              { target: "nav-plano", text: "Abre **Plano Pro** 💳" },
            ],
            done: "Veja seu plano e pagamentos. ✅",
          },
          {
            id: "perfil",
            intents: ["perfil", "minha conta", "meu perfil"],
            steps: [
              { target: "nav-conta", text: "Abre **Meu Perfil** 👤" },
            ],
            done: "Edite seu nome + foto. ✅",
          },
        ],
      });
    };
    document.body.appendChild(s);
  }, []);

  return null;
}
