import { createClient as createSupabaseClient } from "@supabase/supabase-js";

function secretKey(): string {
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("SUPABASE_SECRET_KEY (ou SUPABASE_SERVICE_ROLE_KEY) ausente");
  }
  return key;
}

/**
 * Client com secret key (Supabase novo modelo) ou service_role (legacy fallback).
 * BYPASSA RLS.
 * Usar APENAS em:
 *   - scripts (scheduler, syncs)
 *   - rotas server-side que precisam operar cross-tenant (cron, webhooks)
 * NUNCA expor ao browser.
 */
export function createServiceClient() {
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, secretKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
