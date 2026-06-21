# Pixel & Vendas — Design Spec

- **Data:** 2026-06-20
- **Status:** Aprovado (design) — pendente revisão do spec → plano de implementação
- **Seção:** Tráfego (Ads) · **Acesso:** Super Admin only (v1)
- **Autor:** Roberto + Claude (brainstorming)

---

## 1. Problema / Objetivo

Hoje a seção **Tráfego (Ads)** tem 9 itens (2 funcionais, 7 placeholders "BREVE") e o Meta não recebe de volta as vendas que acontecem no WhatsApp. Sem isso:

- O Meta não sabe **qual campanha gerou a venda** → otimiza no escuro (otimiza por lead, não por compra).
- Roberto não tem uma visão única de **gasto × faturamento × ROAS por campanha/conjunto**.

**Objetivo v1:** construir **uma** ferramenta dentro de Tráfego (Ads) — **Pixel & Vendas** — que:

1. Envia ao Meta (Conversions API) um evento **Purchase** sempre que um **Fechamento** é registrado no CRM, atribuído à campanha de origem (CTWA) via `ctwa_clid`.
2. Mostra um painel de atribuição: **Gasto, Faturamento bruto, Faturamento líquido, ROAS**, por **campanha → conjunto**, com busca e filtro.
3. Conecta o Pixel do cliente automaticamente via login do Meta (OAuth).

Construir 1 ferramenta, **validar 100%**, depois expandir (globo de estados, web pixel, etc.).

---

## 2. Escopo

### Dentro do v1
- Parquear os 9 itens atuais da seção (preservar nomes/rotas, sumir da sidebar).
- Aba **Pixel & Vendas** (super_admin).
- Disparo de **Purchase** via CAPI no Fechamento.
- Correção do bug de chave `ctwa_clid` (atribuição).
- Conexão automática do Pixel via OAuth (scope `ads_management`).
- Painel: KPIs + tabela campanha→conjunto + feed de eventos + conectar pixel.

### Fora do v1 (Fase 2+)
- 🌐 **Globo 3D girável** de leads por estado (Brasil), hover/seleção por estado (fonte: DDD do telefone → estado).
- Faturamento líquido com **custo de serviço** (exige cadastro de custo por serviço).
- Evento **Lead** (CTWA) para otimização do Meta (não só atribuição).
- Web Pixel / checkout (atribuição fora do WhatsApp).
- Liberar a aba pra admins (não-super) e por cliente.

---

## 3. Parqueamento dos 9 itens

Itens atuais (de [`AppSidebar.tsx`](../../../components/layout/AppSidebar.tsx), seção `trafego`): Leads Meta, Campanhas, Funil, Criativos, Público, Relatórios, Insights IA, Alertas, Clientes (Ads).

- **Sidebar:** remover os 9 da seção `trafego`; deixar só `Pixel & Vendas`.
- **Rotas:** NÃO deletar os arquivos de página. Mover/registrar num "estacionamento" documentado para futuro (`docs/parking-trafego.md` listando nome + rota + estado), e/ou manter as rotas acessíveis por URL direta mas fora do menu. Decisão de implementação: manter os arquivos onde estão e apenas removê-los do menu (menor risco), com o doc de parking registrando a intenção de reuso dos nomes.
- `Leads Meta` e `Clientes (Ads)` continuam funcionando por URL; só saem do menu.

---

## 4. Atribuição (coração)

### 4.1 Dados que já existem
- `ctwa_clid` capturado no referral CTWA → `mensagens.metadata.ad_referral.ctwaClid` ([`webhook-parser.ts`](../../../lib/uazapi/webhook-parser.ts) linhas ~300-316).
- Etiqueta automática por mensagem (`etiquetas.palavra_gatilho`, match "contém") → fonte 2 de campanha.
- Hierarquia Meta (campanha → conjunto → anúncio) e insights já sincronizados por [`lib/meta-ads/sync.ts`](../../../lib/meta-ads/sync.ts).

### 4.2 Bug a corrigir (bloqueia atribuição hoje)
O parser grava a chave **`ctwaClid`** (camelCase) mas [`lib/meta-ads/conciliar.ts`](../../../lib/meta-ads/conciliar.ts) (~linha 56) lê **`ctwa_clid`** (snake_case). Não casa → reconciliação por click-id falha silenciosamente.

**Fix:** padronizar a chave. Gravar `ctwa_clid` (snake_case) no `ad_referral` (alinhar ao resto do sistema e ao `meta_leads.ctwa_clid`), e ler com fallback para `ctwaClid` (compat retroativa com mensagens já gravadas). Aplicar tanto na conciliação quanto na nova leitura para o Purchase.

