import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

/**
 * GET /api/contatos/[id]/ficha — dados pro balão de edição do contato:
 * nome/whatsapp, etiquetas aplicadas + catálogo, e o LOG de fechamentos do
 * cliente (todos os tickets com valor_fechado), com totais.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "auth" }, { status: 401 });

  const sb = createServiceClient();
  const { data: u } = await sb.from("usuarios").select("agencia_id").eq("id", auth.user.id).single();
  if (!u) return NextResponse.json({ error: "no_user" }, { status: 403 });

  // Contato precisa ser da agência
  const { data: contato } = await sb
    .from("contatos")
    .select("id, nome, whatsapp, contato_etiquetas(etiqueta:etiquetas(id, nome, cor, categoria))")
    .eq("id", id)
    .eq("agencia_id", u.agencia_id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!contato) return NextResponse.json({ error: "nao_encontrado" }, { status: 404 });

  const [{ data: todasTags }, { data: fechRows }] = await Promise.all([
    sb.from("etiquetas").select("id, nome, cor, categoria").eq("agencia_id", u.agencia_id).eq("ativo", true).or("categoria.eq.etiqueta,categoria.is.null").order("nome"),
    sb.from("tickets").select("id, numero, valor_fechado, metadata, fechado_em").eq("agencia_id", u.agencia_id).eq("contato_id", id).not("valor_fechado", "is", null).order("fechado_em", { ascending: false }),
  ]);

  type ETag = { etiqueta: { id: string; nome: string; cor: string; categoria?: string | null } | { id: string; nome: string; cor: string; categoria?: string | null }[] | null };
  const aplicadas = ((contato.contato_etiquetas as unknown as ETag[] | null) || [])
    .map((e) => (Array.isArray(e.etiqueta) ? e.etiqueta[0] : e.etiqueta))
    .filter((e): e is { id: string; nome: string; cor: string; categoria?: string | null } => !!e && (e.categoria || "etiqueta") === "etiqueta")
    .map((e) => ({ id: e.id, nome: e.nome, cor: e.cor }));

  const fechamentos = (fechRows || []).map((t) => {
    const meta = (t.metadata || {}) as { servico?: string; quantidade?: number };
    return {
      ticketId: t.id as string,
      numero: t.numero as number,
      valor: Number(t.valor_fechado || 0),
      servico: (meta.servico || "").trim() || null,
      quantidade: meta.quantidade != null ? Number(meta.quantidade) : null,
      fechado_em: t.fechado_em as string | null,
    };
  });
  const totalValor = fechamentos.reduce((s, f) => s + f.valor, 0);
  const totalQtd = fechamentos.reduce((s, f) => s + (f.quantidade || 0), 0);

  return NextResponse.json({
    ok: true,
    nome: contato.nome,
    whatsapp: contato.whatsapp,
    etiquetasAplicadas: aplicadas,
    todasEtiquetas: (todasTags || []).filter((e) => (e.categoria || "etiqueta") === "etiqueta").map((e) => ({ id: e.id, nome: e.nome, cor: e.cor })),
    fechamentos,
    totais: { quantidadeFechamentos: fechamentos.length, totalValor, totalQtd, ultimo: fechamentos[0]?.fechado_em || null },
  });
}
