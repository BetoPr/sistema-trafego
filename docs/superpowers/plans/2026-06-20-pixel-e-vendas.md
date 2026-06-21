# Pixel & Vendas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir a aba única **Pixel & Vendas** em Tráfego (Ads): enviar evento Meta CAPI **Purchase** quando há Fechamento (atribuído por `ctwa_clid` da CTWA), e mostrar painel Gasto/Bruto/Líquido/ROAS por campanha→conjunto. Super Admin only.

**Architecture:** O Fechamento (`tickets.valor_fechado`) dispara `after()` que enfileira uma linha em `capi_eventos` (status `pendente`), resolvendo atribuição (contato → `ad_referral.ctwaClid`/`sourceId` → `anuncios.external_id` → conjunto → campanha → integração → pixel+token). Um cron (worker em `lib/`, rota Bearer CRON_SECRET, claim atômico) processa pendentes e faz `POST /{pixel}/events`. O painel agrega `metricas_diarias.gasto` (spend) + `capi_eventos.valor` (receita) por campanha/conjunto.

**Tech Stack:** Next.js 16 (App Router, `after()`, async params), Supabase (service client bypassa RLS, RLS por `agencia_id`), Meta Graph API v21.0 (Conversions API), AES-256-GCM (tokens).

**Nota sobre testes (TDD):** O repo **não tem test runner** (sem jest/vitest; `playwright` presente mas não wired). Seguindo o padrão estabelecido do projeto, a verificação de cada task é: `npm run build` (Turbopack) + smoke no endpoint de cron (retorna JSON) + checagem SQL via Supabase MCP + **Events Manager → Test Events** no Meta. Não introduzir harness de teste novo (fora de escopo).

**Build sempre com prefixo (cwd reseta):** `cd /c/Users/ADM/Desktop/sistema-trafego && npm run build`.

**Migrations:** aplicar via Supabase MCP (`apply_migration`, projeto `nnswiakwjvoqwcjscbqq`) **e** commitar o arquivo em `supabase/migrations/` pra reprodutibilidade.

**Segurança (não-negociável):** nunca expor service_role/token no browser; auth via `getUser()`/`requireSuperAdmin()`, nunca `getSession()`; token só app-level (`lib/crypto/tokens.ts`); nunca logar token/telefone cru; erros em PT-BR.

---

## File Structure

**Criar:**
- `supabase/migrations/20260621000000_pixel_vendas.sql` — ALTER integracoes (pixel) + CREATE capi_eventos + RLS.
- `lib/meta-ads/capi.ts` — cliente CAPI: hash SHA-256 + `enviarPurchase()`.
- `lib/crm/capi-eventos.ts` — atribuição + `enfileirarPurchase()` + `processarCapiEventosPendentes()` (claim atômico).
- `app/api/cron/capi-eventos/route.ts` — rota do cron (Bearer CRON_SECRET).
- `app/api/integracoes/meta/pixels/route.ts` — GET lista pixels do cliente, POST salva pixel escolhido.
- `app/api/pixel-vendas/reenviar/route.ts` — POST reenfileira um evento.
- `app/(dashboard)/pixel-vendas/page.tsx` — server component (gate + queries + render).
- `app/(dashboard)/pixel-vendas/_client.tsx` — client (busca, filtros, tabela expansível, reenviar, conectar pixel).
- `docs/parking-trafego.md` — registro dos 9 itens parqueados (nomes p/ reuso futuro).

**Modificar:**
- `components/layout/AppSidebar.tsx` — seção `trafego` passa a ter só Pixel & Vendas.
- `lib/meta-ads/conciliar.ts` — fix do `ctwa_clid` (camelCase).
- `lib/meta-ads/api.ts` — scope `ads_management` + `listPixels()`.
- `app/api/atendimentos/[id]/fechamento/route.ts` — `after()` enfileira Purchase.

---

## Task 1: Parquear os 9 itens + doc de parking

**Files:**
- Create: `docs/parking-trafego.md`
- Modify: `components/layout/AppSidebar.tsx:60-81`

- [ ] **Step 1: Criar o doc de parking**

Create `docs/parking-trafego.md`:

```markdown
# Tráfego (Ads) — Itens parqueados (2026-06-20)

Removidos do menu pra focar na 1ª ferramenta (Pixel & Vendas). **Rotas preservadas** (acessíveis por URL direta); nomes guardados pra reuso futuro. Reativar = re-adicionar o item na seção `trafego` de `components/layout/AppSidebar.tsx`.

| Nome | Rota | Estado quando parqueado |
|---|---|---|
| Leads Meta | `/leads-meta` | Funcional (leadgen) |
| Campanhas | `/campanhas` | Placeholder (BREVE) |
| Funil | `/funil` | Placeholder |
| Criativos | `/criativos` | Placeholder |
| Público | `/publico` | Placeholder |
| Relatórios | `/relatorios` | Placeholder |
| Insights IA | `/ia-insights` | Placeholder |
| Alertas | `/alertas` | Placeholder |
| Clientes (Ads) | `/clientes` | Funcional (CRUD) |
```

- [ ] **Step 2: Trocar os itens da seção `trafego` na sidebar**

Em `components/layout/AppSidebar.tsx`, a seção `trafego` (linhas 60-81) hoje lista 9 itens. Substituir o array `items` por só o novo:

```tsx
    // Tráfego (Ads) — visível só pra super_admin
    ...(role === "super_admin"
      ? [
          {
            id: "trafego",
            label: "Tráfego (Ads)",
            icon: "ti-speakerphone",
            iconColor: "var(--mk-icon-purple)",
            items: [
              { href: "/pixel-vendas", label: "Pixel & Vendas", icon: "ti-target-arrow" },
            ],
          } as NavSection,
        ]
      : []),
```

- [ ] **Step 3: Build**

Run: `cd /c/Users/ADM/Desktop/sistema-trafego && npm run build`
Expected: build OK (a rota `/pixel-vendas` ainda não existe; o link 404 até a Task 8 — aceitável durante o desenvolvimento; não commitar até a Task 10 wire-up).

- [ ] **Step 4: NÃO commitar ainda** (a sidebar aponta pra rota inexistente). Commit acontece no final (Task 10). Seguir.

---

## Task 2: Fix do bug `ctwa_clid` (atribuição)

**Files:**
- Modify: `lib/meta-ads/conciliar.ts:56`

O parser grava `metadata.ad_referral.ctwaClid` (camelCase, `webhook-parser.ts:312`), mas o leitor busca `ctwa_clid` (snake). Corrigir o leitor pra casar com os dados já gravados.

- [ ] **Step 1: Trocar a chave no filtro**

Em `lib/meta-ads/conciliar.ts`, linha ~56, trocar:

```ts
      .filter("metadata->ad_referral->>ctwa_clid", "eq", ctwaClid)
```
por:
```ts
      .filter("metadata->ad_referral->>ctwaClid", "eq", ctwaClid)
```

(ou seja: `ctwa_clid` → `ctwaClid`).

- [ ] **Step 2: Verificar via SQL (MCP) que existem mensagens com a chave camelCase**

