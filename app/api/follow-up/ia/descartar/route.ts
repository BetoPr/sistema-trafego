import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { audit } from "@/lib/crm/audit";

export const runtime = "nodejs";

/**
 * POST /api/follow-up/ia/descartar { ticketId, fechar?: boolean, horas?: number, nunca?: boolean }
 * Tira a conversa da lista de Follow-up IA:
 *  - fechar=true  → ENCERRA o ticket (status fechado).
 *  - fechar=false → cooldown configurável (follow_up_ia_snooze_ate): some da busca
 *    por `horas` (default 12; 0,5..720h) e volta depois. `nunca=true` = não volta
 *    (snooze pro ano 2999) a menos que o cliente mande mensagem nova.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "auth" }, { status: 401 });

  const sb = createServiceClient();
  const { data: u } = await sb.from("usuarios").select("agencia_id").eq("id", auth.user.id).single();
  if (!u) return NextResponse.json({ error: "no_user" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as { ticketId?: string; fechar?: boolean; horas?: number; nunca?: boolean };
  if (!body.ticketId) return NextResponse.json({ error: "ticketId_obrigatorio" }, { status: 400 });

  // Confirma posse do ticket
  const { data: tk } = await sb.from("tickets").select("id").eq("id", body.ticketId).eq("agencia_id", u.agencia_id).maybeSingle();
  if (!tk) return NextResponse.json({ error: "ticket_nao_encontrado" }, { status: 404 });

  if (body.fechar) {
    const { error } = await sb
      .from("tickets")
      .update({ status: "fechado", fechado_em: new Date().toISOString(), fechado_por: auth.user.id })
      .eq("id", body.ticketId)
      .eq("agencia_id", u.agencia_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    void audit({ agenciaId: u.agencia_id, usuarioId: auth.user.id, acao: "close_ticket", entidade: "ticket", entidadeId: body.ticketId, payload: { via: "follow_up_ia" } });
    return NextResponse.json({ ok: true, fechado: true });
  }

  // Descarte sem fechar → cooldown configurável (default 12h; "nunca" = não volta)
  const ate = body.nunca
    ? "2999-12-31T00:00:00.000Z"
    : new Date(Date.now() + Math.max(0.5, Math.min(720, Number(body.horas) || 12)) * 3600000).toISOString();
  const { error } = await sb
    .from("tickets")
    .update({ follow_up_ia_snooze_ate: ate })
    .eq("id", body.ticketId)
    .eq("agencia_id", u.agencia_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, snooze_ate: ate });
}
