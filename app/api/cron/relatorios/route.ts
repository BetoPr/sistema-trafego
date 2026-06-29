import { NextRequest, NextResponse } from "next/server";
import { processarRelatoriosPendentes } from "@/lib/relatorios/worker";
import { autorizarCron } from "@/lib/utils/cron-secret";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const ok = await autorizarCron(req.headers.get("authorization"));
  if (!ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const inicio = Date.now();
  const r = await processarRelatoriosPendentes();
  return NextResponse.json({ ok: true, ...r, duracao_ms: Date.now() - inicio });
}