Rodar via Supabase MCP `execute_sql`:
```sql
select count(*) from mensagens where metadata->'ad_referral'->>'ctwaClid' is not null;
```
Expected: ≥ 0 (confirma que a chave é `ctwaClid`; se houver linhas, o fix passa a casar).

- [ ] **Step 3: Build**

Run: `cd /c/Users/ADM/Desktop/sistema-trafego && npm run build`
Expected: build OK.

---

## Task 3: Migration — `integracoes.pixel` + tabela `capi_eventos`

**Files:**
- Create: `supabase/migrations/20260621000000_pixel_vendas.sql`

- [ ] **Step 1: Escrever a migration**

Create `supabase/migrations/20260621000000_pixel_vendas.sql`:

```sql
-- Pixel & Vendas: pixel no integracoes + ledger de eventos CAPI

alter table integracoes add column if not exists pixel_id text;
alter table integracoes add column if not exists pixel_nome text;

create table if not exists capi_eventos (
  id uuid primary key default gen_random_uuid(),
  agencia_id uuid not null references agencias(id) on delete cascade,
  cliente_id uuid references clientes(id) on delete set null,
  integracao_id uuid references integracoes(id) on delete set null,
  pixel_id text,
  ticket_id uuid not null references tickets(id) on delete cascade,
  contato_id uuid references contatos(id) on delete set null,
  event_id text not null,
  event_name text not null default 'Purchase',
  valor numeric(12,2) not null default 0,
  moeda text not null default 'BRL',
  servico text,
  quantidade integer,
  fechado_em timestamptz,
  ctwa_clid text,
  source_id text,
  anuncio_id uuid references anuncios(id) on delete set null,
  conjunto_id uuid references conjuntos(id) on delete set null,
  campanha_id uuid references campanhas(id) on delete set null,
  status text not null default 'pendente'
    check (status in ('pendente','enviando','enviado','erro','sem_atribuicao')),
  tentativas integer not null default 0,
  erro text,
  resposta jsonb,
  enviado_em timestamptz,
  created_at timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (agencia_id, event_id)
);

create index if not exists idx_capi_eventos_pendentes on capi_eventos(status) where status in ('pendente','erro');
create index if not exists idx_capi_eventos_agencia on capi_eventos(agencia_id, created_at desc);
create index if not exists idx_capi_eventos_campanha on capi_eventos(campanha_id);

alter table capi_eventos enable row level security;
create policy "tenant_capi_eventos" on capi_eventos for all using (agencia_id = auth_agencia_id());
```

- [ ] **Step 2: Aplicar via MCP**

Aplicar com Supabase MCP `apply_migration` (name: `pixel_vendas`, query = conteúdo acima).

- [ ] **Step 3: Verificar**

Via MCP `execute_sql`:
```sql
select column_name from information_schema.columns where table_name='integracoes' and column_name in ('pixel_id','pixel_nome');
select to_regclass('public.capi_eventos');
```
Expected: 2 colunas + `capi_eventos` existe.

---

## Task 4: Cliente CAPI (`lib/meta-ads/capi.ts`)

**Files:**
- Create: `lib/meta-ads/capi.ts`

- [ ] **Step 1: Escrever o cliente CAPI**

Create `lib/meta-ads/capi.ts`:

```ts
import crypto from "crypto";

const GRAPH_BASE = "https://graph.facebook.com";
function apiVersion(): string {
  return process.env.META_API_VERSION || "v21.0";
}

/** SHA-256 hex de um valor normalizado (lowercase + trim), conforme spec do Meta. */
export function hashSHA256(value: string): string {
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

export interface PurchaseInput {
  pixelId: string;
  accessToken: string;
  eventId: string;        // "fechamento:{ticketId}" — dedup
  eventTimeMs: number;    // ms; convertido pra segundos no payload
  value: number;
  currency: string;       // "BRL"
  ctwaClid?: string | null;
  telefone?: string | null;
  contentName?: string | null;
  numItems?: number | null;
  testEventCode?: string | null; // opcional p/ Events Manager Test Events
}

export interface CapiResult {
  ok: boolean;
  status: number;
  fbtrace?: string;
  error?: string;
  raw: unknown;
}

/**
 * Envia um evento Purchase ao Pixel via Conversions API.
 * CTWA: action_source "business_messaging" + messaging_channel "whatsapp" + ctwa_clid em user_data.
 */
export async function enviarPurchase(p: PurchaseInput): Promise<CapiResult> {
  const url = `${GRAPH_BASE}/${apiVersion()}/${p.pixelId}/events`;

  const user_data: Record<string, unknown> = {};
  if (p.ctwaClid) user_data.ctwa_clid = p.ctwaClid;
  if (p.telefone) {
    const digits = p.telefone.replace(/\D/g, "");
    if (digits) user_data.ph = [hashSHA256(digits)];
  }

  const custom_data: Record<string, unknown> = {
    currency: p.currency,
    value: Number(p.value) || 0,
  };
  if (p.contentName) custom_data.content_name = p.contentName;
  if (p.numItems) custom_data.num_items = p.numItems;

  const body: Record<string, unknown> = {
    data: [
      {
        event_name: "Purchase",
        event_time: Math.floor(p.eventTimeMs / 1000),
        action_source: "business_messaging",
        messaging_channel: "whatsapp",
        event_id: p.eventId,
        user_data,
        custom_data,
      },
    ],
    access_token: p.accessToken,
  };
  if (p.testEventCode) body.test_event_code = p.testEventCode;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch (e) {
    return { ok: false, status: 0, error: e instanceof Error ? e.message : String(e), raw: null };
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok || (json as { error?: unknown }).error) {
    const err = (json as { error?: { message?: string; fbtrace_id?: string } }).error;
    return { ok: false, status: res.status, error: err?.message || res.statusText, fbtrace: err?.fbtrace_id, raw: json };
  }
  return { ok: true, status: res.status, raw: json };
}
```

- [ ] **Step 2: Build**

Run: `cd /c/Users/ADM/Desktop/sistema-trafego && npm run build`
Expected: build OK (módulo compila; nenhum import quebrado).

---

## Task 5: `listPixels` + scope `ads_management` (`lib/meta-ads/api.ts`)

**Files:**
- Modify: `lib/meta-ads/api.ts:119` (scope) e fim do arquivo (novo helper)

- [ ] **Step 1: Subir o scope**

Em `lib/meta-ads/api.ts`, dentro de `buildAuthorizeUrl`, trocar a linha 119:

```ts
  // ads_read (leitura) + ads_management (escrever eventos no Pixel via CAPI).
  // NÃO usar business_management (causou o popup de Business Manager que
  // cancelava sozinho). ads_management exige Advanced Access (App Review) pra
  // clientes que não são admin/tester do app — ver riscos no spec.
  url.searchParams.set("scope", "ads_read,ads_management");
```

- [ ] **Step 2: Adicionar `listPixels`**

No fim de `lib/meta-ads/api.ts`, adicionar:

