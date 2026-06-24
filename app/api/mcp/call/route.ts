/**
 * POST /api/mcp/call
 * Headers: Authorization: Bearer <sn_mcp_...>
 * Body: { tool: string, args: object }
 *
 * Roteador unico pra todas as tools MCP. Valida token, isola agencia_id.
 */
import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { createServiceClient } from "@/lib/supabase/service";
import { kpiResumo, topCampanhas, topCriativos, serieDiaria, tabelaAnuncios } from "@/lib/meta-ads/queries";

export const runtime = "nodejs";

function sha256(s: string): string { return crypto.createHash("sha256").update(s).digest("hex"); }

async function ctxFromToken(authHeader: string | null) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();
  if (!token.startsWith("sn_mcp_")) return null;
  const sb = createServiceClient();
  const hash = sha256(token);
  const { data: row } = await sb
    .from("mcp_tokens")
    .select("id, agencia_id, usuario_id, scopes, expira_em, ativo")
    .eq("token_hash", hash)
    .eq("ativo", true)
    .is("revogado_em", null)
    .maybeSingle();
  if (!row) return null;
  if (row.expira_em && new Date(row.expira_em as string) < new Date()) return null;
  void sb.from("mcp_tokens").update({ ultima_uso_em: new Date().toISOString() }).eq("id", row.id);
  return { agenciaId: row.agencia_id as string, scopes: (row.scopes || []) as string[], sb };
}

interface Args { periodo?: "hoje" | "7d" | "30d"; limit?: number; busca?: string; status?: string }

export async function POST(req: Request) {
  const ctx = await ctxFromToken(req.headers.get("authorization"));
  if (!ctx) return NextResponse.json({ ok: false, error: "auth_invalida" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { tool?: string; args?: Args };
  const tool = body.tool;
  const args: Args = body.args || {};
  const periodo = args.periodo === "hoje" || args.periodo === "7d" || args.periodo === "30d" ? args.periodo : "30d";

  try {
    switch (tool) {
      case "kpis_resumo": {
        const r = await kpiResumo(ctx.sb, ctx.agenciaId, periodo);
        return NextResponse.json({ ok: true, data: r });
      }
      case "serie_diaria": {
        const r = await serieDiaria(ctx.sb, ctx.agenciaId, periodo);
        return NextResponse.json({ ok: true, data: r });
      }
      case "top_campanhas": {
        const r = await topCampanhas(ctx.sb, ctx.agenciaId, periodo, args.limit ?? 10);
        return NextResponse.json({ ok: true, data: r });
      }
      case "top_criativos": {
        const r = await topCriativos(ctx.sb, ctx.agenciaId, periodo, args.limit ?? 10);
        return NextResponse.json({ ok: true, data: r });
      }
      case "tabela_anuncios": {
        const r = await tabelaAnuncios(ctx.sb, ctx.agenciaId, periodo);
        return NextResponse.json({ ok: true, data: r });
      }
      case "listar_tickets": {
        const q = ctx.sb
          .from("tickets")
          .select("id, numero, status, ultima_mensagem_em, ultima_mensagem_preview, valor_fechado, fechado_em, sentimento, contato:contatos(nome, whatsapp)")
          .eq("agencia_id", ctx.agenciaId)
          .order("ultima_mensagem_em", { ascending: false, nullsFirst: false })
          .limit(args.limit ?? 50);
        if (args.status) q.eq("status", args.status);
        const { data } = await q;
        return NextResponse.json({ ok: true, data: data ?? [] });
      }
      case "listar_contatos": {
        const q = ctx.sb
          .from("contatos")
          .select("id, nome, whatsapp, wa_id, criado_em:created_at")
          .eq("agencia_id", ctx.agenciaId)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(args.limit ?? 50);
        if (args.busca) q.ilike("nome", `%${args.busca}%`);
        const { data } = await q;
        return NextResponse.json({ ok: true, data: data ?? [] });
      }
      case "buscar_etiquetas": {
        const q = ctx.sb
          .from("etiquetas")
          .select("id, nome, cor, etiqueta_pai_id, palavra_gatilho, ativo")
          .eq("agencia_id", ctx.agenciaId)
          .eq("ativo", true)
          .order("nome");
        if (args.busca) q.ilike("nome", `%${args.busca}%`);
        const { data } = await q;
        return NextResponse.json({ ok: true, data: data ?? [] });
      }
      default:
        return NextResponse.json({ ok: false, error: `tool_desconhecida: ${tool}` }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "erro" }, { status: 500 });
  }
}
