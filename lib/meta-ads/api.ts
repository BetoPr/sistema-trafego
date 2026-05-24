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
  // Apenas ads_read — escopo mínimo pra leitura de campanhas/insights/ads.
  // business_management foi removido em 2026-05-24 pq exigia Business Manager
  // selecionado no popup Meta; usuários sem Business Manager (ou com app não
  // vinculado a um Business) viam o dialog cancelar sozinho com
  // action=reentry_finish + selected_business_id vazio. ads_read sozinho
  // permite listar ad accounts pessoais + sync de campanhas/insights.
  url.searchParams.set("scope", "ads_read");
  return url.toString();
}

// =========================================
// SYNC HELPERS
// =========================================

export interface MetaCampaign {
  id: string;
  name: string;
  objective?: string;
  status?: string;
  daily_budget?: string; // centavos
  lifetime_budget?: string;
  start_time?: string;
  stop_time?: string;
}

export interface MetaAdSet {
  id: string;
  name: string;
  status?: string;
  daily_budget?: string;
  campaign_id: string;
  targeting?: Record<string, unknown>;
}

export interface MetaAd {
  id: string;
  name: string;
  status?: string;
  adset_id: string;
  campaign_id: string;
  creative?: { id?: string; thumbnail_url?: string; effective_object_story_id?: string };
}

export interface MetaInsightRow {
  ad_id: string;
  adset_id: string;
  campaign_id: string;
  date_start: string;
  impressions?: string;
  reach?: string;
  clicks?: string;
  spend?: string;
  frequency?: string;
  actions?: Array<{ action_type: string; value: string }>;
  video_p25_watched_actions?: Array<{ action_type: string; value: string }>;
  inline_link_clicks?: string;
}

async function paginatedGet<T>(initialUrl: string, token: string, maxPages = 20): Promise<T[]> {
  const out: T[] = [];
  let next: string | undefined = initialUrl;
  let pages = 0;
  while (next && pages < maxPages) {
    const url: URL = new URL(next);
    if (!url.searchParams.get("access_token")) {
      url.searchParams.set("access_token", token);
    }
    const res = await fetch(url.toString(), { cache: "no-store" });
    const json = await res.json();
    if (!res.ok || json.error) {
      throw new Error(`Meta API error: ${json.error?.message || res.statusText}`);
    }
    if (Array.isArray(json.data)) out.push(...(json.data as T[]));
    next = json.paging?.next;
    pages++;
  }
  return out;
}

export async function listCampaigns(accessToken: string, adAccountId: string): Promise<MetaCampaign[]> {
  const url = new URL(graphUrl(`/${adAccountId}/campaigns`));
  url.searchParams.set(
    "fields",
    "id,name,objective,status,daily_budget,lifetime_budget,start_time,stop_time",
  );
  url.searchParams.set("limit", "100");
  url.searchParams.set("access_token", accessToken);
  return paginatedGet<MetaCampaign>(url.toString(), accessToken);
}

export async function listAdSets(accessToken: string, adAccountId: string): Promise<MetaAdSet[]> {
  const url = new URL(graphUrl(`/${adAccountId}/adsets`));
  url.searchParams.set("fields", "id,name,status,daily_budget,campaign_id,targeting");
  url.searchParams.set("limit", "100");
  url.searchParams.set("access_token", accessToken);
  return paginatedGet<MetaAdSet>(url.toString(), accessToken);
}

export async function listAds(accessToken: string, adAccountId: string): Promise<MetaAd[]> {
  const url = new URL(graphUrl(`/${adAccountId}/ads`));
  url.searchParams.set(
    "fields",
    "id,name,status,adset_id,campaign_id,creative{id,thumbnail_url,effective_object_story_id}",
  );
  url.searchParams.set("limit", "100");
  url.searchParams.set("access_token", accessToken);
  return paginatedGet<MetaAd>(url.toString(), accessToken);
}

export async function listDailyInsights(
  accessToken: string,
  adAccountId: string,
  datePreset: "last_7d" | "last_14d" | "last_30d" = "last_7d",
): Promise<MetaInsightRow[]> {
  const url = new URL(graphUrl(`/${adAccountId}/insights`));
  url.searchParams.set("level", "ad");
  url.searchParams.set("time_increment", "1");
  url.searchParams.set("date_preset", datePreset);
  url.searchParams.set(
    "fields",
    "ad_id,adset_id,campaign_id,date_start,impressions,reach,clicks,spend,frequency,actions,inline_link_clicks",
  );
  url.searchParams.set("limit", "500");
  url.searchParams.set("access_token", accessToken);
  return paginatedGet<MetaInsightRow>(url.toString(), accessToken);
}

export function redirectUri(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL;
  if (!base) throw new Error("NEXT_PUBLIC_APP_URL ausente");
  return `${base.replace(/\/$/, "")}/oauth/meta/callback`;
}
