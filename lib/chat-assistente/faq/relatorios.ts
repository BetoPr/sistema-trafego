export const RELATORIOS = `# Relatórios agendados

Rota: /relatorios

Mensagens automáticas que CRM envia em horários definidos com KPIs Meta/Google. Ex: "Toda segunda 9h manda performance da semana pro WhatsApp do cliente Fulano".

## Criar
**Criar Relatório**. Form:
- **Nome** (ex: "Relatório Felipe Boulanger")
- **Cliente cadastrado** dropdown OU **Telefone destino** (+55 11 99999-9999) — mutuamente exclusivos
- **Plataforma** (Meta Ads / Google Ads)
- **Canal WhatsApp** ("Qualquer ativo" ou específico)
- **Frequência** (Diário / Semanal / Mensal)
  - Semanal → Dia da Semana
  - Mensal → Dia do Mês (1-31)
- **Hora** (HH:MM)
- **Formato** (PDF / Imagem / Texto)
- **Período (dias)** lookback (1-90)

**Salvar**.

## Formatos
- **PDF** — relatório completo com gráficos + tabelas. Anexo no WhatsApp.
- **Imagem** — captura PNG com KPIs. Aparece direto no chat.
- **Texto** — só texto formatado, mais leve.

PDF e Imagem usam Puppeteer pra renderizar — gera mais lento.

## Ações por linha
- **Enviar** — dispara agora sem esperar horário (desabilita se ativo=false)
- ✏️ Editar
- Toggle 🟢/⚫ ativo/inativo
- 🗑️ Deletar (confirma)

## Busca e filtros
Topo: "Buscar relatório…" + chips "Todos / Ativos / Inativos".

## Quem pode criar
Qualquer Usuário CRM com agencia_id (não exige admin).

## Mobile
Layout cards 1 coluna no celular. Mesmas ferramentas.
`;
