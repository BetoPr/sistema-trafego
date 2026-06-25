export const ALERTAS = `# Alertas Inteligentes

Rota: /alertas

Notifica via WhatsApp quando algo importante acontece em campanhas. Ex: gasto diário ultrapassou R$500 → manda msg pro seu WhatsApp.

## Tipos hoje
- **Gasto do dia** — dispara quando gasto do dia ≥ limite configurado
- **Gasto do mês** — dispara quando gasto mês ≥ limite

Futuro: leads sem resposta, queda CPL, etc.

## Criar
**Novo**. Form:
- **Nome do alerta** (ex: "Gasto diário Studios Festas")
- **Tipo** (Gasto do dia / mês)
- **Limite (R$)** decimal vírgula BR
- **Conta Meta Ads** (dropdown integrações)
- **Cliente** (opcional)
- **WhatsApp destino** (5511999990000 — DDI+DDD+número)
- **Canal de envio** (qual WhatsApp dispara)
- **Mensagem** template com placeholders:
  - {{conta}} — nome da conta Meta
  - {{gasto}} — valor atual gasto
  - {{limite}} — limite configurado
  - {{tipo}} — dia / mês

Preview WhatsApp em tempo real ao lado.

**Salvar**.

## Ações por linha
- ✏️ Editar
- **Testar agora** — força dispatch sem esperar threshold
- Toggle 🟢/⚫ ativo/inativo
- 🗑️ Deletar

Linha mostra "último disparo" + "último observado" pra debug.

## Stats topo
"Alertas configurados" — X ativo(s) · Y já disparou.
`;
