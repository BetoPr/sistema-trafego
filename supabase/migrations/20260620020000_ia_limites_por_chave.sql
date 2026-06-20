-- Fase 3 — limites por chave de IA + rastreio de qual chave foi usada.
-- Aplicada via MCP em 2026-06-20.

alter table ia_uso add column if not exists chave_id uuid references ia_chaves(id) on delete set null;
create index if not exists idx_ia_uso_chave_dia on ia_uso (chave_id, criado_em);

alter table ia_chaves
  add column if not exists limite_tpd integer not null default 100000,
  add column if not exists limite_tpm integer not null default 12000,
  add column if not exists limite_followup_dia integer not null default 80;

comment on column ia_chaves.limite_tpd is 'Teto de tokens/dia desta chave (Groq free = 100000). Acima disso o gateway pula pra proxima chave/OpenAI.';
comment on column ia_chaves.limite_followup_dia is 'Maximo de analises de follow-up/dia por esta chave (anti-flood). 0 = sem limite.';
comment on column ia_uso.chave_id is 'Qual ia_chaves foi usada (null = chave legada/env).';
