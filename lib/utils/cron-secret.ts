/**
 * Resolve CRON_SECRET com fallback DB → env.
 *
 * Por que: o .env da VPS pode ter um valor diferente do que pg_cron espera
 * (ex: VPS resetada, secret regenerado). DB é fonte de verdade — pg_cron e app
 * leem o mesmo lugar. Env continua suportado como fallback dev/local.
 */

import { createServiceClient } from "@/lib/supabase/service";

let cacheValor: string | null = null;
let cacheEm = 0;
const TTL_MS = 60_000;

export async function getCronSecret(): Promise<string> {
  const agora = Date.now();
  if (cacheValor && agora - cacheEm < TTL_MS) return cacheValor;

  try {
    const sb = createServiceClient();
    const { data } = await sb.from("super_admin_secrets").select("cron_secret").eq("id", 1).maybeSingle();
    const dbVal = (data?.cron_secret as string | null)?.trim();
    if (dbVal) {
      cacheValor = dbVal;
      cacheEm = agora;
      return dbVal;
    }
  } catch {
    /* cai pro env */
  }

  const envVal = (process.env.CRON_SECRET || "").trim();
  cacheValor = envVal;
  cacheEm = agora;
  return envVal;
}

/** Compara header `Authorization: Bearer <secret>` com o secret atual. */
export async function autorizarCron(authHeader: string | null): Promise<boolean> {
  const secret = await getCronSecret();
  if (!secret) return false;
  const auth = (authHeader || "").trim();
  return auth === `Bearer ${secret}`;
}
