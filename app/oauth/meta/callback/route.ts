import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { verifyState } from "@/lib/oauth/state";
import { signPending } from "@/lib/oauth/pending";
import { encryptToken } from "@/lib/crypto/tokens";
import {
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  listAdAccounts,
  redirectUri,
} from "@/lib/meta-ads/api";

function errorRedirect(req: NextRequest, code: string, msg?: string) {
  const url = new URL("/integracoes/meta", req.url);
  url.searchParams.set("erro", code);
  if (msg) url.searchParams.set("msg", msg.slice(0, 200));
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");
  const fbError = url.searchParams.get("error");

  if (fbError) {
    const desc = url.searchParams.get("error_description") || fbError;
    return errorRedirect(req, "fb_error", desc);
  }

  if (!code || !stateParam) {
    return errorRedirect(req, "missing_params");
  }

  // Valida state via cookie + assinatura HMAC
  const cookieStore = await cookies();
  const stateCookie = cookieStore.get("oauth_state_meta")?.value;
  if (!stateCookie || stateCookie !== stateParam) {
    return errorRedirect(req, "state_mismatch");
  }

  let statePayload: ReturnType<typeof verifyState>;
  try {
    statePayload = verifyState(stateParam);
  } catch (e) {
    return errorRedirect(req, "state_invalid", (e as Error).message);
  }

  // Confirma usuário ainda autenticado e é o mesmo que iniciou o flow
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", req.url));
  if (user.id !== statePayload.user_id) {
    return errorRedirect(req, "user_mismatch");
  }

  // Confirma cliente pertence à agência do usuário (RLS)
  const { data: usuario } = await supabase
    .from("usuarios")
    .select("agencia_id")
    .eq("id", user.id)
    .single();
  if (!usuario) return errorRedirect(req, "usuario_nao_encontrado");

  const { data: cliente } = await supabase
    .from("clientes")
    .select("id, agencia_id, deleted_at")
    .eq("id", statePayload.cliente_id)
    .maybeSingle();
  if (!cliente || cliente.deleted_at || cliente.agencia_id !== usuario.agencia_id) {
    return errorRedirect(req, "cliente_invalido");
  }

  // Troca code → short token → long-lived token
  let longToken;
  try {
    const short = await exchangeCodeForToken({ code, redirectUri: redirectUri() });
    longToken = await exchangeForLongLivedToken(short.access_token);
  } catch (e) {
    return errorRedirect(req, "exchange_failed", (e as Error).message);
  }

  // Lista ad accounts disponíveis
  let adAccounts;
  try {
    adAccounts = await listAdAccounts(longToken.access_token);
  } catch (e) {
    return errorRedirect(req, "list_adaccounts_failed", (e as Error).message);
  }

  if (adAccounts.length === 0) {
    return errorRedirect(
      req,
      "sem_contas",
      "Nenhuma ad account vinculada a este usuário Meta",
    );
  }

  // Criptografa token (app-level AES-256-GCM)
  const encrypted = encryptToken(longToken.access_token);
  const accessTokenB64 = encrypted.toString("base64");
  const tokenExpiresAt = Date.now() + longToken.expires_in * 1000;

  // Persiste em cookie pending assinado (HttpOnly, 10min TTL)
  const pendingCookie = signPending({
    cliente_id: statePayload.cliente_id,
    user_id: user.id,
    agencia_id: usuario.agencia_id,
    access_token_b64: accessTokenB64,
    token_expires_at: tokenExpiresAt,
    ad_accounts: adAccounts.map((a) => ({
      id: a.id,
      account_id: a.account_id,
      name: a.name,
      currency: a.currency,
      business_name: a.business_name,
    })),
  });

  const res = NextResponse.redirect(new URL("/integracoes/meta/contas", req.url));
  res.cookies.set("meta_pending", pendingCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  res.cookies.delete("oauth_state_meta");
  return res;
}
