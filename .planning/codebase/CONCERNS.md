# Codebase Concerns

**Analysis Date:** 2026-05-22

Audit do sistema-trafego (Next 16, Supabase, OAuth Meta). Cross-check com não-negociáveis do `CLAUDE.md` mais inspeção direta de `app/oauth/**`, `lib/oauth/**`, `lib/crypto/**`, `lib/supabase/**`, `proxy.ts` e migration única.

Status geral: a engenharia das peças críticas (cripto, state OAuth, RLS, proxy) está **correta**. Os problemas reais estão em:
1. Vazamento de secrets em arquivo commitado.
2. Wizards que persistem secrets em `localStorage`.
3. Lacunas operacionais (sem tests/CI, sem observability, sem refresh de token, sem scheduler implementado apesar do `node-cron` no package.json).
4. Pequenos bugs de correctness em rotas server.

---

## Security

### Credenciais reais commitadas em `.fix-env.ps1` — **HIGH**

- **Files:** `.fix-env.ps1:2-9`
- **Problem:** Arquivo está tracked no git (confirmado via `git ls-files`) e contém valores production reais: `SUPABASE_SERVICE_ROLE_KEY` (JWT válido até 2036), `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `ENCRYPTION_KEY` (64 hex chars de AES-256-GCM usado para cifrar tokens OAuth), `OAUTH_STATE_SECRET` (HMAC do CSRF). Repo é público (`github.com/BetoPr/sistema-trafego`). Qualquer um na internet tem acesso total ao Supabase do projeto, pode decriptar todo token OAuth Meta em banco e forjar `oauth_state`.
- **Fix:** (1) Imediatamente rotacionar **todas as 4 chaves** (`service_role`, `anon`, `ENCRYPTION_KEY`, `OAUTH_STATE_SECRET`) — o anon key também vaza porque o JWT está visível. (2) Como `ENCRYPTION_KEY` muda, todo `access_token_encrypted` em `integracoes` vira lixo: pode-se invalidar e exigir re-OAuth, ou migrar com chave antiga decrypt → nova encrypt antes de deletar a antiga. (3) `git rm --cached .fix-env.ps1`, adicionar `.fix-env.ps1` ao `.gitignore`, commit. (4) Considerar `git filter-repo` + force-push pra purgar do histórico (já está exposto, mas reduz superfície futura). (5) Habilitar GitHub secret scanning + push protection.

### `META_APP_SECRET` salvo em `localStorage` do navegador — **HIGH**

- **Files:** `app/(dashboard)/integracoes/meta/_wizard.tsx:145`, `app/(dashboard)/integracoes/google/_wizard.tsx:167-169`
- **Problem:** Os wizards de setup persistem `META_APP_SECRET`, `GOOGLE_CLIENT_SECRET` e `GOOGLE_ADS_DEVELOPER_TOKEN` em `localStorage`. Qualquer XSS (extensão de browser maliciosa, lib comprometida, eval acidental) lê tudo. O texto do passo 4 chega a dizer "credenciais salvas no navegador" como se fosse feature.
- **Fix:** Wizard deve ser **só visual** — mostrar as variáveis a copiar mas não armazená-las. Se quiser preservar estado entre passos, usar `useState` em memória (some no F5). Para o app realmente usar o secret, ele vai pra `vercel env` (env var no servidor), nunca pro browser.

### Cookie `oauth_state_meta` lido por igualdade direta com `stateParam` antes do `verifyState` — **MED**

- **Files:** `app/oauth/meta/callback/route.ts:38-40`
- **Problem:** Compara `stateCookie !== stateParam` com `!==` simples (sensível a timing). Não é o pior caso porque o `stateParam` veio da URL pública (atacante já o conhece), então timing leak não dá ataque novo. Mas a defesa em profundidade pedia `timingSafeEqual`. A verificação real de assinatura HMAC já está em `verifyState` (que usa `timingSafeEqual`), então o impacto prático é baixo.
- **Fix:** Usar `crypto.timingSafeEqual(Buffer.from(stateCookie), Buffer.from(stateParam))` com pré-check de tamanho.

### Endpoint `/api/cron/sync-meta` autentica via header sem rate-limit — **MED**

- **Files:** `app/api/cron/sync-meta/route.ts:17-20`
- **Problem:** Compara `auth !== \`Bearer ${secret}\`` com `!==` (timing leak) e sem rate-limit. `CRON_SECRET` é um segredo longo, então timing é teórico. Mais relevante: qualquer um conhecendo a URL pode tentar brute force sem ser limitado.
- **Fix:** `timingSafeEqual` na comparação. Em prod, deixar Vercel Cron como único caller (URL não exposta no app) ou bloquear via `User-Agent`/IP allowlist.

