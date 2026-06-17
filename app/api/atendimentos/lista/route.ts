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
      .select("id, numero, status, ultima_mensagem_em, ultima_mensagem_preview, sentimento, created_at, usuario_id, ia_pausada, ia_perfil_id, contato:contatos(id, nome, whatsapp, foto_url, contato_etiquetas(etiqueta:etiquetas(id, nome, cor, categoria))), canal:canais(id, nome, status, instance_id), fila:filas(id, nome, cor, fixa)")
      .eq("agencia_id", u.agencia_id)
      .order("ultima_mensagem_em", { ascending: false, nullsFirst: false })
      .limit(300),
    sb.from("mensagens").select("ticket_id").eq("agencia_id", u.agencia_id).eq("autor", "cliente").neq("status", "lida").limit(5000),
  ]);

  const naoLidasCount = new Map<string, number>();
  for (const m of (naoLidasRows || []) as Array<{ ticket_id: string }>) {
    naoLidasCount.set(m.ticket_id, (naoLidasCount.get(m.ticket_id) || 0) + 1);
  }

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
    ia_pausada: t.ia_pausada ?? null,
    ia_perfil_id: t.ia_perfil_id ?? null,
    nao_lido: (naoLidasCount.get(t.id as string) || 0) > 0,
    nao_lidas: naoLidasCount.get(t.id as string) || 0,
    contato: (Array.isArray(t.contato) ? t.contato[0] : t.contato) as AnyObj | null,
    canal: (Array.isArray(t.canal) ? t.canal[0] : t.canal) as AnyObj | null,
    fila: (Array.isArray(t.fila) ? t.fila[0] : t.fila) as AnyObj | null,
  }));

  return NextResponse.json({ tickets: flat });
}
