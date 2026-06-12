import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sugerirFollowUpTicket } from "@/lib/crm/ia";

export const runtime = "nodejs";
export const maxDuration = 60;

/** POST /api/follow-up/ia/regenerar { ticketId } → nova sugestão da IA. */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "auth" }, { status: 401 });

  const sb = createServiceClient();
  const { data: u } = await sb.from("usuarios").select("agencia_id").eq("id", auth.user.id).single();
  if (!u) return NextResponse.json({ error: "no_user" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as { ticketId?: string };
  if (!body.ticketId) return NextResponse.json({ error: "ticketId_obrigatorio" }, { status: 400 });

  // Garante que o ticket é da agência
  const { data: tk } = await sb.from("tickets").select("id").eq("id", body.ticketId).eq("agencia_id", u.agencia_id).maybeSingle();
  if (!tk) return NextResponse.json({ error: "ticket_nao_encontrado" }, { status: 404 });

  try {
    const s = await sugerirFollowUpTicket({ agenciaId: u.agencia_id, ticketId: body.ticketId });
    return NextResponse.json({ ok: true, ...s });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
