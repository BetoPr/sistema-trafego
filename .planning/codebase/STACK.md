# Technology Stack

**Analysis Date:** 2026-05-22

## Languages

**Primary:**
- TypeScript `^5` — all `app/`, `lib/`, `components/`, `proxy.ts`, `next.config.ts`
- SQL (PostgreSQL dialect) — `supabase/migrations/*.sql`, `supabase/seed.sql`

**Secondary:**
- CSS — `app/globals.css` (Tailwind 4 import + custom design tokens)
- MJS — `eslint.config.mjs`, `postcss.config.mjs`

## Runtime

**Environment:**
- Node 20+ (README §Setup). Local machine running v26.1.0 at audit time.
- React Server Components (RSC) by default, opt-in `"use client"`.

**Package Manager:**
- npm
- Lockfile: `package-lock.json` (present, 445 KB — committed)

## Frameworks

**Core:**

| Lib | Version | Purpose |
|-----|---------|---------|
| `next` | `16.2.6` | App Router framework (Turbopack root configured) |
| `react` / `react-dom` | `19.2.4` | UI runtime (React 19) |
| `@supabase/ssr` | `^0.10.3` | Cookie-bound Supabase clients for server/browser |
| `@supabase/supabase-js` | `^2.106.0` | Service-role client + JS SDK |

**Styling / UI:**

| Lib | Version | Purpose |
|-----|---------|---------|
| `tailwindcss` | `^4` | Utility CSS (v4, PostCSS plugin) |
| `@tailwindcss/postcss` | `^4` | PostCSS bridge for Tailwind 4 |
| `tw-animate-css` | `^1.4.0` | Animation utilities |
| `shadcn` | `^4.7.0` | Component registry CLI (style `base-nova`) |
| `@base-ui/react` | `^1.5.0` | Headless primitives (radix-style) used by shadcn registry |
| `class-variance-authority` | `^0.7.1` | Variant API for shadcn components |
| `clsx` / `tailwind-merge` | `^2.1.1` / `^3.6.0` | Class-name composition (`lib/utils.ts` → `cn()`) |
| `lucide-react` | `^1.16.0` | Icon set (configured in `components.json`) |
| `next-themes` | `^0.4.6` | Dark/light theme provider (`components/providers/ThemeProvider.tsx`) |
| `sonner` | `^2.0.7` | Toast notifications (mounted in `app/layout.tsx:38`) |

**Data / Reporting:**

| Lib | Version | Purpose |
|-----|---------|---------|
| `recharts` | `^3.8.1` | Charts — client-only, requires `"use client"` (see CLAUDE.md) |
| `@react-pdf/renderer` | `^4.5.1` | PDF report generation |
| `exceljs` | `^4.4.0` | Excel report generation |
| `date-fns` | `^4.2.1` | Date formatting with `ptBR` locale |
| `zod` | `^4.4.3` | Schema validation |

**Scheduler:**

| Lib | Version | Purpose |
|-----|---------|---------|
| `node-cron` | `^4.2.1` | Local cron scheduler (`scripts/sync-scheduler.ts`, file not yet created) |
| `@types/node-cron` | `^3.0.11` | Type defs |

**Testing:** Not detected — no Jest/Vitest/Playwright in `package.json`.

## Build / Dev Tooling

| Tool | Config | Notes |
|------|--------|-------|
| Next build | `next.config.ts` | Turbopack root = `__dirname` (no other overrides) |
| TypeScript | `tsconfig.json` | strict, `moduleResolution: bundler`, `paths: { "@/*": ["./*"] }`, target ES2017 |
| ESLint 9 | `eslint.config.mjs` | flat config; spreads `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript`; ignores `.next/`, `out/`, `build/` |
| PostCSS | `postcss.config.mjs` | only plugin: `@tailwindcss/postcss` |
| `tsx` | `^4.22.3` (devDep) | runs TS scripts (e.g. `npx tsx scripts/sync-scheduler.ts`) |
| Prettier | Not detected (no config file) | formatting deferred to ESLint defaults |