```ts
/**
 * Lista os Pixels (datasets) de uma ad account.
 * `adAccountId` pode vir como "123" (numérico) ou "act_123"; normaliza pra "act_".
 */
export async function listPixels(token: string, adAccountId: string): Promise<{ id: string; name: string }[]> {
  const acct = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
  const u = new URL(graphUrl(`/${acct}/adspixels`));
  u.searchParams.set("fields", "id,name");
  u.searchParams.set("access_token", token);
  const res = await fetch(u.toString(), { cache: "no-store" });
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(`Meta adspixels falhou: ${json.error?.message || res.statusText}`);
  }
  return ((json.data as { id: string; name?: string }[]) || []).map((p) => ({ id: p.id, name: p.name || p.id }));
}
```

- [ ] **Step 3: Build**

Run: `cd /c/Users/ADM/Desktop/sistema-trafego && npm run build`
Expected: build OK.

---

## Task 6: Atribuição + fila (`lib/crm/capi-eventos.ts`)

**Files:**
- Create: `lib/crm/capi-eventos.ts`

- [ ] **Step 1: Escrever o módulo (atribuição + enfileirar + processar)**

Create `lib/crm/capi-eventos.ts`:

```ts
import { createServiceClient } from "@/lib/supabase/service";
import { byteaToBuffer, decryptToken } from "@/lib/crypto/tokens";
import { enviarPurchase } from "@/lib/meta-ads/capi";

type Sb = ReturnType<typeof createServiceClient>;

interface Atribuicao {
  ctwaClid: string | null;
  sourceId: string | null;
}
interface AnuncioResolvido {
  anuncioId: string;
  conjuntoId: string;
  campanhaId: string;
  integracaoId: string;
  clienteId: string;
}

/** Acha o ctwa_clid + sourceId (ad id) da 1ª mensagem do contato vinda de anúncio. */
async function acharAtribuicao(sb: Sb, agenciaId: string, contatoId: string): Promise<Atribuicao | null> {
  const { data: tks } = await sb.from("tickets").select("id").eq("agencia_id", agenciaId).eq("contato_id", contatoId);
  const ids = (tks || []).map((t) => t.id as string);
  if (!ids.length) return null;
  const { data: msg } = await sb
    .from("mensagens")
    .select("metadata")
    .eq("agencia_id", agenciaId)
    .in("ticket_id", ids)
    .not("metadata->ad_referral->>ctwaClid", "is", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<{ metadata: { ad_referral?: { ctwaClid?: string; sourceId?: string } } }>();
  if (!msg?.metadata?.ad_referral) return null;
  const ref = msg.metadata.ad_referral;
  return { ctwaClid: ref.ctwaClid ?? null, sourceId: ref.sourceId ?? null };
}

/** Resolve sourceId (ad external id) → anuncio/conjunto/campanha/integração/cliente. */
async function resolverAnuncio(sb: Sb, agenciaId: string, sourceId: string): Promise<AnuncioResolvido | null> {
  const { data: an } = await sb
    .from("anuncios")
    .select("id, conjunto_id, conjuntos!inner(id, campanha_id, campanhas!inner(id, integracao_id, cliente_id))")
    .eq("agencia_id", agenciaId)
    .eq("external_id", sourceId)
    .limit(1)
    .maybeSingle<{
      id: string;
      conjunto_id: string;
      conjuntos: { campanha_id: string; campanhas: { id: string; integracao_id: string; cliente_id: string } };
    }>();
  if (!an) return null;
  const camp = an.conjuntos?.campanhas;
  if (!camp) return null;
  return {
    anuncioId: an.id,
    conjuntoId: an.conjunto_id,
    campanhaId: camp.id,
    integracaoId: camp.integracao_id,
    clienteId: camp.cliente_id,
  };
}

/**
 * Enfileira o Purchase de um Fechamento (idempotente por event_id).
 * Chamado via after() na rota de fechamento. Nunca lança.
 */
export async function enfileirarPurchase(ticketId: string): Promise<void> {
  const sb = createServiceClient();
  const { data: tk } = await sb
    .from("tickets")
    .select("id, agencia_id, contato_id, valor_fechado, metadata, fechado_em")
    .eq("id", ticketId)
    .maybeSingle<{
      agencia_id: string;
      contato_id: string;
      valor_fechado: number | null;
      metadata: { servico?: string; quantidade?: number } | null;
      fechado_em: string | null;
    }>();
  if (!tk || tk.valor_fechado == null) return;

  const eventId = `fechamento:${ticketId}`;
  // já existe? (dedup no enfileiramento)
  const { data: existe } = await sb
    .from("capi_eventos")
    .select("id")
    .eq("agencia_id", tk.agencia_id)
    .eq("event_id", eventId)
    .maybeSingle();
  if (existe) return;

  const atrib = await acharAtribuicao(sb, tk.agencia_id, tk.contato_id);
  const anr = atrib?.sourceId ? await resolverAnuncio(sb, tk.agencia_id, atrib.sourceId) : null;

  // Sem integração/pixel resolvido → não dá pra mandar (não sabemos o pixel).
  const semAtribuicao = !anr;

  await sb.from("capi_eventos").insert({
    agencia_id: tk.agencia_id,
    cliente_id: anr?.clienteId ?? null,
    integracao_id: anr?.integracaoId ?? null,
    pixel_id: null, // resolvido no envio (lê integracoes.pixel_id)
    ticket_id: ticketId,
    contato_id: tk.contato_id,
    event_id: eventId,
    event_name: "Purchase",
    valor: tk.valor_fechado,
    moeda: "BRL",
    servico: tk.metadata?.servico ?? null,
    quantidade: tk.metadata?.quantidade ?? null,
    fechado_em: tk.fechado_em,
    ctwa_clid: atrib?.ctwaClid ?? null,
    source_id: atrib?.sourceId ?? null,
    anuncio_id: anr?.anuncioId ?? null,
    conjunto_id: anr?.conjuntoId ?? null,
    campanha_id: anr?.campanhaId ?? null,
    status: semAtribuicao ? "sem_atribuicao" : "pendente",
    tentativas: 0,
  });
}

export interface ProcessamentoResult {
  processados: number;
  enviados: number;
  erros: number;
  pulados: number;
  sem_pixel: number;
}

/** Processa eventos pendentes com claim atômico. Chamado pelo cron. */
export async function processarCapiEventosPendentes(): Promise<ProcessamentoResult> {
  const sb = createServiceClient();
  const res: ProcessamentoResult = { processados: 0, enviados: 0, erros: 0, pulados: 0, sem_pixel: 0 };

  // Reaper: devolve pra 'pendente' eventos presos em 'enviando' há >10min
  // (timeout serverless no envio anterior). Dedup por event_id torna o reenvio seguro.
  const presoAntes = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  await sb
    .from("capi_eventos")
    .update({ status: "pendente", atualizado_em: new Date().toISOString() })
    .eq("status", "enviando")
    .lt("atualizado_em", presoAntes);

  const { data: pendentes } = await sb
    .from("capi_eventos")
    .select("id, agencia_id, integracao_id, ticket_id, contato_id, event_id, valor, moeda, servico, quantidade, fechado_em, ctwa_clid, created_at, tentativas")
    .eq("status", "pendente")
    .lt("tentativas", 5)
    .limit(50);

  for (const ev of pendentes || []) {
    res.processados++;

    // marcar() nunca lança.
    const marcar = async (status: string, patch: Record<string, unknown> = {}) => {
      try {
        await sb.from("capi_eventos").update({ status, atualizado_em: new Date().toISOString(), ...patch }).eq("id", ev.id);
      } catch (e) {
        console.error(`[capi] marcar '${status}' falhou (${ev.id}):`, e instanceof Error ? e.message : String(e));
      }
    };

    // CLAIM ATÔMICO: pendente → enviando antes de qualquer envio lento.
    const { data: claim, error: claimErr } = await sb
      .from("capi_eventos")
      .update({ status: "enviando", atualizado_em: new Date().toISOString() })
      .eq("id", ev.id)
      .eq("status", "pendente")
      .select("id");
    if (claimErr) { console.error(`[capi] claim falhou (${ev.id}):`, claimErr.message); res.erros++; continue; }
    if (!claim || claim.length === 0) { res.pulados++; continue; }

    if (!ev.integracao_id) { await marcar("sem_atribuicao"); res.sem_pixel++; continue; }

    const { data: integ } = await sb
      .from("integracoes")
      .select("access_token_encrypted, pixel_id")
      .eq("id", ev.integracao_id)
      .maybeSingle<{ access_token_encrypted: unknown; pixel_id: string | null }>();
    if (!integ?.pixel_id || !integ.access_token_encrypted) {
      await marcar("erro", { erro: "pixel ou token ausente na integração (reconectar/escolher pixel)", tentativas: (ev.tentativas as number) + 1, status: "pendente" });
      res.erros++;
      continue;
    }

    let token: string;
    try {
      token = decryptToken(byteaToBuffer(integ.access_token_encrypted));
    } catch (e) {
      await marcar("erro", { erro: `decrypt token: ${e instanceof Error ? e.message : String(e)}`, tentativas: (ev.tentativas as number) + 1, status: "pendente" });
      res.erros++;
      continue;
    }

    const { data: ct } = await sb
      .from("contatos")
      .select("telefone, whatsapp, wa_id")
      .eq("id", ev.contato_id)
      .maybeSingle<{ telefone: string | null; whatsapp: string | null; wa_id: string | null }>();
    const telefone = ct?.whatsapp || ct?.telefone || ct?.wa_id || null;

    const r = await enviarPurchase({
      pixelId: integ.pixel_id,
      accessToken: token,
      eventId: ev.event_id as string,
      eventTimeMs: Date.parse((ev.fechado_em as string) || (ev.created_at as string)),
      value: ev.valor as number,
      currency: (ev.moeda as string) || "BRL",
      ctwaClid: (ev.ctwa_clid as string) || null,
      telefone,
      contentName: (ev.servico as string) || null,
      numItems: (ev.quantidade as number) || null,
    });

    if (r.ok) {
      await marcar("enviado", { enviado_em: new Date().toISOString(), pixel_id: integ.pixel_id, resposta: r.raw as object, erro: null });
      res.enviados++;
    } else {
      await marcar("pendente", { erro: r.error || "erro CAPI", resposta: r.raw as object, tentativas: (ev.tentativas as number) + 1 });
      res.erros++;
    }
  }

  return res;
}
```

