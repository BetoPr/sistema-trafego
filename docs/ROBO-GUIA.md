# Robô-Guia — Mascote do CRM

Mascote-robô neon que voa pela tela e ensina o usuário como usar o Sonar CRM.

## Como funciona

- **FAB único** verde no canto inferior direito: clica → abre **Assistente IA**.
- O Assistente IA tem **sugestões**. Quando você clica numa sugestão (ou digita e o texto bate), o robô:
  1. Fecha o chat
  2. Voa até o elemento alvo
  3. Aponta com o braço + balão de fala "Clica aqui"
  4. Espera o usuário clicar
  5. Avança pro próximo passo
  6. Quando termina, fala "Pronto!" e volta pra base
- Se o texto não bate em nenhum tour, cai pro chat IA tradicional (Groq Llama 8B).

## Tours configurados

| Pergunta tipo | Tour ID | Passos |
|---|---|---|
| Como atender um cliente? | `atender` | → Atendimentos |
| Como conectar WhatsApp? | `canal_whatsapp` | → Canais |
| Como criar uma IA? | `ia_criar` | → IA → Novo perfil |
| Como configurar a IA atendente? | `configurar_ia_atendente` | → IA → Novo/Editar perfil |
| O que é Pasta vs Etiqueta? | `pasta_etiqueta` | → Configurações → Etiquetas |
| Como aplicar etiqueta automática? | `etiqueta_auto` | → IA |
| Como ver o Dashboard? | `dashboard` | → Dashboard |
| Ver Campanhas (Pixel)? | `campanhas` | → Pixel & Campanhas |
| Como agendar relatório? | `relatorio_novo` | → Relatórios |
| Como trocar a logo? | `marca_logo` | → Marca / Logo |
| Como criar fila? | `filas` | → Filas |
| Como adicionar usuário? | `equipes` | → Usuários |
| Envio em massa? | `envio_massa` | → Envio em Massa |
| Mensagens rápidas? | `mensagens_rapidas` | → Mensagens Rápidas |
| Configurar alertas? | `alertas` | → Alertas |
| Plano / cobrança? | `plano` | → Plano Pro |
| Meu perfil? | `perfil` | → Meu Perfil |
| Chat de teste IA? | `chat_teste` | → IA → Editar → Chat de Teste |

## Como adicionar um tour novo

1. Marca o elemento alvo com `data-guide="minha-chave"`:
   ```tsx
   <button data-guide="meu-botao">...</button>
   ```
2. Edita `components/layout/RoboGuia.tsx` → adiciona objeto no array `tours`:
   ```ts
   {
     id: "meu_tour",
     intents: ["palavra chave 1", "palavra chave 2"],
     steps: [
       { target: "outra-chave", text: "Primeiro abra X" },
       { target: "meu-botao", text: "Depois clica em **Y**" },
     ],
     done: "Pronto! 🎉",
   }
   ```
3. (Opcional) Adiciona a frase típica em `SUGESTOES_SUPORTE` em `components/chat-assistente/ChatDrawer.tsx` pra aparecer no chat.

## API runtime

- `window.RoboGuia.start("id")` — força tour
- `window.RoboGuia.ask("texto livre")` — tenta match nos intents
- `window.RoboGuia.stop()` — interrompe
- `window.RoboGuia.resetOnboarding()` — limpa localStorage do welcome

## Trocar cor / mascote

- Cor: `color: "#00E19A"` em `RoboGuia.tsx`
- Mascote do FAB / header chat: componente `MascoteRoboMini` em `ChatDrawer.tsx` — SVG inline com bobbing + acena
