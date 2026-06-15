import { NextRequest, NextResponse } from "next/server";
import { processarBufferIA } from "@/lib/ia-atendimento/executor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Processa buffer pendente da IA de atendimento.
 * pg_cron 1/min dispara — debounce padrão é 20s, então 1/min é suficiente.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET não configurado" }, { status: 500 });

  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const inicio = Date.now();
  const r = await processarBufferIA();
  return NextResponse.json({ ok: true, ...r, duracao_ms: Date.now() - inicio });
}