### Cookie `meta_pending` carrega o access token cifrado pelo navegador — **LOW**

- **Files:** `app/oauth/meta/callback/route.ts:107-131`, `lib/oauth/pending.ts`
- **Problem:** O cookie `meta_pending` carrega `access_token_b64` (AES-GCM blob em base64) + lista de ad accounts entre callback e tela de seleção. É HttpOnly + Secure + SameSite=Lax + 10min TTL + HMAC-assinado, então é defensivelmente OK. Risco residual: o blob é interceptável em proxy MITM caso usuário esteja em rede sem TLS (atenuado pelo `Secure` em prod). Cookie size pode estourar 4KB se a Meta retornar muitas ad accounts.
- **Fix:** Considerar mover pending pra tabela `oauth_pending` no banco (chaveada por `pending_id` no cookie) — elimina os limites de tamanho e tira o blob cifrado do browser.

### Service-role client é construído sem checar `process.env.SUPABASE_SERVICE_ROLE_KEY` — **LOW**

- **Files:** `lib/supabase/service.ts:13`
- **Problem:** `process.env.SUPABASE_SERVICE_ROLE_KEY!` com non-null assertion — se a env var faltar em produção, o cliente é criado com `undefined`, e a primeira chamada Supabase falha com erro pouco informativo.
- **Fix:** Lançar erro explícito (`throw new Error("SUPABASE_SERVICE_ROLE_KEY ausente")`) como já é feito em `tokens.ts` e `state.ts`.

### Sem refresh de token Meta — **MED**

- **Files:** `lib/meta-ads/sync.ts:96-113`, `app/oauth/meta/callback/route.ts:80-83`
- **Problem:** Token long-lived da Meta tem ~60 dias. Não há código que detecte `token_expires_at < now()` e force o usuário a re-OAuth. Sync vai falhar silenciosamente quando o token expirar (Meta retorna 401, código marca `status=erro` em `integracoes`, mas usuário só descobre quando abre a tela).
- **Fix:** Adicionar checagem em `syncMetaIntegracao` no início: se `token_expires_at` < hoje + 5 dias, marcar `status='expirada'` e disparar alerta. UI deve mostrar CTA "reconectar". Idealmente, pré-aviso 7 dias antes via `alertas_disparos`.

### Sem CSRF token em server actions de mutação cross-origin — **LOW**

- **Files:** `app/(dashboard)/clientes/actions.ts`, `app/(dashboard)/configuracoes/actions.ts`, `app/(dashboard)/integracoes/meta/_actions.ts`
- **Problem:** Server Actions em Next 16 são protegidas por origem (Next bloqueia request cross-origin por default), então não é exploit imediato. Mas `excluirClienteAction` apaga via soft-delete sem confirmação UI, e `desconectar` apaga a `integracoes` direto — qualquer XSS na própria app pega esse poder.
- **Fix:** Defesa em profundidade — `excluirClienteAction` deve exigir confirmação no servidor (campo `confirm=delete-{id}` no FormData) ou usar Dialog com double-submit. Mais importante: revisar CSP do app para reduzir surface de XSS.

---

## Correctness

### `MetaContasPage` chama `requireUserWithAgencia()` duas vezes — **LOW**

