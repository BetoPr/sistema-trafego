# Codebase Structure

**Analysis Date:** 2026-05-22

## Directory Layout

```text
sistema-trafego/
├── proxy.ts                          # Next 16 Proxy (substitui middleware.ts) — auth gate
├── next.config.ts                    # Config Next 16 (turbopack root)
├── tsconfig.json                     # Path alias `@/*` → projeto root
├── eslint.config.mjs                 # eslint-config-next (vitals + ts)
├── postcss.config.mjs                # PostCSS p/ Tailwind v4
├── package.json                      # Next 16.2.6 · React 19.2 · @supabase/ssr · node-cron
├── components.json                   # shadcn config
├── README.md · GUIA-MANUAL.md · INTEGRACAO-META.md · INTEGRACAO-GOOGLE.md
├── AGENTS.md                         # "This is NOT the Next.js you know" — diretriz raiz
├── CLAUDE.md                         # Regras não-negociáveis (proxy/crypto/RLS/cron)
│
├── app/                              # Next 16 App Router (Server Components default)
│   ├── layout.tsx                    # Root layout: fonts, ThemeProvider, Sonner
│   ├── page.tsx                      # `/` → redirect login/dashboard
│   ├── globals.css                   # Tailwind v4 + design tokens `--mk-*`
│   ├── favicon.ico
│   ├── (auth)/                       # Route group para páginas anônimas
│   │   ├── layout.tsx
│   │   └── login/
│   │       ├── page.tsx              # "use client" — form com useActionState
│   │       └── actions.ts            # "use server" — loginAction
│   ├── (dashboard)/                  # Route group autenticado (layout traz Sidebar/Topbar)
│   │   ├── layout.tsx                # requireUserWithAgencia + providers
│   │   ├── dashboard/                # Visão geral
│   │   │   ├── page.tsx
│   │   │   └── _components/          # Privados da rota (DashboardEmptyMetrics)
│   │   ├── clientes/
│   │   │   ├── page.tsx
│   │   │   ├── actions.ts            # criar/excluir cliente (server actions)
│   │   │   └── novo/
│   │   │       ├── page.tsx
│   │   │       └── _form.tsx         # "use client"
│   │   ├── campanhas/                # page.tsx
│   │   ├── criativos/                # page.tsx
│   │   ├── funil/                    # page.tsx
│   │   ├── alertas/                  # page.tsx
│   │   ├── relatorios/               # page.tsx
│   │   ├── ia-insights/              # page.tsx
│   │   ├── plano/                    # page.tsx
│   │   ├── publico/                  # page.tsx
│   │   ├── integracoes/
│   │   │   ├── page.tsx              # Hub de plataformas (cards Meta/Google)
│   │   │   ├── meta/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── _actions.ts       # sincronizar / desconectar (server actions)
│   │   │   │   ├── _wizard.tsx       # "use client" — passo a passo OAuth setup
│   │   │   │   ├── _sync-btn.tsx     # "use client"
│   │   │   │   ├── _desconectar.tsx  # "use client"
│   │   │   │   └── contas/
│   │   │   │       ├── page.tsx      # Seleção da ad account
│   │   │   │       └── actions.ts    # salvarContaSelecionada / cancelar
│   │   │   └── google/
│   │   │       ├── page.tsx
│   │   │       └── _wizard.tsx       # "use client"
│   │   └── configuracoes/
│   │       ├── page.tsx
│   │       ├── actions.ts
│   │       └── _components/          # AgenciaForm · PerfilForm · ConfigToggles
│   ├── oauth/                        # OAuth route handlers (públicos, fora do dashboard)
│   │   └── meta/
│   │       ├── start/route.ts        # GET — inicia autorização Meta
│   │       └── callback/route.ts     # GET — recebe code, troca tokens, lista ad accounts
│   └── api/                          # JSON route handlers (cron/webhook/sync)
│       ├── cron/sync-meta/route.ts   # GET — Bearer CRON_SECRET; sync de todas integ Meta
│       ├── oauth/meta/start/         # (reservado — atual em /app/oauth)
│       ├── reports/                  # (vazio — futuro: geração PDF/Excel)
│       ├── sync/meta/                # (vazio — futuro: sync síncrono por integ)
│       └── webhooks/                 # (vazio — futuro: Meta webhook subscriptions)
│
├── lib/                              # Domain libs (importáveis via @/lib/...)
│   ├── auth.ts                       # requireUser · requireUserWithAgencia
│   ├── platform.ts                   # Tipo Plataforma + metadados PLATFORMS
│   ├── utils.ts                      # Helpers genéricos (cn, etc.)
│   ├── actions/
│   │   └── auth.ts                   # signOutAction (server action global)
│   ├── ai/                           # (vazio — futuro: ia-insights backend)
│   ├── alertas/                      # (vazio — futuro: motor de alertas)
│   ├── utils/                        # (vazio)
│   ├── crypto/
│   │   └── tokens.ts                 # AES-256-GCM encrypt/decrypt para tokens OAuth
│   ├── oauth/
│   │   ├── state.ts                  # signState/verifyState (HMAC + TTL CSRF)
│   │   └── pending.ts                # signPending/verifyPending (cookie c/ token + accounts)
│   ├── meta-ads/
│   │   ├── api.ts                    # Meta Graph v21 client (oauth, accounts, campaigns, insights)
│   │   └── sync.ts                   # syncMetaIntegracao · syncTodasMeta (pure, service_role)
│   └── supabase/
│       ├── client.ts                 # createClient() — browser (anon)
│       ├── server.ts                 # createClient() — server (cookies, anon, RLS)
│       └── service.ts                # createServiceClient() — bypass RLS (server-only)
│
├── components/
│   ├── ui/                           # shadcn primitives
│   │   ├── button.tsx · card.tsx · input.tsx · label.tsx · select.tsx
│   │   ├── dialog.tsx · dropdown-menu.tsx · table.tsx · tabs.tsx
│   │   ├── badge.tsx · separator.tsx · sonner.tsx
│   ├── layout/
│   │   ├── AppSidebar.tsx            # "use client" — nav lateral com seções
│   │   ├── Topbar.tsx                # "use client" — header
│   │   └── PlatformSelector.tsx      # "use client" — switcher Meta/Google
│   ├── providers/
│   │   ├── ThemeProvider.tsx         # next-themes wrapper
│   │   ├── CollapseProvider.tsx      # estado da sidebar
│   │   ├── PlatformProvider.tsx      # plataforma ativa (localStorage)
│   │   └── AppShell.tsx              # layout grid consciente de collapse
│   ├── shared/                       # Composições reutilizáveis no domínio
│   │   ├── EmptyState.tsx
│   │   ├── NeedsPlatform.tsx         # gate "conecte uma plataforma primeiro"
│   │   └── PlatformContextBadge.tsx
│   ├── dashboards/                   # (vazio — futuro: widgets de dashboard)
│   └── reports/                      # (vazio — futuro: PDF/Excel templates)
│
├── public/
│   ├── icons/                        # meta-ads.png · google-ads.webp
│   ├── file.svg · globe.svg · next.svg · vercel.svg · window.svg
│
├── scripts/                          # CLI/scheduler jobs (rodam fora do request lifecycle)
│   └── (sync-scheduler.ts a ser criado — ver CLAUDE.md)
│
├── supabase/
│   ├── migrations/
│   │   └── 20260520120000_schema_inicial.sql   # Schema + RLS + view v_kpis_diarios
│   ├── tests/
│   │   └── rls_isolation.sql         # Testes de isolamento RLS
│   └── seed.sql                      # Seed de dev
│
├── .env.example                      # Template (NEXT_PUBLIC_SUPABASE_*, ENCRYPTION_KEY, META_APP_*, CRON_SECRET)
├── .env.local                        # (gitignored — segredos locais)
├── .git/hooks/post-commit            # Auto-push para origin (local-only, não versionado)
├── .gitignore
├── .next/                            # Build cache (gitignored)
└── node_modules/                     # Dependências (gitignored)
```

## Directory Purposes

**`app/`** — App Router do Next 16
- Purpose: tudo que vira rota HTTP (página renderizada ou route handler).
- Contains: `page.tsx`, `layout.tsx`, `route.ts`, server actions co-locadas (`actions.ts`, `_actions.ts`), forms client co-locados (`_form.tsx`, `_wizard.tsx`, `_components/`).
- Key files: `app/layout.tsx`, `app/(dashboard)/layout.tsx`, `app/oauth/meta/callback/route.ts`.

**`app/(auth)/`** — Route group anônimo
- Purpose: páginas pré-login (login, futuramente signup/reset).
- Layout: `app/(auth)/layout.tsx` (card centralizado).
- Pages: `app/(auth)/login/page.tsx`.

**`app/(dashboard)/`** — Route group autenticado
- Purpose: app real, requer sessão. Layout traz Sidebar/Topbar/providers.
- Pages: dashboard, clientes, campanhas, conjuntos virtuais (em criativos), funil, alertas, relatorios, ia-insights, plano, publico, integracoes (meta/google), configuracoes.
- Convenção: server actions vivem em `actions.ts` (públicas no contexto da rota) ou `_actions.ts` (prefixo `_` indica "privado da rota, não exporta page"); forms client em `_form.tsx`, wizards em `_wizard.tsx`, sub-componentes privados em `_components/`.

**`app/oauth/`** — OAuth route handlers
- Purpose: endpoints públicos que recebem redirects do provider (Facebook, futuramente Google).
- Files: `app/oauth/meta/start/route.ts`, `app/oauth/meta/callback/route.ts`.
- Note: estão FORA de `(dashboard)` porque devem aceitar redirect externo, mas o `proxy.ts` ainda libera o prefixo `/oauth` em `PUBLIC_PATHS`.

**`app/api/`** — JSON route handlers
- Purpose: cron, webhooks, RPC interno (geração de relatório, sync forçado).
- Files atuais: `app/api/cron/sync-meta/route.ts`.
- Convenção: cada handler valida auth (Bearer secret p/ cron, signature p/ webhook).

**`lib/`** — Domain libs
- Purpose: lógica reutilizável fora do request lifecycle. Importável de qualquer arquivo via `@/lib/...`.
- Contains: clientes Supabase, auth helpers, cripto, OAuth state, integrações por plataforma, utilitários.
- Key files: `lib/auth.ts`, `lib/supabase/{client,server,service}.ts`, `lib/crypto/tokens.ts`, `lib/oauth/{state,pending}.ts`, `lib/meta-ads/{api,sync}.ts`.

**`lib/supabase/`** — Três clients separados (PROPOSITAL)
- `client.ts`: navegador, anon key, RLS aplica. Para componentes client que façam queries direto.
- `server.ts`: server-side, anon key, lê cookies do request. **Usar em server components, server actions, route handlers normais.** `await createClient()`.
- `service.ts`: service_role key, **bypassa RLS**. **Usar APENAS em cron, scripts e syncs cross-tenant.**

**`components/`** — UI compartilhada
- `ui/`: primitives shadcn (Button, Input, Card, etc.) — não-customizados em sua maioria.
- `layout/`: Sidebar, Topbar, PlatformSelector (todos client).
- `providers/`: Context providers React (theme, collapse, platform).
- `shared/`: composições de domínio reutilizáveis (EmptyState, NeedsPlatform, PlatformContextBadge).
- `dashboards/`, `reports/`: hoje vazios; reservados para widgets futuros.

**`supabase/`** — Migrações e fixtures
- `migrations/`: SQL versionado com timestamp prefix. Schema inteiro hoje em `20260520120000_schema_inicial.sql`.
- `tests/`: testes SQL (RLS isolation).
- `seed.sql`: dados de dev.

**`scripts/`** — Jobs e CLIs locais
- Purpose: processos longos/agendados desacoplados do Next runtime.
- Padrão definido em CLAUDE.md: `scripts/sync-scheduler.ts` rodaria `node-cron` chamando libs puras de sync.
- Hoje a pasta existe mas está vazia.

**`public/`** — Assets servidos diretamente
- `icons/`: logos de plataforma (`meta-ads.png`, `google-ads.webp`).

## Key File Locations

**Entry Points:**
- `proxy.ts`: Next 16 Proxy (auth gate). Linha 10: `export async function proxy(request)`.
- `app/page.tsx`: redirect raiz.
- `app/(dashboard)/layout.tsx`: bootstrap do app autenticado.
- `app/oauth/meta/start/route.ts` e `.../callback/route.ts`: OAuth flow.
- `app/api/cron/sync-meta/route.ts`: cron endpoint.

**Configuration:**
- `next.config.ts`: turbopack root.
- `tsconfig.json`: path alias `@/* → ./*`.
- `eslint.config.mjs`: eslint-config-next (vitals + typescript).
- `postcss.config.mjs`: Tailwind v4.
- `components.json`: config shadcn.
- `.env.example`: template de envs (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, ENCRYPTION_KEY, OAUTH_STATE_SECRET, META_APP_ID, META_APP_SECRET, META_API_VERSION, CRON_SECRET).

**Core Logic:**
- `lib/auth.ts`: helpers de autenticação server-side.
- `lib/supabase/server.ts`: client SSR padrão para server components/actions.
- `lib/supabase/service.ts`: client service_role (cross-tenant).
- `lib/crypto/tokens.ts`: AES-256-GCM dos tokens OAuth.
- `lib/oauth/state.ts`: HMAC state CSRF.
- `lib/oauth/pending.ts`: cookie assinado entre callback OAuth e seleção de conta.
- `lib/meta-ads/sync.ts`: orquestração de sync Meta (função pura).
- `lib/meta-ads/api.ts`: HTTP client do Meta Graph.
- `lib/platform.ts`: enum + metadados de plataformas.

**Schema:**
- `supabase/migrations/20260520120000_schema_inicial.sql`: todas as tabelas + RLS + view `v_kpis_diarios`.

**Testing:**
- `supabase/tests/rls_isolation.sql`: testes de isolamento por tenant.
- (Não há test runner JS configurado hoje — `npm run test` não existe em `package.json`.)

## Naming Conventions

**Files:**
| Tipo | Padrão | Exemplo |
|------|--------|---------|
| Página de rota | `page.tsx` | `app/(dashboard)/clientes/page.tsx` |
| Layout de rota | `layout.tsx` | `app/(dashboard)/layout.tsx` |
| Route handler | `route.ts` | `app/oauth/meta/callback/route.ts` |
| Server action pública da rota | `actions.ts` | `app/(dashboard)/clientes/actions.ts` |
| Server action interna ("privada") | `_actions.ts` (underscore prefix) | `app/(dashboard)/integracoes/meta/_actions.ts` |
| Form/wizard client co-locado | `_form.tsx`, `_wizard.tsx`, `_<nome>.tsx` | `app/(dashboard)/clientes/novo/_form.tsx` |
| Sub-componentes de uma rota | `_components/<Nome>.tsx` | `app/(dashboard)/dashboard/_components/DashboardEmptyMetrics.tsx` |
| Lib | `<dominio>/<modulo>.ts` (kebab dir, camel file) | `lib/meta-ads/sync.ts` |
| UI primitive | `<nome>.tsx` lowercase | `components/ui/button.tsx` |
| Componente de feature | `PascalCase.tsx` | `components/layout/AppSidebar.tsx` |
| Migração SQL | `YYYYMMDDHHMMSS_<descricao>.sql` | `supabase/migrations/20260520120000_schema_inicial.sql` |

**Directories:**
- Route groups: `(nome)` parênteses não viram URL — usados para agrupar layouts (`(auth)`, `(dashboard)`).
- Subpastas em `app/`: kebab-case (`integracoes/meta/contas/`).
- Subpastas em `lib/`: kebab-case (`meta-ads`, `oauth`, `crypto`, `supabase`).
- Subpastas em `components/`: lowercase singular (`ui`, `layout`, `providers`, `shared`).
- Prefixo `_` em diretórios/arquivos dentro de `app/`: privado da rota (não rota Next).

**Functions/Variables:**
- Funções: `camelCase` (`syncMetaIntegracao`, `requireUserWithAgencia`, `signState`).
- Componentes React: `PascalCase` (`AppSidebar`, `PlatformProvider`, `WizardMeta`).
- Tipos/interfaces: `PascalCase` (`SyncResult`, `OAuthStatePayload`, `Plataforma`).
- Constantes globais: `UPPER_SNAKE` (`PUBLIC_PATHS`, `STATE_TTL_MS`, `PLATFORMS`, `STORAGE_KEY`).
- Tabelas Postgres: `snake_case` plural em PT-BR (`clientes`, `integracoes`, `metricas_diarias`, `alertas_disparos`).

## Where to Add New Code

**Nova rota / página do dashboard:**
- Criar `app/(dashboard)/<feature>/page.tsx` (server component).
- Layout do dashboard já cuida de auth + providers.
- Adicionar link no `components/layout/AppSidebar.tsx` (`SECTIONS` array).
- Se a página listar dados de plataforma, envolver em `<NeedsPlatform>` (`components/shared/NeedsPlatform.tsx`).

**Nova rota anônima (pré-login):**
- Criar `app/(auth)/<feature>/page.tsx`.
- Adicionar prefixo em `PUBLIC_PATHS` no `proxy.ts` se não for `/login`/`/signup` (que já estão).

**Nova mutação (form / botão):**
- Server action em `actions.ts` (ou `_actions.ts`) co-locado na rota.
- Topo do arquivo: `"use server"`.
- Validar `FormData` com `zod`.
- Autenticar com `await requireUserWithAgencia()` de `lib/auth.ts`.
- Mutation no Supabase via `lib/supabase/server.ts` (RLS aplicada).
- Encerrar com `revalidatePath(...)` + `redirect(...)`.

**Novo route handler (webhook, cron, RPC interno):**
- Criar `app/api/<dominio>/<acao>/route.ts`.
- `export async function GET/POST(req: NextRequest)`.
- Cron: validar `Authorization: Bearer ${process.env.CRON_SECRET}` (pattern em `app/api/cron/sync-meta/route.ts`).
- Webhook: validar signature do provider antes de qualquer side-effect.
- Lógica de negócio chama `lib/<dominio>/*.ts`, não inline no handler.
- `export const dynamic = "force-dynamic"` se acessar request data.

**Nova lib de domínio:**
- Criar `lib/<dominio>/<modulo>.ts`.
- Mantém funções **puras** (sem dependência de cookies/request) — recebem args, retornam dados.
- Para Supabase: aceitar client como arg ou instanciar via `createServiceClient()` se for cross-tenant.
- Para crypto/HMAC: padronizar como `lib/crypto/tokens.ts` (Buffer in/out).

**Novo OAuth provider:**
- `lib/<provider>/api.ts`: HTTP client.
- `app/oauth/<provider>/start/route.ts` + `callback/route.ts` (espelhar pattern Meta).
- Reusar `lib/oauth/state.ts` e `lib/oauth/pending.ts` para HMAC/cookies.
- Reusar `lib/crypto/tokens.ts` para AES.
- Adicionar entrada em `lib/platform.ts` se for nova plataforma de UI.
- Adicionar prefixo `/oauth/<provider>` ao `PUBLIC_PATHS` do `proxy.ts` (já coberto por `/oauth` genérico).

**Novo componente de UI:**
- Primitive shadcn → `components/ui/<nome>.tsx` (lowercase). Importar via `@/components/ui/<nome>`.
- Componente de feature/layout → `components/<categoria>/<Nome>.tsx` (PascalCase).
- Provider → `components/providers/<Nome>Provider.tsx`.
- Componente privado a uma rota → `app/(dashboard)/<feature>/_components/<Nome>.tsx`.
- Componentes com Recharts: **sempre `"use client"`** no topo.

**Nova tabela / migração:**
- Criar `supabase/migrations/YYYYMMDDHHMMSS_<descricao>.sql`.
- Incluir `agencia_id uuid not null references agencias(id) on delete cascade`.
- `alter table <nome> enable row level security;`
- `create policy "tenant_<nome>" on <nome> for all using (agencia_id = auth_agencia_id());`
- Soft delete: adicionar `deleted_at timestamptz` se a entidade pode ser arquivada — e índice parcial `where deleted_at is null`.
- Atualizar `supabase/tests/rls_isolation.sql` cobrindo a nova tabela.

**Novo job agendado:**
- Lógica em `lib/<dominio>/sync.ts` (função pura `async function syncX()`).
- Endpoint `/api/cron/<acao>/route.ts` autenticado por `CRON_SECRET`.
- Scheduler local: adicionar entrada em `scripts/sync-scheduler.ts` (node-cron) chamando a lib.
- Em produção (Supabase pg_cron / Cloudflare Cron Triggers): chamar o endpoint HTTP.

**Novo helper genérico:**
- `lib/utils.ts` (já existe — concentrar `cn`, formatters, etc.).
- Formatters BR específicos podem virar `lib/utils/format.ts` (pasta `lib/utils/` reservada).

## Special Directories

**`.next/`:**
- Purpose: build cache do Next.
- Generated: Yes.
- Committed: No (`.gitignore`).

**`node_modules/`:**
- Purpose: dependências npm.
- Generated: Yes (`npm install`).
- Committed: No.

**`.vercel/`:**
- Purpose: cache do CLI Vercel.
- Committed: No.

**`.planning/codebase/`:**
- Purpose: documentos de mapeamento gerados pelo GSD (este arquivo).
- Generated: Yes (via comando `/gsd:map-codebase`).
- Committed: tipicamente sim, para que outros agentes consumam.

**`.git/hooks/`:**
- Purpose: hooks Git locais. CLAUDE.md exige `post-commit` que faz auto-push para `origin`.
- Generated: No (manualmente em cada clone).
- Committed: No (`.git/` é local).

---

*Structure analysis: 2026-05-22*