- [ ] **Step 2: Build**

Run: `cd /c/Users/ADM/Desktop/sistema-trafego && npm run build`
Expected: build OK. Se o TS reclamar do shape aninhado em `resolverAnuncio` (PostgREST embed), ajustar o tipo do `maybeSingle<...>()` pra `conjuntos` ser objeto (não array) — o embed `!inner` com `.limit(1).maybeSingle()` retorna objeto único.

---

## Task 7: Cron route + registro pg_cron

**Files:**
- Create: `app/api/cron/capi-eventos/route.ts`

- [ ] **Step 1: Escrever a rota do cron**

Create `app/api/cron/capi-eventos/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { processarCapiEventosPendentes } from "@/lib/crm/capi-eventos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Processa eventos CAPI pendentes (Purchase → Meta). Protegido por CRON_SECRET.
 * Disparado pelo Supabase pg_cron 1/min.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET não configurado" }, { status: 500 });

  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const inicio = Date.now();
  const r = await processarCapiEventosPendentes();
  return NextResponse.json({ ok: true, ...r, duracao_ms: Date.now() - inicio });
}
```

- [ ] **Step 2: Build + smoke local do auth**

Run: `cd /c/Users/ADM/Desktop/sistema-trafego && npm run build`
Expected: build OK.

Smoke (após deploy): `curl -s https://<APP_URL>/api/cron/capi-eventos` → `{"error":"unauthorized"}` (sem header). Com header correto → `{"ok":true,"processados":0,...}`.

- [ ] **Step 3: Registrar o pg_cron (via MCP, net-new — sem template no repo)**

Após o deploy da rota, aplicar via Supabase MCP `execute_sql` (substituir `<APP_URL>` e `<CRON_SECRET>` pelos reais; **não commitar o secret**):

```sql
select cron.schedule(
  'capi-eventos-1min',
  '* * * * *',
  $$
  select net.http_get(
    url := 'https://<APP_URL>/api/cron/capi-eventos',
    headers := jsonb_build_object('Authorization', 'Bearer <CRON_SECRET>')
  );
  $$
);
```

Verificar: `select jobname, schedule, active from cron.job where jobname='capi-eventos-1min';` → 1 linha, active=true.

---

## Task 8: Hook do Fechamento → enfileirar Purchase

**Files:**
- Modify: `app/api/atendimentos/[id]/fechamento/route.ts`

- [ ] **Step 1: Importar `after` + o enfileirador**

No topo de `app/api/atendimentos/[id]/fechamento/route.ts`, ajustar imports:

```ts
import { NextResponse, after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { audit } from "@/lib/crm/audit";
import { enfileirarPurchase } from "@/lib/crm/capi-eventos";
```

- [ ] **Step 2: Disparar o enfileiramento após o UPDATE bem-sucedido (no POST)**

No handler `POST`, logo após o bloco `if (error) return ...;` e antes do `void audit({...})`, adicionar:

```ts
  // Enfileira o Purchase pro Meta (CAPI) — assíncrono, não bloqueia a resposta.
  // Só quando há valor (fechamento real). Idempotente por event_id (dedup).
  if (body.valor != null) {
    after(async () => {
      try {
        await enfileirarPurchase(id);
      } catch (e) {
        console.error("[fechamento] enfileirar CAPI falhou:", e instanceof Error ? e.message : String(e));
      }
    });
  }
```

- [ ] **Step 3: Build**

Run: `cd /c/Users/ADM/Desktop/sistema-trafego && npm run build`
Expected: build OK. (Confirmar que `after` é exportado de `next/server` nesta versão; é, no Next 16.)

---