### 4.3 Mapear venda → campanha/conjunto
Para a tabela "Desempenho por campanha", precisamos ligar cada **Fechamento** (receita) a uma **campanha + conjunto**:

1. Do contato do ticket, achar o `ctwa_clid` (1ª mensagem com `ad_referral`).
2. Do referral, ler o identificador do anúncio (`ad_referral.source_id` / `sourceId`). **A confirmar no plano:** se `source_id` corresponde ao `ad_id` na hierarquia sincronizada. Se sim → `ad → adset(conjunto) → campanha`.
3. Fallback quando não há `source_id` mapeável: agrupar por **etiqueta** (fonte 2) ou marcar como "Sem campanha (sem click-id)".

A **receita** (bruto) vem de `tickets.valor_fechado`; o **gasto** vem dos insights Meta já sincronizados, agregados por campanha/conjunto no mesmo período/cliente.

---

## 5. Disparo do Purchase (Conversions API)

### 5.1 Gatilho
Quando [`/api/atendimentos/[id]/fechamento`](../../../app/api/atendimentos/[id]/fechamento/route.ts) grava `valor_fechado`, enfileirar o envio do evento (assíncrono — `after()` do Next 16 ou cron/fila; **nunca** bloquear a resposta do fechamento, **nunca** acoplar cron a route handler).

### 5.2 Payload (POST `https://graph.facebook.com/v21.0/{pixel_id}/events`)
```jsonc
{
  "data": [{
    "event_name": "Purchase",
    "event_time": <unix do fechado_em>,
    "action_source": "business_messaging",
    "messaging_channel": "whatsapp",
    "event_id": "fechamento:{ticket_id}",        // dedup — 1 fechamento por ticket
    "user_data": {
      "ctwa_clid": "<click-id do contato>",        // chave da atribuição CTWA
      "ph": ["<SHA256(telefone E.164)>"]           // hash, nunca telefone cru
    },
    "custom_data": {
      "currency": "BRL",
      "value": <valor_fechado>,
      "content_name": "<servico>",
      "num_items": <quantidade>
    }
  }],
  "access_token": "<token do pixel/integração, descriptografado>"
}
```
- **Dedup:** `event_id = fechamento:{ticket_id}`. Reenvio nunca duplica no Meta.
- **Recorrência:** cada ticket fechado = 1 evento próprio com seu valor. Cliente que fecha 3x → 3 Purchases.
- **Sem `ctwa_clid`:** ainda envia o Purchase (Meta pode casar por telefone hash), mas marca o log como `sem_clid` (atribuição fraca).

### 5.3 Log de eventos — tabela `capi_eventos`
| coluna | tipo | nota |
|---|---|---|
| id | uuid pk | |
| agencia_id | uuid | RLS |
| cliente_id | uuid | |
| ticket_id | uuid | FK tickets |
| contato_id | uuid | |
| pixel_id | text | |
| event_id | text | **unique (agencia_id, event_id)** — dedup |
| event_name | text | "Purchase" |
| valor | numeric(12,2) | |
| moeda | text | "BRL" |
| ctwa_clid | text | nullable |
| campanha_id / conjunto_id / anuncio_id | text | nullable (atribuição) |
| status | text | `pendente` / `enviado` / `erro` / `sem_clid` |
| tentativas | int | retry |
| resposta | jsonb | retorno/erro do Meta |
| enviado_em | timestamptz | |
| created_at | timestamptz | |

- **Idempotência de envio:** claim atômico (`pendente → enviando`) antes do POST, igual ao padrão dos workers de follow-up — evita reenvio em timeout serverless.
- **Reenviar manual:** botão na UI re-dispara usando o mesmo `event_id` (seguro pelo dedup).

---

## 6. Credenciais — OAuth automático

- **Scope:** subir o OAuth Meta de `ads_read` para incluir **`ads_management`** (necessário para escrever eventos no Pixel). **Evitar** `business_management` (causou o popup de Business Manager que cancelava sozinho — ver comentário em [`lib/meta-ads/api.ts`](../../../lib/meta-ads/api.ts)).
- **Descoberta do Pixel:** após conectar, listar os pixels da conta via Graph (`/{ad_account_id}/adspixels` ou `/{business_id}/owned_pixels`). Se 1 → seleciona automático; se vários → UI pede escolher.
- **Storage:** adicionar em `integracoes` (plataforma `meta_ads`): `pixel_id text`, `pixel_nome text`. O token já existe (criptografado AES-256-GCM); reusar o mesmo para escrever eventos.
- **Token:** long-lived (~60 dias). Monitorar `token_expires_at`; avisar/forçar re-login antes de expirar (senão os eventos param).

