/**
 * GET /api/contatos/[id]/espiar
 * Retorna último ticket do contato + últimas 80 mensagens. Usado no "Espiar" do Pipeline/Etiquetas.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "auth" }, { status: 401 });

  const sb = createServiceClient();
  const { data: u } = await sb.from("usuarios").select("agencia_id").eq("id", auth.user.id).single();
  if (!u) return NextResponse.json({ error: "no_user" }, { status: 403 });

  const { data: contato } = await sb
    .from("contatos")
    .select("id, nome, whatsapp")
    .eq("id", id)
    .eq("agencia_id", u.agencia_id)
    .maybeSingle();
  if (!contato) return NextResponse.json({ error: "contato_nao_encontrado" }, { status: 404 });

  const { data: ticket } = await sb
    .from("tickets")
    .select("id, numero, status")
    .eq("contato_id", contato.id as string)
    .eq("agencia_id", u.agencia_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let mensagens: unknown[] = [];
  if (ticket) {
    const { data: msgs } = await sb
      .from("mensagens")
      .select("id, autor, tipo, conteudo, transcricao, midia_url, midia_mime, status, created_at")
      .eq("ticket_id", ticket.id as string)
      .order("created_at", { ascending: true })
      .limit(80);
    mensagens = msgs || [];
  }

  return NextResponse.json({
    contato: { id: contato.id, nome: contato.nome, whatsapp: contato.whatsapp },
    ticket: ticket ? { id: ticket.id, numero: ticket.numero, status: ticket.status } : null,
    mensagens,
  });
}
