import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

export async function POST() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "auth" }, { status: 401 });

  const sb = createServiceClient();
  const { data: u } = await sb.from("usuarios").select("agencia_id").eq("id", auth.user.id).maybeSingle();
  if (!u) return NextResponse.json({ error: "usuario_nao_encontrado" }, { status: 403 });

  const { error } = await sb
    .from("agencias")
    .update({ onda_zero_convite_visto_em: new Date().toISOString() })
    .eq("id", u.agencia_id);
  if (error) return NextResponse.json({ error: "db", msg: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
