/**
 * POST /api/atendimentos/[id]/fechamento
 * Body: { valor: number|null, servico: string|null, quantidade: number|null }
 * Atualiza tickets.valor_fechado + metadata.servico + metadata.quantidade.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { audit } from "@/lib/crm/audit";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "auth" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    valor?: number | null;
    servico?: string | null;
    quantidade?: number | null;
  };

  const sb = createServiceClient();
  const { data: u } = await sb.from("usuarios").select("agencia_id").eq("id", auth.user.id).single();
  if (!u) return NextResponse.json({ error: "no_user" }, { status: 403 });

  const { data: ticket } = await sb
    .from("tickets")
    .select("id, metadata")
    .eq("id", id)
    .eq("agencia_id", u.agencia_id)
    .single();
  if (!ticket) return NextResponse.json({ error: "ticket_nao_encontrado" }, { status: 404 });

  const meta = (ticket.metadata && typeof ticket.metadata === "object") ? { ...ticket.metadata } : {};
  if (body.servico != null) meta.servico = body.servico;
  if (body.quantidade != null) meta.quantidade = body.quantidade;

  const { error } = await sb
    .from("tickets")
    .update({
      valor_fechado: body.valor,
      metadata: meta,
    })
    .eq("id", id)
    .eq("agencia_id", u.agencia_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  void audit({
    agenciaId: u.agencia_id,
    usuarioId: auth.user.id,
    acao: "update",
    entidade: "ticket_fechamento",
    entidadeId: id,
    payload: { valor: body.valor, servico: body.servico, quantidade: body.quantidade },
  });

  return NextResponse.json({ ok: true });
}
