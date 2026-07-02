# ERRORS LOG — Sonar CRM

Log persistente e consultável de erros. Cada entrada tem: **sintoma → causa raiz → fix → prevenção**.

Prepend novas entradas no topo. Data+hora BR (America/Sao_Paulo).

Grep útil:
```bash
grep -A5 -i "PGRST204" docs/ERRORS-LOG.md
grep -A5 -i "signup" docs/ERRORS-LOG.md
grep -A5 -i "@lid"   docs/ERRORS-LOG.md
grep -A5 -i "502"    docs/ERRORS-LOG.md
```

---

## 2026-07-01 21:15 · Login 502 pra contas Email+Google (upstream too big header)

**Sintoma:** conta com providers "Email, Google" (jj.rroberto2010, coringa após vincular Google) → POST /login retorna 502 Bad Gateway. Login normal (só Email) funciona.

**Causa raiz:** Nginx error log: `upstream sent too big header while reading response header from upstream`. Response Set-Cookie do Supabase JWT quando user tem 2 identities (email+google) fica maior que `proxy_buffer_size` default (4KB). Next.js tenta setar cookie chunked (`sb-...-auth-token.0`, `.1`, `.2`) — total header estoura buffer.

**Fix:** aumentar buffer Nginx no `/etc/nginx/sites-enabled/sonarcrm`:
```nginx
location / {
    proxy_buffer_size 32k;
    proxy_buffers 8 32k;
    proxy_busy_buffers_size 64k;
    # ... resto proxy_pass etc
}
```
Aplicar via:
```bash
sudo sed -i '/location \/ {/a\        proxy_buffer_size 32k;\n        proxy_buffers 8 32k;\n        proxy_busy_buffers_size 64k;' /etc/nginx/sites-enabled/sonarcrm
sudo nginx -t && sudo nginx -s reload
```

**Prevenção:**
- PM2 log não aparece nada (nginx bloqueia antes de proxy) — sempre checar `/var/log/nginx/error.log` quando 502 sem info em PM2.
- Se app crescer identities (Google + Github + Apple), buffer pode precisar subir mais.
- Alternativa: reduzir tamanho JWT no Supabase Auth (remover claims custom).

---

## 2026-07-01 19:45 · Página `/login` retorna 502 Bad Gateway (temporário)

**Sintoma:** navegador mostra "This page couldn't load" após clicar em login não-Google. Console: `502 ()`.

**Causa raiz:** PM2 restartando o processo `sonar` durante deploy anterior. Nginx respondeu 502 enquanto upstream estava indisponível (~30s de janela).

**Fix:** aguardar. Auto-recuperou quando PM2 terminou o restart. Verificação: `curl -w "%{http_code}" https://sonarcrm.com.br/login` → 200.

**Prevenção:** deploy via `scripts/deploy-vps.py` usa `pm2 restart` (graceful reload). Alternativa mais robusta: `pm2 reload` (zero-downtime, precisa cluster mode). Se acontecer com frequência, configurar cluster mode no ecosystem.config.js.

---

## 2026-07-01 19:20 · Signup 500 "Database error checking email"

**Sintoma:** cadastro novo com email antes-testado retorna 500. PM2 log: `Error [AuthApiError]: Database error checking email`.

**Causa raiz:** após deletar `auth.users` via SQL direto (`DELETE FROM auth.users WHERE id=X`), sobraram registros órfãos em `auth.identities` (FK sem cascade). Supabase Auth ao validar email novo faz JOIN interno com `identities` — órfãs quebram query.

**Fix:**
```sql
DELETE FROM auth.identities
WHERE user_id NOT IN (SELECT id FROM auth.users);
```

**Prevenção:** **NUNCA** deletar `auth.users` via SQL direto. Sempre `await svc.auth.admin.deleteUser(id)` — faz cascade correto em identities, sessions, refresh_tokens.

---

## 2026-07-01 17:00 · Signup 500 "Could not find the 'whatsapp' column of 'usuarios'"

**Sintoma:** cadastro chega até "Erro ao concluir cadastro". PM2 log: `PGRST204: Could not find the 'whatsapp' column of 'usuarios'`.

**Causa raiz:** `app/api/signup/route.ts` inseria `whatsapp: ...` em `usuarios`, mas coluna real é `telefone`.

**Fix:** trocado em signup route.

**Prevenção:** antes de inserir em tabela nova, checar schema real: `SELECT column_name FROM information_schema.columns WHERE table_name='usuarios'`.

---

## 2026-07-01 16:30 · Signup 500 "A user with this email address has already been registered"

**Sintoma:** cadastro com email novo (nunca usado) retorna 500. PM2 log: `AuthApiError: already been registered`.

