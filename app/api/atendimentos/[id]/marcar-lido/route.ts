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

  const body = (await req.json().catch(() => ({}))) as { lido?: boolean };
  const lido = body.lido !== false;

  const sb = createServiceClient();
  const { data: u } = await sb.from("usuarios").select("agencia_id").eq("id", auth.user.id).single();
  if (!u) return NextResponse.json({ error: "no_user" }, { status: 403 });

  // Marca todas mensagens do cliente como lida/entregue
  await sb
    .from("mensagens")
    .update({ status: lido ? "lida" : "entregue" })
    .eq("ticket_id", id)
    .eq("agencia_id", u.agencia_id)
    .eq("autor", "cliente");

  void audit({ agenciaId: u.agencia_id, usuarioId: auth.user.id, acao: "view", entidade: "ticket_marcar_lido", entidadeId: id, payload: { lido } });
  return NextResponse.json({ ok: true });
}
