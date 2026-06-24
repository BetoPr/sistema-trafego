export const CONFIG_MCP = `# MCP / API Programatica

Permite usar Claude Desktop, Claude Code, Cursor ou qualquer cliente MCP pra acessar dados do CRM.

## Pra que serve
- Voce abre Claude Desktop e prompt: "olha meus KPIs do Sonar, qual criativo cortar?".
- Claude usa MCP pra puxar dados reais e analisa.
- Multi-tenant: o token define a agencia. Voce so ve seus dados.

## Gerar token
- /configuracoes/mcp > Nome + dias de expiracao (0 = sem expiracao).
- Token revelado UMA vez (sn_mcp_...). Copia agora ou nunca mais.

## Instalar no Claude Desktop
- Edita claude_desktop_config.json:
\`\`\`
{
  "mcpServers": {
    "sonar-crm": {
      "command": "node",
      "args": ["C:/.../mcp-server/dist/index.js"],
      "env": {
        "SONAR_MCP_TOKEN": "sn_mcp_...",
        "SONAR_MCP_URL": "https://sonarcrm.com.br"
      }
    }
  }
}
\`\`\`

## Instalar no Claude Code
- \`claude mcp add sonar-crm --command node --args .../mcp-server/dist/index.js --env SONAR_MCP_TOKEN=... --env SONAR_MCP_URL=https://sonarcrm.com.br\`

## Tools disponiveis (8)
- kpis_resumo, serie_diaria, top_campanhas, top_criativos, tabela_anuncios.
- listar_tickets (status filter), listar_contatos (busca), buscar_etiquetas.

## Multi-tenant
- Cada token amarrado a 1 agencia. Outro cliente NUNCA ve seus dados.
- Tools validam agencia_id server-side antes de qualquer query.

## Revogar
- /configuracoes/mcp > linha do token > Revogar. Efeito imediato.

## Custo
- Usa SEU plano Claude (Pro/Max). CRM nao cobra extra.

## Problemas
- Token nao funciona: prefixo errado (precisa sn_mcp_), expirado, ou revogado.
- "auth_invalida": token cifrado errado, gera novo.
- Tool nao responde: VPS pode estar offline ou /api/mcp/call quebrado.
`;
