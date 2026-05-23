# Testing Patterns

**Analysis Date:** 2026-05-22

## Honest Snapshot

**There is no automated test suite for the application code.**

- No `*.test.ts` / `*.spec.ts` files exist under `app/`, `lib/`, `components/`, or `scripts/`.
- No test runner is installed: `package.json` has no `vitest`, `jest`, `playwright`, `@testing-library/*`, or `cypress` in `dependencies` or `devDependencies`.
- No `test` script in `package.json` (`scripts` are only `dev`, `build`, `start`, `lint`).
- Verification only exists at two layers: **TypeScript strict** (compile-time) + **ESLint** (`npm run lint`) + **manual smoke testing** (per `GUIA-MANUAL.md`).

If a phase needs guaranteed regression coverage, testing infrastructure has to be added first — there is nothing to extend.

## What Does Exist

### 1. SQL RLS isolation test

- **File:** `supabase/tests/rls_isolation.sql`
- **Purpose:** Validates that Row-Level Security policies prevent agency A from reading agency B's clients.
- **Mechanism:** Transactional block — inserts a second `agencias` row + a client in each agency, switches role to `authenticated` with a fake JWT claim, counts rows visible, then `rollback` to discard mocks.
- **How to run:** Paste into the Supabase SQL Editor (or `psql` against the project DB). It's not wired into any CI or script — has to be invoked manually.

### 2. TypeScript strict mode

- `tsconfig.json` → `"strict": true`. Build (`npm run build`) and IDE will flag type errors; this is the primary "test" today.

### 3. ESLint

- `eslint.config.mjs` extends `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript`.
- Run: `npm run lint`.

### 4. Manual setup / smoke checklist

- **File:** `GUIA-MANUAL.md` at the repo root.
- Covers: setup steps that MCP couldn't automate (copying `SUPABASE_SERVICE_ROLE_KEY`, creating the first Supabase Auth user + `usuarios` row, Meta App creation), then a `npm run dev` smoke check.
- It is **setup documentation**, not a recurring manual-test plan. There is no documented manual regression script for new builds.

## Run Commands

```bash
npm run lint    # ESLint — only automated check today
npm run build   # next build — exercises TypeScript strict + Next compilation
npm run dev     # local smoke test (next dev)
```

No `npm test` exists. Adding one would require choosing and installing a runner first.

## Test File Organization (recommended convention if/when added)

There is no current convention to follow because no tests exist. If tests are introduced, sensible defaults given this stack would be:

- **Unit / integration:** co-located `*.test.ts` next to the module (`lib/crypto/tokens.test.ts`, `lib/oauth/state.test.ts`).
- **Route handler tests:** mock `next/headers` + `@supabase/ssr`; assert response shape.
- **E2E:** `e2e/` directory at the repo root with Playwright specs.

This is a recommendation only — pick the convention when the first test is added and document it here.

## Coverage State

**None.** No coverage tool, no targets, no reports.

## Recommendations (Pure-function priorities)

The lowest-friction wins — pure logic that already lives in isolation:

1. **`lib/crypto/tokens.ts`** — `encryptToken` / `decryptToken` round-trip + bad-key + tampered-blob failure cases. AES-GCM correctness is load-bearing for the entire OAuth integration model.
2. **`lib/oauth/state.ts`** — `signState` / `verifyState`: valid roundtrip, expired payload rejected, tampered signature rejected, malformed token rejected.
3. **`lib/oauth/pending.ts`** — same shape as `state.ts`; mirror its tests.
4. **`lib/meta-ads/sync.ts` helpers** — pull `actionsToMap`, `sumConversions`, `sumLeads`, `sumEngajamento`, `reaisFromCents` into a tested module; they are pure and easy to lock down.

These four files together represent the highest-risk surface (crypto + CSRF + money math) and have zero external dependencies, so a single runner (`vitest` is the lightest fit for this stack) would cover them in a few hours.

Defer for later (require fixtures / Supabase mocking): server actions, route handlers, OAuth callback flow, RSC pages. The existing SQL RLS test plus the manual `GUIA-MANUAL.md` walkthrough is the current safety net for those layers.

## What NOT to do

- Do not invent a fake "Testing Framework" section listing tools that are not installed. There are none.
- Do not couple any future tests to `node-cron` (same rule as runtime code).
- Do not store the `ENCRYPTION_KEY` or `OAUTH_STATE_SECRET` in test fixtures — generate per-test keys via `crypto.randomBytes(32).toString("hex")`.

---

*Testing analysis: 2026-05-22*
