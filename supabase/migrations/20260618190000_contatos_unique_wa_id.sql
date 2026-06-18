-- Trava de duplicado de contato por (agencia, wa_id). Parcial: ignora wa_id nulo
-- (contato manual sem WhatsApp) e contatos apagados (soft-delete).
create unique index if not exists uq_contatos_agencia_waid
  on contatos (agencia_id, wa_id)
  where wa_id is not null and deleted_at is null;
