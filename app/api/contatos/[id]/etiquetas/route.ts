import { NextResponse, after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { audit } from "@/lib/crm/audit";
import { inscreverPorEtiqueta } from "@/lib/crm/follow-up";

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

/** Confirma que o contato é da agência (evita vínculo cross-tenant). */
async function contatoDaAgencia(svc: ReturnType<typeof createServiceClient>, contatoId: string, agenciaId: string): Promise<boolean> {
  const { data } = await svc.from("contatos").select("id").eq("id", contatoId).eq("agencia_id", agenciaId).maybeSingle();
  return !!data;
}

// POST /api/contatos/[id]/etiquetas { etiquetaId? | nome? cor? }
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: contatoId } = await params;
  const ctx = await getCtx(req);
  if (!ctx) return NextResponse.json({ error: "auth" }, { status: 401 });

  if (!(await contatoDaAgencia(ctx.svc, contatoId, ctx.agenciaId))) {
    return NextResponse.json({ error: "nao_encontrado" }, { status: 404 });
  }

  const body = (await req.json().catch(() => null)) as { etiquetaId?: string; nome?: string; cor?: string; categoria?: "etiqueta" | "flag" } | null;
  if (!body || (!body.etiquetaId && !body.nome)) return NextResponse.json({ error: "body_invalido" }, { status: 400 });

  let etiquetaId = body.etiquetaId;
  // etiquetaId vindo do body precisa ser da própria agência.
  if (etiquetaId) {
    const { data: etq } = await ctx.svc.from("etiquetas").select("id").eq("id", etiquetaId).eq("agencia_id", ctx.agenciaId).maybeSingle();
    if (!etq) return NextResponse.json({ error: "etiqueta_invalida" }, { status: 404 });
  }
  if (!etiquetaId && body.nome) {
    const nome = body.nome.trim();
    const categoria = body.categoria === "flag" ? "flag" : "etiqueta";
    // Find-or-create: nao duplica etiqueta com o mesmo nome na agencia
    // (ex: "Em follow-up" auto-aplicada no envio do Follow-up com IA).
    const { data: existentes } = await ctx.svc
      .from("etiquetas").select("id").eq("agencia_id", ctx.agenciaId).ilike("nome", nome).limit(1);
    if (existentes && existentes.length) {
      etiquetaId = existentes[0].id as string;
    } else {
      const { data: nova, error } = await ctx.svc
        .from("etiquetas")
        .insert({ agencia_id: ctx.agenciaId, nome, cor: body.cor || "#00E19A", categoria })
        .select("id")
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      etiquetaId = nova.id;
    }
  }

  const { error } = await ctx.svc
    .from("contato_etiquetas")
    .insert({ contato_id: contatoId, etiqueta_id: etiquetaId! });
  if (error && !error.message.includes("duplicate")) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  void audit({ agenciaId: ctx.agenciaId, usuarioId: ctx.userId, acao: "update", entidade: "contato_etiqueta", entidadeId: contatoId, payload: { etiquetaId } });

  // 3B — etiqueta-gatilho: inscreve em follow-ups vinculados a essa etiqueta
  const etqId = etiquetaId!;
  after(async () => {
    try { await inscreverPorEtiqueta({ agenciaId: ctx.agenciaId, contatoId, etiquetaId: etqId }); } catch {}
  });

  return NextResponse.json({ ok: true, etiquetaId });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: contatoId } = await params;
  const ctx = await getCtx(req);
  if (!ctx) return NextResponse.json({ error: "auth" }, { status: 401 });

  const url = new URL(req.url);
  const etiquetaId = url.searchParams.get("etiquetaId");
  if (!etiquetaId) return NextResponse.json({ error: "etiquetaId_obrigatorio" }, { status: 400 });

  if (!(await contatoDaAgencia(ctx.svc, contatoId, ctx.agenciaId))) {
    return NextResponse.json({ error: "nao_encontrado" }, { status: 404 });
  }

  await ctx.svc
    .from("contato_etiquetas")
    .delete()
    .eq("contato_id", contatoId)
    .eq("etiqueta_id", etiquetaId);

  void audit({ agenciaId: ctx.agenciaId, usuarioId: ctx.userId, acao: "delete", entidade: "contato_etiqueta", entidadeId: contatoId, payload: { etiquetaId } });
  return NextResponse.json({ ok: true });
}
