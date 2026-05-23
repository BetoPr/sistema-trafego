# Coding Conventions

**Analysis Date:** 2026-05-22

Source of truth: `CLAUDE.md` (repo root) + `AGENTS.md` + observed patterns in `lib/` and `app/`. Conventions below are prescriptive — follow them when writing new code.

## Language & Tooling

- **TypeScript strict** (`tsconfig.json`: `"strict": true`, `target: ES2017`, `module: esnext`, `moduleResolution: bundler`).
- **ESLint** flat config — `eslint.config.mjs` extends `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript`. Run: `npm run lint`.
- **No Prettier config** in repo. Default formatting comes from editor; ESLint enforces lint rules only.
- **No Biome/Husky/lint-staged.** No pre-commit lint hook (only the auto-push hook in `.git/hooks/post-commit`).

## Import Style

- **Absolute imports only** via the `@/*` alias mapped to the project root (`tsconfig.json` `paths`).
  - `import { createClient } from "@/lib/supabase/server";`
  - `import { requireUserWithAgencia } from "@/lib/auth";`
  - `import { Toaster } from "@/components/ui/sonner";`
- **Do not use relative imports across modules** (`../../lib/...`). Sibling relative imports inside the same feature are acceptable (`./actions`, `./_components/X`).
- **Import groups (observed order):** 1) `node:*` builtins, 2) framework (`next/*`, `react`), 3) third-party packages, 4) `@/lib/*`, 5) `@/components/*`, 6) sibling relatives. Blank line between groups is not enforced.
- **Type-only imports:** use `import type { Plataforma } from "@/lib/platform"` for type-only references.

## Server vs Client Components

- **Server Components are the default.** Pages under `app/(dashboard)/**/page.tsx` are async server components that call `await requireUserWithAgencia()` (see `app/(dashboard)/clientes/page.tsx`, `app/(dashboard)/dashboard/page.tsx`).
- **Add `"use client"` only when needed:**
  - React hooks (`useState`, `useEffect`, `useActionState`, `useContext`)
  - Event handlers / `onClick`
  - Browser APIs (`localStorage`, `window`)
  - `next-themes`, `usePathname`, providers
  - **Recharts** components (Recharts does not run in RSC — see "Recharts gotcha" below)
- **Server Actions:** files annotated with `"use server"` at the top (`lib/actions/auth.ts`, `app/(dashboard)/clientes/actions.ts`). Actions are awaited from `<form action={...}>` or `useActionState`.

## Route Handlers

- File: `app/**/route.ts` exporting `GET`, `POST`, etc.
- Return `NextResponse.json({...}, { status })` (see `app/api/cron/sync-meta/route.ts`).
- For OAuth callbacks that need to redirect, return `NextResponse.redirect(new URL("/path", req.url))`.
- For cron / dynamic endpoints, set `export const dynamic = "force-dynamic";`.
- **Error responses** are JSON in PT-BR for user-facing errors; English keys for code paths (`{ error: "cliente_id obrigatório" }`).

## Naming

- **Files:**
  - Server components / pages: `page.tsx` (Next convention).
  - Layouts: `layout.tsx`. Route handlers: `route.ts`.
  - Server actions: `actions.ts` (co-located with the route segment) or `lib/actions/<area>.ts`.
  - Private route-segment components: `_components/PascalCase.tsx` or `_form.tsx` (leading underscore opts them out of routing).
  - React components: **PascalCase** (`AppSidebar.tsx`, `NovoClienteForm`, `DashboardEmptyMetrics`).
  - Library modules: **kebab-case directories**, **camelCase or kebab files** (`lib/meta-ads/sync.ts`, `lib/crypto/tokens.ts`, `lib/oauth/state.ts`).
- **Functions/vars:** `camelCase`. Server actions end in `Action` (`criarClienteAction`, `excluirClienteAction`, `signOutAction`).
- **Types/interfaces:** `PascalCase` (`OAuthStatePayload`, `MetaAdAccount`, `ClienteFormState`, `Plataforma`).
- **Constants:** `SCREAMING_SNAKE_CASE` for module-level constants (`PUBLIC_PATHS`, `STATE_TTL_MS`, `PLATFORMS`, `SECTIONS`).
- **DB columns: `snake_case`** (`agencia_id`, `cliente_id`, `deleted_at`, `access_token_encrypted`, `ultima_sync`, `erro_ultima_sync`, `data_inicio`).
- **DB tables: `snake_case` plural pt-BR** (`agencias`, `clientes`, `usuarios`, `integracoes`, `campanhas`, `conjuntos`, `anuncios`, `metricas_diarias`).
- **DB enum-like statuses:** lowercase pt-BR strings (`"ativo"`, `"ativa"`, `"erro"`, `"meta_ads"`, `"google_ads"`).
- **Domain language is Portuguese** in code: `cliente`, `agencia`, `usuario`, `campanha`, `conjunto`, `anuncio`, `criativo`, `relatorio`, `integracao`. Keep code and DB consistent — do not mix English domain terms.

