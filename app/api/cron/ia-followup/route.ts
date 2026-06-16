import { NextRequest, NextResponse } from "next/server";
import { processarFollowUpsIA } from "@/lib/ia-atendimento/followup-worker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Cron do follow-up sequencial IA. Dispara pg_cron 1/min — debounce baseado
 * em delay_segundos_antes de cada etapa, então 1/min cobre. Cancelamento
 * imediato é via after() no webhook UAZAPI quando cliente responde.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET nao configurado" }, { status: 500 });
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const inicio = Date.now();
  const r = await processarFollowUpsIA(50);
  return NextResponse.json({ ...r, duracao_ms: Date.now() - inicio });
}
