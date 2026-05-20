import { NextRequest, NextResponse } from "next/server";
import { syncTodasMeta } from "@/lib/meta-ads/sync";

export const dynamic = "force-dynamic";

/**
 * Endpoint protegido por CRON_SECRET pra Vercel Cron / scheduler externo.
 * Header: Authorization: Bearer <CRON_SECRET>
 * Roda sync em TODAS integrações Meta ativas (cross-tenant via service role).
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET não configurado" }, { status: 500 });
  }

  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const inicio = Date.now();
  const results = await syncTodasMeta();
  const okCount = results.filter((r) => r.ok).length;
  const failCount = results.length - okCount;

  return NextResponse.json({
    ok: true,
    total: results.length,
    sucesso: okCount,
    falhas: failCount,
    duracao_ms: Date.now() - inicio,
    detalhes: results,
  });
}
