# Guia Manual — Passos Restantes

Boa parte do setup já foi feita automaticamente via MCP Supabase em **2026-05-20**:

✅ Projeto Supabase criado: **Sistema Trafego** (`nnswiakwjvoqwcjscbqq`, sa-east-1)
✅ Schema completo aplicado (12 tabelas + view + RLS)
✅ Agência "Infinity Consultoria" seedada
✅ Bucket `relatorios` criado (privado, PDF/XLSX, 50MB max)
✅ `ENCRYPTION_KEY` e `OAUTH_STATE_SECRET` gerados e gravados em `.env.local`
✅ `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` em `.env.local`

**Sobra para você fazer (3 passos):**

---

## 1. Copiar `service_role` key do dashboard

MCP não expõe a `service_role` por segurança. Você precisa pegar manualmente:

1. Abra: https://supabase.com/dashboard/project/nnswiakwjvoqwcjscbqq/settings/api-keys
2. Aba **Project API keys** → encontre `service_role` → clique **Reveal** → copie
3. Cole em `.env.local` na linha:
   ```
   SUPABASE_SERVICE_ROLE_KEY=<cole aqui>
   ```

> ⚠️ Essa chave bypassa RLS. Nunca commitar, nunca expor ao browser. Só em scripts server-side.

---

## 2. Criar seu usuário no Supabase Auth

1. Abra: https://supabase.com/dashboard/project/nnswiakwjvoqwcjscbqq/auth/users
2. Clique **Add user** → **Create new user**
3. Preencha:
   - **Email:** `contato@infinitycomercialia.com` (ou outro)
   - **Password:** senha forte (salve em Credenciais)
   - Marque ✅ **Auto Confirm User**
4. Clique **Create user**
5. **Copie o User UID** que aparece (ex: `12345678-aaaa-bbbb-cccc-deadbeef0001`)
6. Abra o SQL Editor: https://supabase.com/dashboard/project/nnswiakwjvoqwcjscbqq/sql/new
7. Cole e ajuste:
   ```sql
   insert into usuarios (id, agencia_id, nome, email, role)
   values (
     '<COLE_O_USER_UID>',
     'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
     'Roberto',
     'contato@infinitycomercialia.com',
     'owner'
   );
   ```
8. Clique **Run**

---

## 3. Criar App no Meta for Developers (necessário só para Fase 2)

> Pode pular agora se não vai começar Fase 2 hoje. Os campos `META_*` em `.env.local` só são lidos quando OAuth Meta for usado.

1. https://developers.facebook.com → **My Apps** → **Create App**
2. Use case: **Other** → próximo
3. Tipo: **Business** → próximo
4. Nome: `Sistema Trafego Dev`. Email de contato. Sem business portfolio.
5. **Create App** (deixar em modo **Development**)
6. Dashboard → **Add Products** → **Facebook Login for Business** → Set up
7. Em **Facebook Login for Business → Settings**:
   - **Valid OAuth Redirect URIs:** `http://localhost:3000/oauth/meta/callback`
   - **Save changes**
8. **Settings → Basic**: copiar **App ID** + **App Secret** (clicar Show)
9. Colar em `.env.local`:
   ```
   META_APP_ID=<app_id>
   META_APP_SECRET=<app_secret>
   ```
10. **App roles → Roles → Add People → Testers** → adicionar seu perfil Facebook → aceitar convite

---

## 4. Validar setup

Depois dos passos 1 e 2 (passo 3 só pra Fase 2):

```powershell
cd $env:USERPROFILE\Desktop\sistema-trafego
npm run dev
```

> Nota: como ainda não criamos a tela `/login` (Fase 1), qualquer URL vai redirecionar e cair em 404. Isso é **esperado** nesta fase. O importante é o servidor subir sem erro no terminal.

Quando estiver OK, me chama no Claude pra começar **Fase 1** (auth UI + CRUD clientes).

---

## Credenciais salvas

Adicione ao seu cofre `Desktop\Credenciais\`:

**Sistema Trafego — Supabase**
- Project ref: `nnswiakwjvoqwcjscbqq`
- URL: `https://nnswiakwjvoqwcjscbqq.supabase.co`
- Dashboard: https://supabase.com/dashboard/project/nnswiakwjvoqwcjscbqq
- DB password: gerada pelo Supabase no momento da criação — recuperar em Settings → Database → Reset database password se precisar
