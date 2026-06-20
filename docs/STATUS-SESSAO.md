# STATUS DA SESSÃO — Sonar CRM (sistema-trafego)

> Handoff pra retomar depois do `/compact`. Atualizado: **19/06/2026 ~23h55 BR**.
> Tudo em ✅ FEITO está **deployado em produção** (auto-push → Vercel). Login teste: `jj.rroberto2010@gmail.com` (super_admin). Agência "Teste" (canal Innova & AI Studio).

---

## ✅ FEITO (esta sessão)

### Backlog A–D
- **A. Nova conversa avulsa** (`3d4abdf`) — botão ao lado do sino (ícone **verde**, `f6111fd`); número → cria/reaproveita contato+ticket (`/api/atendimentos/nova-conversa`) → abre chat.
- **B. Pílula de data no scroll** do chat (`3d4abdf`).
- **C. Menu 3-pontinhos** do chat limpo (`3d4abdf`).
- **D. Abas flutuantes ON/OFF** (`ba236a7`, `35fae95`, `3762bf8`) — launcher arrastável (snap 4 cantos mobile) → painel **redimensionável** (bordas/cantos) com **4 abas: Mensagens Rápidas · Contatos · Grupos · Envio em Massa**, cada uma = **iframe da página real** (modo `embed` via `lib/embed.ts inIframe()` + classe `embed-mode` em globals.css). Inserir atalho no chat (postMessage). Toast "aba alterada" só no balão. **Contatos lean** + Grupos/Envio empilham no embed.

### Ajustes de feedback
- **Follow-up com IA** (`e5e8419`): cadência **por card** (1/2/3 follow-ups; 2º/3º **gerados pela IA, editáveis** + tempo; dividir em 2); tirada a barra global confusa; instruções legíveis. **Botão Parar** na aba + **429/TPD tratado** (`965c4eb`).
- **Canais** (`e5e8419`): número + foto de perfil sincronizam via `/instance/all` (sincronizarPlataformaCanais).
- **Fundo do chat** (`e5e8419`): colagem de ícones SVG.
- **Configurações de API (IA)** (`f6111fd`): "Chaves IA (Groq)" → **"Configurações de API (IA)"**, juntou chaves + transcrição numa tela; GroqCloud duplicado removido (rota redireciona); 1 chave Groq faz tudo. **Dropdown de modelos sem campos em branco** (`965c4eb`).
- **Filtros vira ícone** quando a coluna encolhe (`f6111fd`).

### IA — infra (Fases 1 e 4 do plano de IA)
- **Fase 1 — Rastreio** (`879b1b4`): tabela **`ia_uso`** (migration `20260619220000`) + `lib/ai/uso.ts` (`registrarUsoIA` fire-and-forget + `custoUsd`). Instrumentadas as 4 sessões (transcrição/resumo/sentimento/follow-up); follow-up grava **usuario_id** (qual admin).
- **Fase 4 — Hub "Análise de IAs"** (`/analise-ias`, sidebar → Configuração) + **v2** (`de34367`): escopo **Meu CRM / Todos os clientes / Por tipo de cliente** (super-admin, cross-agência); **Por Admin/usuário · Por modelo · Por cliente · Por sessão · Por provedor**; KPIs com **delta** vs período anterior; médias **por conversa/ticket/chamada**; **eficiência prompt×resposta**; gráfico por dia; barra de limite diário Groq; **log + export CSV/PDF** (`/api/ia/uso/pdf`, @react-pdf/renderer). Agregação: `lib/ai/relatorio.ts`.
- **Fase 2 — Multi-chave + troca OpenAI** (`3cb66d3`): tabela **`ia_chaves`** (migration `20260620000500`, várias chaves/provider + backfill das legadas). `lib/ai/keys.ts` (resolver `ia_chaves`→legacy→env + prefs). `lib/ai/gateway.ts` (**rotação de chaves Groq → fallback OpenAI no 429**, loga uso) usado por sentimento/resumo/follow-up/transcrição em `lib/crm/ia.ts`. `chat()`/`transcribeAudio` generalizados (`baseUrl`/`provider`). UI **Configurações de API (IA)** redesenhada: gerenciador add/remover por provider + toggles + **botão "usar OpenAI em tudo"** (`_chaves.tsx`, `_provider.tsx`). Modelos OpenAI: chat **gpt-4o-mini**, transcr **gpt-4o-transcribe**. ⚠️ streaming do resumo (`resumo-stream`) e `/api/ia/reescrever` ainda em 1 chave (`getGroqKey`) — migrar depois.

