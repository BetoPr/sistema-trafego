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
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '[RLS] Cliente A', 'rls-cli-a'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '[RLS] Cliente B', 'rls-cli-b');

-- Visão como superuser (sem RLS) — deve ver os 2
select 'superuser' as contexto, count(*) as visiveis from clientes
where slug in ('rls-cli-a','rls-cli-b');

-- Visão como user da agência A — deve ver só o cliente A
set local role authenticated;
set local "request.jwt.claims" to
  '{"sub":"240f53ee-85c6-4e6f-b69b-963e63163691","role":"authenticated"}';

select 'user_agencia_a' as contexto, count(*) as visiveis from clientes
where slug in ('rls-cli-a','rls-cli-b');

select 'user_ve_outra_agencia' as bug_se_maior_que_zero,
       count(*) as visiveis
from clientes where slug = 'rls-cli-b';

reset role;

-- Rollback descarta tudo (não vai persistir)
rollback;
