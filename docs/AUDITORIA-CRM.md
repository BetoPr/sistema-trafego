# Auditoria completa do CRM — bugs, inconsistências e erros

> Gerada em 2026-06-18 por auditoria multi-agente (6 dimensões: segurança/auth, multi-tenant, UAZAPI/import, IA, rotas/Next16, dados/SQL). Cada item confirmado lendo o código (`arquivo:linha`).
> Status: **diagnóstico** — nada corrigido ainda. Prioridade de cima pra baixo.

## Resumo executivo
Base de auth/cripto/Next16 está **sólida** (getUser em tudo, AES-256-GCM, OAuth com HMAC, params/cookies async corretos). Os riscos reais se concentram em: **(1) algumas rotas que usam o service client (bypassa RLS) sem checar dono → vazamento entre agências (IDOR)**, **(2) falta de unicidade em `wa_message_id` e `contatos` → duplicação**, **(3) condição de corrida no buffer da IA → msg perdida / resposta dupla**, e **(4) migrations desatualizadas (schema só existe no cloud)**.

---

## Status das correções (2026-06-18, pós-auditoria)
**🔴 Críticos 1-6 CORRIGIDOS + deployados** (vazamentos entre agências, duplicação de msg, race do buffer). Crítico 7 (pull do schema) pendente — precisa do Supabase CLI. 🟠 Altos: pendentes (próxima leva).

## 🔴 CRÍTICO (corrigir antes de tudo)

1. **IDOR cross-tenant no resumo de conversa** — `app/api/atendimentos/[id]/resumo-stream/route.ts:70-76,146-149`
   Service client lê `mensagens` (`.eq("ticket_id", id)`) e `tickets` (`.eq("id", id)`) e dá UPDATE no resumo **sem `agencia_id` e sem checar dono**. Qualquer usuário logado passa um `id` na URL e **lê a conversa inteira (até 500 msgs) de qualquer outra agência** + sobrescreve o resumo. *(confirmado por 2 auditores)*
   **Fix:** validar `ticket.agencia_id === sessão` (404 senão) + `.eq("agencia_id", ...)` em todas as queries.

2. **Mesmo IDOR no resumo não-stream** — `app/api/atendimentos/[id]/resumo/route.ts:19` + raiz em `lib/crm/ia.ts:89,129,186`
   `gerarResumoTicket` recebe `agenciaId` mas **não usa** — opera só por `ticket_id`. Lê msgs + sobrescreve `tickets.resumo` de outra agência. Os irmãos `sentimento`/`regenerar` checam dono; este foi esquecido.
   **Fix:** gate de dono no route + escopar `agencia_id` dentro de `lib/crm/ia.ts` (defense-in-depth p/ todo chamador).

3. **Vazamento de token OAuth Meta entre agências** — `app/(dashboard)/integracoes/meta/_actions.ts:65-101`
   `sincronizarPagesMeta` recebe `integracaoId` do browser, busca `integracoes` só por `.eq("id", ...)`, **descriptografa o access_token Meta de outra agência** e usa na Graph API + sobrescreve metadata.
   **Fix:** exigir `integ.agencia_id === sessão` antes de decryptToken/update.

4. **Escrita cross-tenant de etiquetas** — `app/api/contatos/[id]/etiquetas/route.ts:40-42,67-71`
   INSERT/DELETE em `contato_etiquetas` só por `contato_id` (URL) + `etiqueta_id` (body), service client, **sem validar que o contato é da agência**. Marca/desmarca etiqueta em contato de outro tenant.
   **Fix:** validar dono de `contato_id` (e da etiqueta) antes.

5. **`wa_message_id` não é UNIQUE → mensagens duplicadas + IA re-disparada** — `mensagens` (schema) + `lib/crm/ingest.ts:159` + `lib/crm/import-mensagens.ts:148`
   Webhook insere msg recebida sem dedup atômico; toda re-entrega do UAZAPI **duplica a mensagem e re-aciona a IA**.
   **Fix:** `UNIQUE (agencia_id, wa_message_id)` + upsert `ignoreDuplicates` no ingest/import.

6. **Race no buffer da IA → mensagem perdida + resposta em dobro** — `lib/ia-atendimento/executor.ts:102,668-676`
   Ao terminar, `delete().eq("ticket_id")` apaga a row **inteira**, incluindo msg que chegou durante o processamento (perde a msg → cliente sem resposta). E o `upsert` do buffer sempre seta `trava_processando:false`, podendo **ressuscitar a trava** e processar 2× (resposta duplicada).
   **Fix:** delete condicional por `ultimo_recebido_em` (snapshot) + não tocar `trava_processando` no append.

7. **Migrations desatualizadas (schema só no cloud)** — `supabase/migrations/`
   A maioria das tabelas do CRM (`follow_up_*`, `ia_atendimento_*`, `meta_leads`, colunas novas) **não está em nenhuma migration** — foi aplicada ad-hoc. Ambiente novo não sobe; `dedup_contatos_por_numero.sql` quebraria com "relation does not exist".
   **Fix:** `supabase db pull` / `pg_dump --schema-only` → commitar o schema real.

