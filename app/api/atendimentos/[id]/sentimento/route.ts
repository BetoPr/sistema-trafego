import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { analisarSentimentoTicket } from "@/lib/crm/ia";
import { audit } from "@/lib/crm/audit";

export const runtime = "nodejs";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "auth" }, { status: 401 });

  const sb = createServiceClient();
  const { data: u } = await sb.from("usuarios").select("agencia_id").eq("id", auth.user.id).single();
  if (!u) return NextResponse.json({ error: "no_user" }, { status: 403 });

  // 1x por atendimento: se já tem sentimento, recusa (evita gasto de token repetido
  // e mantém o registro consistente pra análise de satisfação do dashboard).
  const { data: t } = await sb
    .from("tickets")
    .select("sentimento")
    .eq("id", id)
    .eq("agencia_id", u.agencia_id)
    .maybeSingle();
  if (t?.sentimento) {
    return NextResponse.json({ error: "Este atendimento já foi analisado (1x por atendimento)." }, { status: 409 });
  }

  try {
    const r = await analisarSentimentoTicket({ agenciaId: u.agencia_id, ticketId: id });
    void audit({ agenciaId: u.agencia_id, usuarioId: auth.user.id, acao: "sentimento", entidade: "ticket", entidadeId: id, payload: { ticket_id: id, sentimento: r.sentimento, confianca: r.confianca } });
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
