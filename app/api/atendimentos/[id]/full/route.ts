/**
 * GET /api/atendimentos/[id]/full
 * Bundle completo do ticket pro shell SPA: ticket + contato + canal + mensagens + etiquetas do contato.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "auth" }, { status: 401 });

  const sb = createServiceClient();
  const { data: u } = await sb.from("usuarios").select("agencia_id").eq("id", auth.user.id).single();
  if (!u) return NextResponse.json({ error: "no_user" }, { status: 403 });

  const { data: t } = await sb
    .from("tickets")
    .select("id, numero, status, sentimento, sentimento_confianca, sentimento_motivo, resumo, resumo_atualizado_em, valor_fechado, metadata, fila_id, usuario_id, contato:contatos(id, nome, whatsapp, ia_habilitada, email, empresa, cidade, estado, cpf), canal:canais(id, nome, status)")
    .eq("id", id)
    .eq("agencia_id", u.agencia_id)
    .maybeSingle();
  if (!t) return NextResponse.json({ error: "ticket_nao_encontrado" }, { status: 404 });

  type AnyObj = Record<string, unknown>;
  const contato = (Array.isArray(t.contato) ? t.contato[0] : t.contato) as AnyObj | null;
  const canal = (Array.isArray(t.canal) ? t.canal[0] : t.canal) as AnyObj | null;
  if (!contato) return NextResponse.json({ error: "contato_nao_encontrado" }, { status: 404 });

  const [{ data: msgs }, { data: tags }] = await Promise.all([
    sb
      .from("mensagens")
      .select("id, autor, tipo, conteudo, transcricao, midia_url, midia_mime, status, created_at, usuario_id, wa_message_id, metadata")
      .eq("ticket_id", id)
      .order("created_at", { ascending: true })
      .limit(500),
    sb
      .from("contato_etiquetas")
      .select("etiqueta:etiquetas(id, nome, cor, categoria)")
      .eq("contato_id", contato.id as string),
  ]);

  const etiquetas = ((tags || []) as unknown as Array<{ etiqueta: AnyObj | AnyObj[] | null }>)
    .map((e) => (Array.isArray(e.etiqueta) ? e.etiqueta[0] : e.etiqueta))
    .filter(Boolean);

  return NextResponse.json({
    ticket: { ...t, contato, canal: canal ?? null },
    mensagens: msgs || [],
    etiquetas,
  });
}
