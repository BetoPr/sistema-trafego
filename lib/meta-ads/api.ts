/**
 * Meta Marketing API client (Graph API v21+)
 * Docs: https://developers.facebook.com/docs/marketing-apis
 */

const GRAPH_BASE = "https://graph.facebook.com";

function apiVersion(): string {
  return process.env.META_API_VERSION || "v21.0";
}

function graphUrl(path: string): string {
  return `${GRAPH_BASE}/${apiVersion()}${path.startsWith("/") ? path : `/${path}`}`;
}

export interface MetaShortTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

export interface MetaLongTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number; // segundos
}

export interface MetaAdAccount {
  id: string; // "act_123456"
  account_id: string; // "123456"
  name: string;
  account_status: number;
  currency: string;
  business_name?: string;
}

/**
 * Step 1 do OAuth code flow: troca authorization code por short-lived token (1h).
 */
export async function exchangeCodeForToken(params: {
  code: string;
  redirectUri: string;
}): Promise<MetaShortTokenResponse> {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) throw new Error("META_APP_ID/META_APP_SECRET ausente");

  const url = new URL(graphUrl("/oauth/access_token"));
  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("code", params.code);

  const res = await fetch(url.toString(), { cache: "no-store" });
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(`Meta exchange code falhou: ${json.error?.message || res.statusText}`);
  }
  return json as MetaShortTokenResponse;
}

/**
 * Step 2: troca short-lived token por long-lived token (~60 dias).
 */
export async function exchangeForLongLivedToken(shortToken: string): Promise<MetaLongTokenResponse> {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) throw new Error("META_APP_ID/META_APP_SECRET ausente");

  const url = new URL(graphUrl("/oauth/access_token"));
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("fb_exchange_token", shortToken);

  const res = await fetch(url.toString(), { cache: "no-store" });
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(`Meta long-lived exchange falhou: ${json.error?.message || res.statusText}`);
  }
  return json as MetaLongTokenResponse;
}

/**
 * Lista todas as ad accounts que o usuário autorizou acesso.
 */
export async function listAdAccounts(accessToken: string): Promise<MetaAdAccount[]> {
  const url = new URL(graphUrl("/me/adaccounts"));
  url.searchParams.set("access_token", accessToken);
  url.searchParams.set("fields", "id,account_id,name,account_status,currency,business_name");
  url.searchParams.set("limit", "100");

  const res = await fetch(url.toString(), { cache: "no-store" });
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(`Meta listAdAccounts falhou: ${json.error?.message || res.statusText}`);
  }
  return (json.data || []) as MetaAdAccount[];
}

/**
 * Constrói URL de autorização OAuth.
 */
export function buildAuthorizeUrl(params: { redirectUri: string; state: string }): string {
  const appId = process.env.META_APP_ID;
  if (!appId) throw new Error("META_APP_ID ausente");

  const url = new URL(`https://www.facebook.com/${apiVersion()}/dialog/oauth`);
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("state", params.state);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "ads_read,business_management,read_insights");
  return url.toString();
}

export function redirectUri(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL;
  if (!base) throw new Error("NEXT_PUBLIC_APP_URL ausente");
  return `${base.replace(/\/$/, "")}/oauth/meta/callback`;
}
