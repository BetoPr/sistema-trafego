import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

/** GET /api/follow-up/sequencias — sequências ATIVAS da agência (pro enroll no painel). */
export async function GET() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "auth" }, { status: 401 });

  const sb = createServiceClient();
  const { data: u } = await sb.from("usuarios").select("agencia_id").eq("id", auth.user.id).single();
  if (!u) return NextResponse.json({ error: "no_user" }, { status: 403 });

  const { data } = await sb
    .from("follow_up_sequencias")
    .select("id, nome, etapas:follow_up_etapas(id)")
    .eq("agencia_id", u.agencia_id)
    .eq("ativo", true)
    .order("nome");

  const seqs = (data || []).map((s) => ({ id: s.id, nome: s.nome, etapas: (s.etapas as unknown[])?.length || 0 }));
  return NextResponse.json({ sequencias: seqs });
}
