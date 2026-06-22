-- Aba Relatórios: agendamento de envio automático de relatorio por WhatsApp.
-- Cada linha: 1 relatório agendado (ex.: "Mandar resumo da Felipe Boulanger toda Sexta 9:30")

create table if not exists public.relatorios_agendados (
  id uuid primary key default gen_random_uuid(),
  agencia_id uuid not null references public.agencias(id) on delete cascade,
  -- identidade
  nome text not null,
  -- destinatário: cliente cadastrado OU telefone livre (E.164)
  cliente_id uuid references public.clientes(id) on delete set null,
  telefone_destino text,
  -- canal de envio (whatsapp via canais)
  canal_id uuid references public.canais(id) on delete set null,
  -- plataforma origem: meta_ads | google_ads (fonte dos dados)
  plataforma text not null default 'meta_ads' check (plataforma in ('meta_ads', 'google_ads')),
  -- agendamento
  frequencia text not null check (frequencia in ('diario', 'semanal', 'mensal')),
  dia_semana smallint check (dia_semana between 0 and 6), -- 0=dom, 6=sab (apenas se semanal)
  dia_mes smallint check (dia_mes between 1 and 31), -- apenas se mensal
  hora_envio time not null default '09:00',
  timezone text not null default 'America/Sao_Paulo',
  -- conteúdo
  formato text not null default 'pdf' check (formato in ('pdf', 'imagem', 'texto')),
  periodo_dias smallint not null default 7 check (periodo_dias between 1 and 90),
  -- estado
  ativo boolean not null default true,
  proximo_envio timestamptz,
  ultimo_envio timestamptz,
  ultimo_status text, -- 'enviado', 'falhou', 'pendente'
  ultimo_erro text,
  -- audit
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- soft delete pra consistência
  deleted_at timestamptz,
  -- regra: tem destinatário (cliente OR telefone)
  constraint relatorios_destino_check check (cliente_id is not null or telefone_destino is not null)
);

create index if not exists idx_relatorios_agencia
  on public.relatorios_agendados (agencia_id)
  where deleted_at is null;

create index if not exists idx_relatorios_ativo_proximo
  on public.relatorios_agendados (ativo, proximo_envio)
  where deleted_at is null and ativo = true;

-- RLS multi-tenant
alter table public.relatorios_agendados enable row level security;

drop policy if exists relatorios_agencia_isol on public.relatorios_agendados;
create policy relatorios_agencia_isol on public.relatorios_agendados
  for all
  using (agencia_id = auth_agencia_id())
  with check (agencia_id = auth_agencia_id());

comment on table public.relatorios_agendados is
  'Aba Relatorios: agendamento automatico de envio de relatorio (PDF/imagem/texto) por WhatsApp para clientes ou telefones livres.';
