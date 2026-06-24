export const CONFIG_IA = `# Configuracao de IA (Chaves Groq/OpenAI/Anthropic)

Onde voce coloca suas chaves de LLM. CRM usa essas chaves pra IA atendente, follow-up, resumo, chat assistente.

## Providers suportados
- **Groq**: gratuito ate limite diario (~100k tokens/dia por chave). Llama 3.x.
- **OpenAI**: pago. GPT-4o-mini barato, GPT-4o caro.
- **Anthropic**: pago. Claude Sonnet 4.5, Haiku 4.5.

## Multi-chave (rotacao Groq)
- Pode cadastrar varias chaves Groq de contas diferentes.
- Sistema rotaciona automatico: 3 chaves = ~300k tokens/dia.
- Quando uma bate limite (429), pula pra proxima.
- Esgotadas todas: cai pra OpenAI (fallback).

## Limite por chave (Fase 3)
- Cada chave Groq tem limite_followup_dia configuravel (0 = sem limite).
- Chave atinge limite: pausa proativa, evita 429.

## Como adicionar
- /configuracoes/ia > Adicionar chave (rotacao).
- Cola gsk_... (Groq), sk-... (OpenAI), sk-ant-... (Anthropic).
- Rotulo: apelido pra identificar (ex: "Conta principal").

## Como obter
- Groq: console.groq.com > API Keys > Create.
- OpenAI: platform.openai.com > API keys.
- Anthropic: console.anthropic.com > API keys.

## Olho + lapis (visualizar/editar)
- Olho: revela chave em texto plano (auditado).
- Lapis: edita rotulo ou troca valor da chave inline.

## Testar
- Botao Testar bate POST /v1/chat/completions com 5 tokens reais. Retorna "OK — N tokens" ou erro.

## Provider de chat / transcricao
- Escolhe se chat usa Groq ou OpenAI por padrao.
- Transcricao audio: Groq Whisper ou OpenAI Whisper.

## Problemas
- "Unsupported state or unable to authenticate data": ENCRYPTION_KEY do VPS foi trocada, chave nao decripta mais. Reinsere a chave.
- "Invalid API Key": chave esta errada/revogada. Edita e cola nova.
- "Rate limit exceeded": chave bateu limite diario. Adiciona outra chave ou aguarda 24h.
`;
