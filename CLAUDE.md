@AGENTS.md

# Sistema de Gestão de Tráfego — Diretrizes para Claude Code

## Regras técnicas (não-negociáveis)

### Next 16 (mudanças vs treinamento anterior)

- **Middleware agora é Proxy.** Arquivo é `proxy.ts` (raiz), função exportada `proxy`. Não criar `middleware.ts`.
- **`cookies()` é async.** Sempre `await cookies()`. Vale também para `headers()` e `params`.
- Antes de tocar qualquer API Next, conferir `node_modules/next/dist/docs/`.

### Recharts

- **Componentes de gráfico devem ser Client Components.** Adicionar `"use client"` no topo do arquivo. Recharts não roda em RSC.

### Criptografia de tokens OAuth

- **Sempre app-level** (`lib/crypto/tokens.ts`, AES-256-GCM).
- **Nunca** chamar `pgp_sym_encrypt`/`pgp_sym_decrypt` no Postgres — não funciona confiável com pool de conexões do Supabase.
- Banco armazena `bytea` opaco em `integracoes.access_token_encrypted` e `refresh_token_encrypted`.

### OAuth state (CSRF)

- Sempre `lib/oauth/state.ts` (`signState`/`verifyState`).
- Cookie `oauth_state`: HttpOnly, Secure (prod), SameSite=Lax, maxAge 300s.
- TTL embutido no payload — verificar antes de aceitar callback.

### Supabase clients

- **Browser:** `lib/supabase/client.ts` (`createClient()`)
- **Server (route handlers, server components, server functions):** `lib/supabase/server.ts` (`await createClient()`)
- **Service role (scripts, cron, webhooks):** `lib/supabase/service.ts` (`createServiceClient()`) — BYPASSA RLS, nunca expor ao browser
- **Autorização:** usar `getUser()` ou `getClaims()`, **nunca** `getSession()` para decisões de acesso.

### Scheduler / cron

- Lógica de sync sempre em `lib/meta-ads/sync.ts` (pura, sem cron embutido).
- Cron local: `scripts/sync-scheduler.ts` (node-cron).
- Endpoints `/api/cron/*` que invocam a mesma lógica — assim funciona com Supabase pg_cron ou Cloudflare Cron Triggers quando publicar.
- **Não acoplar node-cron a rotas Next.** Vai quebrar em serverless.

### Multi-tenant

- Toda tabela transacional tem `agencia_id`.
- RLS habilitado em todas. Policy padrão: `agencia_id = auth_agencia_id()`.
- Ao inserir/upsertar do app, sempre setar `agencia_id` explicitamente.

### Soft delete

- `clientes.deleted_at` é a coluna canônica.
- Listas e views devem filtrar `where deleted_at is null`.

### Formatação BR

- Moeda: `Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })`
- Datas: `date-fns` com locale `ptBR`.
- Decimais: vírgula. Milhares: ponto.

## Balão (modal padrão)

Quando o Roberto pedir "abre um balão", "balão com X funções" etc., usar o componente **`components/ui/Balao.tsx`**:

```tsx
import { Balao } from "@/components/ui/Balao";

const [aberto, setAberto] = useState(false);
<button onClick={() => setAberto(true)}>Abrir</button>
<Balao open={aberto} onClose={() => setAberto(false)} titulo="Título" icone="ti-flag" largura={460}>
  ...conteúdo...
</Balao>
```

Características: portal no `document.body` (imune a transform de pais), overlay com blur, centralizado, header com título+X, corpo `.chat-scroll`, Esc/clique-fora fecha, `footer` opcional pra botões. Não criar modais inline novos — sempre Balao.

## Convenções de código

- Imports absolutos via `@/*` (configurado em `tsconfig.json`).
- Server Components por padrão; `"use client"` só quando necessário (hooks, Recharts, eventos).
- Route handlers retornam `Response.json(...)` ou `NextResponse.json(...)`.
- Errors em PT-BR (vão pro usuário). Logs estruturados em EN se preferir.

## Auto-push GitHub

Todo commit dispara `git push origin <branch>` via `.git/hooks/post-commit`. Repo público: https://github.com/BetoPr/sistema-trafego.

- Não desativar o hook sem permissão.
- Se push falhar, hook avisa no terminal — rode manual: `git push origin main`.
- Hook não vai pro repo (`.git/` é local). Em clones novos, recriar manualmente.

## O que NUNCA fazer

- Commitar `.env.local` ou qualquer chave.
- Usar service_role no browser.
- Decisões de autorização com `getSession()`.
- Cron acoplado a route handler.
- Criptografia via pgcrypto pra tokens (use app-level).
- Skipar verificação de state OAuth.
- Desativar o hook de auto-push.
