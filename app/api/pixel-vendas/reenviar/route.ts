import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminApi } from "@/lib/crm/auth-api";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/pixel-vendas/reenviar  body: { evento_id }
export async function POST(req: NextRequest) {
  const a = await requireSuperAdminApi();
  if (a instanceof NextResponse) return a;
  const ctx = a;
  const body = (await req.json().catch(() => ({}))) as { evento_id?: string };
  if (!body.evento_id) return NextResponse.json({ error: "evento_id obrigatório" }, { status: 400 });

  const sb = createServiceClient();
  const { error } = await sb
    .from("capi_eventos")
    .update({ status: "pendente", tentativas: 0, erro: null, atualizado_em: new Date().toISOString() })
    .eq("id", body.evento_id)
    .eq("agencia_id", ctx.agenciaId)
    .in("status", ["erro", "sem_atribuicao"]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
