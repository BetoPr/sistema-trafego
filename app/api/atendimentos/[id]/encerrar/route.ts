import { NextResponse, after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { audit } from "@/lib/crm/audit";
import { dispatchWebhook } from "@/lib/crm/webhook-dispatcher";
import { gerarResumoTicket } from "@/lib/crm/ia";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "auth" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { valor_fechado?: number };

  const sb = createServiceClient();
  const { data: u } = await sb.from("usuarios").select("agencia_id").eq("id", auth.user.id).single();
  if (!u) return NextResponse.json({ error: "no_user" }, { status: 403 });

  const { error } = await sb
    .from("tickets")
    .update({
      status: "fechado",
      fechado_em: new Date().toISOString(),
      fechado_por: auth.user.id,
      valor_fechado: typeof body.valor_fechado === "number" ? body.valor_fechado : undefined,
    })
    .eq("id", id)
    .eq("agencia_id", u.agencia_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  void audit({ agenciaId: u.agencia_id, usuarioId: auth.user.id, acao: "close_ticket", entidade: "ticket", entidadeId: id });
  void dispatchWebhook({ agenciaId: u.agencia_id, evento: "ticket.fechado", payload: { ticket_id: id, fechado_por: auth.user.id } });

  // Resumo automático ao fechar (gasto baixo de token) — base pra análise geral.
  // Roda em after() pra não atrasar a resposta; falha silenciosa se Groq não configurado.
  after(async () => {
    try {
      await gerarResumoTicket({ agenciaId: u.agencia_id, ticketId: id });
    } catch (e) {
      console.error("[encerrar] resumo automático falhou:", e instanceof Error ? e.message : e);
    }
  });

  return NextResponse.json({ ok: true });
}
