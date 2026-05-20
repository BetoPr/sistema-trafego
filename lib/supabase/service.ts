import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Client com service_role key. BYPASSA RLS.
 * Usar APENAS em:
 *   - scripts (scheduler, syncs)
 *   - rotas server-side que precisam operar cross-tenant (cron, webhooks)
 * NUNCA expor ao browser.
 */
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
