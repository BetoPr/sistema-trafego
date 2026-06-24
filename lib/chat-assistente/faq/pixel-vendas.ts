export const PIXEL_VENDAS = `# Pixel & Vendas

Atribuicao de vendas/leads ao anuncio Meta correto via Pixel + CAPI.

## Pra que serve
- Cliente clica em anuncio → vai pro WhatsApp via CTWA (click_id na URL).
- CRM detecta o ctwa_clid, salva no contato.
- Quando contato vira venda (ticket fechado com valor): dispara evento CAPI **Purchase** pro Pixel Meta.
- Meta aprende quem converte, otimiza entrega.

## Eventos suportados
- **Lead**: ao criar contato com ctwa_clid (1a mensagem).
- **AddToCart**: ao detectar palavras-chave (configuravel) — geralmente "preco", "valor", "quanto custa".
- **Purchase**: ao fechar ticket com valor_fechado preenchido.

## Configurar
1. /integracoes/meta — conecta conta + escolhe ad_account.
2. /pixel-vendas — escolhe Pixel ID (lista vem do Meta).
3. Vincula Pasta/Etiqueta a campanha pra atribuicao precisa.

## Vincular Pasta a Campanha
- Cria Pasta "Restauracao" em /configuracoes/etiquetas.
- Filhas: "Restauracao/Bebe", "Restauracao/Mofo".
- Na pagina Pixel & Vendas, escolhe campanha Meta e vincula Pasta + Etiqueta.
- Quando lead chega via CTWA, aplica Pasta + Etiqueta automatico.

## Cancelamento
- Apagar ticket fechado dispara **Refund** CAPI (reverte purchase).

## Como saber se ta funcionando
- Aba "Eventos" em Pixel & Vendas mostra ultimos 50 eventos enviados (status, motivo).
- Test Events no Meta Business: ve eventos chegando em tempo real.

## Problemas
- Evento nao dispara: ctwa_clid nao foi capturado (bug ja fix em camelCase).
- Lead sem campanha: o ctwa_clid expirou (Meta limita ~30d).
- CAPI rejeita: token expirou (reconectar Meta).
`;
