import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminApi } from "@/lib/crm/auth-api";
import { createServiceClient } from "@/lib/supabase/service";
import { byteaToBuffer, decryptToken } from "@/lib/crypto/tokens";
import { listPixels } from "@/lib/meta-ads/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/integracoes/meta/pixels?cliente_id=...  → lista pixels da integração meta do cliente
export async function GET(req: NextRequest) {
  const a = await requireSuperAdminApi();
  if (a instanceof NextResponse) return a;
  const ctx = a;
  const clienteId = new URL(req.url).searchParams.get("cliente_id");
  if (!clienteId) return NextResponse.json({ error: "cliente_id obrigatório" }, { status: 400 });

  const sb = createServiceClient();
  const { data: integ } = await sb
    .from("integracoes")
    .select("id, account_id, access_token_encrypted")
    .eq("agencia_id", ctx.agenciaId)
    .eq("cliente_id", clienteId)
    .eq("plataforma", "meta_ads")
    .maybeSingle<{ id: string; account_id: string; access_token_encrypted: unknown }>();
  if (!integ?.access_token_encrypted) return NextResponse.json({ error: "integração Meta não encontrada" }, { status: 404 });

  try {
    const token = decryptToken(byteaToBuffer(integ.access_token_encrypted));
    const pixels = await listPixels(token, integ.account_id);
    return NextResponse.json({ ok: true, integracao_id: integ.id, pixels });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "erro ao listar pixels" }, { status: 502 });
  }
}

// POST /api/integracoes/meta/pixels  body: { integracao_id, pixel_id, pixel_nome }
export async function POST(req: NextRequest) {
  const a = await requireSuperAdminApi();
  if (a instanceof NextResponse) return a;
  const ctx = a;
  const body = (await req.json().catch(() => ({}))) as { integracao_id?: string; pixel_id?: string; pixel_nome?: string };
  if (!body.integracao_id || !body.pixel_id) return NextResponse.json({ error: "integracao_id e pixel_id obrigatórios" }, { status: 400 });

  const sb = createServiceClient();
  const { error } = await sb
    .from("integracoes")
    .update({ pixel_id: body.pixel_id, pixel_nome: body.pixel_nome ?? null })
    .eq("id", body.integracao_id)
    .eq("agencia_id", ctx.agenciaId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
