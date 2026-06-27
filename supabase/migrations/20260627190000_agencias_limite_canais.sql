-- Migration: limite de conexoes WhatsApp por agencia.
--
-- Modelo de cobranca:
--   - Plano base R$29/mes inclui 1 conexao
--   - Cada conexao adicional R$19/mes (cobrada manualmente pelo super-admin)
--
-- Colunas:
--   - canais_inclusos: quantas conexoes vem no plano base (default 1)
--   - canais_extras_pagos: quantas conexoes extras o cliente pagou (default 0)
--   - canais_extras_cortesia: bonus dado pelo super-admin (default 0)
--   - limite_canais (computed): canais_inclusos + canais_extras_pagos + canais_extras_cortesia
--
-- Enforcement: server actions de criar/importar canal checam contagem
-- de canais ativos do agencia_id contra limite_canais.

ALTER TABLE agencias
  ADD COLUMN IF NOT EXISTS canais_inclusos integer NOT NULL DEFAULT 1
    CHECK (canais_inclusos >= 0);

ALTER TABLE agencias
  ADD COLUMN IF NOT EXISTS canais_extras_pagos integer NOT NULL DEFAULT 0
    CHECK (canais_extras_pagos >= 0);

ALTER TABLE agencias
  ADD COLUMN IF NOT EXISTS canais_extras_cortesia integer NOT NULL DEFAULT 0
    CHECK (canais_extras_cortesia >= 0);

-- Computed column derivada dos 3 campos acima.
ALTER TABLE agencias
  ADD COLUMN IF NOT EXISTS limite_canais integer
    GENERATED ALWAYS AS (
      canais_inclusos + canais_extras_pagos + canais_extras_cortesia
    ) STORED;

COMMENT ON COLUMN agencias.canais_inclusos IS
  'Conexoes incluidas no plano base. Default 1 (R$29).';
COMMENT ON COLUMN agencias.canais_extras_pagos IS
  'Conexoes extras pagas pelo cliente (R$19/cada). Super-admin atualiza apos pagamento.';
COMMENT ON COLUMN agencias.canais_extras_cortesia IS
  'Conexoes extras dadas como cortesia (promo, parceria, suporte). Super-admin define.';
COMMENT ON COLUMN agencias.limite_canais IS
  'Total de conexoes WhatsApp permitidas (inclusos + pagos + cortesia). Auto-calculado.';
