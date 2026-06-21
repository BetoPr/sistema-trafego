-- capi_eventos: aceitar status 'cancelado' (quando fechamento eh excluido).
-- Evento Refund correspondente eh enfileirado como novo registro (event_name='Refund').
alter table capi_eventos drop constraint capi_eventos_status_check;
alter table capi_eventos add constraint capi_eventos_status_check
  check (status in ('pendente','enviando','enviado','erro','sem_atribuicao','cancelado'));
