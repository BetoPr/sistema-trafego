# External Integrations

**Analysis Date:** 2026-05-22

## Summary Table

| Service | Status | Purpose | Key files |
|---------|--------|---------|-----------|
| Supabase Auth | Active | Email/password auth, session refresh | `lib/supabase/*`, `proxy.ts`, `lib/auth.ts` |
| Supabase Postgres | Active | Multi-tenant DB w/ RLS | `supabase/migrations/`, `lib/supabase/*` |
| Meta Marketing API (Graph v21+) | Active (OAuth + sync) | Read ad accounts, campaigns, adsets, ads, daily insights | `lib/meta-ads/api.ts`, `lib/meta-ads/sync.ts`, `app/oauth/meta/*` |
| Google Ads API | Not implemented | Future ad data source | Guide only: `INTEGRACAO-GOOGLE.md` |
| GA4 | Not implemented | Schema reserves `plataforma='ga4'` | `supabase/migrations/...sql` (enum value only) |
| Ollama / Groq / Anthropic | Not wired | AI insights (provider plug-in) | `lib/ai/` empty dir; env vars defined |
| Vercel | Deploy target | Hosting + (planned) Cron Triggers | `.vercel/` present; `app/api/cron/sync-meta` ready |

## APIs & External Services

### Meta Marketing API

**Base URL:** `https://graph.facebook.com/${META_API_VERSION}` (default `v21.0`) — `lib/meta-ads/api.ts:6-13`.

**Auth dialog URL:** `https://www.facebook.com/${apiVersion}/dialog/oauth` — `lib/meta-ads/api.ts:108`.

**Scopes requested:** `ads_read,business_management` (`lib/meta-ads/api.ts:114`).
Note: `read_insights` deliberately removed — Meta deprecated it for ads (commit `7508923`); `ads_read` already covers ad insights.

**Endpoints called:**

| Method | Endpoint | Function | File |
|--------|----------|----------|------|
| GET | `/oauth/access_token` (code) | `exchangeCodeForToken` | `lib/meta-ads/api.ts:40` |
| GET | `/oauth/access_token?grant_type=fb_exchange_token` | `exchangeForLongLivedToken` (short → 60-day long-lived) | `lib/meta-ads/api.ts:65` |
| GET | `/me/adaccounts` | `listAdAccounts` | `lib/meta-ads/api.ts:87` |
| GET | `/{adAccountId}/campaigns` | `listCampaigns` | `lib/meta-ads/api.ts:187` |
| GET | `/{adAccountId}/adsets` | `listAdSets` | `lib/meta-ads/api.ts:198` |
| GET | `/{adAccountId}/ads` | `listAds` | `lib/meta-ads/api.ts:206` |
| GET | `/{adAccountId}/insights` (level=ad, time_increment=1) | `listDailyInsights` (default `last_7d`) | `lib/meta-ads/api.ts:217` |

**Pagination:** `paginatedGet<T>()` follows `paging.next` up to 20 pages (`lib/meta-ads/api.ts:166`).

**Credentials env:** `META_APP_ID`, `META_APP_SECRET`, `META_REDIRECT_URI`, `META_API_VERSION`.

**Redirect URI (computed):** `${NEXT_PUBLIC_APP_URL}/oauth/meta/callback` — `lib/meta-ads/api.ts:235-239`.

**Sync orchestration:** `lib/meta-ads/sync.ts`
- `syncMetaIntegracao(integracaoId)` — single integration. Decrypts token via `decryptToken`, fetches campaigns → adsets → ads → insights, upserts into `campanhas`, `conjuntos`, `anuncios`, `metricas_diarias`. Updates `integracoes.ultima_sync` / `status`.
- `syncTodasMeta()` — iterates all `integracoes` where `plataforma='meta_ads'` and `status='ativa'` (cross-tenant via service role).
- Action-type aggregation: `purchase`/`offsite_conversion.fb_pixel_purchase`/`onsite_conversion.purchase` → `conversoes`; `lead`/`leadgen.other`/`onsite_conversion.lead_grouped` → `leads`; `post_engagement`/`page_engagement`/`post_reaction`/`comment`/`post` → `engajamento`; `video_view` → `visualizacoes_video`.
- Currency: budgets returned in cents → `reaisFromCents()` divides by 100.
- Insights upserted in 200-row batches to stay under Postgres param limit.

**Setup guide:** `INTEGRACAO-META.md` (app in Development mode + Tester role; no App Review needed for `ads_read`, `business_management`).

### Google Ads API

**Status:** Setup guide present, no code.

**Planned scope:** `https://www.googleapis.com/auth/adwords` (per `INTEGRACAO-GOOGLE.md:143`).

**Planned redirect URI:** `${baseUrl}/oauth/google/callback` (`/oauth/google/start` + callback not implemented).

