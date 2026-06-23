import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

/**
 * PATCH /api/contatos/[id] — atualizações pontuais no contato.
 * Suporta: { idade?: number | null, nome?: string }
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "auth" }, { status: 401 });

  const sb = createServiceClient();
  const { data: u } = await sb.from("usuarios").select("agencia_id").eq("id", auth.user.id).single();
  if (!u) return NextResponse.json({ error: "no_user" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as { idade?: unknown; nome?: unknown };
  const patch: Record<string, unknown> = {};

  if ("idade" in body) {
    const v = body.idade;
    if (v === null || v === "") patch.idade = null;
    else {
      const n = Math.floor(Number(v));
      if (!Number.isFinite(n) || n < 0 || n > 130) {
        return NextResponse.json({ error: "Idade inválida (0–130)." }, { status: 400 });
      }
      patch.idade = n;
    }
  }
  if ("nome" in body) {
    const v = String(body.nome || "").trim();
    if (!v) return NextResponse.json({ error: "Nome obrigatório." }, { status: 400 });
    patch.nome = v.slice(0, 120);
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nada para atualizar." }, { status: 400 });
  }

  const { error } = await sb
    .from("contatos")
    .update(patch)
    .eq("id", id)
    .eq("agencia_id", u.agencia_id)
    .is("deleted_at", null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
