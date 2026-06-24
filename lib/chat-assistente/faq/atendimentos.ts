export const ATENDIMENTOS = `# Atendimentos

Chat WhatsApp via UAZAPI dentro do CRM.

## Estrutura
- Lista esquerda: tickets pendentes/abertos/fechados, filtros por fila/etiqueta/canal.
- Centro: chat com cliente (mensagens, audios, imagens, documentos).
- Direita: detalhe do contato (nome, etiquetas, mid, follow-up, mais).

## Status do ticket
- **Pendente**: cliente mandou primeira mensagem, ninguem respondeu.
- **Aberto**: atendente ou IA respondeu, conversa em andamento.
- **Fechado**: marcou como concluido (valor_fechado opcional pra venda).

## Acoes principais
- **Atender** (botao em ticket pendente): atribui pra voce + marca como aberto.
- **Enviar mensagem**: texto / imagem / audio / documento / mensagem rapida.
- **IA toggle**: liga/desliga IA atendente nesse ticket especifico (icone robo).
- **Fechar ticket**: marca como concluido, opcional registrar valor de venda.
- **Editar contato**: salva nome, etiquetas, follow-up agendado.

## IA atendente
- Quando ativa, responde sozinha conforme perfil configurado (/ia-atendimento).
- Pausa **automatico** quando voce envia mensagem manual.
- Reativa via toggle (icone robo no painel direito).
- Limpa contexto: comando "LIMPAR" da reset na conversa.

## Notas internas
- Nao vai pro cliente. Funciona como log interno por ticket.

## Mensagens rapidas
- Em /mensagens-rapidas voce cadastra atalhos texto. Apareceem no input do chat (icone raio).

## Audios
- Audio cliente: transcricao automatica via Groq Whisper (configurar chave em /configuracoes/ia).
- Voce envia audio: grava com botao microfone, sobe pra storage.

## Problemas
- Ticket nao chega: webhook UAZAPI quebrado. Veja /canais > status canal.
- IA nao responde: chave Groq quebrada (ENCRYPTION_KEY trocada?). Reinsira em /configuracoes/ia.
`;
