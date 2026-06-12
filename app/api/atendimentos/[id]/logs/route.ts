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

  // Inclui também eventos do CONTATO por trás do ticket (etiqueta, edição de
  // contato, sanitização) — "todas as ações que ocorreram com o cliente".
  const { data: tk } = await sb
    .from("tickets")
    .select("contato_id")
    .eq("id", id)
    .eq("agencia_id", u.agencia_id)
    .maybeSingle();
  const contatoId = tk?.contato_id as string | undefined;

  const ors = [`entidade_id.eq.${id}`, `payload->>ticket_id.eq.${id}`];
  if (contatoId) ors.push(`entidade_id.eq.${contatoId}`, `payload->>contato_id.eq.${contatoId}`);

  const { data: logs } = await sb
    .from("audit_logs")
    .select("id, acao, entidade, payload, created_at, usuario:usuarios(nome)")
    .eq("agencia_id", u.agencia_id)
    .or(ors.join(","))
    .order("created_at", { ascending: false })
    .limit(200);

  return NextResponse.json({ logs: logs || [] });
}
