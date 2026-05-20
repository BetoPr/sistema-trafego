# Guia Manual — Setup Inicial

Passos que o Claude Code **não pode executar** sozinho. Faça nesta ordem.

---

## 1. Criar projeto Supabase Cloud (free)

1. Acesse https://supabase.com e faça login (use email contato@infinitycomercialia.com).
2. **New Project** → org pessoal.
3. Preencher:
   - **Name:** `sistema-trafego` (ou outro)
   - **Database Password:** gere uma senha forte e **salve em local seguro** (Credenciais)
   - **Region:** `South America (São Paulo)` — `sa-east-1`
   - **Pricing Plan:** Free
4. Clicar **Create new project**. Aguarda ~2 minutos.

---

## 2. Pegar chaves do Supabase

No dashboard do projeto criado:

1. Sidebar → **Project Settings** → **API**
2. Copiar para `.env.local`:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key (em "Project API keys", revelar) → `SUPABASE_SERVICE_ROLE_KEY`

> ⚠️ **service_role bypassa RLS.** Nunca commitar, nunca expor ao browser.

---

## 3. Aplicar schema no Supabase

1. Sidebar → **SQL Editor** → **New query**
2. Abrir local: `supabase/migrations/20260520120000_schema_inicial.sql`
3. Copiar **todo o conteúdo** e colar no SQL Editor
4. **Run** (canto inferior direito)
5. Esperar "Success. No rows returned"
6. Conferir em **Table Editor** que todas as 12 tabelas apareceram

### 3.1 Rodar seed

1. Nova query no SQL Editor
2. Colar conteúdo de `supabase/seed.sql`
3. Run. Vai criar a agência "Infinity Consultoria"

### 3.2 Criar usuário inicial

1. Sidebar → **Authentication** → **Users** → **Add user** → **Create new user**
2. Email: `contato@infinitycomercialia.com` (ou outro)
3. Senha forte. Marcar **Auto Confirm User**
4. Copiar o **User UID** que aparece
5. Voltar no SQL Editor:
   ```sql
   insert into usuarios (id, agencia_id, nome, email, role)
   values (
     '<COLE_O_USER_UID_AQUI>',
     'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
     'Roberto',
     'contato@infinitycomercialia.com',
     'owner'
   );
   ```

### 3.3 Criar bucket de Storage para relatórios

1. Sidebar → **Storage** → **New bucket**
2. Nome: `relatorios`
3. **Public bucket:** **NÃO** (deixe privado)
4. Create

---

## 4. Gerar chaves criptográficas

Abra o PowerShell na pasta do projeto:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Execute 2x. Cada saída é uma chave hex de 64 chars. Use:
- **1ª saída** → `ENCRYPTION_KEY` no `.env.local`
- **2ª saída** → `OAUTH_STATE_SECRET` no `.env.local`

> ⚠️ Se trocar `ENCRYPTION_KEY` depois, **todos os tokens armazenados ficam ilegíveis**. Trate como chave de produção mesmo no MVP.

---

## 5. Criar App no Meta for Developers

1. Acesse https://developers.facebook.com → **My Apps** → **Create App**
2. Use case: **Other** → próximo
3. Tipo: **Business** → próximo
4. Nome: `Sistema Trafego Dev` (ou outro). Email de contato. Sem business portfolio.
5. Create App.
6. **App está em modo Development** por padrão. **Não publicar.**

### 5.1 Adicionar Facebook Login for Business

1. Dashboard do app → **Add Products** → **Facebook Login for Business** → Set up
2. **Settings** dentro do produto:
   - **Valid OAuth Redirect URIs:** `http://localhost:3000/oauth/meta/callback`
   - Save changes

### 5.2 Pegar credenciais

1. Dashboard → **Settings** → **Basic**
2. **App ID** → `META_APP_ID` no `.env.local`
3. **App Secret** (clicar Show, autenticar) → `META_APP_SECRET` no `.env.local`

### 5.3 Adicionar você como Tester

1. Dashboard → **App roles** → **Roles**
2. Add People → **Testers** → adicionar seu próprio perfil Facebook
3. Aceitar convite (em facebook.com → Settings → Business Integrations OU notificação)

### 5.4 Solicitar permissions (em Development já vêm como "Available")

1. App Review → **Permissions and Features**
2. Confirmar disponibilidade de:
   - `ads_read`
   - `business_management`
   - `read_insights`

> Como o app está em Development, essas permissions funcionam para Testers sem precisar de App Review. App Review só será necessário quando publicar pra outros usuários (Fase SaaS).

---

## 6. Preencher `.env.local`

Na raiz do projeto, copie o template:

```powershell
Copy-Item .env.example .env.local
```

Edite `.env.local` e preencha todas as variáveis com os valores coletados acima.

---

## 7. Validar setup

```powershell
npm run dev
```

Abrir http://localhost:3000. Deve carregar a página padrão do Next sem erros no console.

Se aparecer erro de Supabase URL inválida → variáveis não foram lidas. Reiniciar o `npm run dev`.

---

## 8. Próximos passos (Fase 1)

Quando o setup acima estiver OK, retorne ao Claude Code e peça pra começar Fase 1 (estrutura base: layout, auth, CRUD clientes).
