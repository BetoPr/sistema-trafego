/**
 * POST /api/usuarios/online-toggle
 *
 * Toggle manual de status online/offline do usuario logado.
 * Quando offline, heartbeat continua batendo mas nao reativa online —
 * usuario fica "invisivel" pra equipe ate religar.
 *
 * Body: { online: boolean }
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

  const body = (await req.json().catch(() => null)) as { online?: boolean } | null;
  if (!body || typeof body.online !== "boolean") {
    return NextResponse.json({ error: "payload" }, { status: 400 });
  }

  const sb = createServiceClient();
  const agora = new Date().toISOString();
  const patch = body.online
    ? { online: true, online_manual: true, ultimo_heartbeat: agora }
    : { online: false, online_manual: false, ultimo_logout: agora };

  await sb.from("usuarios").update(patch).eq("id", auth.user.id);
  return NextResponse.json({ ok: true, online: body.online });
}