## Task 9: Endpoints de Pixel (listar/salvar) + Reenviar

**Files:**
- Create: `app/api/integracoes/meta/pixels/route.ts`
- Create: `app/api/pixel-vendas/reenviar/route.ts`

- [ ] **Step 1: Endpoint de pixels (GET lista, POST salva)**

Create `app/api/integracoes/meta/pixels/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/crm/permissions";
import { createServiceClient } from "@/lib/supabase/service";
import { byteaToBuffer, decryptToken } from "@/lib/crypto/tokens";
import { listPixels } from "@/lib/meta-ads/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/integracoes/meta/pixels?cliente_id=...  → lista pixels da integração meta do cliente
export async function GET(req: NextRequest) {
  const ctx = await requireSuperAdmin();
  const clienteId = new URL(req.url).searchParams.get("cliente_id");
  if (!clienteId) return NextResponse.json({ error: "cliente_id obrigatório" }, { status: 400 });

  const sb = createServiceClient();
  const { data: integ } = await sb
    .from("integracoes")
    .select("id, account_id, access_token_encrypted")
    .eq("agencia_id", ctx.agenciaId)
    .eq("cliente_id", clienteId)
    .eq("plataforma", "meta_ads")
    .maybeSingle<{ id: string; account_id: string; access_token_encrypted: unknown }>();
  if (!integ?.access_token_encrypted) return NextResponse.json({ error: "integração Meta não encontrada" }, { status: 404 });

  try {
    const token = decryptToken(byteaToBuffer(integ.access_token_encrypted));
    const pixels = await listPixels(token, integ.account_id);
    return NextResponse.json({ ok: true, integracao_id: integ.id, pixels });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "erro ao listar pixels" }, { status: 502 });
  }
}

// POST /api/integracoes/meta/pixels  body: { integracao_id, pixel_id, pixel_nome }
export async function POST(req: NextRequest) {
  const ctx = await requireSuperAdmin();
  const body = (await req.json().catch(() => ({}))) as { integracao_id?: string; pixel_id?: string; pixel_nome?: string };
  if (!body.integracao_id || !body.pixel_id) return NextResponse.json({ error: "integracao_id e pixel_id obrigatórios" }, { status: 400 });

  const sb = createServiceClient();
  const { error } = await sb
    .from("integracoes")
    .update({ pixel_id: body.pixel_id, pixel_nome: body.pixel_nome ?? null })
    .eq("id", body.integracao_id)
    .eq("agencia_id", ctx.agenciaId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Endpoint de reenviar**

Create `app/api/pixel-vendas/reenviar/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/crm/permissions";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/pixel-vendas/reenviar  body: { evento_id }
export async function POST(req: NextRequest) {
  const ctx = await requireSuperAdmin();
  const body = (await req.json().catch(() => ({}))) as { evento_id?: string };
  if (!body.evento_id) return NextResponse.json({ error: "evento_id obrigatório" }, { status: 400 });

  const sb = createServiceClient();
  const { error } = await sb
    .from("capi_eventos")
    .update({ status: "pendente", tentativas: 0, erro: null, atualizado_em: new Date().toISOString() })
    .eq("id", body.evento_id)
    .eq("agencia_id", ctx.agenciaId)
    .in("status", ["erro", "sem_atribuicao"]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Build**

Run: `cd /c/Users/ADM/Desktop/sistema-trafego && npm run build`
Expected: build OK.

---

## Task 10: Página Pixel & Vendas (server) + client

**Files:**
- Create: `app/(dashboard)/pixel-vendas/page.tsx`
- Create: `app/(dashboard)/pixel-vendas/_client.tsx`

- [ ] **Step 1: Server component (gate + agregação + render do shell)**

Create `app/(dashboard)/pixel-vendas/page.tsx`:

```tsx
import { requireSuperAdmin } from "@/lib/crm/permissions";
import { createServiceClient } from "@/lib/supabase/service";
import { PixelVendasClient } from "./_client";

export const dynamic = "force-dynamic";

const PERIODOS: Record<string, number> = { "7d": 7, "14d": 14, "30d": 30, "90d": 90 };

export interface LinhaConjunto {
  conjunto_id: string | null;
  nome: string;
  gasto: number;
  bruto: number;
  liquido: number;
  roas: number | null;
  vendas: number;
}
export interface LinhaCampanha {
  campanha_id: string | null;
  nome: string;
  gasto: number;
  bruto: number;
  liquido: number;
  roas: number | null;
  vendas: number;
  conjuntos: LinhaConjunto[];
}
export interface EventoRow {
  id: string;
  contato_nome: string | null;
  valor: number;
  campanha_nome: string | null;
  ctwa_clid: string | null;
  status: string;
  created_at: string;
}
export interface ClientePixel {
  cliente_id: string;
  cliente_nome: string;
  integracao_id: string;
  pixel_id: string | null;
  pixel_nome: string | null;
}

export default async function Page({ searchParams }: { searchParams: Promise<{ periodo?: string; cliente?: string }> }) {
  const ctx = await requireSuperAdmin();
  const sb = createServiceClient();
  const params = await searchParams;
  const periodo = params.periodo && PERIODOS[params.periodo] ? params.periodo : "30d";
  const dias = PERIODOS[periodo];
  const desdeDate = new Date(Date.now() - dias * 24 * 3600 * 1000);
  const desdeISO = desdeDate.toISOString();
  const desdeData = desdeISO.slice(0, 10); // YYYY-MM-DD p/ metricas_diarias.data

  // ---- Spend por campanha + conjunto (metricas_diarias) ----
  let mq = sb
    .from("metricas_diarias")
    .select("campanha_id, conjunto_id, gasto, cliente_id")
    .eq("agencia_id", ctx.agenciaId)
    .gte("data", desdeData);
  if (params.cliente) mq = mq.eq("cliente_id", params.cliente);
  const { data: metricas } = await mq;

  const gastoCamp = new Map<string, number>();
  const gastoConj = new Map<string, number>();
  for (const m of metricas || []) {
    if (m.campanha_id) gastoCamp.set(m.campanha_id, (gastoCamp.get(m.campanha_id) || 0) + Number(m.gasto || 0));
    if (m.conjunto_id) gastoConj.set(m.conjunto_id, (gastoConj.get(m.conjunto_id) || 0) + Number(m.gasto || 0));
  }

  // ---- Receita por campanha + conjunto (capi_eventos) ----
  let eq = sb
    .from("capi_eventos")
    .select("id, valor, campanha_id, conjunto_id, ctwa_clid, status, created_at, cliente_id, contato_id, servico")
    .eq("agencia_id", ctx.agenciaId)
    .gte("created_at", desdeISO)
    .order("created_at", { ascending: false })
    .limit(500);
  if (params.cliente) eq = eq.eq("cliente_id", params.cliente);
  const { data: eventos } = await eq;

  const brutoCamp = new Map<string, number>();
  const vendasCamp = new Map<string, number>();
  const brutoConj = new Map<string, number>();
  const vendasConj = new Map<string, number>();
  let brutoTotal = 0;
  let vendasTotal = 0;
  let comClid = 0;
  for (const e of eventos || []) {
    brutoTotal += Number(e.valor || 0);
    vendasTotal++;
    if (e.ctwa_clid) comClid++;
    const ck = e.campanha_id || "__none__";
    brutoCamp.set(ck, (brutoCamp.get(ck) || 0) + Number(e.valor || 0));
    vendasCamp.set(ck, (vendasCamp.get(ck) || 0) + 1);
    if (e.conjunto_id) {
      brutoConj.set(e.conjunto_id, (brutoConj.get(e.conjunto_id) || 0) + Number(e.valor || 0));
      vendasConj.set(e.conjunto_id, (vendasConj.get(e.conjunto_id) || 0) + 1);
    }
  }

  // ---- Nomes de campanhas/conjuntos ----
  const campIds = Array.from(new Set([...gastoCamp.keys(), ...brutoCamp.keys()].filter((k) => k && k !== "__none__")));
  const conjIds = Array.from(new Set([...gastoConj.keys(), ...brutoConj.keys()]));
  const { data: campRows } = campIds.length
    ? await sb.from("campanhas").select("id, nome").eq("agencia_id", ctx.agenciaId).in("id", campIds)
    : { data: [] as { id: string; nome: string }[] };
  const { data: conjRows } = conjIds.length
    ? await sb.from("conjuntos").select("id, nome, campanha_id").eq("agencia_id", ctx.agenciaId).in("id", conjIds)
    : { data: [] as { id: string; nome: string; campanha_id: string }[] };
  const nomeCamp = new Map((campRows || []).map((c) => [c.id, c.nome]));
  const conjPorCamp = new Map<string, { id: string; nome: string }[]>();
  for (const c of conjRows || []) {
    const arr = conjPorCamp.get(c.campanha_id) || [];
    arr.push({ id: c.id, nome: c.nome });
    conjPorCamp.set(c.campanha_id, arr);
  }

  const calcRoas = (bruto: number, gasto: number) => (gasto > 0 ? bruto / gasto : null);

  const linhas: LinhaCampanha[] = campIds.map((cid) => {
    const gasto = gastoCamp.get(cid) || 0;
    const bruto = brutoCamp.get(cid) || 0;
    const conjuntos: LinhaConjunto[] = (conjPorCamp.get(cid) || []).map((cj) => {
      const cg = gastoConj.get(cj.id) || 0;
      const cb = brutoConj.get(cj.id) || 0;
      return { conjunto_id: cj.id, nome: cj.nome, gasto: cg, bruto: cb, liquido: cb - cg, roas: calcRoas(cb, cg), vendas: vendasConj.get(cj.id) || 0 };
    });
    return { campanha_id: cid, nome: nomeCamp.get(cid) || cid, gasto, bruto, liquido: bruto - gasto, roas: calcRoas(bruto, gasto), vendas: vendasCamp.get(cid) || 0, conjuntos };
  });
  // bucket "Sem campanha" (eventos sem campanha_id)
  if (brutoCamp.has("__none__")) {
    const bruto = brutoCamp.get("__none__") || 0;
    linhas.push({ campanha_id: null, nome: "Sem campanha (sem click-id)", gasto: 0, bruto, liquido: bruto, roas: null, vendas: vendasCamp.get("__none__") || 0, conjuntos: [] });
  }
  linhas.sort((a, b) => b.bruto - a.bruto);

  const gastoTotal = Array.from(gastoCamp.values()).reduce((s, v) => s + v, 0);
  const kpis = {
    gasto: gastoTotal,
    bruto: brutoTotal,
    liquido: brutoTotal - gastoTotal,
    roas: gastoTotal > 0 ? brutoTotal / gastoTotal : null,
    matchClid: vendasTotal > 0 ? Math.round((comClid / vendasTotal) * 100) : 0,
    vendas: vendasTotal,
  };

  // ---- Feed de eventos (nomes de contato + campanha) ----
  const contatoIds = Array.from(new Set((eventos || []).map((e) => e.contato_id).filter(Boolean) as string[]));
  const { data: contatos } = contatoIds.length
    ? await sb.from("contatos").select("id, nome").in("id", contatoIds)
    : { data: [] as { id: string; nome: string | null }[] };
  const nomeContato = new Map((contatos || []).map((c) => [c.id, c.nome]));
  const feed: EventoRow[] = (eventos || []).slice(0, 50).map((e) => ({
    id: e.id,
    contato_nome: nomeContato.get(e.contato_id as string) || null,
    valor: Number(e.valor || 0),
    campanha_nome: e.campanha_id ? nomeCamp.get(e.campanha_id) || null : null,
    ctwa_clid: e.ctwa_clid,
    status: e.status,
    created_at: e.created_at,
  }));

  // ---- Clientes com integração Meta (pra conectar pixel) ----
  const { data: integs } = await sb
    .from("integracoes")
    .select("id, cliente_id, pixel_id, pixel_nome, clientes!inner(nome)")
    .eq("agencia_id", ctx.agenciaId)
    .eq("plataforma", "meta_ads");
  const clientesPixel: ClientePixel[] = (integs || []).map((i) => ({
    cliente_id: i.cliente_id as string,
    cliente_nome: (i as { clientes?: { nome?: string } }).clientes?.nome || "—",
    integracao_id: i.id as string,
    pixel_id: (i as { pixel_id: string | null }).pixel_id,
    pixel_nome: (i as { pixel_nome: string | null }).pixel_nome,
  }));

  return (
    <PixelVendasClient
      periodo={periodo}
      clienteFiltro={params.cliente || ""}
      kpis={kpis}
      linhas={linhas}
      feed={feed}
      clientesPixel={clientesPixel}
    />
  );
}
```

- [ ] **Step 2: Client component (busca, filtros, tabela expansível, reenviar, conectar pixel)**

Create `app/(dashboard)/pixel-vendas/_client.tsx`. Segue o padrão visual do site (`mk-*`, ícones SVG, verde `#10b981`). Layout do mockup v3: título com ícone SVG, filtros embaixo à esquerda.

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { LinhaCampanha, EventoRow, ClientePixel } from "./page";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const PERIODOS: [string, string][] = [["7d", "7 dias"], ["14d", "14 dias"], ["30d", "30 dias"], ["90d", "90 dias"]];

interface Kpis { gasto: number; bruto: number; liquido: number; roas: number | null; matchClid: number; vendas: number }

export function PixelVendasClient({
  periodo, clienteFiltro, kpis, linhas, feed, clientesPixel,
}: {
  periodo: string; clienteFiltro: string; kpis: Kpis; linhas: LinhaCampanha[]; feed: EventoRow[]; clientesPixel: ClientePixel[];
}) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [aberta, setAberta] = useState<Record<string, boolean>>({});

  const ir = (p: { periodo?: string; cliente?: string }) => {
    const q = new URLSearchParams();
    q.set("periodo", p.periodo ?? periodo);
    const cli = p.cliente ?? clienteFiltro;
    if (cli) q.set("cliente", cli);
    router.push(`/pixel-vendas?${q.toString()}`);
  };

  const linhasFiltradas = useMemo(
    () => linhas.filter((l) => l.nome.toLowerCase().includes(busca.trim().toLowerCase())),
    [linhas, busca],
  );

  const roasTxt = (r: number | null) => (r == null ? "—" : `${r.toFixed(2).replace(".", ",")}x`);

  async function reenviar(id: string) {
    await fetch("/api/pixel-vendas/reenviar", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ evento_id: id }) });
    router.refresh();
  }

  return (
    <div className="mk-page">
      {/* Header: título + filtros embaixo, à esquerda */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
        <h1 style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 22, fontWeight: 700, color: "var(--mk-accent)" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1" /></svg>
          Pixel &amp; Vendas
        </h1>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input className="mk-input" placeholder="Pesquisar campanha…" value={busca} onChange={(e) => setBusca(e.target.value)} style={{ minWidth: 200 }} />
          <select className="mk-input" value={clienteFiltro} onChange={(e) => ir({ cliente: e.target.value })}>
            <option value="">Todos os clientes</option>
            {clientesPixel.map((c) => <option key={c.cliente_id} value={c.cliente_id}>{c.cliente_nome}</option>)}
          </select>
          <select className="mk-input" value={periodo} onChange={(e) => ir({ periodo: e.target.value })}>
            {PERIODOS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 16 }}>
        <Kpi titulo="Gasto em ads" valor={BRL.format(kpis.gasto)} sub="investido no período" cor="#f0a35e" />
        <Kpi titulo="Faturamento bruto" valor={BRL.format(kpis.bruto)} sub={`${kpis.vendas} vendas atribuídas`} />
        <Kpi titulo="Faturamento líquido" valor={BRL.format(kpis.liquido)} sub="bruto − gasto" cor="var(--mk-accent)" destaque />
        <Kpi titulo="ROAS" valor={roasTxt(kpis.roas)} sub={`match de click-id: ${kpis.matchClid}%`} />
      </div>

      {/* Tabela campanha → conjunto */}
      <div className="mk-card" style={{ padding: 0, marginBottom: 16, overflow: "hidden" }}>
        <div style={{ padding: "12px 14px", fontWeight: 600, borderBottom: "1px solid var(--mk-border)" }}>Desempenho por campanha</div>
        <table className="mk-table" style={{ width: "100%" }}>
          <thead>
            <tr><th>Campanha / Conjunto</th><th>Gasto</th><th>Bruto</th><th>Líquido</th><th>ROAS</th><th>Vendas</th></tr>
          </thead>
          <tbody>
            {linhasFiltradas.length === 0 && <tr><td colSpan={6} style={{ textAlign: "center", opacity: 0.6, padding: 18 }}>Sem dados no período.</td></tr>}
            {linhasFiltradas.map((l) => {
              const key = l.campanha_id || "__none__";
              const temConj = l.conjuntos.length > 0;
              const open = !!aberta[key];
              return (
                <FragmentLinha key={key} linha={l} open={open} temConj={temConj} onToggle={() => setAberta((s) => ({ ...s, [key]: !s[key] }))} BRL={BRL} roasTxt={roasTxt} />
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Feed de eventos */}
      <div className="mk-card" style={{ padding: 0, marginBottom: 16, overflow: "hidden" }}>
        <div style={{ padding: "12px 14px", fontWeight: 600, borderBottom: "1px solid var(--mk-border)" }}>Vendas enviadas ao Meta (Purchase)</div>
        {feed.length === 0 && <div style={{ padding: 16, opacity: 0.6 }}>Nenhum evento ainda.</div>}
        {feed.map((e) => (
          <div key={e.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderTop: "1px solid var(--mk-border)", fontSize: 13 }}>
            <div>{e.contato_nome || "Contato"} · <b>{BRL.format(e.valor)}</b> · {e.campanha_nome || (e.ctwa_clid ? "—" : "sem click-id")} · {new Date(e.created_at).toLocaleString("pt-BR")}</div>
            <StatusEvento status={e.status} onReenviar={() => reenviar(e.id)} />
          </div>
        ))}
      </div>

      {/* Conectar Pixel */}
      <ConectarPixel clientes={clientesPixel} />
    </div>
  );
}

function FragmentLinha({ linha, open, temConj, onToggle, BRL, roasTxt }: { linha: LinhaCampanha; open: boolean; temConj: boolean; onToggle: () => void; BRL: Intl.NumberFormat; roasTxt: (r: number | null) => string }) {
  return (
    <>
      <tr onClick={temConj ? onToggle : undefined} style={{ cursor: temConj ? "pointer" : "default" }}>
        <td>{temConj ? (open ? "▾ " : "▸ ") : ""}{linha.nome}</td>
        <td style={{ color: "#f0a35e" }}>{BRL.format(linha.gasto)}</td>
        <td>{BRL.format(linha.bruto)}</td>
        <td style={{ color: "var(--mk-accent)", fontWeight: 600 }}>{BRL.format(linha.liquido)}</td>
        <td>{roasTxt(linha.roas)}</td>
        <td>{linha.vendas}</td>
      </tr>
      {open && linha.conjuntos.map((cj) => (
        <tr key={cj.conjunto_id} style={{ opacity: 0.8 }}>
          <td style={{ paddingLeft: 28 }}>· {cj.nome}</td>
          <td>{BRL.format(cj.gasto)}</td>
          <td>{BRL.format(cj.bruto)}</td>
          <td>{BRL.format(cj.liquido)}</td>
          <td>{roasTxt(cj.roas)}</td>
          <td>{cj.vendas}</td>
        </tr>
      ))}
    </>
  );
}

function Kpi({ titulo, valor, sub, cor, destaque }: { titulo: string; valor: string; sub: string; cor?: string; destaque?: boolean }) {
  return (
    <div className="mk-card" style={{ padding: "12px 14px", ...(destaque ? { borderColor: "var(--mk-accent)" } : {}) }}>
      <div style={{ fontSize: 11, opacity: 0.6, textTransform: "uppercase", letterSpacing: ".04em" }}>{titulo}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: cor || "inherit" }}>{valor}</div>
      <div style={{ fontSize: 11, opacity: 0.5 }}>{sub}</div>
    </div>
  );
}

