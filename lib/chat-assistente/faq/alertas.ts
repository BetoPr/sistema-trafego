export const ALERTAS = `# Alertas

Regras automaticas que disparam mensagem WhatsApp quando metrica bate criterio.

## Tipos de regra
- **Gasto subiu acima de X%**: compara periodo atual vs anterior.
- **Queda de leads**: leads abaixo de X em N dias.
- **CPL alto**: custo por lead acima de R$ X.
- **ROAS baixo**: ROAS abaixo de Y.
- **Campanha pausada**: detecta pausa inesperada.

## Como criar
- /alertas > Nova regra. Escolhe metrica + condicao + threshold + canal/numero destino + mensagem custom.

## Anti-spam
- Cada regra so dispara 1x a cada 24h por padrao (configuravel).
- Botao "Testar agora" valida envio sem trigger real.

## Mensagem custom
- Suporta variaveis: {gasto}, {cpl}, {roas}, {campanha}, {periodo}.
- Use Markdown WhatsApp: *bold*, _italico_, ~strike~.

## Emoji picker
- Botao emoji ao lado do input mensagem.

## WhatsApp preview
- Antes de salvar, ve como vai chegar no WhatsApp.

## Disparos historico
- /alertas > Disparos: log dos ultimos envios (data, regra, status).

## Problemas
- Alerta nao dispara: regra pode estar com anti-spam ativo (24h). Veja log /alertas/disparos.
- Mensagem feia: usa preview pra ajustar antes.
`;
