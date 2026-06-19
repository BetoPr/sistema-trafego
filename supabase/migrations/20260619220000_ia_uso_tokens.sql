-- Log de uso de tokens das IAs (groq/openai/anthropic) por tarefa/usuario/contato/ticket.
-- Insert via service role; SELECT por agência (RLS). Base do hub "Análise de IAs".
create table if not exists public.ia_uso (
  id uuid primary key default gen_random_uuid(),
  agencia_id uuid not null references public.agencias(id) on delete cascade,
  usuario_id uuid references public.usuarios(id) on delete set null,
  contato_id uuid references public.contatos(id) on delete set null,
  ticket_id uuid references public.tickets(id) on delete set null,
  tarefa text not null,                  -- transcricao | resumo | sentimento | followup | atendimento | outro
  provider text not null,                -- groq | openai | anthropic
  modelo text not null,
  prompt_tokens integer not null default 0,
  completion_tokens integer not null default 0,
  total_tokens integer not null default 0,
  audio_seg numeric not null default 0,  -- segundos de audio (transcricao)
  custo_usd numeric(14,6) not null default 0,
  status text not null default 'ok',     -- ok | erro | rate_limit
  erro text,
  criado_em timestamptz not null default now()
);

create index if not exists idx_ia_uso_ag_data on public.ia_uso (agencia_id, criado_em desc);
create index if not exists idx_ia_uso_ag_tarefa on public.ia_uso (agencia_id, tarefa, criado_em desc);
create index if not exists idx_ia_uso_ag_provider on public.ia_uso (agencia_id, provider, criado_em desc);
create index if not exists idx_ia_uso_ag_usuario on public.ia_uso (agencia_id, usuario_id, criado_em desc);
create index if not exists idx_ia_uso_ag_ticket on public.ia_uso (agencia_id, ticket_id);

alter table public.ia_uso enable row level security;

drop policy if exists ia_uso_select on public.ia_uso;
create policy ia_uso_select on public.ia_uso
  for select using (agencia_id = auth_agencia_id());

comment on table public.ia_uso is 'Log de uso de tokens das IAs por tarefa/usuario/contato/ticket. Insert via service role; SELECT por agencia (RLS).';
