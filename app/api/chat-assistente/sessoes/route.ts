/** GET sessões do usuário + GET mensagens de uma sessão (?sessao_id=). */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ ok: false }, { status: 401 });
  const sb = createServiceClient();
  const { data: u } = await sb.from("usuarios").select("agencia_id").eq("id", auth.user.id).single();
  if (!u) return NextResponse.json({ ok: false }, { status: 403 });

  const url = new URL(req.url);
  const sessaoId = url.searchParams.get("sessao_id");
  const bot = url.searchParams.get("bot");

  if (sessaoId) {
    const { data: dono } = await sb.from("chat_sessoes").select("id").eq("id", sessaoId).eq("agencia_id", u.agencia_id).maybeSingle();
    if (!dono) return NextResponse.json({ ok: false, error: "nao_encontrado" }, { status: 404 });
    const { data } = await sb
      .from("chat_mensagens")
      .select("id, papel, conteudo, created_at")
      .eq("sessao_id", sessaoId)
      .neq("papel", "tool")
      .order("created_at", { ascending: true });
    return NextResponse.json({ ok: true, mensagens: data || [] });
  }

  const q = sb
    .from("chat_sessoes")
    .select("id, bot, titulo, updated_at")
    .eq("agencia_id", u.agencia_id)
    .eq("usuario_id", auth.user.id)
    .order("updated_at", { ascending: false })
    .limit(20);
  if (bot === "suporte" || bot === "dados") q.eq("bot", bot);
  const { data } = await q;
  return NextResponse.json({ ok: true, sessoes: data || [] });
}
