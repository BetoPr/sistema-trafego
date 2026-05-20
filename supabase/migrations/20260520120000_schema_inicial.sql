-- =============================================================
-- Sistema de Gestão de Tráfego — Schema inicial
-- Multi-tenant por agencia_id, RLS habilitado em todas as tabelas.
-- Tokens OAuth são criptografados NO APP (AES-256-GCM via node:crypto)
-- antes de chegar aqui; o banco apenas armazena bytea opaco.
-- =============================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- -------------------------------------------------------------
-- Trigger genérico: atualiza updated_at
-- -------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =============================================================
-- 1. AGÊNCIAS
-- =============================================================
create table agencias (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  slug text unique not null,
  branding jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create trigger trg_agencias_updated before update on agencias
  for each row execute function set_updated_at();

-- =============================================================
-- 2. USUÁRIOS (linka a auth.users do Supabase)
-- =============================================================
create table usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  agencia_id uuid not null references agencias(id) on delete cascade,
  nome text not null,
  email text not null,
  role text default 'owner' check (role in ('owner','admin','editor','viewer')),
  ativo boolean default true,
  created_at timestamptz default now()
);
create index idx_usuarios_agencia on usuarios(agencia_id);

-- =============================================================
-- 3. CLIENTES
-- =============================================================
create table clientes (
  id uuid primary key default gen_random_uuid(),
  agencia_id uuid not null references agencias(id) on delete cascade,
  nome text not null,
  slug text not null,
  segmento text,
  status text default 'ativo' check (status in ('ativo','pausado','encerrado')),
  valor_mensal numeric(10,2),
  data_inicio date,
  contato_principal jsonb default '{}'::jsonb,
  observacoes text,
  deleted_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(agencia_id, slug)
);
create index idx_clientes_agencia on clientes(agencia_id) where deleted_at is null;
create trigger trg_clientes_updated before update on clientes
  for each row execute function set_updated_at();

-- =============================================================
-- 4. INTEGRAÇÕES (tokens OAuth criptografados no app)
-- =============================================================
create table integracoes (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  agencia_id uuid not null references agencias(id) on delete cascade,
  plataforma text not null check (plataforma in ('meta_ads','google_ads','ga4')),
  account_id text not null,
  account_name text,
  access_token_encrypted bytea,
  refresh_token_encrypted bytea,
  token_expires_at timestamptz,
  status text default 'ativa' check (status in ('ativa','expirada','erro','pausada')),
  ultima_sync timestamptz,
  proxima_sync timestamptz,
  erro_ultima_sync text,
  created_at timestamptz default now(),
  unique(cliente_id, plataforma, account_id)
);
create index idx_integracoes_cliente on integracoes(cliente_id);
create index idx_integracoes_sync on integracoes(proxima_sync) where status = 'ativa';

-- =============================================================
-- 5. CAMPANHAS
-- =============================================================
create table campanhas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  agencia_id uuid not null references agencias(id) on delete cascade,
  integracao_id uuid not null references integracoes(id) on delete cascade,
  plataforma text not null,
  external_id text not null,
  nome text not null,
  objetivo text,
  status text,
  orcamento_diario numeric(10,2),
  orcamento_total numeric(10,2),
  data_inicio date,
  data_fim date,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(integracao_id, external_id)
);
create index idx_campanhas_cliente on campanhas(cliente_id);
create trigger trg_campanhas_updated before update on campanhas
  for each row execute function set_updated_at();

-- =============================================================
-- 6. CONJUNTOS DE ANÚNCIOS
-- =============================================================
create table conjuntos (
  id uuid primary key default gen_random_uuid(),
  campanha_id uuid not null references campanhas(id) on delete cascade,
  cliente_id uuid not null references clientes(id) on delete cascade,
  agencia_id uuid not null references agencias(id) on delete cascade,
  external_id text not null,
  nome text not null,
  status text,
  orcamento numeric(10,2),
  segmentacao jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(campanha_id, external_id)
);
create index idx_conjuntos_campanha on conjuntos(campanha_id);

-- =============================================================
-- 7. ANÚNCIOS
-- =============================================================
create table anuncios (
  id uuid primary key default gen_random_uuid(),
  conjunto_id uuid not null references conjuntos(id) on delete cascade,
  cliente_id uuid not null references clientes(id) on delete cascade,
  agencia_id uuid not null references agencias(id) on delete cascade,
  external_id text not null,
  nome text not null,
  status text,
  criativo jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(conjunto_id, external_id)
);
create index idx_anuncios_conjunto on anuncios(conjunto_id);

-- =============================================================
-- 8. MÉTRICAS DIÁRIAS
-- =============================================================
create table metricas_diarias (
  id uuid primary key default gen_random_uuid(),
  anuncio_id uuid not null references anuncios(id) on delete cascade,
  conjunto_id uuid not null references conjuntos(id) on delete cascade,
  campanha_id uuid not null references campanhas(id) on delete cascade,
  cliente_id uuid not null references clientes(id) on delete cascade,
  agencia_id uuid not null references agencias(id) on delete cascade,
  data date not null,
  impressoes integer default 0,
  alcance integer default 0,
  cliques integer default 0,
  gasto numeric(10,2) default 0,
  conversoes integer default 0,
  receita numeric(10,2) default 0,
  frequencia numeric(5,2) default 0,
  visualizacoes_video integer default 0,
  engajamento integer default 0,
  leads integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(anuncio_id, data)
);
create index idx_metricas_data on metricas_diarias(data desc);
create index idx_metricas_cliente_data on metricas_diarias(cliente_id, data desc);
create index idx_metricas_campanha_data on metricas_diarias(campanha_id, data desc);

