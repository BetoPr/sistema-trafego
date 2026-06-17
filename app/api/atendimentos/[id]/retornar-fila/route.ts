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

  // Retornar à fila = reativa IA. Se houver perfil IA ativo cobrindo o canal,
  // marca ia_perfil_id (liga o ícone de robô). NÃO mexe em fila_id — filas fixas
  // foram aposentadas; setar fila inexistente quebrava FK (tickets_fila_id_fkey).
  const { data: ticket } = await sb
    .from("tickets")
    .select("canal_id")
    .eq("id", id)
    .eq("agencia_id", u.agencia_id)
    .maybeSingle();

  let perfilIA: string | null = null;
  if (ticket?.canal_id) {
    const { data: perfis } = await sb
      .from("ia_atendimento_perfis")
      .select("id, canais_ativos")
      .eq("agencia_id", u.agencia_id)
      .eq("ativo", true);
    const perfilEscolhido = (perfis || []).find((p) => {
      const canaisArr = (p.canais_ativos || []) as string[];
      return canaisArr.length === 0 || canaisArr.includes(ticket.canal_id as string);
    });
    if (perfilEscolhido) perfilIA = perfilEscolhido.id;
  }

  const patch: Record<string, unknown> = {
    status: "pendente",
    usuario_id: null,
    ia_pausada: false,
    updated_at: new Date().toISOString(),
  };
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
