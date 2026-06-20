-- Fase 2 IA — multi-chave + troca de provider.
-- Tabela ia_chaves: várias chaves por provider (rotação Groq 3x = 300k/dia) + fallback OpenAI.
-- Source of truth a partir daqui; colunas single em configuracoes_agencia viram fallback legado.

create table if not exists public.ia_chaves (
  id uuid primary key default gen_random_uuid(),
  agencia_id uuid not null references public.agencias(id) on delete cascade,
  provider text not null check (provider in ('groq','openai','anthropic')),
  rotulo text,
  key_encrypted bytea not null,
  ativa boolean not null default true,
  ordem int not null default 0,
  ultimo_uso_em timestamptz,
  criado_em timestamptz not null default now()
);

create index if not exists ia_chaves_agencia_provider_idx
  on public.ia_chaves (agencia_id, provider, ativa, ordem);

alter table public.ia_chaves enable row level security;

-- Leitura por agência (escrita é via service role nas server actions).
drop policy if exists ia_chaves_select on public.ia_chaves;
create policy ia_chaves_select on public.ia_chaves
  for select using (agencia_id = auth_agencia_id());

-- Backfill: migra as chaves single existentes pra ia_chaves (ordem 0), sem duplicar.
insert into public.ia_chaves (agencia_id, provider, rotulo, key_encrypted, ordem)
select agencia_id, 'groq', 'Chave 1', groq_key_encrypted, 0
from public.configuracoes_agencia c
where groq_key_encrypted is not null
  and not exists (select 1 from public.ia_chaves k where k.agencia_id = c.agencia_id and k.provider='groq');

insert into public.ia_chaves (agencia_id, provider, rotulo, key_encrypted, ordem)
select agencia_id, 'openai', 'Chave 1', openai_key_encrypted, 0
from public.configuracoes_agencia c
where openai_key_encrypted is not null
  and not exists (select 1 from public.ia_chaves k where k.agencia_id = c.agencia_id and k.provider='openai');

insert into public.ia_chaves (agencia_id, provider, rotulo, key_encrypted, ordem)
select agencia_id, 'anthropic', 'Chave 1', anthropic_key_encrypted, 0
from public.configuracoes_agencia c
where anthropic_key_encrypted is not null
  and not exists (select 1 from public.ia_chaves k where k.agencia_id = c.agencia_id and k.provider='anthropic');