- **Files:** `app/(dashboard)/integracoes/meta/contas/page.tsx:9,23`
- **Problem:** Linha 9 faz `await requireUserWithAgencia()` sem usar o retorno (apenas como guard), linha 23 chama de novo só pra pegar `supabase`. Duas queries `auth.getUser()` + duas queries em `usuarios`, em sequência, por request. Funciona mas é desperdício e confunde quem lê.
- **Fix:** `const { supabase } = await requireUserWithAgencia();` na primeira linha, remover a segunda chamada.

### `redirect` em catch sem `return` em `MetaContasPage` — **MED**

- **Files:** `app/(dashboard)/integracoes/meta/contas/page.tsx:13-20`
- **Problem:** Linhas 13 (`if (!pendingRaw) redirect(...)`) e 19 (`} catch { redirect(...) }`). Em Next 16, `redirect()` lança internamente (a função não retorna pro código abaixo), então funciona — mas o TypeScript ainda pensa que `pending` é `undefined` na linha 23. Como o `redirect` está dentro de `try/catch` no segundo caso, qualquer chamada futura a `redirect()` que esteja sob `try/catch` engole o sinal e quebra silenciosamente. Próximo dev pode adicionar `try { ... }` em volta sem perceber.
- **Fix:** Estruturar com checks explícitos: `if (!pendingRaw) { redirect("/integracoes/meta?erro=sessao_expirada"); }` fora de try/catch. Para o `verifyPending`, capturar antes do try ou rethrow.

### Sync sobrescreve `proxima_sync` jamais — **MED**

- **Files:** `lib/meta-ads/sync.ts:266-273`, `supabase/migrations/20260520120000_schema_inicial.sql:90,96`
- **Problem:** A migration cria `proxima_sync timestamptz` e o índice `idx_integracoes_sync on integracoes(proxima_sync) where status = 'ativa'`, sugerindo um modelo de "sync next" para o scheduler. Mas `syncMetaIntegracao` nunca seta `proxima_sync` — só atualiza `ultima_sync`. O índice nunca é usado, e nenhum scheduler pode priorizar integrações próximas de sync.
- **Fix:** Após sync OK, setar `proxima_sync = now() + interval '1 hour'` (ou outro intervalo). Scheduler deve fazer `select ... where status='ativa' and proxima_sync < now()`. Ou, se decidiu não usar esse modelo, dropar a coluna e o índice em uma nova migration.

### `state_mismatch` quando cookie expira == experiência ruim — **LOW**

- **Files:** `app/oauth/meta/callback/route.ts:38-41`
- **Problem:** Cookie `oauth_state_meta` tem `maxAge: 300` (5min). Se o usuário demora >5 min para autorizar na Meta (tela de login, MFA, "Continue com Roberto…"), o cookie some, e o callback retorna `state_mismatch` que sugere ataque. A UX vai mostrar "State CSRF não bate (possível ataque ou cookie expirado)" — confuso pra usuário legítimo.
- **Fix:** Aumentar para 600s (10min) ou diferenciar mensagens (`state_missing` vs `state_mismatch`). O TTL real está no payload (state_ttl_ms = 5min em `state.ts:3`) — sincronizar ambos.

### `desconectar` apaga `integracoes` sem checar `agencia_id` no WHERE — **LOW (RLS cobre)**

- **Files:** `app/(dashboard)/integracoes/meta/_actions.ts:45-49`
- **Problem:** `supabase.from("integracoes").delete().eq("id", integracaoId).eq("plataforma", "meta_ads")` — confia exclusivamente em RLS pra impedir delete de integração de outra agência. RLS está habilitado e a policy `tenant_integracoes` cobre, então é OK *enquanto a policy estiver lá*. Defesa em profundidade pediria filtro explícito por `agencia_id`.
- **Fix:** Adicionar `.eq("agencia_id", usuario.agencia_id)` (precisa carregar `usuario` antes). Aplicar mesmo padrão em todas mutations.

### Listas server-side esquecem `deleted_at is null` em `integracoes`/`campanhas` — **LOW**

