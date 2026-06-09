import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

/**
 * GET /api/atendimentos/[id]/logs
 * Retorna eventos do audit_logs ligados ao ticket (incluindo transferências,
 * encerramentos, mensagens enviadas, etc).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "auth" }, { status: 401 });

  const sb = createServiceClient();
  const { data: u } = await sb.from("usuarios").select("agencia_id").eq("id", auth.user.id).single();
  if (!u) return NextResponse.json({ error: "no_user" }, { status: 403 });

  const { data: logs } = await sb
    .from("audit_logs")
    .select("id, acao, entidade, payload, created_at, usuario:usuarios(nome)")
    .eq("agencia_id", u.agencia_id)
    .or(`entidade_id.eq.${id},payload->>ticket_id.eq.${id}`)
    .order("created_at", { ascending: false })
    .limit(200);

  return NextResponse.json({ logs: logs || [] });
}
