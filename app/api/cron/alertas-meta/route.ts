import { NextRequest, NextResponse } from "next/server";
import { rodarAlertasMeta } from "@/lib/alertas/meta-worker";

export const dynamic = "force-dynamic";

/**
 * Endpoint cron protegido por CRON_SECRET.
 * Header: Authorization: Bearer <CRON_SECRET>
 * Checa todos os alertas Meta ativos (cross-tenant via service role),
 * dispara WhatsApp quando gasto >= limite.
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
  try {
    const r = await rodarAlertasMeta();
    return NextResponse.json({ ok: true, ...r, duracao_ms: Date.now() - inicio });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, erro: msg, duracao_ms: Date.now() - inicio }, { status: 500 });
  }
}
