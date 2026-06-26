/**
 * GET /api/cron/trial-vencidos
 *
 * Cron diario (pg_cron ou Cloudflare Cron Triggers).
 *
 * Faz 2 coisas:
 *   1. Bloqueia agencias cujo trial_acaba_em ja passou (acesso_bloqueado = true).
 *   2. Apaga agencias cujo apagar_em ja passou (cascata via FK).
 *
 * Protegido por header X-CRON-SECRET = process.env.CRON_SECRET.
 */

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const segredo = req.headers.get("x-cron-secret");
  if (!segredo || segredo !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const svc = createServiceClient();
  const agora = new Date().toISOString();

  // 1. Bloqueia trial expirado.
  const { data: bloqueadas, error: errBloq } = await svc
    .from("agencias")
    .update({ acesso_bloqueado: true })
    .lt("trial_acaba_em", agora)
    .eq("acesso_bloqueado", false)
    .select("id");

  if (errBloq) {
    console.error("[cron/trial-vencidos] erro ao bloquear:", errBloq);
  }

  // 2. Apaga agencias cujo apagar_em ja passou.
  // Lista primeiro pra poder logar quantas + IDs.
  const { data: paraApagar } = await svc
    .from("agencias")
    .select("id, nome")
    .lt("apagar_em", agora);

  let apagadas = 0;
  if (paraApagar && paraApagar.length > 0) {
    const ids = paraApagar.map((a) => a.id);
    const { error: errApagar } = await svc.from("agencias").delete().in("id", ids);
    if (errApagar) {
      console.error("[cron/trial-vencidos] erro ao apagar:", errApagar);
    } else {
      apagadas = ids.length;
    }
  }

  return NextResponse.json({
    ok: true,
    bloqueadas: bloqueadas?.length ?? 0,
    apagadas,
    timestamp: agora,
  });
}
