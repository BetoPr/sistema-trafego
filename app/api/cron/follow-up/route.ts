import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * DESLIGADO (2026-06-18). As sequências/fila de follow-up MANUAL foram removidas do
 * produto — o follow-up agora é só "Follow-up IA" (envio revisado pelo humano).
 * Este cron virou no-op autenticado e REVERSÍVEL: pra religar, reimporte
 * `processarFollowUpsDevidos` de "@/lib/crm/follow-up" e volte a chamá-lo aqui.
 *
 * Não confundir com o follow-up AUTOMÁTICO da IA de atendimento
 * (lib/ia-atendimento/followup-worker.ts), que tem cron próprio e segue ativo.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET não configurado" }, { status: 500 });

  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  return NextResponse.json({ ok: true, disabled: true, motivo: "follow_up_manual_removido" });
}
