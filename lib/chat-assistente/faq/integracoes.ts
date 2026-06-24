export const INTEGRACOES = `# Integracoes (Meta Ads, Google Ads, WhatsApp UAZAPI)

Conecta plataformas externas pra puxar dados.

## Meta Ads
- /integracoes/meta. Botao Conectar abre OAuth Facebook.
- Escolhe ad_account + vincula a 1 cliente da agencia.
- Sync automatico: campanhas, conjuntos, anuncios, metricas, criativos (thumbnails).
- Botao "Sincronizar agora" em varios lugares (Dashboard, Campanhas).
- Reconectar quando token expira (60d normalmente).

## Google Ads
- /integracoes/google. OAuth Google. Aceito mas sync ainda nao implementado completo.

## WhatsApp UAZAPI (canal)
- /canais. Lista canais conectados (instancias).
- Adicionar canal: Servidor UAZAPI + token. QR code aparece, escaneia com WhatsApp.
- Status: conectado, desconectado, qrcode.
- Padrao: marca 1 canal como "padrao" pra envios sem canal especificado.
- Mensagem de despedida: configura mensagem ao fechar ticket (opcional).

## Webhook UAZAPI
- Cada canal tem webhook_secret unico. UAZAPI manda eventos pra /api/webhooks/uazapi/<secret>.
- Eventos: messages (recebida), messages_update (status entregue/lida).

## Servidores UAZAPI (super-admin)
- Super-admin cadastra servidores UAZAPI globais. Agencias escolhem servidor ao criar canal.

## Asaas (pagamentos)
- /integracoes/asaas. Cadastra api_key. Permite gerar cobrancas.
- Webhook Asaas: /api/webhooks/asaas/<secret>. Atualiza status da cobranca.

## Problemas
- Sync Meta nao acontece: token expirou. /integracoes/meta > Reconectar.
- WhatsApp desconecta sozinho: instancia UAZAPI travada. Veja /canais > status > QR de novo.
- "Invalid OAuth state": cookie expirou no callback. Tenta de novo.
`;
