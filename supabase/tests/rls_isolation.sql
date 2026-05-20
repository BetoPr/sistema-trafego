-- =============================================================
-- RLS Isolation Test
-- Valida que policies impedem agência A ver dados da agência B.
-- Roda como bloco transacional; rollback no final (não persiste mocks).
-- =============================================================
begin;

-- Agência B fictícia
insert into agencias (id, nome, slug)
values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'RLS Test B', 'rls-test-b');

-- 1 cliente em cada agência
insert into clientes (agencia_id, nome, slug) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '[RLS] Cliente Infinity', 'rls-cli-inf'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '[RLS] Cliente Outra',    'rls-cli-out');

-- Visão como superuser (sem RLS) — deve ver os 2
select 'superuser' as contexto, count(*) as visiveis from clientes
where slug in ('rls-cli-inf','rls-cli-out');

-- Visão como Roberto (agência Infinity) — deve ver só o cliente Infinity
set local role authenticated;
set local "request.jwt.claims" to
  '{"sub":"240f53ee-85c6-4e6f-b69b-963e63163691","role":"authenticated"}';

select 'roberto_infinity' as contexto, count(*) as visiveis from clientes
where slug in ('rls-cli-inf','rls-cli-out');

select 'roberto_pode_ver_outra' as bug_se_maior_que_zero,
       count(*) as visiveis
from clientes where slug = 'rls-cli-out';

reset role;

-- Rollback descarta tudo (não vai persistir)
rollback;
