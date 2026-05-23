<!-- refreshed: 2026-05-22 -->
# Architecture

**Analysis Date:** 2026-05-22

## System Overview

`sistema-trafego` is a multi-tenant SaaS (Next.js 16 App Router + React 19 + Supabase Postgres) for advertising agencies to manage paid traffic across Meta Ads and Google Ads on behalf of multiple clients. Each agency (`agencia`) owns clients (`clientes`); each client owns OAuth integrations (`integracoes`) to ad platforms; the system periodically syncs campaign structure (campanhas → conjuntos → anuncios) and daily metrics into Postgres, then renders dashboards/reports/alerts on top of that data.

```text
┌──────────────────────────────────────────────────────────────────────┐
│                          Browser (React 19)                          │
│  Server Components (default) · "use client" only for hooks/Recharts  │
│  `app/(auth)/...`  `app/(dashboard)/...`  `components/...`           │
└──────────────────────┬───────────────────────────────────────────────┘
                       │ HTTP cookies (Supabase SSR session)
                       ▼
┌──────────────────────────────────────────────────────────────────────┐
│           Next 16 Proxy (CSRF/auth gate at the edge)                 │
│                         `proxy.ts`                                    │
│   - Refreshes Supabase session, redirects unauth → /login            │
└──────────────────────┬───────────────────────────────────────────────┘
                       ▼
┌──────────────────────────────────────────────────────────────────────┐
│                  Next 16 App Router (server side)                    │
│  ┌──────────────────┐  ┌────────────────────┐  ┌──────────────────┐ │
│  │ Server Components│  │  Server Actions    │  │ Route Handlers   │ │
│  │ `app/**/page.tsx`│  │ `"use server"` fns │  │ `app/api/**/`    │ │
│  └────────┬─────────┘  └─────────┬──────────┘  └────────┬─────────┘ │
└───────────┼──────────────────────┼──────────────────────┼───────────┘
            │                      │                      │
            ▼                      ▼                      ▼
┌──────────────────────────────────────────────────────────────────────┐
│                       Domain libs (`lib/`)                           │
│  auth.ts · platform.ts · supabase/{client,server,service}.ts         │
│  oauth/{state,pending}.ts · crypto/tokens.ts                         │
│  meta-ads/{api,sync}.ts                                              │
└──────────────────────┬─────────────────────────────────┬─────────────┘
                       │ anon + RLS                      │ service_role
                       ▼                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│  Supabase Postgres (multi-tenant, RLS por `agencia_id`)              │
│  agencias · usuarios · clientes · integracoes (bytea opaca)          │
│  campanhas · conjuntos · anuncios · metricas_diarias                 │
│  metas · alertas_regras · alertas_disparos · relatorios_gerados      │
└──────────────────────┬───────────────────────────────────────────────┘
                       │ (cross-tenant via service_role)
                       ▼
┌──────────────────────────────────────────────────────────────────────┐
│  External APIs    : Meta Marketing API (Graph v21)                   │
│  Background jobs  : scripts/sync-scheduler.ts (node-cron)            │
│                     /api/cron/sync-meta (Bearer CRON_SECRET)         │
└──────────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Proxy (Next 16 middleware replacement) | Refresh Supabase session, gate non-public routes, redirect logged-in users away from /login | `proxy.ts` |
| Root layout | HTML shell, fonts, Tabler icons CDN, `ThemeProvider`, Sonner toaster | `app/layout.tsx` |
| Auth layout / login | Email/password sign-in via server action | `app/(auth)/layout.tsx`, `app/(auth)/login/page.tsx`, `app/(auth)/login/actions.ts` |
| Dashboard layout | Loads user + agência + lista de plataformas conectadas; envolve em providers (Collapse, Platform), monta Sidebar/Topbar | `app/(dashboard)/layout.tsx` |
| Server auth helpers | `requireUser()` e `requireUserWithAgencia()` para todas as páginas server-side | `lib/auth.ts` |
| Supabase clients | Browser / Server (cookies) / Service role (bypass RLS) | `lib/supabase/{client,server,service}.ts` |
| OAuth state | Sign/verify HMAC state token com TTL para CSRF | `lib/oauth/state.ts` |
| OAuth pending | Cookie assinado guardando token criptografado + ad accounts entre callback e seleção de conta | `lib/oauth/pending.ts` |
| Token crypto | AES-256-GCM app-level encrypt/decrypt para `bytea` na tabela `integracoes` | `lib/crypto/tokens.ts` |
| Meta API client | Wrappers do Graph API (oauth, accounts, campaigns, adsets, ads, insights) | `lib/meta-ads/api.ts` |
| Meta sync engine | Função pura `syncMetaIntegracao(integracaoId)`: lê integração, decripta token, upsert estrutura + métricas, atualiza `ultima_sync` | `lib/meta-ads/sync.ts` |
| OAuth flow Meta — start | Inicia autorização: valida cliente, assina state, seta cookie, redireciona p/ Facebook | `app/oauth/meta/start/route.ts` |
| OAuth flow Meta — callback | Valida state, troca code → short → long-lived token, criptografa, lista ad accounts, guarda em cookie `meta_pending` | `app/oauth/meta/callback/route.ts` |
| Seleção de conta + persistência | Server actions consomem `meta_pending`, gravam em `integracoes` | `app/(dashboard)/integracoes/meta/contas/actions.ts` |
| Sync manual UI | Botão chama action que invoca `syncMetaIntegracao` e revalida rotas | `app/(dashboard)/integracoes/meta/_actions.ts`, `app/(dashboard)/integracoes/meta/_sync-btn.tsx` |
| Cron endpoint | `GET /api/cron/sync-meta` autenticado por `Bearer CRON_SECRET` chama `syncTodasMeta()` | `app/api/cron/sync-meta/route.ts` |
| Plataforma context | Provider client-side guarda plataforma ativa em localStorage; afeta widgets do dashboard | `components/providers/PlatformProvider.tsx`, `lib/platform.ts` |
| UI primitives (shadcn) | Card, Button, Input, Dialog, etc. via Tailwind v4 + class-variance-authority | `components/ui/*` |

## Pattern Overview

**Overall:** Next.js 16 App Router monolith — Server-first React (RSC) com server actions para mutações, route handlers para webhooks/cron/OAuth, e um domínio de libs puras em `lib/` que falam direto com Supabase e APIs externas. Multi-tenant fornecido pelo banco (RLS por `agencia_id`).

**Key Characteristics:**
- Server Components por padrão; `"use client"` é exceção (forms interativos, Recharts, providers de contexto, wizards OAuth).
- Mutações fazem-se **sempre por Server Actions** (`"use server"`), nunca por route handlers customizados — handlers ficam reservados a OAuth (callback Facebook), cron e webhooks externos.
- Validação com `zod` em toda server action que aceita `FormData`.
- Supabase como única fonte de auth + dados; RLS é a fronteira primária de segurança multi-tenant.
- App-level AES-256-GCM para tokens OAuth (não pgcrypto), porque pool de conexões do Supabase quebra `pgp_sym_decrypt` confiável.
- Background jobs separados da request lifecycle (lib pura + cron endpoint + scheduler script).

## Layers

**Edge / Proxy layer:**
- Purpose: refrescar sessão Supabase em cada navegação, decidir redirects de auth.
- Location: `proxy.ts`
- Contains: função exportada `proxy` + `config.matcher`
- Depends on: `@supabase/ssr`
- Used by: Next 16 runtime (substitui o `middleware.ts` do Next 14/15)

**Presentation (Server Components + Client Components):**
- Purpose: renderizar UI, formular intents do usuário.
- Location: `app/**`, `components/**`
- Contains: páginas (`page.tsx`), layouts, forms interativos (`_form.tsx`, `_wizard.tsx`), gráficos Recharts (sempre `"use client"`)
- Depends on: `lib/auth`, providers em `components/providers`, primitives em `components/ui`
- Used by: navegador

**Server Actions (mutations):**
- Purpose: única forma de gravar dados a partir da UI.
- Location: `app/**/actions.ts`, `app/**/_actions.ts`, `lib/actions/*.ts`
- Contains: funções assíncronas com `"use server"` no topo, validadas por zod, retornam `state` ou `redirect`.
- Depends on: `lib/auth.ts`, `lib/supabase/server.ts`, libs de domínio
- Used by: forms client-side via `useActionState`

**Route handlers (OAuth, cron, webhooks):**
- Purpose: fronteira HTTP para integrações externas e schedulers.
- Location: `app/oauth/**/route.ts`, `app/api/**/route.ts`
- Contains: `export async function GET/POST(req: NextRequest)`
- Depends on: libs de domínio
- Used by: navegador (callback OAuth via redirect), cron externo, webhooks

**Domain libs:**
- Purpose: lógica reutilizável e testável fora do request lifecycle.
- Location: `lib/**`
- Contains: clientes Supabase, helpers de auth, cripto, OAuth state, integrações de plataforma
- Depends on: `node:crypto`, `@supabase/*`, fetch nativo
- Used by: route handlers, server actions, server components, scripts

**Data layer:**
- Purpose: persistência multi-tenant com RLS.
- Location: `supabase/migrations/*.sql`
- Contains: schema, índices, triggers, view de KPIs, policies por `agencia_id`
- Used by: tudo via Supabase clients

## Data Flow

### Primary Request Path — usuário navegando

1. Request chega → `proxy.ts` (`proxy()`) refresca sessão Supabase e checa `getUser()`.
2. Se não autenticado e rota não-pública → redirect `/login`.
3. Caso contrário → `app/(dashboard)/layout.tsx:9-48` chama `requireUserWithAgencia()` (`lib/auth.ts:14`), carrega usuário + agência + plataformas conectadas, envolve children em `CollapseProvider` + `PlatformProvider`.
4. `app/(dashboard)/<rota>/page.tsx` (server component) consulta Supabase (RLS filtra por agência automaticamente).
5. Render HTML + hidratação client onde houver `"use client"`.

### OAuth Connect Flow (Meta Ads)

1. Usuário em `/integracoes/meta` (`app/(dashboard)/integracoes/meta/page.tsx`) clica "Conectar" → `GET /oauth/meta/start?cliente_id=...` (`app/oauth/meta/start/route.ts:7`).
2. `start` valida usuário + cliente, assina state HMAC (`lib/oauth/state.ts:27`), grava cookie `oauth_state_meta` (HttpOnly, SameSite=Lax, 300s) e redireciona para Facebook.
3. Facebook redireciona de volta para `/oauth/meta/callback?code=...&state=...` (`app/oauth/meta/callback/route.ts:21`).
4. Callback compara state cookie ↔ query, valida assinatura/TTL (`verifyState`), confirma `user.id == statePayload.user_id`, confirma cliente pertence à agência.
5. Troca `code` por short-lived token e depois long-lived (~60d) via `exchangeCodeForToken` + `exchangeForLongLivedToken` (`lib/meta-ads/api.ts`).
6. Lista ad accounts do usuário Meta (`listAdAccounts`).
7. Criptografa token com `encryptToken` (AES-256-GCM, `lib/crypto/tokens.ts:18`), grava cookie `meta_pending` assinado (`lib/oauth/pending.ts:37`) com token + lista de contas, TTL 10min.
8. Redireciona para `/integracoes/meta/contas`. Usuário escolhe a conta no form.
9. Server action `salvarContaSelecionada` (`app/(dashboard)/integracoes/meta/contas/actions.ts:9`) verifica pending, faz `upsert` em `integracoes` com `access_token_encrypted` bytea + `agencia_id` + `cliente_id`, limpa cookie pending, redireciona.

### Sync Flow (Meta Ads)

1. Trigger: (a) usuário clica "Sincronizar" → server action `sincronizar` (`app/(dashboard)/integracoes/meta/_actions.ts:8`), ou (b) cron bate em `GET /api/cron/sync-meta` com `Authorization: Bearer $CRON_SECRET` (`app/api/cron/sync-meta/route.ts:11`), ou (c) `scripts/sync-scheduler.ts` (node-cron) chama a mesma lib.
2. `syncMetaIntegracao(integracaoId)` (`lib/meta-ads/sync.ts:70`) instancia **service_role client** (bypass RLS — necessário no cron cross-tenant).
3. Lê `integracoes` row, decripta `access_token_encrypted` via `decryptToken`.
4. Fetch sequencial Meta Graph: `listCampaigns` → `listAdSets` → `listAds` → `listDailyInsights("last_7d")`.
5. Upsert em batches: `campanhas` (onConflict `integracao_id,external_id`), `conjuntos`, `anuncios`, `metricas_diarias` (batch 200, onConflict `anuncio_id,data`).
6. Atualiza `integracoes.ultima_sync` + `status='ativa'`, ou registra `status='erro'` + `erro_ultima_sync` em catch.
7. Server action chama `revalidatePath` em `/integracoes/meta`, `/dashboard`, `/campanhas`, `/criativos`.

**State Management:**
- Sessão de auth: cookies HttpOnly geridos pelo `@supabase/ssr`, refrescados no proxy.
- Plataforma ativa: `localStorage["mk-platform-ativa"]` + React Context (`components/providers/PlatformProvider.tsx`).
- Sidebar collapsed: Context client-only em `CollapseProvider`.
- Tema: `next-themes` via `ThemeProvider`.

## Key Abstractions

**Tenant (`agencia`):**
- Purpose: unidade de billing/isolamento — uma agência de tráfego.
- Examples: `supabase/migrations/20260520120000_schema_inicial.sql:27-34`
- Pattern: toda tabela transacional carrega `agencia_id` e tem RLS `agencia_id = auth_agencia_id()`.

**Cliente:**
- Purpose: marca/anunciante atendido pela agência. Suporta soft delete via `deleted_at`.
- Examples: `app/(dashboard)/clientes/actions.ts:26-67`
- Pattern: queries SEMPRE filtram `deleted_at is null` (ver índice parcial `idx_clientes_agencia`).

**Integração:**
- Purpose: conexão OAuth de um cliente para uma plataforma (`meta_ads`, `google_ads`, `ga4`).
- Examples: `lib/meta-ads/sync.ts:70-113`
- Pattern: `account_id` é unique por `(cliente_id, plataforma)`; tokens em `bytea` opaco; status enum (`ativa|expirada|erro|pausada`).

**Plataforma:**
- Purpose: enum tipado de plataformas suportadas (presentation).
- Examples: `lib/platform.ts:1`
- Pattern: tipo união `"meta_ads" | "google_ads"` + tabela de metadados (`PLATFORMS`).

**Server Action:**
- Purpose: mutação confiável a partir da UI.
- Examples: `app/(auth)/login/actions.ts`, `app/(dashboard)/clientes/actions.ts`, `app/(dashboard)/integracoes/meta/_actions.ts`
- Pattern: `"use server"` no topo, valida com zod, autentica com `requireUserWithAgencia()`, faz mutation, `revalidatePath`, `redirect`.

## Entry Points

**Proxy:**
- Location: `proxy.ts`
- Triggers: toda request que casa o matcher `((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)`
- Responsibilities: refrescar sessão Supabase, redirects de auth.

**Root page:**
- Location: `app/page.tsx`
- Triggers: GET `/`
- Responsibilities: redirect para `/dashboard` (logged) ou `/login` (anônimo).

**Auth routes:**
- Location: `app/(auth)/login/page.tsx`
- Triggers: GET `/login`
- Responsibilities: form + server action de login.

**Dashboard routes:**
- Location: `app/(dashboard)/<feature>/page.tsx`
- Triggers: GET `/<feature>` (dashboard, clientes, campanhas, integracoes, criativos, funil, alertas, ia-insights, plano, publico, relatorios, configuracoes)
- Responsibilities: render server components, mutações via co-located `actions.ts`/`_actions.ts`.

**OAuth route handlers:**
- Location: `app/oauth/meta/start/route.ts`, `app/oauth/meta/callback/route.ts`
- Triggers: navegação do navegador (start) e redirect do Facebook (callback).

**Cron endpoint:**
- Location: `app/api/cron/sync-meta/route.ts`
- Triggers: chamadas externas autenticadas via `Authorization: Bearer $CRON_SECRET`.

## Architectural Constraints

- **Next 16 specifics:** middleware é `proxy.ts` (raiz) com export `proxy()`, **não** `middleware.ts`. `cookies()`, `headers()` e `params` são async — sempre `await`.
- **Recharts:** componentes que importam Recharts **devem ter `"use client"`** no topo. Recharts não renderiza em RSC.
- **Token crypto sempre app-level:** AES-256-GCM via `lib/crypto/tokens.ts`. **Nunca** usar `pgp_sym_encrypt/decrypt` no Postgres (pool de conexões Supabase quebra).
- **Cron desacoplado:** `node-cron` vive em `scripts/sync-scheduler.ts` (processo separado). Lógica de sync mora em `lib/meta-ads/sync.ts` (pura). Rotas `/api/cron/*` invocam a mesma lib. **Não acoplar node-cron a route handlers** (serverless vai matar).
- **Multi-tenant:** toda tabela transacional carrega `agencia_id` obrigatório. RLS habilitada em todas. Helper `auth_agencia_id()` em SQL faz join com `usuarios`.
- **Service role only server-side:** `lib/supabase/service.ts` BYPASSA RLS — proibido importar em qualquer arquivo que rode no browser.
- **Authorization checks:** usar `getUser()`/`getClaims()`, **nunca** `getSession()` para decisões de acesso (session pode estar stale).
- **Soft delete:** `clientes.deleted_at` é a coluna canônica; toda query lista filtra `deleted_at is null`.
- **OAuth state TTL:** 300s para `oauth_state_meta`, 600s para `meta_pending` — verificar antes de aceitar callback/seleção.
- **Schema search_path:** função `auth_agencia_id()` é `security definer` com `set search_path = public, pg_temp` para evitar injection via schema.
- **Threading:** Node.js single-process; sync engine sequencial (loop em `syncTodasMeta` espera cada integração). Sem worker threads explícitos.
- **Global state:** nenhum singleton mutável no app code; providers React (Context) só guardam estado de UI.

## Anti-Patterns

### Token criptografado no banco (pgcrypto)

**What happens:** Tentar usar `pgp_sym_encrypt(token, secret)` / `pgp_sym_decrypt` em colunas de `integracoes`.
**Why it's wrong:** O pool de conexões do Supabase reusa conexões com `search_path`/state diferentes; `pgp_sym_decrypt` quebra intermitentemente. Além disso, expõe segredo no SQL/logs.
**Do this instead:** `encryptToken(plaintext)` / `decryptToken(buffer)` em `lib/crypto/tokens.ts:18` — chave AES vem de `ENCRYPTION_KEY` (64 hex chars), gravar `bytea` opaco no banco.

### Middleware no padrão antigo

**What happens:** Criar `middleware.ts` com `export function middleware(...)`.
**Why it's wrong:** Next 16 renomeou para Proxy — `middleware.ts` é ignorado.
**Do this instead:** Arquivo `proxy.ts` na raiz exportando `export async function proxy(request)` + `export const config`. Ver `proxy.ts`.

### Service role no browser

**What happens:** Importar `createServiceClient` em arquivo client component ou expor `SUPABASE_SERVICE_ROLE_KEY` no bundle público.
**Why it's wrong:** Service role bypassa RLS — qualquer agência leria dados de outra. Vazamento = comprometimento total do multi-tenancy.
**Do this instead:** Service role só em `scripts/`, `lib/meta-ads/sync.ts` (cross-tenant) e route handlers `/api/cron/*`. Server components/actions usam `lib/supabase/server.ts` (anon + RLS).

### Autorização via `getSession()`

**What happens:** `const { data: { session } } = await supabase.auth.getSession(); if (session) { ... }`.
**Why it's wrong:** `getSession()` lê cookie local sem validar com auth server — usuário pode estar revogado mas a sessão ainda parece válida.
**Do this instead:** `getUser()` (vai ao auth server) ou `getClaims()` (valida JWT). Ver pattern em `proxy.ts:35`, `lib/auth.ts:7`.

### Cron em route handler

**What happens:** `node-cron`.schedule(...) dentro de `app/api/.../route.ts`.
**Why it's wrong:** Route handlers são serverless/efêmeros — o scheduler morre quando a função termina.
**Do this instead:** Scheduler num processo dedicado (`scripts/sync-scheduler.ts` rodando localmente, ou pg_cron/Cloudflare Cron Triggers em produção) que chama a lib pura ou hits o endpoint `/api/cron/sync-meta` autenticado.

### Skipar verify de state OAuth

**What happens:** Aceitar `code` do callback sem comparar state cookie ↔ query e validar assinatura HMAC + TTL.
**Why it's wrong:** Abre CSRF + token replay.
**Do this instead:** Sempre `verifyState(stateParam)` + cookie match. Ver `app/oauth/meta/callback/route.ts:36-48`.

## Error Handling

**Strategy:** Erros nunca lançam ao usuário cru — são convertidos em UI redirects com query params (`?erro=...&msg=...`) ou retornam state em server actions (`{ error: "..." }`). Erros de sync persistem em `integracoes.erro_ultima_sync` + `status='erro'` para auditoria posterior.

**Patterns:**
- Server actions retornam `{ error, fieldErrors? }` para forms (consumido por `useActionState`) — ver `app/(auth)/login/actions.ts:20-22`, `app/(dashboard)/clientes/actions.ts:31-35`.
- OAuth callback usa `errorRedirect(req, code, msg)` para todos os erros → `/integracoes/meta?erro=<code>&msg=<short>` (`app/oauth/meta/callback/route.ts:14`).
- Mensagens visíveis ao usuário em PT-BR; logs e códigos internos em EN ok.
- `try/catch` granular ao redor de chamadas externas (Meta API): falha de insights **não bloqueia** sync da estrutura — apenas `console.warn` (`lib/meta-ads/sync.ts:217-223`).
- Falha total da sync atualiza row `integracoes` com `status='erro'` antes de retornar `SyncResult { ok:false, erro:msg }` — ver `lib/meta-ads/sync.ts:283-298`.

## Cross-Cutting Concerns

**Logging:** `console.warn`/`console.error` ad-hoc. Não há framework de logging estruturado. Erros de sync persistem em DB (`integracoes.erro_ultima_sync`).

**Validation:** `zod` em todas as server actions que recebem `FormData` (`z.object({...}).safeParse(...)`). Schema-first; mensagens em PT-BR. Ver `app/(dashboard)/clientes/actions.ts:8-11`, `app/(dashboard)/configuracoes/actions.ts:9-14`.

**Authentication:** Supabase Auth (email/password) via `@supabase/ssr`. Cookies HttpOnly geridos pelo SSR helper. `proxy.ts` força `getUser()` em cada request.

**Authorization (multi-tenant):**
1. **App-level:** `requireUserWithAgencia()` resolve `usuario` → `agencia_id`, usado em queries explícitas (`actions.ts`).
2. **DB-level:** RLS policies `agencia_id = auth_agencia_id()` em todas as tabelas — defesa em profundidade caso o app esqueça de filtrar.
3. **Service role** ignora RLS — usar só onde for cross-tenant intencional (cron, scripts).

**Formatação BR:**
- Moeda: `Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })`.
- Datas: `date-fns` + `ptBR` locale.

**Theming:** `next-themes` + Tailwind v4. CSS vars `--mk-*` no `globals.css` para paleta customizada.

---

*Architecture analysis: 2026-05-22*
