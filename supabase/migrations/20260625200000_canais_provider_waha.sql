-- Migration: adiciona suporte multi-provider (UAZAPI + WAHA) em `canais`.
--
-- Contexto: até hoje todos canais usavam UAZAPI (lib/uazapi/client.ts).
-- A partir desta migration o sistema suporta WAHA (self-hosted Docker)
-- como provider alternativo. Novos canais default = WAHA (decisão de
-- produto em 2026-06-25). Canais existentes ficam 'uazapi'.
--
-- Lib que consome essas colunas: lib/whatsapp/{provider,uazapi,waha}.ts

-- Adiciona coluna provider (string flexível, sem CHECK rígido pra futuras opções).
ALTER TABLE canais
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'uazapi';

-- Nome da session no WAHA (preenchido quando provider='waha').
-- Convenção: `ag_{agencia_id}_ch_{canal_id}` ou similar — atribuído pelo backend.
ALTER TABLE canais
  ADD COLUMN IF NOT EXISTS waha_session_name text;

-- Base URL do servidor WAHA (pode variar se cada agência tiver server próprio).
-- Quando NULL, backend usa SONAR_WAHA_BASE_URL do env.
ALTER TABLE canais
  ADD COLUMN IF NOT EXISTS waha_base_url text;

-- Backfill defensivo: garante todos canais antigos com provider='uazapi'.
UPDATE canais
SET provider = 'uazapi'
WHERE provider IS NULL OR provider = '';

-- Constraint: provider só pode ser 'uazapi' ou 'waha' (por enquanto).
-- DROP antes pra ser idempotente em re-runs.
ALTER TABLE canais DROP CONSTRAINT IF EXISTS canais_provider_chk;
ALTER TABLE canais
  ADD CONSTRAINT canais_provider_chk
  CHECK (provider IN ('uazapi', 'waha'));

-- Index pra queries que filtram por provider (ex: status checker WAHA-only).
CREATE INDEX IF NOT EXISTS canais_provider_idx ON canais (provider);

COMMENT ON COLUMN canais.provider IS 'WhatsApp provider: uazapi (legado, hosted) ou waha (self-hosted, gratuito).';
COMMENT ON COLUMN canais.waha_session_name IS 'Nome da session no servidor WAHA. Preenchido só quando provider=waha.';
COMMENT ON COLUMN canais.waha_base_url IS 'Base URL do servidor WAHA. NULL = usa env SONAR_WAHA_BASE_URL.';
