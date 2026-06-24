/**
 * GET /api/filtro-ativo/opcoes?q=texto
 * Retorna lista combinada de Pastas/Etiquetas/Campanhas com nome batendo `q`.
 * Consumido pelo FiltroGlobal dropdown (autocomplete).
 */
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
  const q = (url.searchParams.get("q") || "").trim();
  const ilike = q ? `%${q}%` : "%";

  const [etqs, camps] = await Promise.all([
    sb
      .from("etiquetas")
      .select("id, nome, cor, etiqueta_pai_id")
      .eq("agencia_id", u.agencia_id)
      .eq("ativo", true)
      .ilike("nome", ilike)
      .limit(50),
    sb
      .from("campanhas")
      .select("id, nome, status")
      .eq("agencia_id", u.agencia_id)
      .ilike("nome", ilike)
      .order("nome")
      .limit(50),
  ]);

  const etiquetas = etqs.data || [];
  const idsComFilhas = new Set(etiquetas.filter((e) => e.etiqueta_pai_id).map((e) => e.etiqueta_pai_id));
  const pastas = etiquetas.filter((e) => !e.etiqueta_pai_id && idsComFilhas.has(e.id as string))
    .map((e) => ({ tipo: "pasta" as const, id: e.id as string, nome: e.nome as string, cor: e.cor as string }));
  const etqsSemPasta = etiquetas.filter((e) => !pastas.some((p) => p.id === e.id))
    .map((e) => ({ tipo: "etiqueta" as const, id: e.id as string, nome: e.nome as string, cor: e.cor as string }));

  const campanhas = (camps.data || []).map((c) => ({
    tipo: "campanha" as const,
    id: c.id as string,
    nome: c.nome as string,
    status: c.status as string | null,
  }));

  return NextResponse.json({ ok: true, pastas, etiquetas: etqsSemPasta, campanhas });
}
