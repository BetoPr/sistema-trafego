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
        chat: true,
        chatTitle: "Posso te ajudar 👇",
        chatHint: "Escolha ou escreva sua dúvida:",
        chatSuggestions: [
          { intent: "atender", label: "Como atender um cliente?" },
          { intent: "etiqueta_criar", label: "Como criar uma etiqueta?" },
          { intent: "ia_criar", label: "Como criar uma IA?" },
          { intent: "campanha_pixel", label: "Como conectar Meta Ads?" },
          { intent: "relatorio_novo", label: "Como agendar relatório?" },
          { intent: "marca_logo", label: "Como trocar a logo?" },
        ],
        fallback: "Hmm, ainda não sei te ensinar isso 😅 Tenta uma sugestão da lista.",
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
        ],
      });
    };
    document.body.appendChild(s);
  }, []);

  return null;
}
