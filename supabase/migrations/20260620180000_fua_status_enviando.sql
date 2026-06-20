-- Fix incidente reenvio (follow-up avulso): adiciona status 'enviando' p/ claim atômico.
-- Aplicada via MCP em 2026-06-20.
--
-- Antes: worker enviava as mensagens e SÓ DEPOIS marcava 'enviado'. Com envio lento
-- (UAZAPI) a função serverless estourava o maxDuration (60s) ANTES de marcar, deixando
-- a linha em 'agendado' → o cron (1/min) reprocessava e reenviava a mesma mensagem em
-- loop (1 contato recebeu 12 msgs). Correção: o worker agora "claima" a linha
-- (agendado → enviando) num UPDATE rápido ANTES de enviar; se o envio depois falhar/
-- timeoutar, a linha já saiu de 'agendado' e nunca é reprocessada.

alter table follow_up_avulsos drop constraint if exists follow_up_avulsos_status_check;
alter table follow_up_avulsos add constraint follow_up_avulsos_status_check
  check (status = any (array['agendado'::text, 'enviando'::text, 'enviado'::text, 'cancelado'::text, 'respondido'::text, 'falha'::text]));