**npm scripts (`package.json:5-10`):**

```
dev   → next dev
build → next build
start → next start
lint  → eslint
```

## Database

**Provider:** Supabase Cloud (Postgres + Auth + RLS). Free tier per README.

**Schema source of truth:** `supabase/migrations/20260520120000_schema_inicial.sql` (single migration, ~Multi-tenant schema).

**Core tables (from migration):**

| Table | Notes |
|-------|-------|
| `agencias` | Tenant root |
| `usuarios` | FK to `auth.users(id)`, has `agencia_id`, `role` (owner/admin/editor/viewer) |
| `clientes` | Soft delete via `deleted_at` |
| `integracoes` | OAuth tokens stored as `bytea` (app-encrypted AES-256-GCM); `plataforma in ('meta_ads','google_ads','ga4')` |
| `campanhas`, `conjuntos`, `anuncios`, `metricas_diarias` | Ad data tree synced from Meta |

**Multi-tenancy:** every transactional table carries `agencia_id`; RLS enabled with policy `agencia_id = auth_agencia_id()` (per CLAUDE.md).

**Postgres extensions enabled:** `uuid-ossp`, `pgcrypto` (extensions only — pgcrypto is NOT used for token encryption; see CLAUDE.md non-negotiable).

## Supabase Client Surface

| File | Purpose | Notes |
|------|---------|-------|
| `lib/supabase/client.ts` | Browser client (`createClient()` via `createBrowserClient`) | Anon key only |
| `lib/supabase/server.ts` | Server client (`await createClient()` via `createServerClient` + `next/headers cookies()`) | `cookies()` is async (Next 16) |
| `lib/supabase/service.ts` | Service-role client (`createServiceClient()`) | BYPASSES RLS, no session persist, never expose to browser |

**Auth decisions** must use `getUser()` / `getClaims()` — never `getSession()` (CLAUDE.md non-negotiable).

## Auth Approach

- Supabase Auth (email/password — `app/(auth)/login`, signup route covered in proxy).
- Session refresh: `proxy.ts` (Next 16 Proxy, not Middleware) calls `supabase.auth.getUser()` on every non-public request.
- Public path allowlist: `/login`, `/signup`, `/oauth`, `/_next`, `/favicon.ico` (`proxy.ts:4`).
- Redirect flow: unauthenticated → `/login`; authenticated hitting `/login` or `/signup` → `/dashboard` (`proxy.ts:39-49`).
- Helpers: `lib/auth.ts` exports `requireUser()` and `requireUserWithAgencia()` for Server Components / Server Actions.
- Sign-out: server action `lib/actions/auth.ts:signOutAction`.

## Cron / Scheduler Approach

**Architecture (per CLAUDE.md + AGENTS.md):**
- Sync logic lives in `lib/meta-ads/sync.ts` — pure, scheduler-agnostic. Exports `syncMetaIntegracao(id)` and `syncTodasMeta()`.
- Three invocation paths share that core:
  1. **HTTP cron endpoint** `GET /api/cron/sync-meta` — `app/api/cron/sync-meta/route.ts`. Protected by `Bearer ${CRON_SECRET}`. `dynamic = "force-dynamic"`. Intended for Vercel Cron / Supabase pg_cron / Cloudflare Cron Triggers.
  2. **Local scheduler** `scripts/sync-scheduler.ts` (node-cron) — referenced in README but file not yet created in `scripts/` (empty dir at audit time).
  3. **Server Action** `app/(dashboard)/integracoes/meta/_actions.ts:sincronizar` — on-demand UI button.
- node-cron MUST NOT be wired into a route handler (would break in serverless).

## Unusual / Notable Versions

