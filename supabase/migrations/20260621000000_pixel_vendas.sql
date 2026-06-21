-- Pixel & Vendas: pixel no integracoes + ledger de eventos CAPI

alter table integracoes add column if not exists pixel_id text;
alter table integracoes add column if not exists pixel_nome text;

create table if not exists capi_eventos (
  id uuid primary key default gen_random_uuid(),
  agencia_id uuid not null references agencias(id) on delete cascade,
  cliente_id uuid references clientes(id) on delete set null,
  integracao_id uuid references integracoes(id) on delete set null,
  pixel_id text,
  ticket_id uuid not null references tickets(id) on delete cascade,
  contato_id uuid references contatos(id) on delete set null,
  event_id text not null,
  event_name text not null default 'Purchase',
  valor numeric(12,2) not null default 0,
  moeda text not null default 'BRL',
  servico text,
  quantidade integer,
  fechado_em timestamptz,
  ctwa_clid text,
  source_id text,
  anuncio_id uuid references anuncios(id) on delete set null,
  conjunto_id uuid references conjuntos(id) on delete set null,
  campanha_id uuid references campanhas(id) on delete set null,
  status text not null default 'pendente'
    check (status in ('pendente','enviando','enviado','erro','sem_atribuicao')),
  tentativas integer not null default 0,
  erro text,
  resposta jsonb,
  enviado_em timestamptz,
  created_at timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (agencia_id, event_id)
);

create index if not exists idx_capi_eventos_pendentes on capi_eventos(status) where status in ('pendente','erro');
create index if not exists idx_capi_eventos_agencia on capi_eventos(agencia_id, created_at desc);
create index if not exists idx_capi_eventos_campanha on capi_eventos(campanha_id);

alter table capi_eventos enable row level security;
create policy "tenant_capi_eventos" on capi_eventos for all using (agencia_id = auth_agencia_id());
