-- Idempotência de mensagens: impede duplicar a mesma mensagem do WhatsApp
-- (re-entrega do webhook UAZAPI) e re-disparar a IA. NULLs são distintos no
-- Postgres, então mensagens enviadas sem wa_message_id coexistem normalmente.
create unique index if not exists uq_mensagens_agencia_wamsg
  on mensagens (agencia_id, wa_message_id)
  where wa_message_id is not null;
