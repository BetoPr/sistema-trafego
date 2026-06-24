/**
 * Tools do bot Dados — JSON schema pra LLM + executor server-side.
 * Filtra por agencia_id do usuario logado. Reusa queries existentes.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { kpiResumo, topCampanhas, topCriativos, serieDiaria, tabelaAnuncios } from "@/lib/meta-ads/queries";

export const TOOLS_DADOS = [
  {
    type: "function",
    function: {
      name: "kpis_resumo",
      description: "KPIs agregados do periodo: investido, faturamento, lucro, ROAS, leads, CPL, vendas, impressoes, CTR, campanhas ativas.",
      parameters: {
        type: "object",
        properties: { periodo: { type: "string", enum: ["hoje", "7d", "30d"], description: "Padrao 30d" } },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "top_campanhas",
      description: "Top campanhas por gasto no periodo. Retorna nome, gasto, leads, conversoes.",
      parameters: {
        type: "object",
        properties: { periodo: { type: "string", enum: ["hoje", "7d", "30d"] }, limit: { type: "number", description: "Padrao 5" } },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "top_criativos",
      description: "Top anuncios (criativos) por gasto. Retorna nome, campanha, gasto, leads, impressoes.",
      parameters: {
        type: "object",
        properties: { periodo: { type: "string", enum: ["hoje", "7d", "30d"] }, limit: { type: "number" } },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "tabela_anuncios",
      description: "Tabela completa de anuncios (Meta Ads): nome, status, resultados, custo/result, gasto, imp, alcance, CPM, CTR, ROAS, campanha.",
      parameters: {
        type: "object",
        properties: { periodo: { type: "string", enum: ["hoje", "7d", "30d"] } },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "serie_diaria",
      description: "Serie diaria: gasto + receita + leads por dia no periodo. Util pra analise de tendencia.",
      parameters: {
        type: "object",
        properties: { periodo: { type: "string", enum: ["hoje", "7d", "30d"] } },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "tickets_resumo",
      description: "Resumo dos tickets WhatsApp da agencia: contagem por status, ultimos 30d.",
      parameters: { type: "object", properties: {} },
    },
  },
];

export async function executarTool(
  sb: SupabaseClient,
  agenciaId: string,
  nome: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  const periodo = args.periodo === "hoje" || args.periodo === "7d" || args.periodo === "30d" ? args.periodo : "30d";
  const limit = typeof args.limit === "number" ? args.limit : undefined;

  switch (nome) {
    case "kpis_resumo":
      return kpiResumo(sb, agenciaId, periodo);
    case "top_campanhas":
      return topCampanhas(sb, agenciaId, periodo, limit ?? 5);
    case "top_criativos":
      return topCriativos(sb, agenciaId, periodo, limit ?? 6);
    case "tabela_anuncios":
      return tabelaAnuncios(sb, agenciaId, periodo);
    case "serie_diaria":
      return serieDiaria(sb, agenciaId, periodo);
    case "tickets_resumo": {
      const inicio = new Date(Date.now() - 30 * 86400_000).toISOString();
      const { data } = await sb
        .from("tickets")
        .select("status")
        .eq("agencia_id", agenciaId)
        .gte("created_at", inicio);
      const cont: Record<string, number> = { pendente: 0, aberto: 0, fechado: 0 };
      for (const t of data || []) cont[(t.status as string) || "outro"] = (cont[(t.status as string) || "outro"] || 0) + 1;
      return { ultimos_30d: cont, total: (data || []).length };
    }
    default:
      throw new Error(`tool desconhecida: ${nome}`);
  }
}