- **Files:** `app/(dashboard)/integracoes/meta/page.tsx:46-49`, `app/(dashboard)/layout.tsx:18-21`, `app/(dashboard)/integracoes/page.tsx:6-9`
- **Problem:** A regra de soft-delete é em `clientes.deleted_at`. `integracoes` e demais tabelas filhas não têm `deleted_at` próprio, mas o cascade `on delete cascade` foi removido para clientes (o delete real virou update de `deleted_at`). Então `integracoes` órfãs ficam no banco com `cliente_id` apontando pra cliente soft-deleted. A UI lista todas integrações sem join com `clientes` filtrando `deleted_at`. Após excluir um cliente, suas integrações continuam aparecendo em `/integracoes/meta` (mas sem cliente cadastrado).
- **Fix:** Em queries de `integracoes` que listam pra UI, fazer `.select("..., clientes!inner(id)").is("clientes.deleted_at", null)` ou criar uma view `v_integracoes_ativas`. Alternativamente, no `excluirClienteAction` marcar todas integrações filhas como `status='pausada'` ou deletar fisicamente.

---

## Reliability

### Sync iterativo sequencial em `syncTodasMeta` — **MED**

- **Files:** `lib/meta-ads/sync.ts:301-314`
- **Problem:** `for (const i of integs || []) { results.push(await syncMetaIntegracao(i.id)); }` é estritamente sequencial. Em escala, 50 integrações × 4 chamadas Meta cada × ~1s = ~3min de sync. O endpoint `/api/cron/sync-meta` espera tudo terminar antes de responder — Vercel functions têm timeout de 10s no plano Hobby e 60s no Pro. Vai timeout cedo.
- **Fix:** (1) Limit de concorrência com `Promise.all` em chunks (5-10 em paralelo). (2) Mover sync pra background: endpoint só enqueueia, worker processa (Inngest, Trigger.dev, Supabase queues, ou simplesmente `await fetch(/api/cron/sync-one?id=X)` sem await na resposta). (3) Setar `export const maxDuration = 60` no route handler.

### Sync sequencial intra-integração com várias queries Supabase — **MED**

- **Files:** `lib/meta-ads/sync.ts:117-263`
- **Problem:** Sync de uma integração faz: list campanhas → upsert → select de volta para mapa → list adsets → upsert → select → list ads → upsert → select → list insights → upsert em batches. Cada uma é uma round-trip Supabase + uma chamada Meta. Sem retry/backoff em nenhum dos `fetch(graph.facebook.com)`. Rate-limit Meta (códigos 4 ou 17) ou timeout transitório derruba a sync inteira; código marca `status=erro` mas perde todo o progresso parcial das tabelas mais altas (campanhas/adsets já foram upsertadas, anúncios e métricas não).
- **Fix:** Adicionar retry com backoff exponencial em `paginatedGet` e nas chamadas `exchangeCode/exchangeForLongLived` (até 3 tentativas em 429, 500, 502, 503, 504). Considerar `Promise.all` para listAdSets+listAds+listDailyInsights que são independentes. Salvar checkpoints (`integracoes.proxima_sync` indica até onde foi).

### `console.warn` em insights silencia falhas reais — **MED**

- **Files:** `lib/meta-ads/sync.ts:218-223`
- **Problem:** `try { insights = await listDailyInsights(...) } catch (e) { console.warn(...) }` — engole erros de Meta (rate limit, token revogado, permission denied). Sync retorna OK falsamente, métricas ficam vazias, dashboard mostra "sem dados" sem indicar problema. `erro_ultima_sync` nem é setado.
- **Fix:** Distinguir "conta sem histórico" (Meta retorna array vazio, OK) de erro real (response.ok=false). Em erro real, popular `integracoes.erro_ultima_sync = "insights: ${msg}"` e ainda assim retornar OK do sync de estruturas — ou retornar partial-OK.

### Race condition: pendingCookie + signOut concorrente — **LOW**

