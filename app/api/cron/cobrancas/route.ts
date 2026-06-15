import { NextRequest, NextResponse } from "next/server";
import { processarCobrancasDiarias } from "@/lib/super-admin/cobrancas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Processo diário de cobranças:
 *  - Cobra agências com vencimento amanhã (1 dia de antecedência)
 *  - Bloqueia acessos vencidos não pagos
 * Protegido por CRON_SECRET. Disparado pelo Supabase pg_cron 1/dia 12:00 UTC = 09:00 BRT.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET não configurado" }, { status: 500 });

  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const inicio = Date.now();
  const r = await processarCobrancasDiarias();
  return NextResponse.json({ ok: true, ...r, duracao_ms: Date.now() - inicio });
}
