/**
 * GET /api/atendimentos/fechamentos
 * Log de fechamentos (ganho + perdido). Aceita ?tipo=ganho|perdido (default: ambos).
 *
 * DELETE /api/atendimentos/fechamentos?ticketId=xxx
 * Remove a marcação de fechamento (reseta resultado/valor/motivo/fechado_em).
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "auth" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const tipo = searchParams.get("tipo"); // "ganho" | "perdido" | null

  const sb = createServiceClient();
  const { data: u } = await sb.from("usuarios").select("agencia_id").eq("id", auth.user.id).single();
  if (!u) return NextResponse.json({ error: "no_user" }, { status: 403 });

  let q = sb
    .from("tickets")
    .select("id, numero, valor_fechado, fechado_em, metadata, resultado, motivo_perdido, contato:contatos(nome), fechador:usuarios!tickets_fechado_por_fkey(nome)")
    .eq("agencia_id", u.agencia_id)
    .not("resultado", "is", null)
    .order("fechado_em", { ascending: false })
    .limit(300);

  if (tipo === "ganho" || tipo === "perdido") q = q.eq("resultado", tipo);

  const { data: tickets } = await q;

  type AnyObj = Record<string, unknown>;
  const fechamentos = (tickets || []).map((t) => {
    const cAny = t.contato as unknown;
    const c = (Array.isArray(cAny) ? cAny[0] : cAny) as AnyObj | null;
    const fAny = t.fechador as unknown;
    const f = (Array.isArray(fAny) ? fAny[0] : fAny) as AnyObj | null;
    const meta = (t.metadata || {}) as { servico?: string; quantidade?: number };
    return {
      ticketId: t.id,
      numero: t.numero,
      resultado: (t.resultado as "ganho" | "perdido") || "ganho",
      valor: t.valor_fechado != null ? Number(t.valor_fechado) : null,
      servico: meta.servico || null,
      quantidade: meta.quantidade ?? null,
      motivo_perdido: (t.motivo_perdido as string | null) || null,
      fechado_em: t.fechado_em,
      contato_nome: (c?.nome as string) || "—",
      fechado_por: (f?.nome as string) || null,
    };
  });

  return NextResponse.json({ fechamentos });
}

export async function DELETE(req: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "auth" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const ticketId = searchParams.get("ticketId");
  if (!ticketId) return NextResponse.json({ error: "missing_ticketId" }, { status: 400 });

  const sb = createServiceClient();
  const { data: u } = await sb.from("usuarios").select("agencia_id").eq("id", auth.user.id).single();
  if (!u) return NextResponse.json({ error: "no_user" }, { status: 403 });

  const { error } = await sb
    .from("tickets")
    .update({ resultado: null, valor_fechado: null, motivo_perdido: null })
    .eq("id", ticketId)
    .eq("agencia_id", u.agencia_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
