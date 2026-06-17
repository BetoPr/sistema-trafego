/**
 * POST /api/usuarios/heartbeat
 * Marca o usuário como online. Chamado a cada 30s pelo client.
 *
 * Body: { offline?: true } — chamada com offline=true ao fechar a aba
 * desliga o status na hora (em vez de esperar o cron).
 *
 * Um cron desliga quem não bate heartbeat há > 90s.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "auth" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { offline?: boolean } | null;
  const sb = createServiceClient();
  const agora = new Date().toISOString();

  if (body?.offline) {
    await sb.from("usuarios").update({ online: false, ultimo_logout: agora }).eq("id", auth.user.id);
    return NextResponse.json({ ok: true, offline: true });
  }

  await sb.from("usuarios").update({ online: true, ultimo_heartbeat: agora }).eq("id", auth.user.id);
  return NextResponse.json({ ok: true });
}
