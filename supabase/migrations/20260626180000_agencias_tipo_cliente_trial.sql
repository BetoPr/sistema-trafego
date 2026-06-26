-- Migration: agencias ganha tipo_cliente, trial_acaba_em, apagar_em.
--
-- Fluxo trial automatico:
--  1. Usuario cria conta na LP (lp.sonarcrm.com.br) ou em /cadastro
--  2. Escolhe perfil: empreendedor / autonomo / agencia
--  3. agencias.tipo_cliente = perfil
--  4. agencias.trial_acaba_em = now() + interval (14d ou 21d)
--  5. agencias.apagar_em = trial_acaba_em + interval '30 days'
--
-- Cron diario:
--  - se now() > trial_acaba_em e nao pagou: marca acesso_bloqueado = true
--  - se now() > apagar_em: deleta agencia + cascata
--
-- Lib que consome essas colunas: lib/auth/trial.ts (sera criada).

ALTER TABLE agencias
  ADD COLUMN IF NOT EXISTS tipo_cliente text
    CHECK (tipo_cliente IN ('empreendedor', 'autonomo', 'agencia'));

ALTER TABLE agencias
  ADD COLUMN IF NOT EXISTS trial_acaba_em timestamptz;

ALTER TABLE agencias
  ADD COLUMN IF NOT EXISTS apagar_em timestamptz;

ALTER TABLE agencias
  ADD COLUMN IF NOT EXISTS trial_avisado_em timestamptz;

-- Indexes pra cron rodar rapido.
CREATE INDEX IF NOT EXISTS idx_agencias_trial_acaba_em
  ON agencias (trial_acaba_em)
  WHERE acesso_bloqueado = false;

CREATE INDEX IF NOT EXISTS idx_agencias_apagar_em
  ON agencias (apagar_em)
  WHERE apagar_em IS NOT NULL;

-- Backfill agencias antigas: tipo_cliente = agencia, sem trial (nao expira).
UPDATE agencias
SET tipo_cliente = 'agencia'
WHERE tipo_cliente IS NULL;

-- Comentarios pra documentacao no banco.
COMMENT ON COLUMN agencias.tipo_cliente IS
  'Perfil escolhido no cadastro: empreendedor (14d trial), autonomo (14d trial), agencia (21d trial).';
COMMENT ON COLUMN agencias.trial_acaba_em IS
  'Quando o trial expira. Apos esta data, login bloqueia automaticamente.';
COMMENT ON COLUMN agencias.apagar_em IS
  'Quando a conta e dados sao deletados (trial_acaba_em + 30 dias). NULL = nao apaga.';
COMMENT ON COLUMN agencias.trial_avisado_em IS
  'Timestamp do ultimo aviso enviado por email/WhatsApp sobre trial expirando.';
