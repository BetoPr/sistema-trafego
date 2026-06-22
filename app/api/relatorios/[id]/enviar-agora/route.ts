import { NextRequest, NextResponse } from "next/server";
import { requireUserWithAgencia } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { processarRelatoriosPendentes } from "@/lib/relatorios/worker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Botão "Enviar agora" no painel — força o envio de UM relatório imediatamente.
 * Trick: marca proximo_envio = now() e chama o worker. O worker pega ele
 * (junto com qualquer outro pendente) e despacha.
 */
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { usuario } = await requireUserWithAgencia();
  const { id } = await ctx.params;
  const sb = createServiceClient();

  const { data: rel, error: errLoad } = await sb
    .from("relatorios_agendados")
    .select("id, agencia_id, ativo, deleted_at")
    .eq("id", id)
    .maybeSingle();
  if (errLoad || !rel) return NextResponse.json({ error: "Relatório não encontrado" }, { status: 404 });
  if (rel.agencia_id !== usuario.agencia_id) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (rel.deleted_at) return NextResponse.json({ error: "Relatório deletado" }, { status: 400 });
  if (!rel.ativo) return NextResponse.json({ error: "Relatório inativo — ative antes de enviar" }, { status: 400 });

  await sb
    .from("relatorios_agendados")
    .update({ proximo_envio: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", id);

  const r = await processarRelatoriosPendentes();
  return NextResponse.json({ ok: true, ...r });
}