- **Files:** `app/oauth/meta/callback/route.ts:107-131`, `app/(dashboard)/integracoes/meta/contas/actions.ts:21-26`
- **Problem:** Cenário: usuário inicia OAuth, autoriza no Facebook, callback grava `meta_pending`, e em outra aba clica logout. Quando volta na primeira aba e clica "Conectar conta", o action lê cookie, valida `pending.user_id === user.id` (`user` vem do supabase post-logout = `null`), redirect para login. OK na maior parte. Edge: se um colega logar na mesma máquina entre callback e action, o cookie pending persiste e o `user.id !== pending.user_id` previne. Mas o erro lançado (`"Usuário mudou — refaça o OAuth"`) é um throw normal — vai pro 500.
- **Fix:** Trocar `throw` por `redirect("/integracoes/meta?erro=user_mismatch")` no action de salvar (consistente com callback). Limpar cookie pending em logout.

### Cookie `meta_pending` não removido em caso de erro no action de salvar — **LOW**

- **Files:** `app/(dashboard)/integracoes/meta/contas/actions.ts:31-46`
- **Problem:** Se `supabase.from("integracoes").upsert(...)` retornar erro, o `throw new Error(...)` é lançado, mas o cookie `meta_pending` continua válido por 10 min. Próxima request reutiliza o mesmo pending; pode dar a impressão de "tentar de novo" funcionar mas é o mesmo token (que pode ter expirado intermitentemente).
- **Fix:** Em error path, deletar cookie pending e redirecionar pra `/integracoes/meta?erro=salvar_falhou&msg=...`.

---

## Tech Debt

### `scripts/` está vazio mas docs e CLAUDE.md descrevem `scripts/sync-scheduler.ts` — **MED**

- **Files:** `scripts/` (vazio), `CLAUDE.md:38-41`, `README.md:58,72`, `package.json:23` (node-cron dependency)
- **Problem:** O package.json tem `node-cron` como dependência prod, `@types/node-cron` em dev, README documenta `npx tsx scripts/sync-scheduler.ts` como comando de scheduler local, e CLAUDE.md detalha como deve ser estruturado — mas o arquivo não existe. Existe só o endpoint `/api/cron/sync-meta` que processa todas as integrações de uma vez. Quem clonar o repo não tem como rodar sync local.
- **Fix:** Criar `scripts/sync-scheduler.ts` que importa `syncTodasMeta` de `lib/meta-ads/sync.ts` e dispara via `cron.schedule("0 */1 * * *", ...)`. Ou, se decidiu por full-serverless via Vercel Cron, remover `node-cron` do package.json e atualizar README/CLAUDE.md.

### `node-cron@4.2.1` no `package.json` mas zero uso em código — **LOW**

- **Files:** `package.json:23`
- **Problem:** Dependência inflando bundle/install. Sem `scripts/sync-scheduler.ts`, é dead weight.
- **Fix:** Decidir: implementar o scheduler ou remover (`npm rm node-cron @types/node-cron`).

### Não há `@/lib/supabase/service.ts` guard de "server-only" — **LOW**

- **Files:** `lib/supabase/service.ts`
- **Problem:** Nada impede um Client Component de importar `createServiceClient`. Se acontecer, o build até passa (TS não detecta), o `SUPABASE_SERVICE_ROLE_KEY` (que não tem `NEXT_PUBLIC_` prefix) é `undefined` no browser e o cliente quebra — sem vazar a key, mas com erro genérico. Defesa fraca.
- **Fix:** Adicionar `import "server-only"` no topo de `lib/supabase/service.ts`. Idem em `lib/crypto/tokens.ts`, `lib/oauth/state.ts`, `lib/oauth/pending.ts`, `lib/meta-ads/api.ts`, `lib/meta-ads/sync.ts` — todos só servidor.

### Inline styles gigantes em todas as pages — **LOW**

