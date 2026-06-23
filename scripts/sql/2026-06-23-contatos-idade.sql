-- R4: idade do contato (opcional, manual ou via Meta Lead Form).
ALTER TABLE contatos
  ADD COLUMN IF NOT EXISTS idade smallint CHECK (idade IS NULL OR (idade BETWEEN 0 AND 130));

COMMENT ON COLUMN contatos.idade IS
  'Idade declarada do contato em anos. Setada manualmente ou via Meta Leadgen quando o form pergunta idade.';
