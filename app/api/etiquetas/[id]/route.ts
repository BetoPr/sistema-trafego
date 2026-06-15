/**
 * PATCH /api/etiquetas/[id] { nome?: string, cor?: string }
 * DELETE /api/etiquetas/[id]
 * Edita ou exclui a etiqueta da agência. Exclusão remove vínculos contato_etiquetas (cascade no FK).
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { audit } from "@/lib/crm/audit";

export const runtime = "nodejs";

async function getCtx() {
  const sb = await createClient();
  const { data: auth } = await sb.auth.getUser();
  if (!auth?.user) return null;
  const svc = createServiceClient();
  const { data: u } = await svc.from("usuarios").select("agencia_id").eq("id", auth.user.id).single();
  if (!u) return null;
  return { userId: auth.user.id, agenciaId: u.agencia_id, svc };
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getCtx();
  if (!ctx) return NextResponse.json({ error: "auth" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { nome?: string; cor?: string; palavra_gatilho?: string | null; mensagem_resposta?: string | null; ativo?: boolean };
  const patch: Record<string, unknown> = {};
  if (body.nome && body.nome.trim()) patch.nome = body.nome.trim();
  if (body.cor) patch.cor = body.cor;
  if (body.palavra_gatilho !== undefined) patch.palavra_gatilho = body.palavra_gatilho?.trim() || null;
  if (body.mensagem_resposta !== undefined) patch.mensagem_resposta = body.mensagem_resposta?.trim() || null;
  if (typeof body.ativo === "boolean") patch.ativo = body.ativo;
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "nada_a_atualizar" }, { status: 400 });

  const { error } = await ctx.svc
    .from("etiquetas")
    .update(patch)
    .eq("id", id)
    .eq("agencia_id", ctx.agenciaId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  void audit({ agenciaId: ctx.agenciaId, usuarioId: ctx.userId, acao: "update", entidade: "etiqueta", entidadeId: id, payload: patch });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getCtx();
  if (!ctx) return NextResponse.json({ error: "auth" }, { status: 401 });

  // Remove vínculos primeiro (caso FK não tenha cascade)
  await ctx.svc.from("contato_etiquetas").delete().eq("etiqueta_id", id);

  const { error } = await ctx.svc
    .from("etiquetas")
    .delete()
    .eq("id", id)
    .eq("agencia_id", ctx.agenciaId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  void audit({ agenciaId: ctx.agenciaId, usuarioId: ctx.userId, acao: "delete", entidade: "etiqueta", entidadeId: id });
  return NextResponse.json({ ok: true });
}
