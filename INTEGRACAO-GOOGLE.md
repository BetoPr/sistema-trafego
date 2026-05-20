# Integração Google Ads

Tutorial passo a passo para conectar Google Ads (Search, Display, YouTube, Discovery).

**Tempo estimado:** 30-60 min de setup + 1-2 dias úteis (Basic) ou até 2 semanas (Standard) de aprovação Google
**Dificuldade:** Médio-Alto
**Pré-requisitos:** conta Google + Google Ads MCC (My Client Center)

---

## ⚠️ Sobre o Developer Token

Google Ads é mais burocrático que Meta. **Você precisa de um Developer Token aprovado pelo Google.** Existem 3 níveis:

| Nível | Como obtém | Limite | Quando usar |
|-------|-----------|--------|-------------|
| **Test** | Imediato | Só contas dev internas da MCC | Desenvolvimento |
| **Basic** | Aprovação 1-2 dias úteis | 15k operações/dia | MVP com poucos clientes |
| **Standard** | Aprovação até 2 semanas | Sem limite prático | Produção |

**Para uso real com contas de clientes externos**, mínimo é Basic.

---

## Passo 1 — Criar projeto no Google Cloud

1. Acesse https://console.cloud.google.com/projectcreate
2. **Project name:** `Sistema Trafego` (ou outro)
3. **Organization:** deixe a padrão
4. **Create** → aguarda ~30s
5. Anote o **Project ID** que aparecer

---

## Passo 2 — Habilitar Google Ads API

1. Selecione o projeto criado
2. Abra https://console.cloud.google.com/apis/library/googleads.googleapis.com
3. Clique **Enable**
4. Aguarde ativação (10-30s)

---

## Passo 3 — Criar OAuth Client

### 3.1 OAuth Consent Screen

1. https://console.cloud.google.com/apis/credentials/consent
2. **User type:** `External` → *Create*
3. Preencha:
   - **App name:** `Tráfego Sistema`
   - **User support email:** seu Gmail
   - **Developer contact:** seu Gmail
4. **Scopes:** pode pular (configura depois)
5. **Test users:** adicione seu Gmail e os de quem vai testar
6. **Save and continue**

### 3.2 Credentials

1. Sidebar → **Credentials** → **Create Credentials** → **OAuth client ID**
2. **Application type:** `Web application`
3. **Name:** `Tráfego Sistema Web`
4. **Authorized redirect URIs** → adicione (1 por linha):

   ```
   https://sistema-trafego.vercel.app/oauth/google/callback
   http://localhost:3000/oauth/google/callback
   ```

5. **Create** → janela mostra **Client ID** e **Client Secret** → copie ambos

---

## Passo 4 — Solicitar Developer Token

### 4.1 Criar MCC (se não tiver)

1. Acesse https://ads.google.com/intl/pt-BR_br/home/tools/manager-accounts/
2. Crie uma conta MCC vinculada ao seu Gmail
3. Vincule pelo menos 1 conta de anúncios filha (pode ser de teste)

### 4.2 Pedir o token

1. Dentro da MCC, clique **Tools and Settings** (chave inglesa no topo)
2. Em **Setup**, clique **API Center**
3. Aceite os termos da API
4. Preencha o formulário:
   - **Use case:** gestão multi-cliente de campanhas pagas
   - **Application type:** Web application
   - **API access type:** somente leitura inicialmente (pode mudar pra read+write depois)
   - **Justificativa:** ferramenta interna da agência para visualização e relatórios
5. **Submit**

### 4.3 Resultados

- Imediato: você recebe um **Developer Token em modo Test** (funciona só com contas filhas da sua MCC)
- 1-2 dias úteis: pode subir pra **Basic**
- Até 2 semanas: aprovação **Standard**

Anote o token. Formato típico: `abc-XYZ_1234567890`

---

## Passo 5 — Salvar credenciais

### Em produção (Vercel)

1. https://vercel.com/jose-robertos-projects-635b9fc9/sistema-trafego/settings/environment-variables
2. Adicione 4 vars:

   ```
   GOOGLE_CLIENT_ID=<client_id>
   GOOGLE_CLIENT_SECRET=<client_secret>
   GOOGLE_ADS_DEVELOPER_TOKEN=<dev_token>
   GOOGLE_ADS_REDIRECT_URI=https://sistema-trafego.vercel.app/oauth/google/callback
   ```

3. **Redeploy:** Settings → Deployments → último deploy → menu `...` → *Redeploy*

### Local

`.env.local`:

```
GOOGLE_CLIENT_ID=<client_id>
GOOGLE_CLIENT_SECRET=<client_secret>
GOOGLE_ADS_DEVELOPER_TOKEN=<dev_token>
GOOGLE_ADS_REDIRECT_URI=http://localhost:3000/oauth/google/callback
```

---

## Passo 6 — Conectar uma conta de cliente

> ⚠️ **Fase pendente:** O endpoint OAuth `/oauth/google/start` + callback + sync via Google Ads Query Language (GAQL) ainda não está implementado.
> Implementação posterior, depois do Developer Token estar aprovado.

Quando estiver pronto:

1. `/integracoes` → card Google Ads → **Conectar conta**
2. Redirect Google OAuth
3. Autoriza scope `https://www.googleapis.com/auth/adwords`
4. Sistema lista Customer IDs disponíveis
5. Você escolhe quais Customer IDs (= contas de anúncios) conectar
6. Sync inicial via GAQL (~10-30 min)

---

## Diferenças vs Meta

| Item | Meta Ads | Google Ads |
|------|----------|-----------|
| OAuth | Direto | Direto |
| Developer Token | Não exige | Exige (aprovação manual) |
| Token expira | 60 dias (long-lived) | 1h (refresh token disponível) |
| Granularidade dados | `level=ad` | GAQL com `customer.id` |
| Rate limit | 200 calls/h/app | 15k ops/dia (Basic) |
| Custo dev | Grátis | Grátis (após aprovação) |

---

## Referências oficiais

- Google Ads API: https://developers.google.com/google-ads/api/docs/start
- Developer Token: https://developers.google.com/google-ads/api/docs/get-started/dev-token
- OAuth: https://developers.google.com/google-ads/api/docs/oauth/overview
- GAQL (query language): https://developers.google.com/google-ads/api/docs/query/overview
- Best practices: https://developers.google.com/google-ads/api/docs/best-practices/overview

---

*Última atualização: 2026-05-20*
