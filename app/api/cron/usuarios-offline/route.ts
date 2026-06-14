/**
 * GET /api/cron/usuarios-offline
 * Marca offline quem não bateu heartbeat há > 90s.
 * Disparado pelo pg_cron a cada minuto.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET ausente" }, { status: 500 });
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const sb = createServiceClient();
  const cutoff = new Date(Date.now() - 90_000).toISOString();
  const { data, error } = await sb
    .from("usuarios")
    .update({ online: false })
    .eq("online", true)
    .lt("ultimo_heartbeat", cutoff)
    .select("id");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, desligados: data?.length || 0 });
}
