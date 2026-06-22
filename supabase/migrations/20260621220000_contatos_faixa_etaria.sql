-- Adiciona faixa etária ao contato pra suportar filtro Serviço × Idade no mapa do Dashboard/Campanhas.
-- Valores fixos pra evitar typo livre.

alter table public.contatos
  add column if not exists faixa_etaria text;

alter table public.contatos
  drop constraint if exists contatos_faixa_etaria_check;

alter table public.contatos
  add constraint contatos_faixa_etaria_check
  check (faixa_etaria is null or faixa_etaria in ('18-24','25-34','35-44','45-54','55+'));

create index if not exists idx_contatos_faixa_etaria
  on public.contatos (agencia_id, faixa_etaria)
  where faixa_etaria is not null;

comment on column public.contatos.faixa_etaria is
  'Faixa etária declarada pelo lead/contato. Valores: 18-24, 25-34, 35-44, 45-54, 55+. Null = não informado.';