**Causa raiz:** email já estava em `auth.users` de tentativa anterior que falhou entre `auth.createUser` e `usuarios.insert` (auth user órfão sem `public.usuarios` linkado). Check pré-signup só olha `public.usuarios` — não achou, prosseguiu, `auth.admin.createUser` explodiu.

**Fix:**
1. Imediato: `DELETE FROM auth.users WHERE id IN (órfãos)` (ver erro seguinte — isso criou problema em identities).
2. Estrutural: `app/api/signup/route.ts` agora tem fallback — se `createUser` falha com "already registered", busca `auth.admin.listUsers` por email e reusa id existente (atualiza password/metadata).

**Prevenção:** rollback do signup precisa ser atômico. Se qualquer step falha, deletar auth user via `svc.auth.admin.deleteUser` (não SQL).

---

## 2026-07-01 15:00 · Signup 500 "null value in column slug"

**Sintoma:** cadastro trava com "Erro ao criar agência". PM2 log: `null value in column "slug" of relation "agencias" violates not-null constraint`.

**Causa raiz:** tabela `agencias` tem coluna `slug` NOT NULL + UNIQUE, mas signup nunca gerava valor.

**Fix:** signup + oauth-bootstrap agora geram slug automático: `slugify(nome) + '-' + randomUUID().slice(0,8)`.

**Prevenção:** ao usar service_role em route handlers, testar insert em prod-like antes de deploy. RLS + NOT NULL constraints não aparecem em type checks.

---

## 2026-07-01 14:00 · Signup 500 "Could not find the 'criada_em' column of 'agencias'"

**Sintoma:** cadastro trava com "Erro ao criar agência". PM2 log: `PGRST204: Could not find the 'criada_em' column`.

**Causa raiz:** signup + oauth-bootstrap + lib/onda-zero/boas-vindas.ts usavam `criada_em`, mas coluna real é `created_at` (default `now()`). Bug pré-existente — deixou de funcionar quando alguma migration renomeou a coluna sem atualizar o código.

**Fix:** removido `criada_em` dos inserts (created_at tem default). `.lte("criada_em", ...)` → `.lte("created_at", ...)` em onda-zero.

**Prevenção:** sempre checar schema real antes de referenciar coluna. `information_schema.columns` é source of truth. PGRST204 é sinal claro — coluna não existe.

---

## 2026-07-01 15:00 · Contato @lid mostra LID em vez do número real

**Sintoma:** msg chega no CRM com contato tipo `191821862948954@lid` em vez do número WhatsApp real. Nome e whatsapp aparecem como LID.

**Causa raiz:** WhatsApp usa @lid (privacy identifier) em novas conversas. Sonar não estava resolvendo phone real do LID.

**Fix:**
1. `lib/crm/ingest.ts`: helper `resolverLidParaPhone` chama `instanceChatDetails` do uazapi ao criar contato @lid — pega phone real + nome.
2. Se phone real bate com contato antigo já existente, funde (preserva etiquetas).
3. Retroativo agência Guilherme: 128 @lid convertidos pra `@s.whatsapp.net`, 1 dedup.

**Pendente WAHA:** resolver LID pra provider WAHA ainda não implementado. Precisa `GET /api/contacts?session=X&contactId=Y` + `WHATSAPP_NOWEB_STORE_FULLSYNC=true`. Sessão Guilherme já reconfigurada — aguarda full sync completar.

**Prevenção:** contato novo com `wa_id.endsWith('@lid')` deve sempre passar por resolver.

---

## 2026-06-23 22:42 · Canal WhatsApp Guilherme parou de receber msg (8 dias)

**Sintoma:** Guilherme reportou WhatsApp não puxando novos contatos. Sistema mostrava canal `status=connected` mas `numero_conectado=NULL`. Zero msgs em 48h.

**Causa raiz:** sessão uazapi perdeu autenticação/webhook desregistrou silenciosamente. Reconexão via botão da UI só re-abriu socket, não re-registrou webhook.

**Fix:** delete canal + criar novo (gera instance nova, QR novo, webhook novo). Guilherme depois migrou pra WAHA por conta própria.

**Prevenção:** healthcheck periódico do canal — se `ultima_msg > 48h` e `status=connected`, alerta.

---

## Formato pra novas entradas

```
## YYYY-MM-DD HH:MM · Título curto do erro

**Sintoma:** o que o usuário vê (mensagem, tela, status code)

**Causa raiz:** por que aconteceu

**Fix:** comandos/edits específicos que resolveram

**Prevenção:** o que fazer diferente pra não acontecer de novo
```

Prepender no topo (mais recente primeiro).
