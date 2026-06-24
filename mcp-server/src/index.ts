#!/usr/bin/env node
/**
 * Sonar MCP Server — expoe dados do CRM via Model Context Protocol.
 * Token define agencia (multi-tenant). Cada call bate em /api/mcp/call.
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";

const TOKEN = process.env.SONAR_MCP_TOKEN || "";
const BASE_URL = (process.env.SONAR_MCP_URL || "https://sonarcrm.com.br").replace(/\/$/, "");

if (!TOKEN) {
  console.error("[sonar-mcp] SONAR_MCP_TOKEN nao definido");
  process.exit(1);
}

async function callApi(tool: string, args: Record<string, unknown>): Promise<unknown> {
  const r = await fetch(`${BASE_URL}/api/mcp/call`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify({ tool, args }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || (j as { ok?: boolean }).ok === false) {
    throw new Error(`API ${r.status}: ${(j as { error?: string }).error || r.statusText}`);
  }
  return (j as { data: unknown }).data;
}

const TOOLS: Tool[] = [
  {
    name: "kpis_resumo",
    description: "KPIs agregados do periodo: investido, faturamento, lucro, ROAS, leads, CPL, vendas, impressoes, cliques, CTR, campanhas ativas.",
    inputSchema: {
      type: "object",
      properties: {
        periodo: { type: "string", enum: ["hoje", "7d", "30d"], description: "Padrao 30d" },
      },
    },
  },
  {
    name: "serie_diaria",
    description: "Serie temporal diaria: gasto + receita + leads por dia no periodo.",
    inputSchema: {
      type: "object",
      properties: { periodo: { type: "string", enum: ["hoje", "7d", "30d"] } },
    },
  },
  {
    name: "top_campanhas",
    description: "Top campanhas por gasto no periodo.",
    inputSchema: {
      type: "object",
      properties: {
        periodo: { type: "string", enum: ["hoje", "7d", "30d"] },
        limit: { type: "number", description: "Quantas (padrao 10)" },
      },
    },
  },
  {
    name: "top_criativos",
    description: "Top anuncios (criativos) por gasto com thumb URL + campanha.",
    inputSchema: {
      type: "object",
      properties: {
        periodo: { type: "string", enum: ["hoje", "7d", "30d"] },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "tabela_anuncios",
    description: "Tabela completa de anuncios estilo Meta Ads Manager: nome, status, resultados, custo/result, gasto, imp, alcance, CPM, CTR, ROAS, campanha, conjunto.",
    inputSchema: {
      type: "object",
      properties: { periodo: { type: "string", enum: ["hoje", "7d", "30d"] } },
    },
  },
  {
    name: "listar_tickets",
    description: "Tickets do CRM (atendimentos WhatsApp). Filtra por status (pendente|aberto|fechado).",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string" },
        limit: { type: "number", description: "Padrao 50" },
      },
    },
  },
  {
    name: "listar_contatos",
    description: "Contatos da agencia (CRM). Busca por nome via parametro 'busca'.",
    inputSchema: {
      type: "object",
      properties: {
        busca: { type: "string" },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "buscar_etiquetas",
    description: "Etiquetas/pastas ativas da agencia, com cor + palavra_gatilho.",
    inputSchema: {
      type: "object",
      properties: { busca: { type: "string" } },
    },
  },
];

const server = new Server(
  { name: "sonar-crm", version: "0.1.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  try {
    const data = await callApi(req.params.name, (req.params.arguments || {}) as Record<string, unknown>);
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  } catch (e) {
    return {
      content: [{ type: "text", text: `Erro: ${e instanceof Error ? e.message : String(e)}` }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`[sonar-mcp] conectado em ${BASE_URL}`);
}

main().catch((e) => {
  console.error("[sonar-mcp] fatal:", e);
  process.exit(1);
});
