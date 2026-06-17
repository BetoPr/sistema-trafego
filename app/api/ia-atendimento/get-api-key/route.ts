/**
 * GET /api/ia-atendimento/get-api-key?perfilId=...
 *
 * Retorna a chave API decriptada do perfil pra exibir no UI (botao olho).
 * Apenas dono do perfil ou super_admin podem ler.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { decryptToken, byteaToBuffer } from "@/lib/crypto/tokens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "auth" }, { status: 401 });

  const sb = createServiceClient();
  const { data: u } = await sb
    .from("usuarios")
    .select("agencia_id, role")
    .eq("id", auth.user.id)
    .single();
  if (!u) return NextResponse.json({ error: "no_user" }, { status: 403 });

  const perfilId = new URL(req.url).searchParams.get("perfilId");
  if (!perfilId) return NextResponse.json({ error: "perfilId_obrigatorio" }, { status: 400 });

  const { data: p } = await sb
    .from("ia_atendimento_perfis")
    .select("agencia_id, criado_por, api_key_encrypted, provider")
    .eq("id", perfilId)
    .maybeSingle<{ agencia_id: string; criado_por: string | null; api_key_encrypted: unknown; provider: string }>();
  if (!p) return NextResponse.json({ error: "perfil_nao_encontrado" }, { status: 404 });
  if (p.agencia_id !== u.agencia_id) return NextResponse.json({ error: "fora_agencia" }, { status: 403 });
  if (u.role !== "super_admin" && p.criado_por !== auth.user.id) {
    return NextResponse.json({ error: "so_dono" }, { status: 403 });
  }
  if (!p.api_key_encrypted) return NextResponse.json({ apiKey: null, provider: p.provider });

  try {
    const apiKey = decryptToken(byteaToBuffer(p.api_key_encrypted as Parameters<typeof byteaToBuffer>[0]));
    return NextResponse.json({ apiKey, provider: p.provider });
  } catch {
    return NextResponse.json({ error: "chave_corrompida" }, { status: 500 });
  }
}
