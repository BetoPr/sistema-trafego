export const RELATORIOS = `# Relatorios

Agenda envio automatico de relatorios pelo WhatsApp.

## Frequencias
- **Diario**: hora especifica do dia.
- **Semanal**: dia da semana + hora.
- **Mensal**: dia do mes + hora.

## Formatos
- **Texto**: mensagem WhatsApp simples com KPIs.
- **PDF**: documento Sonar com layout (KPIs financeiro + trafego + topo).
- **Imagem (PNG)**: foto formato 1080x1200 com KPIs (gerada via canvas server-side).

## Destino
- Telefone direto: digita numero.
- Cliente do CRM: pega 1o contato vinculado.

## Periodo do relatorio
- Configuravel em dias retroativos (padrao 7d).

## Como criar
- /relatorios > Novo > escolhe nome, frequencia, formato, periodo, destino, canal WhatsApp.

## Editar/desativar
- Click no relatorio > Balao com config + botao Ativar/Desativar.

## Status
- Coluna ultimo_status: enviado, falhou, enviando, agendado.
- Coluna ultimo_erro: motivo da ultima falha.

## Worker
- Roda via /api/cron/relatorios (Bearer CRON_SECRET).
- Pega ativos com proximo_envio <= now, gera, envia, agenda proximo.

## Problemas
- "Nenhum canal WhatsApp conectado": canal usado nao esta connected. Reconecta em /canais.
- "mime type image/png is not supported": bucket relatorios precisa permitir image/png (ja fix).
- Texto chegou em vez de imagem/PDF: fallback automatico quando geracao falha.
`;
