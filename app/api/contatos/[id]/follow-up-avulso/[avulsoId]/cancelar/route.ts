/**
 * POST /api/contatos/[id]/follow-up-avulso/[avulsoId]/cancelar
 * Cancela follow-up agendado. Só funciona se status='agendado'.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { audit } from "@/lib/crm/audit";

export const runtime = "nodejs";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string; avulsoId: string }> }) {
  const { id: contatoId, avulsoId } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "auth" }, { status: 401 });

  const sb = createServiceClient();
  const { data: u } = await sb.from("usuarios").select("agencia_id").eq("id", auth.user.id).single();
  if (!u) return NextResponse.json({ error: "no_user" }, { status: 403 });

  const { data: existing } = await sb
    .from("follow_up_avulsos")
    .select("id, agencia_id, contato_id, status")
    .eq("id", avulsoId)
    .maybeSingle();
  if (!existing || existing.agencia_id !== u.agencia_id || existing.contato_id !== contatoId) {
    return NextResponse.json({ error: "nao_encontrado" }, { status: 404 });
  }
  if (existing.status !== "agendado") {
    return NextResponse.json({ error: "nao_cancelavel", status: existing.status }, { status: 400 });
  }

  await sb.from("follow_up_avulsos")
    .update({ status: "cancelado", motivo: "cancelado pelo usuário" })
    .eq("id", avulsoId);

  void audit({ agenciaId: u.agencia_id, usuarioId: auth.user.id, acao: "delete", entidade: "follow_up_avulso", entidadeId: avulsoId });
  return NextResponse.json({ ok: true });
}