## Supabase Client Usage (HARD RULES)

Three clients, three contexts. **Never cross-use.**

| Context | File | Function | Notes |
|---------|------|----------|-------|
| Browser | `lib/supabase/client.ts` | `createClient()` | `createBrowserClient` from `@supabase/ssr`. Synchronous. |
| Server (RSC, route handlers, server actions) | `lib/supabase/server.ts` | `await createClient()` | **Async** — calls `await cookies()` internally. |
| Service role (scripts, cron, webhooks) | `lib/supabase/service.ts` | `createServiceClient()` | **BYPASSES RLS.** Never import in browser code. |

- Server client uses anon key + user cookies → RLS enforced.
- Service client uses `SUPABASE_SERVICE_ROLE_KEY` → cross-tenant. Used by `lib/meta-ads/sync.ts`, cron routes.

## Auth Pattern

- **Always** `getUser()` or `getClaims()` for authz decisions. **Never** `getSession()` (forbidden — session is unverified cookie state).
- **Standard guard for pages/actions:** `requireUser()` or `requireUserWithAgencia()` from `lib/auth.ts`. Both redirect to `/login` on failure and return `{ supabase, user[, usuario] }`.
- **Proxy (middleware) refresh:** `proxy.ts` calls `supabase.auth.getUser()` on every request to refresh session cookies and gate non-public paths. Do not remove the `getUser()` call from the proxy.
- **OAuth flows** double-check ownership: callback in `app/oauth/meta/callback/route.ts` re-verifies `user.id === statePayload.user_id` and that `cliente.agencia_id === usuario.agencia_id` even though RLS would already enforce it.

## Multi-Tenant Convention

- **Every transactional row carries `agencia_id`.** When inserting/upserting from the app, set it explicitly:
  ```ts
  await supabase.from("clientes").insert({
    agencia_id: usuario.agencia_id,
    nome: parsed.data.nome,
    slug,
    // ...
  });
  ```
- **RLS** policy on every table: `agencia_id = auth_agencia_id()`. Migration: `supabase/migrations/20260520120000_schema_inicial.sql`.
- **Cross-tenant code** (cron sync, scripts) uses the **service role** client and reads `agencia_id` from the row, never from the calling user.

## Soft Delete Convention

- **`deleted_at timestamptz` is the canonical soft-delete column** (see `clientes.deleted_at`).
- **Lists and pickers must filter:** `.is("deleted_at", null)` (see `app/(dashboard)/clientes/page.tsx:11`, `app/oauth/meta/callback/route.ts:73`).
- **Delete** = `update({ deleted_at: new Date().toISOString() })`, never `DELETE` from app code (see `excluirClienteAction` in `app/(dashboard)/clientes/actions.ts:73`).

## Error Handling

- **User-facing errors are in Portuguese.** They flow back through:
  - Server action return shape: `{ error?: string; fieldErrors?: Record<string, string> }` (see `ClienteFormState` in `app/(dashboard)/clientes/actions.ts`).
  - Route handler JSON: `NextResponse.json({ error: "cliente_id obrigatório" }, { status: 400 })`.
  - OAuth flows: redirect to `/integracoes/meta?erro=<code>&msg=<short>` (see `errorRedirect` in `app/oauth/meta/callback/route.ts:14`).
- **Server-side logs can be English** (`console.warn`, structured logs).
- **Pattern for fallible async work:** wrap in `try/catch`, surface user-friendly PT-BR message, persist diagnostic detail to DB (`erro_ultima_sync` column on `integracoes`).
- **Validation:** Zod schemas at action entry points (`ClienteSchema` in `actions.ts`). Convert `parsed.error.issues` into `fieldErrors` keyed by `issue.path.join(".")`.

## Formatting BR

