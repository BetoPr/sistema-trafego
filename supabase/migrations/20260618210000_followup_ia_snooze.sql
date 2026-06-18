-- Follow-up IA: cooldown de descarte.
-- Quando um ticket e "descartado sem fechar" na tela de Follow-up IA, ele some
-- da busca por ~12h (snooze) pra nao poluir a proxima leva. Aplicada via MCP em 2026-06-18.
alter table public.tickets
  add column if not exists follow_up_ia_snooze_ate timestamptz;

comment on column public.tickets.follow_up_ia_snooze_ate is
  'Follow-up IA: ticket descartado sem fechar fica em cooldown ate esta data (some da busca de follow-up por ~12h).';

create index if not exists idx_tickets_fu_ia_snooze
  on public.tickets (agencia_id, follow_up_ia_snooze_ate)
  where follow_up_ia_snooze_ate is not null;
