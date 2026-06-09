import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { audit } from "@/lib/crm/audit";

export const runtime = "nodejs";

async function getCtx(supabaseAuth: Request) {
  const sb = await createClient();
  const { data: auth } = await sb.auth.getUser();
  if (!auth?.user) return null;
  const svc = createServiceClient();
  const { data: u } = await svc.from("usuarios").select("agencia_id").eq("id", auth.user.id).single();
  if (!u) return null;
  return { userId: auth.user.id, agenciaId: u.agencia_id, svc };
}

// POST /api/contatos/[id]/etiquetas { etiquetaId? | nome? cor? }
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: contatoId } = await params;
  const ctx = await getCtx(req);
  if (!ctx) return NextResponse.json({ error: "auth" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { etiquetaId?: string; nome?: string; cor?: string } | null;
  if (!body || (!body.etiquetaId && !body.nome)) return NextResponse.json({ error: "body_invalido" }, { status: 400 });

  let etiquetaId = body.etiquetaId;
  if (!etiquetaId && body.nome) {
    const { data: nova, error } = await ctx.svc
      .from("etiquetas")
      .insert({ agencia_id: ctx.agenciaId, nome: body.nome.trim(), cor: body.cor || "#C9A876" })
      .select("id")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    etiquetaId = nova.id;
  }

  const { error } = await ctx.svc
    .from("contato_etiquetas")
    .insert({ contato_id: contatoId, etiqueta_id: etiquetaId! });
  if (error && !error.message.includes("duplicate")) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  void audit({ agenciaId: ctx.agenciaId, usuarioId: ctx.userId, acao: "update", entidade: "contato_etiqueta", entidadeId: contatoId, payload: { etiquetaId } });
  return NextResponse.json({ ok: true, etiquetaId });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: contatoId } = await params;
  const ctx = await getCtx(req);
  if (!ctx) return NextResponse.json({ error: "auth" }, { status: 401 });

  const url = new URL(req.url);
  const etiquetaId = url.searchParams.get("etiquetaId");
  if (!etiquetaId) return NextResponse.json({ error: "etiquetaId_obrigatorio" }, { status: 400 });

  await ctx.svc
    .from("contato_etiquetas")
    .delete()
    .eq("contato_id", contatoId)
    .eq("etiqueta_id", etiquetaId);

  void audit({ agenciaId: ctx.agenciaId, usuarioId: ctx.userId, acao: "delete", entidade: "contato_etiqueta", entidadeId: contatoId, payload: { etiquetaId } });
  return NextResponse.json({ ok: true });
}
