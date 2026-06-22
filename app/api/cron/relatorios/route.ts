import { NextRequest, NextResponse } from "next/server";
import { processarRelatoriosPendentes } from "@/lib/relatorios/worker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Processa relatórios agendados cujo proximo_envio já passou.
 * Gera texto formatado com KPIs do período + envia via WhatsApp (UAZAPI).
 * Protegido por CRON_SECRET. Pode ser disparado pelo pg_cron a cada 1-5 min.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET não configurado" }, { status: 500 });

  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const inicio = Date.now();
  const r = await processarRelatoriosPendentes();
  return NextResponse.json({ ok: true, ...r, duracao_ms: Date.now() - inicio });
}
