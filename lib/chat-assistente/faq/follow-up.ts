export const FOLLOW_UP = `# Follow-up

Detecta contatos parados (sem resposta) e sugere mensagem IA pra reengajar.

## Como funciona
- Sistema marca contatos que ficaram X tempo sem responder (configuravel).
- IA analisa a conversa e decide: vale enviar follow-up? (motivo + mensagem sugerida).
- Voce revisa, edita, envia (ou descarta).

## Botoes no card
- **Enviar**: dispara a mensagem agora pelo WhatsApp.
- **Regenerar**: pede nova mensagem (mantem resumo e decisao).
- **Reanalisar (apos analise)**: refaz tudo (resumo + decisao + mensagem).
- **Etiquetar**: aplica etiquetas no contato.
- **Descartar**: marca como "nao enviar" (some por X tempo configurado).
- **Fechar ticket** (checkbox): fecha ticket ao descartar.

## Tons da mensagem
- Padrao (IA decide), Emocional, Direto, Curioso, etc. Trocar muda o estilo.

## Cadencia
- "Quantos follow-ups?": 1, 2 ou 3 mensagens com intervalo crescente.
- "Dividir a 1a em 2 envios": quebra a 1a mensagem em 2 (mais natural).

## Filtros
- Por numero de follow-ups ja enviados, recomendacao, tag.

## Lote (massa)
- Botao "Analisar todos": IA analisa lote inteiro. Use porMinuto pra evitar bater limite Groq.
- Botao "Enviar todos": envia em sequencia com delay aleatorio (parecer humano).

## Descarte configuravel
- Em /configuracoes/follow-up: define se cards descartados somem por 7d, 30d, ou nunca aparecem mais.

## IA Follow-up sequencial (auto)
- Em /ia-atendimento configura sequencia (3 mensagens com delay). Quando cliente nao responde, sequencia roda sozinha.

## Problemas
- "Limite diario Groq atingido": pausa fila, troca chave em /configuracoes/ia.
- IA inventa numero: NUNCA inventa — se errar, fala "nao confirmei essa info, melhor verificar".
`;