- **Files:** `app/(dashboard)/integracoes/meta/page.tsx`, `app/(dashboard)/integracoes/meta/_wizard.tsx`, `app/(dashboard)/integracoes/google/_wizard.tsx`, `app/(dashboard)/clientes/page.tsx`, e basicamente todas as outras.
- **Problem:** Centenas de linhas com `style={{ display: "flex", ... }}` inline em vez de classes Tailwind/CSS Modules. Funciona, mas: (1) impossível tematizar dinamicamente sem prop drilling, (2) bundle inflado, (3) HMR mais lento, (4) impossível extrair pra componente puro sem estilos. Mistura estranha com `mk-card`, `mk-page` (que são classes globais), `cta-btn`, etc.
- **Fix:** Já há Tailwind v4 instalado (`@tailwindcss/postcss`, `tailwind-merge`) e shadcn. Padronizar: classes Tailwind ou CSS-in-JS estruturado. Mas é refactor grande — prioridade depende de quanto a UI vai mudar.

### `tsconfig.tsbuildinfo` no repo (build cache) — **LOW**

- **Files:** `tsconfig.tsbuildinfo`
- **Problem:** Está tracked. Cache de build incremental do TS, deveria ser local. Causa merge conflicts e infla `.git`.
- **Fix:** `git rm --cached tsconfig.tsbuildinfo` e já está no `.gitignore` na linha `*.tsbuildinfo`.

### Constants mágicas espalhadas (`maxAge: 300`, `maxAge: 600`, `PENDING_TTL_MS`, `STATE_TTL_MS`) — **LOW**

- **Files:** `app/oauth/meta/start/route.ts:40`, `app/oauth/meta/callback/route.ts:129`, `lib/oauth/state.ts:3`, `lib/oauth/pending.ts:3`
- **Problem:** `STATE_TTL_MS = 5 * 60 * 1000` em `state.ts` mas o cookie `oauth_state_meta` é seteado com `maxAge: 300` (segundos) em `start/route.ts:40`. Dois lugares declarando o mesmo número em unidades diferentes. Se um mudar, o outro fica inconsistente.
- **Fix:** Exportar `STATE_TTL_SECONDS = 300` de `lib/oauth/state.ts` e usar em `start/route.ts`. Mesma coisa pra pending (`PENDING_TTL_MS / 1000` = 600).

### Aviso "App Review" desatualizado no wizard Meta — **LOW**

- **Files:** `app/(dashboard)/integracoes/meta/_wizard.tsx:103-105`
- **Problem:** Wizard ainda lista `read_insights` como permissão necessária (linha 105). O último commit (`7508923 fix: remove read_insights scope (Meta deprecou, ads_read ja cobre insights)`) confirma que `read_insights` foi removido do código. Wizard precisa ser atualizado pra refletir a mudança.
- **Fix:** Remover bullet `read_insights` do passo 3 do wizard ou atualizar nota explicando que `ads_read` já cobre.

---

## DX / Ops

### Zero testes automatizados — **HIGH**

- **Files:** `supabase/tests/rls_isolation.sql` (único arquivo de teste, SQL manual sem runner)
- **Problem:** Sem Jest/Vitest/Playwright. Funções críticas (`encryptToken/decryptToken`, `signState/verifyState`, `signPending/verifyPending`, `syncMetaIntegracao`) não têm cobertura. Refactor seguro impossível. RLS test existe mas tem que ser rodado manualmente no SQL editor.
- **Fix:** Mínimo: adicionar `vitest` + testar puro: `lib/crypto/tokens.ts` (encrypt/decrypt roundtrip, tamper detection), `lib/oauth/state.ts` (TTL, tamper, replay), `lib/oauth/pending.ts`. Médio prazo: e2e via Playwright pra fluxo OAuth Meta (mock graph.facebook.com).

### Sem CI/CD pipeline — **MED**

- **Files:** `.github/workflows/` (não existe)
- **Problem:** Sem `tsc --noEmit`, sem `eslint`, sem testes em PR. Cada deploy depende do dev rodar lint local — em geral não rodam. ESLint config existe (`eslint.config.mjs`) mas é dead-weight no workflow.
- **Fix:** Adicionar GitHub Action: `npm run lint && npx tsc --noEmit && npm test` em PRs pra main. Vercel preview deploys já existem (são automáticos), mas falta validação prévia.

### Hook `post-commit` auto-push descrito em CLAUDE.md mas não está no repo — **LOW**

