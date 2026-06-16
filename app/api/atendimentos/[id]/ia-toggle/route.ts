/**
 * POST /api/atendimentos/[id]/ia-toggle
 * Body: { pausada?: boolean } — se omitido, alterna o estado atual.
 *
 * Liga ou desliga a IA pra esse ticket especifico. Logado em ia_atendimento_log
 * como pausa_manual ou retomada_manual.
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

  const sb = createServiceClient();
  const { data: u } = await sb.from("usuarios").select("agencia_id").eq("id", auth.user.id).single();
  if (!u) return NextResponse.json({ error: "no_user" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as { pausada?: boolean };

  const { data: ticket } = await sb
    .from("tickets")
    .select("id, agencia_id, ia_pausada, ia_perfil_id, canal_id, fila_id")
    .eq("id", id)
    .maybeSingle();
  if (!ticket || ticket.agencia_id !== u.agencia_id) {
    return NextResponse.json({ error: "ticket_invalido" }, { status: 404 });
  }

  const novaPausada = typeof body.pausada === "boolean" ? body.pausada : !ticket.ia_pausada;

  // Se reativando IA: também garante que está numa fila ativa do perfil
  let filaAjustada: string | null = null;
  let perfilAtribuido: string | null = ticket.ia_perfil_id;
  if (!novaPausada && ticket.canal_id) {
    const { data: perfis } = await sb
      .from("ia_atendimento_perfis")
      .select("id, canais_ativos, filas_ativas")
      .eq("agencia_id", u.agencia_id)
      .eq("ativo", true);
    const perfilEscolhido = (perfis || []).find((p) => {
      const arr = (p.canais_ativos || []) as string[];
      return arr.length === 0 || arr.includes(ticket.canal_id as string);
    });
    if (perfilEscolhido) {
      perfilAtribuido = perfilEscolhido.id;
      const filasArr = (perfilEscolhido.filas_ativas || []) as string[];
      if (filasArr.length > 0 && (!ticket.fila_id || !filasArr.includes(ticket.fila_id))) {
        filaAjustada = filasArr[0];
      }
    }
  }

  const patch: Record<string, unknown> = { ia_pausada: novaPausada };
  if (filaAjustada) patch.fila_id = filaAjustada;
  if (perfilAtribuido) patch.ia_perfil_id = perfilAtribuido;
  // Fix: marca instante de reativacao manual da IA. Usado pelo guard
  // pausa_se_humano_responder pra ignorar mensagens do atendente
  // anteriores ao toggle.
  if (!novaPausada) patch.ia_reset_em = new Date().toISOString();

  const { error } = await sb.from("tickets").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Log
  if (perfilAtribuido) {
    await sb.from("ia_atendimento_log").insert({
      agencia_id: u.agencia_id,
      perfil_id: perfilAtribuido,
      ticket_id: id,
      evento: novaPausada ? "pausa_humano" : "tool_call",
      payload: novaPausada
        ? { motivo: "Pausa manual via painel" }
        : { tool: "RETOMAR", resultado: "IA reativada manualmente" },
    });
  }

  void audit({
    agenciaId: u.agencia_id,
    usuarioId: auth.user.id,
    acao: "update",
    entidade: "ticket_ia_toggle",
    entidadeId: id,
    payload: { ia_pausada: novaPausada, fila_ajustada: filaAjustada },
  });

  return NextResponse.json({ ok: true, ia_pausada: novaPausada, fila_id: filaAjustada || ticket.fila_id });
}
