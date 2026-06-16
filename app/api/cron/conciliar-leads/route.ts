/**
 * Cron: reconcilia leads Meta orfaos (sem match imediato com contato/ticket).
 * pg_cron 5/min, ate 50 leads por tick. Abandona depois de 5 tentativas.
 */
import { NextRequest, NextResponse } from "next/server";
import { reconciliarOrfaos } from "@/lib/meta-ads/conciliar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET nao configurado" }, { status: 500 });
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const inicio = Date.now();
  const r = await reconciliarOrfaos(50);
  return NextResponse.json({ ...r, duracao_ms: Date.now() - inicio });
}