- **Currency:** `new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)`.
- **Dates:** `date-fns` with `import { ptBR } from "date-fns/locale";` and `format(d, "dd/MM/yyyy", { locale: ptBR })`. The dependency is installed (`date-fns ^4.2.1`) but not yet used in source — apply it when rendering dates.
- **Numbers:** decimal `,`, thousand `.` (handled by `Intl`).
- **HTML lang:** `<html lang="pt-BR">` in `app/layout.tsx`.

## OAuth State Convention (CSRF)

- **Always** sign with `signState({ cliente_id, user_id })` and verify with `verifyState(token)` from `lib/oauth/state.ts`.
- Format: `b64url(payload).b64url(hmac_sha256)` with `OAUTH_STATE_SECRET`. TTL is 5 min, embedded in `payload.expires_at`.
- **Cookie name pattern:** `oauth_state_<provider>` (e.g. `oauth_state_meta`).
- **Cookie attributes:** `httpOnly: true, secure: NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 300`.
- **Verify both** the cookie value matches the query `state` param **and** the HMAC signature (see `app/oauth/meta/callback/route.ts:38-48`).
- **Never skip state verification.** Same pattern applies to the pending-connection cookie via `signPending`/`verifyPending` in `lib/oauth/pending.ts`.

## Crypto Convention (OAuth tokens)

- **App-level AES-256-GCM only**, via `encryptToken` / `decryptToken` in `lib/crypto/tokens.ts`. Key from `ENCRYPTION_KEY` (64 hex chars = 32 bytes).
- Blob layout: `[12-byte IV][16-byte auth tag][ciphertext]`. Store the raw `Buffer` as `bytea` in `integracoes.access_token_encrypted` and `refresh_token_encrypted`.
- **NEVER** use `pgp_sym_encrypt` / `pgp_sym_decrypt` in Postgres — Supabase connection pooling breaks pgcrypto session keys.
- When passing through cookies (pending flow), serialize the encrypted blob as base64 (see `accessTokenB64` in `app/oauth/meta/callback/route.ts:104`).

## Recharts Gotcha

- **Recharts components must be Client Components.** Add `"use client"` at the top of any file importing from `recharts`. Recharts uses `ResizeObserver` and refs that do not work in RSC.
- No Recharts components exist yet in `app/` or `components/` — first chart component must follow this rule.

## Next 16 Gotchas

- **Middleware is now "Proxy".** File is `proxy.ts` at the **repo root** (not `middleware.ts`), exports an async function named `proxy` plus a `config` object with `matcher`. See `proxy.ts`.
- **`cookies()` is async.** `const cookieStore = await cookies();` — applies to `headers()` and `params` too. All server-side Supabase clients in this repo already do this.
- **`params` in route handlers / pages is async** in Next 16 — `await params` before destructuring when used.
- Before editing any Next API surface, consult `node_modules/next/dist/docs/` (training data predates Next 16).

## Logging

- **No structured logger configured.** Code uses plain `console.warn` / `console.error` for non-blocking failures (`lib/meta-ads/sync.ts:222`).
- For user-impacting errors that need persistence, write to `integracoes.erro_ultima_sync` (or analogous column) instead of just logging.

## Comments

- **JSDoc on exported lib functions** when behavior is non-obvious or there is a hard rule (`lib/supabase/service.ts`, `lib/meta-ads/sync.ts`, `lib/meta-ads/api.ts`).
- **Inline comments in PT-BR** for business logic explanations (e.g. `// Confirma cliente pertence à mesma agência (RLS já garante, mas explícito)`).
- Avoid restating what code already shows — comment the *why* (especially safety / security rationale).

## Forms & Validation

- **Server Actions + `useActionState`** for forms (see `app/(dashboard)/clientes/novo/_form.tsx`).
- **Zod** for schema validation at the action boundary.
- Action returns `{ error?, fieldErrors? } | undefined`. Render `fieldErrors[name]` inline below each input.
- Pass FormData explicitly; use `Object.fromEntries(formData.entries())` then `safeParse`.

## What NEVER to do

- Commit `.env.local` or any key.
- Use `service_role` in browser code.
- Authorize with `getSession()`.
- Couple `node-cron` to a route handler — keep sync logic pure in `lib/meta-ads/sync.ts`, wire schedulers in `scripts/sync-scheduler.ts` or external cron hitting `/api/cron/*`.
- Use `pgp_sym_encrypt` for tokens.
- Skip OAuth state verification.
- Disable the post-commit auto-push hook.
- Create `middleware.ts` (it's `proxy.ts` now).

---

*Convention analysis: 2026-05-22*
