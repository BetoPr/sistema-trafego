# Sonar MCP Server

MCP server pra acessar dados do **Sonar CRM** dentro do Claude Desktop, Claude Code, Cursor ou qualquer cliente compatível com Model Context Protocol.

Multi-tenant: o token define a agência. Você só vê dados da sua.

## Instalar

```bash
cd mcp-server
npm install
npm run build
```

## Gerar token

1. Abre `/configuracoes/mcp` no Sonar
2. Cria um token (ex.: "Claude Desktop do PC")
3. Copia o token (`sn_mcp_...`) — só mostra UMA vez

## Configurar Claude Desktop

Edita `~/Library/Application Support/Claude/claude_desktop_config.json` (Mac) ou `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "sonar-crm": {
      "command": "node",
      "args": ["C:/Users/ADM/Desktop/sistema-trafego/mcp-server/dist/index.js"],
      "env": {
        "SONAR_MCP_TOKEN": "sn_mcp_seu_token_aqui",
        "SONAR_MCP_URL": "https://sonarcrm.com.br"
      }
    }
  }
}
```

Reinicia Claude Desktop.

## Configurar Claude Code

```bash
claude mcp add sonar-crm \
  --command node \
  --args "C:/Users/ADM/Desktop/sistema-trafego/mcp-server/dist/index.js" \
  --env SONAR_MCP_TOKEN=sn_mcp_seu_token \
  --env SONAR_MCP_URL=https://sonarcrm.com.br
```

Ou edita manualmente `~/.config/claude-code/mcp.json`.

## Tools disponíveis

| Tool | Descrição |
|---|---|
| `kpis_resumo` | KPIs do período (gasto, fatura, ROAS, leads, …) |
| `serie_diaria` | Série temporal: gasto + receita + leads/dia |
| `top_campanhas` | Top campanhas por gasto |
| `top_criativos` | Top anúncios com thumb + campanha |
| `tabela_anuncios` | Tabela completa estilo Meta Ads Manager |
| `listar_tickets` | Tickets WhatsApp (pendente/aberto/fechado) |
| `listar_contatos` | Contatos CRM (com busca) |
| `buscar_etiquetas` | Pastas/etiquetas com gatilhos |

## Exemplos de prompt

> "Analisa meus KPIs dos últimos 7 dias e me sugere onde cortar gasto."

> "Quais 3 criativos com pior ROAS? Pega `tabela_anuncios` 30d, mostra os 3 piores."

> "Quantos tickets pendentes tenho? Lista os mais antigos."

## Revogar token

Em `/configuracoes/mcp`, clica em "Revogar" na linha do token. Efeito imediato.
