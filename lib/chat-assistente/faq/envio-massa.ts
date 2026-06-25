export const ENVIO_MASSA = `# Envio em Massa

Rota: /envio-massa

Hoje só aba **Texto** funcional. (Template / Variável / Relatório = em breve, grayed).

## Form
- **Canal** — qual WhatsApp dispara (precisa conectado)
- **Delay min (seg)** — padrão 20
- **Delay max (seg)** — padrão 45
- **Mensagem** — texto (suporta [nome] como placeholder mas hoje NÃO substitui ainda — MVP)
- **Números** — 1 por linha, formato 5511999999999

**Disparar envio**.

## Limites por plano
- **LITE** R$138/mês: até 100 mensagens/dia
- **PRO** R$195/mês: até 300/dia
- R$29 básico: limite muito baixo (não recomendado pra disparo)

Limite diário, zera meia-noite.

## Risco ban WhatsApp
Aviso na tela. Recomendado:
- Delays 20-45s entre disparos
- Máximo 50 números por lote
- Evitar enviar pra quem não te conhece

CRM dispara direto via UAZAPI (MVP — sem fila persistente).

## Cancelar envio em andamento
**Não tem hoje**. Pra parar: fecha a aba (interrompe loop no front).
Versão futura: fila BullMQ permite pausar/cancelar/retomar.

## Mídia (foto/vídeo/PDF) em massa
**Hoje só texto**. Mídia em massa = roadmap (aba Template).

## Variáveis [nome]
Suporta sintaxe mas não substitui (placeholder MVP). Futuro: [nome], [saudacao], [empresa].

## Disparar pra etiqueta inteira
Hoje precisa exportar manualmente:
1. Contatos → filtra (em desenvolvimento) ou cola números na mão
2. Cola no campo Números

Filtro etiqueta em massa = roadmap.
`;