- **Files:** `CLAUDE.md:67-73`
- **Problem:** Hook é local (`.git/hooks/post-commit`), não vai pro repo. Em clones novos, não funciona. CLAUDE.md instrui recriar manualmente — fluxo frágil.
- **Fix:** Mover pra `husky` ou comitar um script em `scripts/install-hooks.sh` que copia hooks/ pra .git/hooks/. Ou abandonar auto-push e fazer push manual mesmo.

### Sem observabilidade / error tracking — **MED**

- **Files:** entire codebase
- **Problem:** Único `console.warn` em `sync.ts:222` para falhas de Meta insights. Nenhum Sentry, nenhum log estruturado, nenhuma métrica. Quando um sync der erro em produção, ninguém vai saber até o cliente reclamar.
- **Fix:** Plugar Sentry (gratuito até 5k events/mês) ou Logflare. Ao menos em `syncMetaIntegracao`, `verifyState`, `verifyPending`, `loginAction` — capturar erros + contexto (sem PII/tokens).

### `npm run` não tem comandos para tipos / formatação — **LOW**

- **Files:** `package.json:5-10`
- **Problem:** Scripts são só `dev`, `build`, `start`, `lint`. Sem `typecheck`, `format`, `test`. Dev tem que lembrar de `npx tsc --noEmit` manualmente.
- **Fix:** Adicionar `"typecheck": "tsc --noEmit"`, `"format": "prettier --write ."`, `"test": "vitest"` quando testes existirem.

### `INTEGRACAO-GOOGLE.md` e `INTEGRACAO-META.md` sem indicação de qual é mais atual — **LOW**

- **Files:** `INTEGRACAO-GOOGLE.md`, `INTEGRACAO-META.md`, `GUIA-MANUAL.md`, `README.md`, `CLAUDE.md`, `AGENTS.md`
- **Problem:** Seis arquivos `.md` na raiz. Risco de divergência entre eles e o código (e.g., `read_insights` ainda no wizard mas removido do código).
- **Fix:** Consolidar em `docs/` com tabela de conteúdo no README.

---

## Performance

### Index `idx_metricas_data on metricas_diarias(data desc)` sem `agencia_id` — **MED**

- **Files:** `supabase/migrations/20260520120000_schema_inicial.sql:185-187`
- **Problem:** Existem 3 índices em `metricas_diarias`: `(data desc)`, `(cliente_id, data desc)`, `(campanha_id, data desc)`. RLS filtra por `agencia_id = auth_agencia_id()` — sem índice nessa coluna como leading, planner pode escolher seq scan em queries amplas de dashboard. Em produção com milhões de linhas, vai pesar.
- **Fix:** Adicionar `create index idx_metricas_agencia_data on metricas_diarias(agencia_id, data desc)`. Considerar particionar `metricas_diarias` por mês quando passar de 1-2M linhas.

### `listCampaigns/listAdSets/listAds` puxam todas sem cursor incremental — **MED**

- **Files:** `lib/meta-ads/api.ts:187-215`
- **Problem:** Cada sync busca TODAS as campanhas/adsets/ads da ad account (paginação até 20 páginas × 100 = 2000 por entidade). Não há filtro `effective_status`, não há filtro por data. Conta com 500 campanhas históricas + 50 ativas paga o custo das 500 a cada sync.
- **Fix:** Filtrar `filtering=[{"field":"effective_status","operator":"IN","value":["ACTIVE","PAUSED"]}]`. Para ads, considerar `since`/`until` em vez de buscar tudo.

### `await supabase.from("clientes").select(...).is("deleted_at", null)` sem paginação — **LOW**

- **Files:** `app/(dashboard)/integracoes/meta/page.tsx:40-44`, `app/(dashboard)/clientes/page.tsx:7-11`
- **Problem:** Lista todos os clientes sem `limit`/cursor. Agência com 1000 clientes vai puxar tudo. Hoje irrelevante (poucos clientes), risco futuro.
- **Fix:** `limit(100)` por enquanto, paginação real quando passar disso.

