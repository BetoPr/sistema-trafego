export const IA_ATENDIMENTO = `# IA Atendimento (Bot do WhatsApp)

Configura a IA que responde os clientes automaticamente no WhatsApp.

## Perfil
- /ia-atendimento. Cria perfil com nome, modelo, prompt, timezone.
- Toggle Ativo: liga/desliga globalmente.
- Pode ter varios perfis (escolhe por canal).

## Modelo
- Padrao Groq Llama 3.x (gratis).
- Pode trocar pra OpenAI/Anthropic se quiser qualidade superior.

## Prompt
- Sistema prompt grande define a persona ("Voce e atendente da Clinica X").
- Use placeholder picker (botao no editor): {nome_cliente}, {data}, {hora}, etc.

## Ferramentas (tools)
- IA pode usar tools server-side pra agir no CRM.
- Padrao: \`aplicar_etiqueta\`, \`transferir_para_humano\`, \`consultar_data\`, \`enviar_imagem_galeria\`, \`manda_biscoito\`.
- Adicionar tool custom: nome + descricao + acao + parametros (drag-drop image upload pra galeria).

## Whitelist (modo teste)
- Lista de numeros autorizados (string array). Fora dela, IA nao responde (modo teste).
- Producao: deixa vazio = atende todos.

## Galeria de imagens
- Sobe imagens em /ia-atendimento (drag-drop). IA usa via tool \`enviar_imagem_galeria\` pra mandar foto correta no contexto.

## Etiquetas configuradas
- Define quais etiquetas a IA pode aplicar via \`aplicar_etiqueta\`. Whitelist de seguranca.

## Sequencia de Follow-up sequencial
- Em /ia-atendimento > Follow-up: cria sequencia (3 mensagens com delay 1h, 4h, 24h).
- Quando cliente nao responde, IA roda sequencia sozinha.
- Cancela quando cliente responde.

## Resumo de conversa
- Toggle em /ia-atendimento > Resumo: quando IA transfere pra humano, envia resumo da conversa pra grupo WhatsApp.

## Pausa automatica
- IA pausa quando atendente envia mensagem manual.
- Reativa via toggle no painel.

## Comando LIMPAR
- Cliente envia "LIMPAR": reset do contexto IA naquele ticket.

## Filas fixas (descontinuado)
- Antigamente IA so respondia em filas marcadas. Agora cobre todas (filas dinamicas).

## Problemas
- IA nao responde: chave Groq quebrada, perfil inativo, ou numero fora whitelist.
- IA inventa info: melhore o prompt + adicione tool pra dado real.
- Loop infinito: maxRounds=4 no executor evita.
`;
