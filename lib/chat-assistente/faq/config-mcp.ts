export const CONFIG_MCP = `# MCP — Acesso Programático

Rota: /configuracoes/mcp

Tokens pra integrar CRM com **Claude / Cursor / outros LLMs externos** via API.

Útil pra automação avançada (ex: Claude na sua máquina ler tickets do CRM).

Geralmente uso interno super_admin.

## Gerar token
Form:
- **Nome** (rótulo)
- **Dias expiração** (TTL)

**Gerar token** → mostra token **uma única vez**. Copia + guarda em lugar seguro.

## Revogar
Tabela → **Revogar** → invalida imediatamente.

Tabela mostra prefix do token + status.

## Não confundir com chaves API IA
- **API IA** (/configuracoes/ia) = chaves Groq/OpenAI/Anthropic pra IA atendente
- **MCP** = tokens pro CRM ser consumido por LLMs externos
`;