---

## 🟠 ALTO

- **IA: throw de tool fura a rede de segurança** — `executor.ts:470-493`. Se uma tool lança (ex: galeria → downloadAndUpload, ou erro de rede no envio), a exceção aborta antes do bloco que garante resposta → buffer deletado → **cliente sem resposta**. Fix: try/catch por tool no loop.
- **IA: galeria falha mas suprime texto** — `tools-runner.ts:463`. `suprimirTextoIA = !!(textoAntes||textoDepois)` ignora se as imagens saíram. Se a moldura sai e as imagens não → cliente recebe "olha os exemplos" e **nada**. Fix: suprimir só se `enviadas>0`.
- **`contatos` sem UNIQUE (agencia_id, wa_id)** + `deleted_at` inconsistente no lookup (`ingest.ts` filtra, `import-contatos.ts` não) → duplica/ressuscita contato. Fix: índice único parcial + padronizar lookup.
- **Cleanup de mídia com path errado** — `lib/crm/storage.ts:115-118`. `limparMidiaAntiga` lista em `${ticket_id}/...` mas o upload grava em `${agencia_id}/${ticket_id}/...` → **mídia nunca é apagada** (storage vaza pra sempre). Fix: usar o path com agencia_id.
- **`resolver-lid` sequencial pode estourar timeout** — `resolver-lid.ts:44-52` + `route.ts`. Até 600 chamadas `/chat/details` (20s cada) no request síncrono; `maxMs` só checado ANTES da chamada. Fix: paralelizar em lotes + checar tempo depois, ou mover pra background.
- **Status da msg enviada nunca atualiza** — `ingest.ts:48` + `canais/[id]/send`. `wa_message_id` gravado de `r.id` (pode vir null); webhook `messages_update` casa por id → fica "enviada" pra sempre. Fix: `r.messageid ?? r.id`.
- **`editarCliente`/`excluirCliente` confiam só em RLS** — `app/(dashboard)/clientes/actions.ts:101,129`. Update/soft-delete por `.eq("id", ...)` sem `agencia_id`. Fix: adicionar `.eq("agencia_id", ...)` (defesa em profundidade).
- **Conciliação de leads Meta ressuscita contato apagado** — `lib/meta-ads/conciliar.ts:61-82`. Match por telefone sem `deleted_at is null`. Fix: filtrar deleted_at.
- **Webhook Meta leadgen sem validação de assinatura** — `app/api/webhooks/meta/leadgen/route.ts:45-63`. Não valida `X-Hub-Signature-256`. Fix: HMAC com `META_APP_SECRET` (timingSafeEqual).
- **Follow-up: fallback não-atômico → envio duplicado** — `followup-worker.ts:166-186`. Se o RPC de pickup falha, o fallback faz SELECT+UPDATE separados; dois crons enviam a mesma etapa. Fix: UPDATE...RETURNING atômico.

---

## 🟡 MÉDIO (amostra — lista completa abaixo)
- IA: `ferramentas`/`perfil_etiquetas`/`followups`/`sequência` inserem com `perfil_id` do form sem checar dono (`ia-atendimento/_actions.ts`). FK cross-tenant.
- `configuracoes/ia/page.tsx:15`: lê `configuracoes_agencia` sem `agencia_id` → mostra flags "chave configurada" de outra agência (vaza booleano).
- `whatsapp` inconsistente: import grava `""`, actions/ingest gravam `null` → quebra filtros `IS NULL`.
- Histórico importado reusa ticket "fechado" antigo (diverge do webhook que só reusa aberto/pendente).
- Crons (`sync-meta`, `cobrancas`) e `canais/send` sem try-catch em I/O → 500 cru. `send` descriptografa token fora do try.
- Anthropic/Groq: histórico pode ter roles consecutivos/começar em assistant → erro de formato (fallback de modelo não resolve).
- Índices de `contatos` não são parciais em `deleted_at` (varre linhas mortas).

## 🟢 BAIXO
- `instanceChatDetails` engole todo erro (401/timeout vira "sem telefone").
- `uso-tokens`/`precos.ts` sem entradas pra GPT-5.x/claude-3.5 → custo subnotificado (0).
- `split.ts:59` `indexOf` quebra com frases repetidas.
- Cron auth com comparação não-constante (timing).
- `follow-up/upload` retorna `e.message` cru ao cliente.

---

## ✅ Verificado e OK (não são bugs)
Núcleo auth/cripto/OAuth; ~45 rotas + ~25 actions restantes escopam `agencia_id` corretamente; crons com `Bearer CRON_SECRET`; engine IA (fora os itens acima) ancora tudo no `agencia_id` do ticket; `params`/`cookies()`/`headers()` sempre `await`; `redirect()` nunca dentro de try/catch; Recharts só em Client Components; super-admin tudo atrás de `requireSuperAdmin`; check constraints alinhadas com o código; `dedup_contatos_agencia` cobre as 8 FKs reais.
