/**
 * Cron worker: processa fila de boas-vindas Onda Zero.
 *
 * Disparado por pg_cron (Supabase) ou cron externo a cada 1 min.
 * Bearer auth com CRON_SECRET.
 */

import { NextResponse } from "next/server";
import { processarFilaBoasVindas } from "@/lib/onda-zero/boas-vindas";
import { autorizarCron } from "@/lib/utils/cron-secret";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const ok = await autorizarCron(req.headers.get("authorization"));
  if (!ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const r = await processarFilaBoasVindas();
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    return NextResponse.json({ error: "worker_falhou", msg: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

// GET pra cron simples poder disparar
export async function GET(req: Request) {
  return POST(req);
}
