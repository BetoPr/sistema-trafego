import { NextRequest, NextResponse } from "next/server";
import { processarFollowUpsDevidos } from "@/lib/crm/follow-up";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Processa follow-ups devidos. Protegido por CRON_SECRET.
 * Disparado pelo Supabase pg_cron (pg_net) a cada minuto:
 *   Authorization: Bearer <CRON_SECRET>
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET não configurado" }, { status: 500 });

  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const inicio = Date.now();
  const r = await processarFollowUpsDevidos();
  return NextResponse.json({ ok: true, ...r, duracao_ms: Date.now() - inicio });
}