-- =============================================================
-- 9. METAS
-- =============================================================
create table metas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  agencia_id uuid not null references agencias(id) on delete cascade,
  metrica text not null,
  valor_alvo numeric(10,2) not null,
  operador text default '>=' check (operador in ('>=','<=','=','>','<')),
  periodo text default 'mensal' check (periodo in ('diario','semanal','mensal')),
  ativa boolean default true,
  created_at timestamptz default now()
);
create index idx_metas_cliente on metas(cliente_id) where ativa = true;

-- =============================================================
-- 10. ALERTAS
-- =============================================================
create table alertas_regras (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references clientes(id) on delete cascade,
  agencia_id uuid not null references agencias(id) on delete cascade,
  nome text not null,
  tipo text not null,
  regra jsonb not null,
  ativa boolean default true,
  created_at timestamptz default now()
);

create table alertas_disparos (
  id uuid primary key default gen_random_uuid(),
  regra_id uuid not null references alertas_regras(id) on delete cascade,
  cliente_id uuid not null references clientes(id) on delete cascade,
  agencia_id uuid not null references agencias(id) on delete cascade,
  mensagem text not null,
  contexto jsonb,
  lido boolean default false,
  enviado_em timestamptz default now()
);
create index idx_alertas_disparos_cliente on alertas_disparos(cliente_id, enviado_em desc);

-- =============================================================
-- 11. RELATÓRIOS
-- =============================================================
create table relatorios_gerados (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  agencia_id uuid not null references agencias(id) on delete cascade,
  formato text not null check (formato in ('pdf','excel')),
  periodo_inicio date,
  periodo_fim date,
  arquivo_url text,
  status text default 'gerado',
  gerado_em timestamptz default now()
);
create index idx_relatorios_gerados_cliente on relatorios_gerados(cliente_id, gerado_em desc);

-- =============================================================
-- VIEW: KPIs diários (exclui clientes soft-deleted)
-- =============================================================
create or replace view v_kpis_diarios as
select
  m.cliente_id,
  m.agencia_id,
  m.campanha_id,
  m.data,
  sum(m.impressoes) as impressoes,
  sum(m.cliques) as cliques,
  sum(m.gasto) as gasto,
  sum(m.conversoes) as conversoes,
  sum(m.receita) as receita,
  case when sum(m.gasto) > 0 then sum(m.receita) / sum(m.gasto) else 0 end as roas,
  case when sum(m.conversoes) > 0 then sum(m.gasto) / sum(m.conversoes) else 0 end as cpa,
  case when sum(m.impressoes) > 0 then (sum(m.cliques)::numeric / sum(m.impressoes)) * 100 else 0 end as ctr,
  case when sum(m.cliques) > 0 then sum(m.gasto) / sum(m.cliques) else 0 end as cpc,
  case when sum(m.impressoes) > 0 then (sum(m.gasto) / sum(m.impressoes)) * 1000 else 0 end as cpm
from metricas_diarias m
join clientes c on c.id = m.cliente_id
where c.deleted_at is null
group by m.cliente_id, m.agencia_id, m.campanha_id, m.data;

-- =============================================================
-- ROW LEVEL SECURITY
-- =============================================================
alter table agencias enable row level security;
alter table usuarios enable row level security;
alter table clientes enable row level security;
alter table integracoes enable row level security;
alter table campanhas enable row level security;
alter table conjuntos enable row level security;
alter table anuncios enable row level security;
alter table metricas_diarias enable row level security;
alter table metas enable row level security;
alter table alertas_regras enable row level security;
alter table alertas_disparos enable row level security;
alter table relatorios_gerados enable row level security;

-- Helper: agência do usuário autenticado
create or replace function auth_agencia_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select agencia_id from public.usuarios where id = auth.uid();
$$;

-- Policies: cada tenant só enxerga sua própria agência
create policy "tenant_agencias" on agencias for all using (id = auth_agencia_id());
create policy "tenant_usuarios" on usuarios for all using (agencia_id = auth_agencia_id());
create policy "tenant_clientes" on clientes for all using (agencia_id = auth_agencia_id());
create policy "tenant_integracoes" on integracoes for all using (agencia_id = auth_agencia_id());
create policy "tenant_campanhas" on campanhas for all using (agencia_id = auth_agencia_id());
create policy "tenant_conjuntos" on conjuntos for all using (agencia_id = auth_agencia_id());
create policy "tenant_anuncios" on anuncios for all using (agencia_id = auth_agencia_id());
create policy "tenant_metricas" on metricas_diarias for all using (agencia_id = auth_agencia_id());
create policy "tenant_metas" on metas for all using (agencia_id = auth_agencia_id());
create policy "tenant_alertas_regras" on alertas_regras for all using (agencia_id = auth_agencia_id());
create policy "tenant_alertas_disparos" on alertas_disparos for all using (agencia_id = auth_agencia_id());
create policy "tenant_relatorios" on relatorios_gerados for all using (agencia_id = auth_agencia_id());