### ⚠️ Risco (go-live)
`ads_management` é **Advanced Access** no Meta → exige **App Review**. Sem review, funciona apenas para usuários que são **admin/tester do app** (Roberto e clientes adicionados como testers). Para liberar a clientes arbitrários de forma self-service, submeter App Review. **Decisão:** validar v1 com Roberto/testers; planejar App Review antes de abrir pra clientes.

---

## 7. UI — Pixel & Vendas

Padrão visual do site (componentes `mk-*`, ícones **Tabler/SVG**, verde do CRM `#10b981`). **Sem emojis** nos títulos.

- **Cabeçalho:** título "Pixel & Vendas" com ícone SVG; **abaixo, alinhados à esquerda:** busca de campanha + filtro Conjunto + filtro Cliente + Período.
- **KPIs (4):** Gasto em ads · Faturamento bruto · Faturamento líquido (= bruto − gasto) · ROAS (= bruto ÷ gasto). Sub-linha: taxa de match de click-id.
- **Tabela "Desempenho por campanha":** linhas por campanha, **expansível** para os conjuntos. Colunas: Campanha/Conjunto · Gasto · Bruto · Líquido · ROAS · Vendas.
- **Feed "Vendas enviadas ao Meta":** lista dos Purchases (contato mascarado, valor, campanha, horário, status ✓/erro/sem-clid, botão **Reenviar**).
- **Card "Conectar Pixel (Meta)":** botão OAuth + status por cliente.
- **Gate:** rota e dados restritos a `super_admin` (checar via `getUser()`/`getClaims()`, RLS por `agencia_id`).

Referência visual: mockups `pixel-vendas-v3.html` (sessão de brainstorming).

---

## 8. Cálculos

- **Bruto** = Σ `tickets.valor_fechado` atribuídos à campanha/conjunto no período/cliente.
- **Gasto** = Σ spend dos insights Meta da campanha/conjunto no mesmo recorte. *(A confirmar no plano: spend já está armazenado por campanha/conjunto pelo sync; se não, estender o sync.)*
- **Líquido** = Bruto − Gasto.
- **ROAS** = Bruto ÷ Gasto (∞/—" quando Gasto = 0).
- **Taxa de match** = vendas com `ctwa_clid` ÷ total de vendas.

---

## 9. Fluxos de erro

| Situação | Comportamento |
|---|---|
| Fechamento sem `ctwa_clid` no contato | Envia Purchase mesmo assim (hash telefone); log `sem_clid` |
| Token Meta expirado | Marca `erro`, sinaliza re-login na UI; retry após reconectar |
| CAPI 4xx (payload inválido) | `erro` + guarda `resposta`; não reenfileira sozinho (precisa correção) |
| CAPI 429 (rate limit) | Backoff + retry |
| Timeout serverless no envio | Claim atômico garante que não duplica; evento volta a `pendente` |
| `source_id` do referral não mapeia anúncio | Atribui por etiqueta (fonte 2) ou "Sem campanha" |

---

## 10. Requisitos não-funcionais

- **Multi-tenant:** toda tabela nova com `agencia_id` + RLS (`agencia_id = auth_agencia_id()`).
- **Cripto:** tokens só app-level AES-256-GCM ([`lib/crypto/tokens.ts`](../../../lib/crypto/tokens.ts)); telefone hash SHA-256 antes de enviar.
- **Assíncrono:** envio desacoplado do request (`after()` ou cron próprio); **não** acoplar node-cron a route handler.
- **Erros em PT-BR** pro usuário; logs estruturados.
- **Segurança:** nunca expor service_role/token no browser; nunca logar token/telefone cru.

---

## 11. Critérios de aceite (validação v1)

1. Seção Tráfego (Ads) mostra só **Pixel & Vendas** (super_admin); os 9 antigos saíram do menu, rotas preservadas + documentadas.
2. Conectar Pixel via Meta funciona (OAuth) e grava `pixel_id` por cliente.
3. Registrar um Fechamento real dispara **1** Purchase no Meta; aparece no **Events Manager → Test Events** com `value`, `currency`, `ctwa_clid`.
4. Reenviar o mesmo fechamento **não duplica** no Meta (dedup por `event_id`).
5. Painel mostra Gasto/Bruto/Líquido/ROAS coerentes e a tabela campanha→conjunto com busca e filtro.
6. Bug do `ctwa_clid` corrigido (atribuição casa).

---

## 12. Decisões abertas (resolver no plano)

- Confirmar `ad_referral.source_id` ⇄ `ad_id` da hierarquia sincronizada.
- Confirmar se spend já está armazenado por campanha/conjunto (senão, estender sync).
- Forma exata de listar pixels (ad account vs business) conforme o que o token `ads_management` libera sem `business_management`.