**Required env (planned):** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_ADS_DEVELOPER_TOKEN`, `GOOGLE_ADS_REDIRECT_URI`.

**Blocker:** Google Ads requires a manually-approved Developer Token (Test → Basic 1-2d → Standard up to 2 weeks).

**Schema readiness:** `integracoes.plataforma` already permits `'google_ads'` (`supabase/migrations/20260520120000_schema_inicial.sql:82`).

### Supabase

**URL/anon key:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — used by browser + server clients.

**Service role key:** `SUPABASE_SERVICE_ROLE_KEY` — used by `lib/supabase/service.ts` ONLY for cron/scheduler/webhook code paths. Never browser.

**Auth provider:** Supabase Auth (email/password). Session cookie managed by `@supabase/ssr` `createServerClient`/`createBrowserClient`. Refresh handled centrally in `proxy.ts:33-35` (`supabase.auth.getUser()` — required call, do not remove).

**Storage:** Not detected. No Supabase Storage buckets referenced in code.

**Realtime:** Not detected.

### AI Providers (planned, not wired)

`lib/ai/` directory exists but is empty. Env vars defined in `.env.example`:

| Provider | Vars |
|----------|------|
| Ollama (default) | `AI_PROVIDER=ollama`, `OLLAMA_BASE_URL=http://localhost:11434`, `OLLAMA_MODEL=llama3.2` |
| Groq | `GROQ_API_KEY` |
| Anthropic Claude | `ANTHROPIC_API_KEY` |

UI route `app/(dashboard)/ia-insights/` exists as placeholder.

## Data Storage

**Database:** Supabase Postgres (managed).
- Multi-tenant via `agencia_id` on every transactional table.
- RLS enabled on all tables; policy: `agencia_id = auth_agencia_id()` (per CLAUDE.md).
- Soft delete: `clientes.deleted_at`; lists must filter `where deleted_at is null`.

**File storage:** Not used. PDF/Excel reports likely streamed via `@react-pdf/renderer` and `exceljs` (no persistence layer detected).

**Caching:** Next.js fetch cache where applicable. Cron route + Meta API calls use `cache: "no-store"` explicitly (`lib/meta-ads/api.ts:54,77,93,175`).

## Authentication & Identity

**Provider:** Supabase Auth.

**Implementation:**
- Browser sign-in via `createClient()` from `lib/supabase/client.ts`.
- Server-side auth gates use `await createClient()` (`lib/supabase/server.ts`) + `getUser()`.
- Helpers in `lib/auth.ts`: `requireUser()`, `requireUserWithAgencia()` (joins `usuarios` table for tenant context).
- Sign-out: server action `lib/actions/auth.ts:signOutAction` → `supabase.auth.signOut()` + redirect `/login`.
- Authorization decisions **never** use `getSession()` (CLAUDE.md non-negotiable).

## OAuth Flows

### Token cryptography

**App-level AES-256-GCM** (`lib/crypto/tokens.ts`):
- `encryptToken(plaintext) → Buffer` (layout: `iv(12) || tag(16) || ciphertext`).
- `decryptToken(blob) → string`.
- Key from `ENCRYPTION_KEY` (64-char hex, validated at runtime).
- **Stored as `bytea`** in `integracoes.access_token_encrypted` / `refresh_token_encrypted`.
- **Never** uses Postgres `pgp_sym_encrypt`/`pgp_sym_decrypt` (unreliable with Supabase pool — CLAUDE.md non-negotiable).

### CSRF state

`lib/oauth/state.ts`:
- `signState({ cliente_id, user_id }) → "body.sig"` — HMAC-SHA256, base64url, embedded nonce + `expires_at` (TTL 5 min).
- `verifyState(token)` — constant-time compare via `timingSafeEqual`, validates TTL.
- Secret: `OAUTH_STATE_SECRET`.

### Pending connection cookie (Meta-specific)

`lib/oauth/pending.ts`:
- Carries `{ cliente_id, user_id, agencia_id, access_token_b64 (encrypted+b64), token_expires_at, ad_accounts[] }`.
- HMAC-signed, TTL 10 min.
- Used to bridge OAuth callback → ad-account picker UI.

### Meta OAuth flow (concrete)

1. `GET /oauth/meta/start?cliente_id=...` (`app/oauth/meta/start/route.ts`)
   - Requires auth user; verifies cliente belongs to user's agency.
   - Generates state → cookie `oauth_state_meta` (HttpOnly, Secure in prod, SameSite=Lax, maxAge 300s).
   - Redirects to Facebook authorize URL.

2. `GET /oauth/meta/callback?code=&state=` (`app/oauth/meta/callback/route.ts`)
   - Verifies state cookie matches param + HMAC signature + TTL + same user.
   - Exchanges code → short token → long-lived token (~60 days).
   - Lists ad accounts via Graph API.
   - Encrypts token (AES-256-GCM), packs into signed `meta_pending` cookie (HttpOnly, maxAge 600s).
   - Clears `oauth_state_meta`. Redirects to `/integracoes/meta/contas`.

3. Account picker: `app/(dashboard)/integracoes/meta/contas/page.tsx` + `actions.ts`
   - User selects an ad account.
   - Server action `salvarContaSelecionada` upserts into `integracoes` (`onConflict: cliente_id,plataforma,account_id`).
   - Deletes `meta_pending` cookie.

