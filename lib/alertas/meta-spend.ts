/**
 * Busca gasto Meta Ads no período (dia atual ou mês atual).
 * Usa Graph API /insights com date_preset=today|this_month, level=account.
 */
const META_API_VERSION = process.env.META_API_VERSION || "v22.0";

function graphUrl(path: string): string {
  return `https://graph.facebook.com/${META_API_VERSION}${path.startsWith("/") ? path : `/${path}`}`;
}

function normalizeAccountId(id: string): string {
  return id.startsWith("act_") ? id : `act_${id}`;
}

interface InsightAccountRow {
  spend?: string;
  date_start?: string;
  date_stop?: string;
}

/**
 * Retorna gasto (em BRL, número) no período informado.
 * preset: "today" (gasto hoje) ou "this_month" (gasto no mês atual).
 * Retorna 0 quando não há dados.
 */
export async function getSpend(
  accessToken: string,
  adAccountId: string,
  preset: "today" | "this_month",
): Promise<number> {
  const acct = normalizeAccountId(adAccountId);
  const url = new URL(graphUrl(`/${acct}/insights`));
  url.searchParams.set("level", "account");
  url.searchParams.set("fields", "spend");
  url.searchParams.set("date_preset", preset);
  url.searchParams.set("access_token", accessToken);

  const res = await fetch(url.toString(), { cache: "no-store" });
  const json = (await res.json()) as { data?: InsightAccountRow[]; error?: { message?: string } };
  if (!res.ok || json.error) {
    throw new Error(`Meta insights falhou: ${json.error?.message || res.status}`);
  }
  const rows = json.data || [];
  if (!rows.length) return 0;
  const spend = Number(rows[0].spend || "0");
  return Number.isFinite(spend) ? spend : 0;
}
