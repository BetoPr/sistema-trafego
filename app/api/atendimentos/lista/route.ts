/**
 * GET /api/atendimentos/lista
 * Todos os tickets da agência (todas as abas) pro shell SPA filtrar client-side.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "auth" }, { status: 401 });

  const sb = createServiceClient();
  const { data: u } = await sb.from("usuarios").select("agencia_id").eq("id", auth.user.id).single();
  if (!u) return NextResponse.json({ error: "no_user" }, { status: 403 });

  const [{ data: tickets }, { data: naoLidasRows }] = await Promise.all([
    sb
      .from("tickets")
      .select("id, numero, status, ultima_mensagem_em, ultima_mensagem_preview, sentimento, created_at, usuario_id, contato:contatos(id, nome, whatsapp, foto_url, contato_etiquetas(etiqueta:etiquetas(id, nome, cor, categoria))), canal:canais(id, nome, status, instance_id), fila:filas(id, nome, cor)")
      .eq("agencia_id", u.agencia_id)
      .order("ultima_mensagem_em", { ascending: false, nullsFirst: false })
      .limit(300),
    sb.from("mensagens").select("ticket_id").eq("agencia_id", u.agencia_id).eq("autor", "cliente").neq("status", "lida").limit(5000),
  ]);

  const naoLidoSet = new Set((naoLidasRows || []).map((m) => m.ticket_id as string));

  type AnyObj = Record<string, unknown>;
  const flat = (tickets || []).map((t) => ({
    id: t.id,
    numero: t.numero,
    status: t.status,
    ultima_mensagem_em: t.ultima_mensagem_em,
    ultima_mensagem_preview: t.ultima_mensagem_preview,
    sentimento: t.sentimento,
    created_at: t.created_at,
    usuario_id: t.usuario_id ?? null,
    nao_lido: naoLidoSet.has(t.id as string),
    contato: (Array.isArray(t.contato) ? t.contato[0] : t.contato) as AnyObj | null,
    canal: (Array.isArray(t.canal) ? t.canal[0] : t.canal) as AnyObj | null,
    fila: (Array.isArray(t.fila) ? t.fila[0] : t.fila) as AnyObj | null,
  }));

  return NextResponse.json({ tickets: flat });
}
