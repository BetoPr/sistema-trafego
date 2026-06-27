-- Migration: registra consentimento LGPD no cadastro.
--
-- Objetivo: separar aceite obrigatorio (Termos + Privacidade) do opt-in
-- voluntario pra marketing. Cada um com timestamp + IP pra prova legal.

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS aceite_termos_em timestamptz;

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS aceita_marketing boolean DEFAULT false NOT NULL;

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS aceite_marketing_em timestamptz;

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS aceite_ip text;

CREATE INDEX IF NOT EXISTS idx_usuarios_aceita_marketing
  ON usuarios (aceita_marketing)
  WHERE aceita_marketing = true;

COMMENT ON COLUMN usuarios.aceite_termos_em IS
  'Timestamp do aceite aos Termos de Uso + Politica de Privacidade no cadastro. Obrigatorio.';
COMMENT ON COLUMN usuarios.aceita_marketing IS
  'Opt-in voluntario pra receber emails/WhatsApp de marketing (novidades, ofertas). LGPD art. 7, I.';
COMMENT ON COLUMN usuarios.aceite_marketing_em IS
  'Quando o usuario marcou o opt-in de marketing. Vira NULL ao revogar.';
COMMENT ON COLUMN usuarios.aceite_ip IS
  'IP de origem do aceite, capturado pelo backend pra prova legal.';
