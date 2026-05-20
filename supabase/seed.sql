-- =============================================================
-- Seed: agência Infinity Consultoria
-- Rode no SQL Editor APÓS aplicar a migration.
-- O usuário é criado via Supabase Auth no signup; depois disso,
-- execute o INSERT em `usuarios` com o uuid retornado.
-- =============================================================
insert into agencias (id, nome, slug)
values (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Infinity Consultoria',
  'infinity'
)
on conflict (slug) do nothing;

-- Após signup, substitua <UUID_AUTH> pelo id do usuário em auth.users:
-- insert into usuarios (id, agencia_id, nome, email, role)
-- values ('<UUID_AUTH>', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Roberto', '<email>', 'owner');
