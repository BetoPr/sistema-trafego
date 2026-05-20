# Sistema de Gestão de Tráfego

MVP local para gestão de tráfego pago de múltiplos clientes (Meta Ads, futuramente Google Ads/GA4). Dashboards consolidados, relatórios PDF/Excel automatizados, alertas inteligentes.

**Estado:** Fase 0 — scaffold pronto. Próximas fases conforme [PLANO_SISTEMA_TRAFEGO.md](../../PLANO_SISTEMA_TRAFEGO.md) (na raiz do home).

## Stack

- **Frontend:** Next.js 16 (App Router) + TypeScript + Tailwind + shadcn/ui
- **Backend/Auth/DB:** Supabase (Cloud free no MVP)
- **Gráficos:** Recharts
- **Relatórios:** @react-pdf/renderer + exceljs
- **IA:** Ollama local (fallback Groq)
- **Scheduler:** node-cron (local) / migrar pra Supabase pg_cron quando publicar

## Setup local

Pré-requisitos: Node 20+, npm, conta Supabase Cloud, conta Meta for Developers.

1. Instalar deps:
   ```bash
   npm install
   ```

2. Copiar variáveis de ambiente e preencher:
   ```bash
   cp .env.example .env.local
   ```

   Gerar chaves criptográficas:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   Uma para `ENCRYPTION_KEY`, outra para `OAUTH_STATE_SECRET`.

3. Seguir [GUIA-MANUAL.md](./GUIA-MANUAL.md) para:
   - Criar projeto Supabase Cloud
   - Aplicar schema
   - Criar app Meta for Developers
   - Preencher `.env.local`

4. Rodar:
   ```bash
   npm run dev
   ```

## Estrutura

```
app/             # Rotas Next.js (App Router)
components/      # UI components (shadcn + custom)
lib/             # Lógica compartilhada
  crypto/        # AES-256-GCM para tokens OAuth
  oauth/         # State CSRF HMAC-signed
  supabase/      # Clients browser/server/service
  meta-ads/      # Wrapper Meta API
  ai/            # Provider plugável (Ollama/Groq/Claude)
scripts/         # Schedulers (node-cron)
supabase/
  migrations/    # SQL versionado
  seed.sql       # Dados iniciais
proxy.ts         # Middleware Next 16 (auth refresh)
```

## Comandos

| Comando | Função |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run lint` | Linter |
| `npx tsx scripts/sync-scheduler.ts` | Scheduler de syncs (local) |
