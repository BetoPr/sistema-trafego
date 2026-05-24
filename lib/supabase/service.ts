import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Client com secret key Supabase (novo modelo, formato sb_secret_*).
 * BYPASSA RLS.
 * Usar APENAS em:
 *   - scripts (scheduler, syncs)
 *   - rotas server-side que precisam operar cross-tenant (cron, webhooks)
 * NUNCA expor ao browser.
 */
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