### Index parcial `idx_integracoes_sync` referencia coluna não usada — **LOW**

- **Files:** `supabase/migrations/20260520120000_schema_inicial.sql:96`
- **Problem:** Index `on integracoes(proxima_sync) where status = 'ativa'` é overhead (manutenção em writes) sem benefício — `proxima_sync` nunca é populado. Ver "Sync sobrescreve `proxima_sync` jamais" acima.
- **Fix:** Mesmo fix — ou implementar uso de `proxima_sync`, ou dropar o índice.

---

## Test Coverage Gaps

### Cripto e OAuth state sem teste — **HIGH**

- **Files:** `lib/crypto/tokens.ts`, `lib/oauth/state.ts`, `lib/oauth/pending.ts`
- **What's not tested:** roundtrip encrypt/decrypt, tamper detection (modificar 1 byte do blob → throw), TTL expirado, assinatura inválida, malformed payload.
- **Risk:** Bug silencioso na cripto pode (a) inutilizar tokens em banco (b) aceitar state forjado (CSRF furado). Setores extremamente sensíveis sem rede de segurança.
- **Priority:** High.

### RLS isolation tem teste SQL manual, mas nada automatizado — **MED**

- **Files:** `supabase/tests/rls_isolation.sql`
- **What's not tested:** o `.sql` cobre clientes A vs B mas não cobre `integracoes`, `campanhas`, `metricas_diarias`, `metas`, `alertas_*`, `relatorios_gerados`. E nada roda em CI.
- **Risk:** Adicionar policy nova sem testar = vazamento entre tenants.
- **Priority:** Medium-High.

### Sync Meta sem teste de integração — **MED**

- **Files:** `lib/meta-ads/sync.ts`, `lib/meta-ads/api.ts`
- **What's not tested:** parsing de actions Meta (purchase/lead/engagement mapping), batch upsert de 200 métricas, retry em erro Meta, comportamento quando token expirou.
- **Risk:** Refactor do mapeamento de actions vira regressão silenciosa nas métricas do dashboard.
- **Priority:** Medium.

### Callback OAuth sem teste E2E — **MED**

- **Files:** `app/oauth/meta/callback/route.ts`
- **What's not tested:** `state_mismatch`, `user_mismatch`, `exchange_failed`, `cliente_invalido`, fluxo happy path completo (start → callback → contas → action de salvar).
- **Risk:** Mudar a forma do cookie ou a função `signState` quebra o callback sem aviso.
- **Priority:** Medium.

### Server actions sem teste — **LOW**

- **Files:** `app/(dashboard)/clientes/actions.ts`, `app/(dashboard)/configuracoes/actions.ts`, `app/(dashboard)/integracoes/meta/_actions.ts`, `app/(auth)/login/actions.ts`
- **What's not tested:** validação zod, slugify edge cases (nomes com emoji, acentos), erro de DB.
- **Risk:** Baixo — actions são thin wrappers em volta do supabase client.
- **Priority:** Low.

---

## Resumo de prioridade

Ordem de ataque sugerida:

1. **Hoje:** Rotacionar chaves expostas e tirar `.fix-env.ps1` do repo (Security #1).
2. **Hoje:** Remover persistência de secrets em `localStorage` nos wizards (Security #2).
3. **Esta semana:** Refresh / detecção de token Meta expirado + alerta (Security: refresh + Reliability: sync silencia falhas).
4. **Esta semana:** Implementar `scripts/sync-scheduler.ts` ou remover `node-cron` (Tech Debt).
5. **Esta semana:** Adicionar Vitest + testes pra cripto e OAuth state (Test #1).
6. **Próxima:** CI mínimo (`tsc + eslint + vitest`) em PR.
7. **Próxima:** Sentry / observability.
8. **Próxima:** Fix do timeout previsto em sync sequencial (concorrência limitada + maxDuration).
9. **Backlog:** Index `metricas_diarias(agencia_id, data)`, decidir destino de `proxima_sync`, consolidar docs.

---

*Concerns audit: 2026-05-22*
