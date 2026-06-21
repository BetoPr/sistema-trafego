import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Autoriza super_admin em route handlers de API.
 * Diferente de requireSuperAdmin() (que faz redirect, p/ páginas), este retorna
 * JSON 401/403 — padrão de erro das rotas de API. Auth via getUser() (nunca getSession()).
 *
 * Uso:
 *   const a = await requireSuperAdminApi();
 *   if (a instanceof NextResponse) return a;
 *   // a.agenciaId disponível
 */
export async function requireSuperAdminApi(): Promise<{ agenciaId: string } | NextResponse> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const sb = createServiceClient();
  const { data: u } = await sb
    .from("usuarios")
    .select("agencia_id, role")
    .eq("id", auth.user.id)
    .single();
  if (!u || u.role !== "super_admin") return NextResponse.json({ error: "acesso negado" }, { status: 403 });

  return { agenciaId: u.agencia_id as string };
}