| Item | Why it matters |
|------|----------------|
| **Next 16.2.6** | Breaking changes vs Next 14/15. `middleware.ts` replaced by `proxy.ts` (root) exporting `proxy()`. `cookies()`, `headers()`, `params` are async. AGENTS.md mandates reading `node_modules/next/dist/docs/` before touching Next APIs. |
| **React 19.2.4** | New `use()` API, Actions, async transitions. Server Components default. |
| **Tailwind 4** | Config-less (no `tailwind.config.*`); CSS-first via `app/globals.css`. `components.json` `tailwind.config: ""` confirms. |
| **shadcn `base-nova` style** | Non-default registry style; `iconLibrary: "lucide"`, RSC enabled, TSX. Aliases: `@/components`, `@/lib`, `@/components/ui`, `@/hooks`, `@/lib/utils`. |
| **ESLint 9 flat config** | Uses `defineConfig` from `eslint/config` (new API). |
| **`@base-ui/react` 1.5** | Mui's Base UI v1.x — replaces Radix as primitive layer for shadcn `base-nova`. |
| **Recharts 3.x** | Major v3 — components must be Client Components (CLAUDE.md). |
| **`lucide-react` 1.16.0** | Note: appears low but matches v1 release line for current lucide. |
| **No test framework** | No jest/vitest/playwright in deps. No `*.test.ts` / `*.spec.ts` files found. |
| **No `.nvmrc`** | Node version pinned only via README ("Node 20+"). |

## Configuration

**Environment file:** `.env.example` (committed) + `.env.local` (gitignored, present).

**Required env vars** (grouped by purpose, from `.env.example` + code):

| Group | Var | Used in |
|-------|-----|---------|
| Supabase | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | `lib/supabase/*.ts` |
| App URL | `NEXT_PUBLIC_APP_URL` | `lib/meta-ads/api.ts:redirectUri()` |
| Crypto | `ENCRYPTION_KEY` (64 hex chars = 32 bytes) | `lib/crypto/tokens.ts` |
| OAuth state | `OAUTH_STATE_SECRET` | `lib/oauth/state.ts`, `lib/oauth/pending.ts` |
| Meta | `META_APP_ID`, `META_APP_SECRET`, `META_REDIRECT_URI`, `META_API_VERSION` (default `v21.0`) | `lib/meta-ads/api.ts` |
| AI | `AI_PROVIDER` (`ollama`/`groq`/`claude`), `OLLAMA_BASE_URL`, `OLLAMA_MODEL`, `GROQ_API_KEY`, `ANTHROPIC_API_KEY` | `lib/ai/` (directory empty — provider not yet wired) |
| Cron | `CRON_SECRET` | `app/api/cron/sync-meta/route.ts:12` |
| Google (per INTEGRACAO-GOOGLE.md) | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_ADS_DEVELOPER_TOKEN`, `GOOGLE_ADS_REDIRECT_URI` | Not yet implemented — guide only |

**Build config:**
- `next.config.ts` — Turbopack root only.
- `tsconfig.json` — `paths: { "@/*": ["./*"] }` enables absolute imports.
- No `vercel.json` detected at root.

## Platform Requirements

**Development:**
- Node 20+, npm.
- Supabase Cloud project (free tier ok).
- Meta for Developers app in Development mode + Tester role.
- Optional: Ollama running locally on `:11434` for AI features (provider plug not yet implemented).

**Production:**
- Vercel (deploy referenced in `INTEGRACAO-META.md:83` and `INTEGRACAO-GOOGLE.md:107`).
- Git auto-push hook (`.git/hooks/post-commit`) configured locally — not committed; repo public at `https://github.com/BetoPr/sistema-trafego`.

## Internationalization

- App locale fixed `pt-BR` (`app/layout.tsx:25`).
- Font: Google Poppins (weights 300-700), via `next/font/google`.
- Icons: Tabler Icons via CDN stylesheet (`app/layout.tsx:31`) + Lucide React for components.
- BR formatting (per CLAUDE.md): `Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })`, `date-fns` `ptBR` locale.

---

*Stack analysis: 2026-05-22*
