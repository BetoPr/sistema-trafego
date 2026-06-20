/**
 * GET /api/contatos/[id]/midias
 * Todas as mídias (imagem/vídeo/áudio/documento) + links trocados com um contato,
 * varrendo TODOS os tickets dele. Estilo "Mídia, links e docs" do WhatsApp.
 * Escopado por agência (service client + filtro agencia_id).
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIPOS_MIDIA = ["imagem", "video", "audio", "documento"];
const URL_RE = /https?:\/\/[^\s<>"')]+/gi;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "auth" }, { status: 401 });

  const sb = createServiceClient();
  const { data: u } = await sb.from("usuarios").select("agencia_id").eq("id", auth.user.id).single();
  if (!u) return NextResponse.json({ error: "no_user" }, { status: 403 });

  // Tickets do contato (já escopa por agência).
  const { data: tks } = await sb
    .from("tickets")
    .select("id")
    .eq("contato_id", id)
    .eq("agencia_id", u.agencia_id);
  const ticketIds = (tks || []).map((t) => t.id as string);
  if (ticketIds.length === 0) return NextResponse.json({ ok: true, midias: [], links: [] });

  // Mídias + mensagens com link (texto contendo http).
  const { data: msgs } = await sb
    .from("mensagens")
    .select("id, ticket_id, tipo, conteudo, transcricao, midia_url, midia_mime, midia_filename, created_at")
    .eq("agencia_id", u.agencia_id)
    .in("ticket_id", ticketIds)
    .is("deleted_em", null)
    .or(`tipo.in.(${TIPOS_MIDIA.join(",")}),conteudo.ilike.*http*`)
    .order("created_at", { ascending: false })
    .limit(800);

  type Row = {
    id: string; ticket_id: string; tipo: string; conteudo: string | null; transcricao: string | null;
    midia_url: string | null; midia_mime: string | null; midia_filename: string | null; created_at: string;
  };

  const midias: Array<Pick<Row, "id" | "ticket_id" | "tipo" | "conteudo" | "transcricao" | "midia_url" | "midia_mime" | "midia_filename" | "created_at">> = [];
  const links: Array<{ url: string; created_at: string; ticket_id: string; contexto: string }> = [];
  const vistos = new Set<string>();

  for (const m of (msgs || []) as Row[]) {
    if (TIPOS_MIDIA.includes(m.tipo) && m.midia_url) {
      midias.push({ id: m.id, ticket_id: m.ticket_id, tipo: m.tipo, conteudo: m.conteudo, transcricao: m.transcricao, midia_url: m.midia_url, midia_mime: m.midia_mime, midia_filename: m.midia_filename, created_at: m.created_at });
    }
    // Extrai links de texto/legenda (qualquer mensagem com http).
    const txt = m.conteudo || "";
    const achados = txt.match(URL_RE);
    if (achados) {
      for (const raw of achados) {
        const url = raw.replace(/[.,;]+$/, ""); // tira pontuação final
        if (vistos.has(url)) continue;
        vistos.add(url);
        links.push({ url, created_at: m.created_at, ticket_id: m.ticket_id, contexto: txt.slice(0, 120) });
      }
    }
  }

  return NextResponse.json({ ok: true, midias, links });
}