function StatusEvento({ status, onReenviar }: { status: string; onReenviar: () => void }) {
  if (status === "enviado") return <span style={{ color: "var(--mk-accent)" }}>✓ enviado</span>;
  if (status === "enviando" || status === "pendente") return <span style={{ opacity: 0.6 }}>⏳ {status}</span>;
  return <button className="mk-btn-sm" onClick={onReenviar}>Reenviar</button>;
}

function ConectarPixel({ clientes }: { clientes: ClientePixel[] }) {
  const [carregando, setCarregando] = useState<string | null>(null);
  const [pixels, setPixels] = useState<Record<string, { id: string; name: string }[]>>({});

  async function listar(clienteId: string, integracaoId: string) {
    setCarregando(integracaoId);
    try {
      const r = await fetch(`/api/integracoes/meta/pixels?cliente_id=${clienteId}`).then((x) => x.json());
      if (r.pixels) setPixels((s) => ({ ...s, [integracaoId]: r.pixels }));
      else alert(r.error || "Erro ao listar pixels");
    } finally { setCarregando(null); }
  }
  async function salvar(integracaoId: string, pixelId: string, pixelNome: string) {
    await fetch("/api/integracoes/meta/pixels", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ integracao_id: integracaoId, pixel_id: pixelId, pixel_nome: pixelNome }) });
    location.reload();
  }

  return (
    <div className="mk-card" style={{ padding: 14, borderColor: "var(--mk-accent)" }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Conectar Pixel (Meta)</div>
      {clientes.length === 0 && <div style={{ opacity: 0.6, fontSize: 13 }}>Nenhum cliente com integração Meta. Conecte o Meta Ads em Integrações primeiro.</div>}
      {clientes.map((c) => (
        <div key={c.integracao_id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderTop: "1px solid var(--mk-border)", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 180 }}>{c.cliente_nome}</div>
          {c.pixel_id
            ? <span style={{ color: "var(--mk-accent)" }}>✓ Pixel {c.pixel_nome || c.pixel_id}</span>
            : <span style={{ opacity: 0.6 }}>— não conectado</span>}
          {!pixels[c.integracao_id]
            ? <button className="mk-btn-sm" disabled={carregando === c.integracao_id} onClick={() => listar(c.cliente_id, c.integracao_id)}>{carregando === c.integracao_id ? "…" : "Escolher pixel"}</button>
            : (
              <select className="mk-input" onChange={(e) => { const p = pixels[c.integracao_id].find((x) => x.id === e.target.value); if (p) salvar(c.integracao_id, p.id, p.name); }} defaultValue="">
                <option value="" disabled>Selecione…</option>
                {pixels[c.integracao_id].map((p) => <option key={p.id} value={p.id}>{p.name} ({p.id})</option>)}
              </select>
            )}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Conferir classes utilitárias**

Confirmar que `mk-input`, `mk-btn-sm`, `mk-table`, `mk-card`, `mk-page`, `--mk-accent`, `--mk-border` existem no CSS global. Buscar em `app/globals.css` (ou equivalente). Se `mk-btn-sm` não existir, usar a classe de botão pequeno já usada no projeto (ex.: a do feed de follow-up) ou um `<button className="mk-btn">` com `style={{ fontSize: 12, padding: "4px 10px" }}`. Ajustar nomes conforme o que existe — **não inventar classe nova sem conferir**.

Run (busca): `grep -n "mk-btn-sm\|mk-input\|mk-table" app/globals.css` (ou via Grep tool).

- [ ] **Step 4: Build**

Run: `cd /c/Users/ADM/Desktop/sistema-trafego && npm run build`
Expected: build OK. Resolver erros de tipo do embed PostgREST (`clientes!inner(nome)` retorna objeto; tipar como `{ clientes?: { nome?: string } }`).

---

## Task 11: Wire-up final + verificação + commit

**Files:** nenhum novo (a sidebar já foi editada na Task 1).

- [ ] **Step 1: Build completo**

Run: `cd /c/Users/ADM/Desktop/sistema-trafego && npm run build`
Expected: build OK, rota `/pixel-vendas` presente no output.

- [ ] **Step 2: Prepend CHANGELOG (data+hora BR)**

Pegar hora: `TZ='America/Sao_Paulo' date '+%Y-%m-%d %H:%M'`. Prepender entrada datada no topo de `CHANGELOG.md` descrevendo a entrega (aba Pixel & Vendas, CAPI Purchase no Fechamento, fix ctwa_clid, parqueamento dos 9, scope ads_management).

- [ ] **Step 3: Commit (auto-push + deploy)**

```bash
cd /c/Users/ADM/Desktop/sistema-trafego && git add -A && git commit -m "feat(pixel-vendas): aba CAPI Purchase no Fechamento + painel atribuicao

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```
Expected: hook auto-push → `origin/main`, Vercel deploy disparado.

- [ ] **Step 4: Registrar pg_cron** (se ainda não feito na Task 7, Step 3) via MCP com APP_URL + CRON_SECRET reais.

- [ ] **Step 5: Smoke do cron (pós-deploy)**

`curl -s -H "Authorization: Bearer <CRON_SECRET>" https://<APP_URL>/api/cron/capi-eventos`
Expected: `{"ok":true,"processados":0,"enviados":0,...}` (ou >0 se houver fechamentos recentes).

- [ ] **Step 6: Teste ponta-a-ponta (Events Manager)**

1. No Meta Events Manager do cliente: Fontes de dados → Pixel → **Testar eventos** (pega `test_event_code`). (Opcional p/ v1: passar `testEventCode` no `enviarPurchase` durante o teste.)
2. Conectar o Pixel via OAuth (reconectar pra pegar o novo scope `ads_management`), escolher o pixel na aba.
3. Garantir que o contato de teste tem uma mensagem com `ad_referral.ctwaClid` (ou simular um Fechamento num ticket cujo contato veio de CTWA).
4. Registrar um Fechamento real → aguardar o cron (≤1 min) → conferir no Events Manager que chegou 1 **Purchase** com `value`, `currency=BRL`, `ctwa_clid`.
5. Reenviar o mesmo evento → confirmar que **não duplica** (mesmo `event_id`).

Expected: 1 Purchase atribuído à campanha; reenvio não duplica; painel mostra a venda na campanha certa.

---

## Decisões abertas resolvidas durante o plano

- **Fix do `ctwa_clid`:** corrigir o **leitor** pra `ctwaClid` (camelCase) — casa com TODOS os dados já gravados (melhor que "gravar snake + fallback" do spec, menos churn). O novo código de atribuição também lê `ctwaClid`.
- **Qual pixel usar:** resolvido via cadeia `ad (sourceId) → anuncios.external_id → conjunto → campanha → integracao_id → cliente_id → integracoes.pixel_id/token`. Sem essa cadeia (sem clid ou anúncio não sincronizado) → status `sem_atribuicao`, não envia (não sabemos o pixel). Aparece no feed pra reenviar depois.
- **Spend:** confirmado em `metricas_diarias.gasto` (grão anúncio/dia) com `campanha_id`+`conjunto_id`+`data` → agrega por campanha/conjunto/período.
- **pg_cron:** sem template no repo → registrar via MCP (Task 7, Step 3), igual aos outros crons do projeto.

## Riscos (do spec, reforçados)

- ⚠️ **`ads_management` exige App Review** do Meta pra clientes não-admin/tester do app. Validar v1 com Roberto/testers; planejar App Review antes de abrir self-service.
- **Reconexão necessária:** integrações Meta já existentes (scope `ads_read`) precisam reconectar pra ganhar `ads_management` + permitir listar pixel/enviar evento.
- **Token expira (~60 dias):** monitorar `integracoes.token_expires_at`; quando perto de expirar, sinalizar reconexão (senão eventos vão pra `erro`). (Monitor de expiração é melhoria pós-v1.)
```
