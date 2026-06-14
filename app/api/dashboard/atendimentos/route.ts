/**
 * GET /api/dashboard/atendimentos?periodo=hoje|7d|30d | ?de=YYYY-MM-DD&ate=YYYY-MM-DD
 * KPIs + série diária + top serviços pro dashboard SPA.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { resolverFaixa, carregarDashboardAtendimentos } from "@/lib/crm/dashboard-queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "auth" }, { status: 401 });

  const sb = createServiceClient();
  const { data: u } = await sb.from("usuarios").select("agencia_id").eq("id", auth.user.id).single();
  if (!u) return NextResponse.json({ error: "no_user" }, { status: 403 });

  const faixa = resolverFaixa(
    url.searchParams.get("periodo") || undefined,
    url.searchParams.get("de") || undefined,
    url.searchParams.get("ate") || undefined,
  );
  const servicosParam = url.searchParams.get("servicos");
  const servicosFiltro = servicosParam
    ? servicosParam.split(",").map((s) => decodeURIComponent(s).trim()).filter(Boolean)
    : undefined;
  const dados = await carregarDashboardAtendimentos(sb, u.agencia_id, faixa, servicosFiltro);
  return NextResponse.json({ ...dados, label: faixa.label });
}
