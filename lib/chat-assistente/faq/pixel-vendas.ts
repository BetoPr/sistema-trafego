export const PIXEL_VENDAS = `# Pixel & Vendas — CAPI Meta + atribuição

Rota: /pixel-vendas

**Apenas super_admin acessa.**

Conecta vendas fechadas no CRM com campanhas Meta Ads via **CAPI** (Conversion API). Quando você fecha venda no chat, CRM dispara evento Purchase pro Meta com qual campanha trouxe esse lead. Meta aprende e otimiza pra trazer mais leads parecidos.

## KPIs (topo da página)
- **Gasto em ads** (R$ investido)
- **Faturamento bruto** (R$ pago pelos clientes)
- **Faturamento líquido** (deduz fees Asaas etc)
- **ROAS** (retorno — quantas vezes recuperou)

Filtros:
- Cliente (dropdown)
- Período (7/14/30/90 dias)

## Eventos CAPI automáticos
- **Lead** — primeira msg do cliente via anúncio (ad_referral detectado)
- **AddToCart** — cliente demonstrou interesse (etiqueta "interessado")
- **Purchase** — fechamento salvo no painel direito
- **Refund** — fechamento deletado (cancela venda)

## Feed de vendas enviadas
Seção "Vendas enviadas ao Meta (Purchase)" — últimas 50:
- Status: ✅ enviado / ❌ erro / ⚠️ sem_atribuicao
- **Por quê?** — modal diagnóstico (CTWA click-id, pixel, campanha, erros)
- **Reenviar** se falhou

## CTWA (Click-to-WhatsApp) click-id
Lead vindo do WhatsApp via clique no anúncio traz CTWA click-id. Sistema captura no webhook. Quando venda fecha, evento Purchase leva o click-id → Meta reconhece e atribui à campanha correta.

Cliente veio via link compartilhado (não clicou no anúncio) → evento sem atribuição → ⚠️ sem_atribuicao.

## Atribuições manuais (Etiquetas por campanha)
Mapeia etiqueta CRM ↔ campanha Meta. Útil sem CTWA.

Estrutura:
- **Pasta** (etiqueta-mãe) ex: "Tráfego Loja A"
- **Etiquetas filhas** ex: "Camp Verão", "Camp Inverno"

Quando aplica etiqueta no contato, Pixel & Vendas usa pra atribuir venda.

Botão **Nova Linha** adiciona inline.

## Acesso
Quem vê: só super_admin. Roadmap: liberar pra admin com permissão.
`;
