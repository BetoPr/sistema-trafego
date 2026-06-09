/**
 * GET /api/atendimentos/buscar-mensagens?q=texto
 * Busca full-text em mensagens.conteudo/transcricao da agência.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  if (!q) return NextResponse.json({ resultados: [] });

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "auth" }, { status: 401 });

  const sb = createServiceClient();
  const { data: u } = await sb.from("usuarios").select("agencia_id").eq("id", auth.user.id).single();
  if (!u) return NextResponse.json({ error: "no_user" }, { status: 403 });

  const ilike = `%${q}%`;
  const { data: msgs } = await sb
    .from("mensagens")
    .select("id, conteudo, transcricao, created_at, ticket_id, ticket:tickets(numero, contato:contatos(nome))")
    .eq("agencia_id", u.agencia_id)
    .or(`conteudo.ilike.${ilike},transcricao.ilike.${ilike}`)
    .order("created_at", { ascending: false })
    .limit(50);

  type AnyObj = Record<string, unknown>;
  const resultados = (msgs || []).map((m) => {
    const tAny = m.ticket as unknown;
    const t = (Array.isArray(tAny) ? tAny[0] : tAny) as AnyObj | null;
    const cAny = t?.contato;
    const c = (Array.isArray(cAny) ? cAny[0] : cAny) as AnyObj | null;
    return {
      id: m.id,
      ticketId: m.ticket_id,
      numero: (t?.numero as number) || 0,
      contato_nome: (c?.nome as string) || "—",
      conteudo: m.conteudo || m.transcricao || "",
      created_at: m.created_at,
    };
  });

  return NextResponse.json({ resultados });
}
