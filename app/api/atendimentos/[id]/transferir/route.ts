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

  const body = (await req.json().catch(() => null)) as {
    filaId?: string | null;
    usuarioId?: string | null;
    mensagem?: string;
  } | null;
  if (!body) return NextResponse.json({ error: "body_invalido" }, { status: 400 });

  const sb = createServiceClient();
  const { data: u } = await sb.from("usuarios").select("agencia_id").eq("id", auth.user.id).single();
  if (!u) return NextResponse.json({ error: "no_user" }, { status: 403 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if ("filaId" in body) patch.fila_id = body.filaId || null;
  if ("usuarioId" in body) patch.usuario_id = body.usuarioId || null;

  const { error } = await sb
    .from("tickets")
    .update(patch)
    .eq("id", id)
    .eq("agencia_id", u.agencia_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Mensagem opcional como nota do sistema
  if (body.mensagem?.trim()) {
    await sb.from("mensagens").insert({
      ticket_id: id,
      agencia_id: u.agencia_id,
      autor: "sistema",
      tipo: "texto",
      conteudo: `[Transferência] ${body.mensagem.trim()}`,
      status: "enviada",
    });
  }

  void audit({
    agenciaId: u.agencia_id,
    usuarioId: auth.user.id,
    acao: "update",
    entidade: "ticket_transferir",
    entidadeId: id,
    payload: { filaId: body.filaId, usuarioId: body.usuarioId },
  });
  return NextResponse.json({ ok: true });
}
