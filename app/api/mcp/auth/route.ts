/**
 * POST /api/mcp/auth { token } -> { ok, agencia_id, agencia_nome, usuario_id?, scopes[] }
 * Valida token MCP do header. Usado pelo mcp-server na inicializacao + a cada call.
 */
import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

function sha256(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { token?: string };
  const token = (body.token || "").trim();
  if (!token || !token.startsWith("sn_mcp_")) {
    return NextResponse.json({ ok: false, error: "token_invalido" }, { status: 401 });
  }

  const sb = createServiceClient();
  const hash = sha256(token);
  const { data: row } = await sb
    .from("mcp_tokens")
    .select("id, agencia_id, usuario_id, scopes, expira_em, ativo, revogado_em, agencias(nome)")
    .eq("token_hash", hash)
    .eq("ativo", true)
    .is("revogado_em", null)
    .maybeSingle();

  if (!row) return NextResponse.json({ ok: false, error: "nao_encontrado" }, { status: 401 });
  if (row.expira_em && new Date(row.expira_em as string) < new Date()) {
    return NextResponse.json({ ok: false, error: "expirado" }, { status: 401 });
  }

  // Touch
  await sb.from("mcp_tokens").update({ ultima_uso_em: new Date().toISOString() }).eq("id", row.id);

  const ag = Array.isArray(row.agencias) ? row.agencias[0] : row.agencias;
  return NextResponse.json({
    ok: true,
    agencia_id: row.agencia_id,
    agencia_nome: (ag as { nome?: string } | null)?.nome ?? "",
    usuario_id: row.usuario_id,
    scopes: row.scopes,
  });
}
