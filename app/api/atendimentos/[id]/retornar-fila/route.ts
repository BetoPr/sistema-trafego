import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
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

  // Retornar à fila = reativa IA + se houver perfil IA ativo cobrindo o canal,
  // move ticket pra primeira fila ativa do perfil (ex: "IA Atendendo")
  const { data: ticket } = await sb
    .from("tickets")
    .select("canal_id, fila_id")
    .eq("id", id)
    .eq("agencia_id", u.agencia_id)
    .maybeSingle();

  let filaIA: string | null = null;
  let perfilIA: string | null = null;
  if (ticket?.canal_id) {
    const { data: perfis } = await sb
      .from("ia_atendimento_perfis")
      .select("id, canais_ativos, filas_ativas")
      .eq("agencia_id", u.agencia_id)
      .eq("ativo", true);
    const perfilEscolhido = (perfis || []).find((p) => {
      const canaisArr = (p.canais_ativos || []) as string[];
      return canaisArr.length === 0 || canaisArr.includes(ticket.canal_id as string);
    });
    if (perfilEscolhido) {
      const filasArr = (perfilEscolhido.filas_ativas || []) as string[];
      if (filasArr.length > 0) filaIA = filasArr[0];
      perfilIA = perfilEscolhido.id;
    }
  }

  const patch: Record<string, unknown> = {
    status: "pendente",
    usuario_id: null,
    ia_pausada: false,
    updated_at: new Date().toISOString(),
  };
  if (filaIA) patch.fila_id = filaIA;
  if (perfilIA) patch.ia_perfil_id = perfilIA;

  const { error } = await sb
    .from("tickets")
    .update(patch)
    .eq("id", id)
    .eq("agencia_id", u.agencia_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  void audit({
    agenciaId: u.agencia_id,
    usuarioId: auth.user.id,
    acao: "update",
    entidade: "ticket_retornar_fila",
    entidadeId: id,
    payload: { ia_reativada: true },
  });
  return NextResponse.json({ ok: true });
}