4. Manual sync: `app/(dashboard)/integracoes/meta/_actions.ts:sincronizar` invokes `syncMetaIntegracao()` then revalidates `/integracoes/meta`, `/dashboard`, `/campanhas`, `/criativos`.

### Google OAuth flow

Not implemented. Routes `/oauth/google/start` and `/oauth/google/callback` are referenced in `INTEGRACAO-GOOGLE.md` but absent from `app/`.

## Webhooks & Callbacks

**Incoming webhooks:** `app/api/webhooks/` directory exists but is empty.

**OAuth callbacks (incoming, browser-redirect):**
- `GET /oauth/meta/callback` — Meta Marketing API callback.
- `GET /oauth/google/callback` — planned, not implemented.

**Outgoing webhooks:** None detected.

## Cron Endpoints

| Method | Path | Purpose | Auth | File |
|--------|------|---------|------|------|
| GET | `/api/cron/sync-meta` | Run `syncTodasMeta()` across all active Meta integrations | `Authorization: Bearer ${CRON_SECRET}` | `app/api/cron/sync-meta/route.ts` |

Response shape:
```json
{ "ok": true, "total": N, "sucesso": N, "falhas": N, "duracao_ms": N, "detalhes": [SyncResult, ...] }
```

`dynamic = "force-dynamic"` (no caching). Intended to be triggered by Vercel Cron / Supabase pg_cron / Cloudflare Cron Triggers; identical logic also runnable from local `scripts/sync-scheduler.ts` (node-cron, file not yet created).

## API Endpoint Inventory

All route handlers under `app/`:

| Method | Path | Purpose | File |
|--------|------|---------|------|
| GET | `/oauth/meta/start` | Initiate Meta OAuth (sets state cookie, redirects to Facebook) | `app/oauth/meta/start/route.ts` |
| GET | `/oauth/meta/callback` | Receive Meta authorization code, exchange tokens, stage pending cookie | `app/oauth/meta/callback/route.ts` |
| GET | `/api/cron/sync-meta` | Cron trigger: sync all Meta integrations | `app/api/cron/sync-meta/route.ts` |

**Scaffolded but empty:** `app/api/oauth/meta/start/`, `app/api/sync/meta/`, `app/api/reports/`, `app/api/webhooks/` — directories exist with no `route.ts` yet.

**Server Actions (not routes, but external-touching):**

| Action | File | Purpose |
|--------|------|---------|
| `sincronizar(integracaoId)` | `app/(dashboard)/integracoes/meta/_actions.ts` | On-demand Meta sync from UI |
| `desconectar(integracaoId)` | `app/(dashboard)/integracoes/meta/_actions.ts` | Delete `integracoes` row |
| `salvarContaSelecionada(formData)` | `app/(dashboard)/integracoes/meta/contas/actions.ts` | Persist chosen ad account after OAuth |
| `cancelar()` | `app/(dashboard)/integracoes/meta/contas/actions.ts` | Drop pending cookie |
| `signOutAction()` | `lib/actions/auth.ts` | Supabase sign-out |

## Environment Configuration

**Required env vars (audit-time):**

| Var | Required for |
|-----|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | All Supabase access |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser + cookie-bound server client |
| `SUPABASE_SERVICE_ROLE_KEY` | `lib/supabase/service.ts` (sync, cron) |
| `NEXT_PUBLIC_APP_URL` | Building OAuth redirect URIs |
| `ENCRYPTION_KEY` | Token encrypt/decrypt (64 hex chars) |
| `OAUTH_STATE_SECRET` | OAuth state + pending cookie HMAC |
| `META_APP_ID`, `META_APP_SECRET` | Meta OAuth code+token exchanges |
| `META_REDIRECT_URI` (optional override) | Defaults computed via `NEXT_PUBLIC_APP_URL` |
| `META_API_VERSION` | Defaults `v21.0` |
| `CRON_SECRET` | `/api/cron/sync-meta` auth |

**Future:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_ADS_DEVELOPER_TOKEN`, `GOOGLE_ADS_REDIRECT_URI`, `AI_PROVIDER` (+ provider-specific keys).

**Secrets location:**
- Local: `.env.local` (gitignored, present at audit time).
- Production: Vercel project env vars (per integration guides).

## Token Lifecycle (Meta)

| Stage | Lifetime | Storage |
|-------|----------|---------|
| Short-lived (code exchange) | ~1 hour | Memory only |
| Long-lived (fb_exchange_token) | ~60 days | `integracoes.access_token_encrypted` (AES-256-GCM blob) |
| `token_expires_at` | `now() + expires_in*1000` | Set on persist (`app/(dashboard)/integracoes/meta/contas/actions.ts:39`) |
| Refresh strategy | Long-lived can be re-extended via Graph; no refresh-token table column actively used for Meta (column exists generically). Future cron alert "7 days before expiration" mentioned in `INTEGRACAO-META.md:120`. |

---

*Integration audit: 2026-05-22*
