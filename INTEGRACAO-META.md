# Integração Meta Ads

Tutorial passo a passo para conectar Facebook/Instagram/Messenger/WhatsApp Ads ao sistema.

**Tempo estimado:** ~5 minutos
**Dificuldade:** Fácil
**Pré-requisitos:** conta Facebook + acesso a alguma conta de anúncios Meta

---

## Por que precisa de uma "app no Meta for Developers"?

Toda integração Meta Ads exige uma app intermediária que recebe o token OAuth do usuário. Esta app:

- É criada UMA VEZ pela agência (você)
- Funciona em modo **Development** para testers que você adicionar (sem App Review)
- Seria submetida pra **App Review** apenas quando virar SaaS público

---

## Passo 1 — Criar app no Meta for Developers

1. Abra https://developers.facebook.com/apps/create/
2. **Use case:** `Other` → *Next*
3. **App type:** `Business` → *Next*
4. Preencha:
   - **Name:** `Tráfego Sistema` (ou outro)
   - **Contact email:** seu email
   - **Business portfolio:** deixe em branco se não tiver
5. Clique **Create App**

App fica em modo **Development** automaticamente (correto).

---

## Passo 2 — Adicionar Facebook Login for Business

1. Dashboard do app → painel esquerdo → **Add Products**
2. Procure **Facebook Login for Business** → *Set up*
3. Sidebar → **Facebook Login for Business** → **Settings**
4. **Valid OAuth Redirect URIs** → adicione (1 por linha):

   ```
   https://sistema-trafego.vercel.app/oauth/meta/callback
   http://localhost:3000/oauth/meta/callback
   ```

5. **Save changes**

---

## Passo 3 — Adicionar você como Tester

1. Sidebar → **App roles** → **Roles**
2. **Add People** → escolha **Testers**
3. Adicione seu perfil Facebook (busca por nome)
4. **Importante:** Vá no Facebook → notificações → **aceite o convite de Tester**

Sem aceitar, o OAuth retorna erro de permissão.

### Permissões disponíveis

Em **App Review → Permissions and Features**, estas 3 ficam disponíveis automaticamente para Testers:

- `ads_read`
- `business_management`
- `read_insights`

Não precisa solicitar App Review para essas no modo Development.

---

## Passo 4 — Copiar credenciais

1. Sidebar → **Settings** → **Basic**
2. **App ID** → copie
3. **App Secret** → clique *Show* (pede senha Facebook) → copie

### Onde colar

**Em produção (Vercel):**

1. Acesse https://vercel.com/jose-robertos-projects-635b9fc9/sistema-trafego/settings/environment-variables
2. Adicione:
   - `META_APP_ID` = `<app_id>`
   - `META_APP_SECRET` = `<app_secret>`
3. **Redeploy:** Settings → Deployments → último deploy → menu `...` → *Redeploy*

**Em desenvolvimento local:**

Cole no `.env.local`:

```
META_APP_ID=<app_id>
META_APP_SECRET=<app_secret>
```

---

## Passo 5 — Conectar uma conta de anúncios

> ⚠️ **Fase pendente:** O endpoint OAuth `/oauth/meta/start` + callback ainda não está implementado.
> Implementação na próxima rodada de trabalho.

Quando estiver pronto, o fluxo será:

1. Sistema → `/integracoes` → card Meta Ads → **Conectar conta**
2. Redireciona para login Facebook
3. Autoriza permissões `ads_read`, `business_management`, `read_insights`
4. Sistema recebe token, lista contas de anúncios disponíveis
5. Você escolhe quais contas conectar (1 por cliente)
6. Sync inicial roda em background (~5-15 min)

---

## Sobre tokens de longa duração

- Token Meta padrão expira em **1 hora**
- O sistema trocará automaticamente por token long-lived (~60 dias) no callback
- Cron diário verifica `token_expires_at`. Alerta 7 dias antes da expiração
- Para escalar SaaS: migrar para System User token (não expira)

---

## Problemas comuns

| Erro | Causa | Fix |
|------|-------|-----|
| `Invalid OAuth redirect URI` | URI não exatamente igual no app | Cole exato, sem barra extra |
| `Permission denied: ads_read` | Tester não aceitou convite no Facebook | Volte no FB → notificações |
| `App not active` | Tentou conectar fora do modo Test User | Adicione conta como Tester |
| Token expirando rápido | Não trocou por long-lived | Implementar exchange no callback |

---

## Referências oficiais

- Meta for Developers: https://developers.facebook.com/docs/
- Marketing API: https://developers.facebook.com/docs/marketing-apis
- Facebook Login for Business: https://developers.facebook.com/docs/facebook-login/
- App Review (futuro): https://developers.facebook.com/docs/app-review/

---

*Última atualização: 2026-05-20*
