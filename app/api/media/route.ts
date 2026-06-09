/**
 * GET /api/media?path=<bucket-path>
 * Retorna signed URL pra qualquer path em crm-media, escopado por agência via RLS.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getSignedUrl } from "@/lib/crm/storage";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "auth" }, { status: 401 });

  const url = new URL(req.url);
  const path = url.searchParams.get("path");
  if (!path) return NextResponse.json({ error: "path_obrigatorio" }, { status: 400 });

  const sb = createServiceClient();
  const { data: u } = await sb.from("usuarios").select("agencia_id").eq("id", auth.user.id).single();
  if (!u) return NextResponse.json({ error: "no_user" }, { status: 403 });

  // Path tem prefixo <agencia_id>/. Valida que bate.
  if (!path.startsWith(`${u.agencia_id}/`)) {
    return NextResponse.json({ error: "fora_da_agencia" }, { status: 403 });
  }

  const signed = await getSignedUrl(path, 3600);
  if (!signed) return NextResponse.json({ error: "nao_encontrada" }, { status: 404 });
  return NextResponse.json({ url: signed });
}
