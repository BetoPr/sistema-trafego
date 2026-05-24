import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { signState } from "@/lib/oauth/state";
import { buildAuthorizeUrl, redirectUri } from "@/lib/meta-ads/api";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);

  // Bloqueia prefetch RSC do Next 16. Sem essa guarda, o <Link> renderizado
  // dispara prefetch automático que: (1) consome/sobrescreve o cookie state,
  // (2) tenta seguir redirect pra facebook.com via fetch CORS (falha), e
  // (3) deixa o cookie real desatualizado quando o user clica de fato →
  // state_mismatch garantido. Detectamos via param ?_rsc=... ou header RSC.
  if (url.searchParams.has("_rsc") || req.headers.get("rsc") === "1") {
    return new NextResponse(null, { status: 204 });
  }

  const clienteId = url.searchParams.get("cliente_id");

  if (!clienteId) {
    return NextResponse.json({ error: "cliente_id obrigatório" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", req.url));

  // Confirma cliente pertence à mesma agência (RLS já garante, mas explícito)
  const { data: cliente } = await supabase
    .from("clientes")
    .select("id, agencia_id, deleted_at")
    .eq("id", clienteId)
    .maybeSingle();

  if (!cliente || cliente.deleted_at) {
    return NextResponse.json({ error: "cliente não encontrado" }, { status: 404 });
  }

  const state = signState({ cliente_id: clienteId, user_id: user.id });

  const cookieStore = await cookies();
  cookieStore.set("oauth_state_meta", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  const authorizeUrl = buildAuthorizeUrl({
    redirectUri: redirectUri(),
    state,
  });

  return NextResponse.redirect(authorizeUrl);
}
