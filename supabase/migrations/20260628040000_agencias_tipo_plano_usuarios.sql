-- Migration: tipo_plano + limite_usuarios + preco_travado + meta_lancamento
--
-- Modelo de negocio:
--   - 4 Planos: solo, time, agencia, studio
--   - Cada plano tem canais_inclusos e usuarios_inclusos como defaults
--   - Cliente pode pagar conexao extra (R$19) e usuario extra (R$5)
--   - Primeiros 10 de cada plano travam preco vitalicio (preco_travado=true)
--   - Escala de preco por meta_lancamento_id (1-10, 11-30, 31-50, 51-100, 100+)
--
-- limite_usuarios = usuarios_inclusos + usuarios_extras_pagos + usuarios_extras_cortesia
-- igual ao padrao de canais.

ALTER TABLE agencias
  ADD COLUMN IF NOT EXISTS tipo_plano text
    CHECK (tipo_plano IN ('solo', 'time', 'agencia', 'studio'));

ALTER TABLE agencias
  ADD COLUMN IF NOT EXISTS usuarios_inclusos integer NOT NULL DEFAULT 1
    CHECK (usuarios_inclusos >= 0);

ALTER TABLE agencias
  ADD COLUMN IF NOT EXISTS usuarios_extras_pagos integer NOT NULL DEFAULT 0
    CHECK (usuarios_extras_pagos >= 0);

ALTER TABLE agencias
  ADD COLUMN IF NOT EXISTS usuarios_extras_cortesia integer NOT NULL DEFAULT 0
    CHECK (usuarios_extras_cortesia >= 0);

ALTER TABLE agencias
  ADD COLUMN IF NOT EXISTS limite_usuarios integer
    GENERATED ALWAYS AS (
      usuarios_inclusos + usuarios_extras_pagos + usuarios_extras_cortesia
    ) STORED;

-- Preco travado da promo de lancamento (vitalicio).
ALTER TABLE agencias
  ADD COLUMN IF NOT EXISTS preco_travado boolean NOT NULL DEFAULT false;

-- Tabela de metas pra escala de preco do lancamento.
CREATE TABLE IF NOT EXISTS super_admin_metas_lancamento (
  id serial PRIMARY KEY,
  faixa_min integer NOT NULL,
  faixa_max integer,  -- null = sem teto (faixa final)
  multiplicador numeric(4, 2) NOT NULL DEFAULT 1.00,
  rotulo text NOT NULL,
  descricao text,
  criada_em timestamptz NOT NULL DEFAULT now()
);

-- Seed metas iniciais.
INSERT INTO super_admin_metas_lancamento (faixa_min, faixa_max, multiplicador, rotulo, descricao)
VALUES
  (1, 10,  0.70, 'Promo Lancamento', '10 primeiros — 30% OFF vitalicio'),
  (11, 30, 1.00, 'Tabela Cheia',     '11 a 30 clientes — preco normal'),
  (31, 50, 1.10, 'Meta 30',          '+10% por cliente acima de 30'),
  (51, 100, 1.20, 'Meta 50',         '+20% por cliente acima de 50'),
  (101, NULL, 1.25, 'Preco Congelado', '100+ clientes — preco fixo final')
ON CONFLICT DO NOTHING;

COMMENT ON COLUMN agencias.tipo_plano IS
  'Plano contratado: solo (1c/1u), time (2c/4u), agencia (3c/8u), studio (5c/15u).';
COMMENT ON COLUMN agencias.usuarios_inclusos IS
  'Usuarios inclusos no plano base. Default 1.';
COMMENT ON COLUMN agencias.usuarios_extras_pagos IS
  'Usuarios extras pagos (R$5/cada). Super-admin atualiza apos pagamento.';
COMMENT ON COLUMN agencias.usuarios_extras_cortesia IS
  'Usuarios extras dados como cortesia (promo, parceria, suporte).';
COMMENT ON COLUMN agencias.limite_usuarios IS
  'Total de usuarios permitidos (inclusos + pagos + cortesia). Auto-calculado.';
COMMENT ON COLUMN agencias.preco_travado IS
  'Se true, agencia mantem preco do momento da assinatura vitalicio (promo lancamento).';

CREATE INDEX IF NOT EXISTS idx_agencias_tipo_plano ON agencias (tipo_plano);
CREATE INDEX IF NOT EXISTS idx_agencias_preco_travado ON agencias (preco_travado) WHERE preco_travado = true;