---

## ⏳ PENDENTE (ordem)

### IA — Fase 3 (limites)  ← PRÓXIMO
- Teto por chave **TPM 12k / TPD 100k** (Groq) + **80 follow-ups/dia** por chave (config) + cadência confortável (porMinuto configurável). Whisper: 20 RPM / 28.800s áudio/dia. **Sem limite semanal/mensal** (projetar ×7/×30).
- Quando bate teto → próxima chave → OpenAI → se acabar, pausa com aviso (já tem o 429-graceful + Parar).

### Outros pendentes
- **E — Balão de mídias** (aba Links/Imagens/Docs no contato + balão com download/encaminhar/ir-pra-conversa/zoom/reagir). MUITO grande.
- **"Selecione um ticket à esquerda"** no rodapé — confirmar se ainda aparece no deploy novo (código só renderiza sem ticket; fix do flash deep-link aplicado).
- **#7 schema pull** (`supabase db pull`) — só Roberto (CLI + senha).
- Opcional: tiers formais por agência (`agencias.plan_tier`) em vez do `usuarios.tipo_cliente` (rótulo livre) pra "por tipo de cliente".

---

## 🧭 CONTEXTO TÉCNICO (IA — pra Fase 2/3)
- **Chaves hoje:** `configuracoes_agencia.groq_key_encrypted` (1 só), `openai_key_encrypted`, `anthropic_key_encrypted`. Resolver atual: `getGroqKey(agenciaId)` em `lib/crm/ia.ts`.
- **Call sites de IA:** `lib/groq/llm.ts` (`chat`/`gerarResumo`/`analisarSentimento` — já aceitam `uso?: UsoLog`), `lib/groq/transcribe.ts` (aceita `uso`). Alto nível em `lib/crm/ia.ts`: `analisarSentimentoTicket`, `gerarResumoTicket`, `sugerirFollowUpTicket` (aceita `usuarioId`), `transcreverMensagemAudio`.
- **Rastreio:** `lib/ai/uso.ts` (`registrarUsoIA`, `custoUsd`, tabela `ia_uso`). Agregação: `lib/ai/relatorio.ts` (`agregarUso(filtro)`).
- **Cripto:** `lib/crypto/tokens.ts` (AES-256-GCM) — usar pra `ia_chaves.key_encrypted`.
- **Super-admin / cliente:** roles em `usuarios.role` (super_admin|admin|atendente). `requireSuperAdmin()`/`isSuperAdmin()` em `lib/crm/permissions.ts`. Cross-agência = service client (bypassa RLS). "tipo de cliente" = `usuarios.tipo_cliente`. agências em `agencias` (id, nome, valor_mensal, vencimento_em…).
- **Limites Groq (confirmados nas docs):** llama-3.3-70b → 30 RPM / 1000 RPD / 12k TPM / 100k TPD. whisper-large-v3 → 20 RPM / 28.800s áudio/dia. Sem semanal/mensal.

---

## ⚠️ REGRAS DO PROJETO
- **Build antes de cada commit** (`npm run build` em `/c/Users/ADM/Desktop/sistema-trafego` — o cwd reseta, sempre `cd` antes). Commit dispara **auto-push → Vercel** (hook). NÃO desativar.
- **CHANGELOG.md**: prepender entrada **datada (dia+hora BR)** a cada commit.
- **Next 16**: `proxy.ts` (não middleware); `cookies()/headers()/params` async.
- **Supabase**: `getUser()/getClaims()` (nunca getSession); `service_role` nunca no browser; multi-tenant por `agencia_id`. Migrations em `supabase/migrations/` + aplicar via MCP (projeto `nnswiakwjvoqwcjscbqq`).
- **Cripto** tokens: `lib/crypto/tokens.ts` (AES-256-GCM), nunca pgcrypto. Modais = `components/ui/Balao.tsx`. Errors em PT-BR.

## ✅ COMO TESTAR
- Checklist completo em **`docs/CHECKLIST-TESTE.md`** (8 áreas).
- Hub: rode uma análise de **Follow-up** (ou resumo/transcrição) → abra **`/analise-ias`** → o uso aparece (escopo, métricas, export PDF/CSV).
