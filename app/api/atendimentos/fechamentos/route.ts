/**
 * GET /api/atendimentos/fechamentos
 * Log de todos os fechamentos da agência (tickets com valor_fechado), mais recentes primeiro.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "auth" }, { status: 401 });

  const sb = createServiceClient();
  const { data: u } = await sb.from("usuarios").select("agencia_id").eq("id", auth.user.id).single();
  if (!u) return NextResponse.json({ error: "no_user" }, { status: 403 });

  const { data: tickets } = await sb
    .from("tickets")
    .select("id, numero, valor_fechado, fechado_em, metadata, contato:contatos(nome), fechador:usuarios!tickets_fechado_por_fkey(nome)")
    .eq("agencia_id", u.agencia_id)
    .not("valor_fechado", "is", null)
    .order("fechado_em", { ascending: false })
    .limit(200);

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
      valor: Number(t.valor_fechado),
      servico: meta.servico || null,
      quantidade: meta.quantidade ?? null,
      fechado_em: t.fechado_em,
      contato_nome: (c?.nome as string) || "—",
      fechado_por: (f?.nome as string) || null,
    };
  });

  return NextResponse.json({ fechamentos });
}
