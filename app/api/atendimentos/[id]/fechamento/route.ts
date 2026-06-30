/**
 * POST /api/atendimentos/[id]/fechamento
 * Body: { valor: number|null, servico: string|null, quantidade: number|null }
 * Atualiza tickets.valor_fechado + metadata.servico + metadata.quantidade.
 */
import { NextResponse, after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { audit } from "@/lib/crm/audit";
import { enfileirarPurchase, cancelarPurchasePorFechamento } from "@/lib/crm/capi-eventos";

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
    resultado?: "ganho" | "perdido";
    motivo_perdido?: string | null;
  };
  const resultado: "ganho" | "perdido" = body.resultado === "perdido" ? "perdido" : "ganho";

  const sb = createServiceClient();
  const { data: u } = await sb.from("usuarios").select("agencia_id").eq("id", auth.user.id).single();
  if (!u) return NextResponse.json({ error: "no_user" }, { status: 403 });

  const { data: ticket } = await sb
    .from("tickets")
    .select("id, metadata, valor_fechado, resultado")
    .eq("id", id)
    .eq("agencia_id", u.agencia_id)
    .single();
  if (!ticket) return NextResponse.json({ error: "ticket_nao_encontrado" }, { status: 404 });

  // Já tem resultado registrado — recusa
  if (ticket.resultado != null) {
    return NextResponse.json({ error: "ja_marcado" }, { status: 409 });
  }

  const meta = (ticket.metadata && typeof ticket.metadata === "object") ? { ...ticket.metadata } : {};
  if (body.servico != null) meta.servico = body.servico;
  if (body.quantidade != null) meta.quantidade = body.quantidade;

  // NÃO muda status — ticket continua onde está; encerrar é ação separada.
  // fechado_em carimba data pro Dashboard metrificar.
  const updatePayload: Record<string, unknown> = {
    metadata: meta,
    fechado_em: new Date().toISOString(),
    fechado_por: auth.user.id,
    resultado,
  };
  if (resultado === "ganho") {
    updatePayload.valor_fechado = body.valor;
  } else {
    updatePayload.valor_fechado = null;
    updatePayload.motivo_perdido = body.motivo_perdido?.trim() || null;
  }

  const { error } = await sb
    .from("tickets")
    .update(updatePayload)
    .eq("id", id)
    .eq("agencia_id", u.agencia_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // CAPI Purchase só pra ganho.
  if (resultado === "ganho" && body.valor != null) {
    after(async () => {
      try {
        await enfileirarPurchase(id);
      } catch (e) {
        console.error("[fechamento] enfileirar CAPI falhou:", e instanceof Error ? e.message : String(e));
      }
    });
  }

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

/** DELETE — remove o fechamento do ticket (some do Dashboard e do log). */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "auth" }, { status: 401 });

  const sb = createServiceClient();
  const { data: u } = await sb.from("usuarios").select("agencia_id").eq("id", auth.user.id).single();
  if (!u) return NextResponse.json({ error: "no_user" }, { status: 403 });

  const { data: ticket } = await sb
    .from("tickets")
    .select("id, metadata, valor_fechado, resultado")
    .eq("id", id)
    .eq("agencia_id", u.agencia_id)
    .single();
  if (!ticket) return NextResponse.json({ error: "ticket_nao_encontrado" }, { status: 404 });
  if (ticket.resultado == null && ticket.valor_fechado == null) return NextResponse.json({ error: "sem_fechamento" }, { status: 404 });

  const meta = (ticket.metadata && typeof ticket.metadata === "object") ? { ...ticket.metadata } : {};
  delete (meta as Record<string, unknown>).servico;
  delete (meta as Record<string, unknown>).quantidade;

  const { error } = await sb
    .from("tickets")
    .update({ valor_fechado: null, fechado_em: null, fechado_por: null, metadata: meta, resultado: null, motivo_perdido: null })
    .eq("id", id)
    .eq("agencia_id", u.agencia_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Cancela o Purchase no CAPI + enfileira Refund pro Meta (se ja tinha enviado).
  after(async () => {
    try {
      await cancelarPurchasePorFechamento(id);
    } catch (e) {
      console.error("[fechamento DELETE] cancelar CAPI falhou:", e instanceof Error ? e.message : String(e));
    }
  });

  void audit({
    agenciaId: u.agencia_id,
    usuarioId: auth.user.id,
    acao: "delete",
    entidade: "ticket_fechamento",
    entidadeId: id,
    payload: { valor_removido: ticket.valor_fechado },
  });

  return NextResponse.json({ ok: true });
}
