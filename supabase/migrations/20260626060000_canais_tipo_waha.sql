-- Migration: estende CHECK constraint canais.tipo pra aceitar 'waha'.
--
-- Contexto: coluna `tipo` foi criada com CHECK só pra 'uazapi'. Agora
-- canais novos default WAHA insert com tipo='waha' e violava.
--
-- Esta migration ajusta a constraint pra aceitar ambos.

ALTER TABLE canais DROP CONSTRAINT IF EXISTS canais_tipo_check;

ALTER TABLE canais
  ADD CONSTRAINT canais_tipo_check
  CHECK (tipo IN ('uazapi', 'waha'));

COMMENT ON COLUMN canais.tipo IS 'WhatsApp backend type: uazapi (legado) ou waha (default novo). Espelha provider.';
