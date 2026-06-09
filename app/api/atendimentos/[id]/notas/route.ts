import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { audit } from "@/lib/crm/audit";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "auth" }, { status: 401 });

  const sb = createServiceClient();
  const { data: u } = await sb.from("usuarios").select("agencia_id").eq("id", auth.user.id).single();
  if (!u) return NextResponse.json({ error: "no_user" }, { status: 403 });

  const { data: notas } = await sb
    .from("notas")
    .select("id, conteudo, created_at, usuario:usuarios(nome)")
    .eq("ticket_id", id)
    .eq("agencia_id", u.agencia_id)
    .order("created_at", { ascending: false })
    .limit(100);

  return NextResponse.json({ notas: notas || [] });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "auth" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { conteudo?: string } | null;
  if (!body?.conteudo?.trim()) return NextResponse.json({ error: "conteudo_vazio" }, { status: 400 });

  const sb = createServiceClient();
  const { data: u } = await sb.from("usuarios").select("agencia_id").eq("id", auth.user.id).single();
  if (!u) return NextResponse.json({ error: "no_user" }, { status: 403 });

  const { data, error } = await sb
    .from("notas")
    .insert({
      ticket_id: id,
      agencia_id: u.agencia_id,
      usuario_id: auth.user.id,
      conteudo: body.conteudo.trim(),
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  void audit({ agenciaId: u.agencia_id, usuarioId: auth.user.id, acao: "create", entidade: "nota", entidadeId: data.id });
  return NextResponse.json({ ok: true, id: data.id });
}
