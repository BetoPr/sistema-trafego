-- Cápsulas modulares de conhecimento por perfil de IA.
-- Substitui prompt monolítico por blocos opt-in (FAQ, Produtos, Horários, Políticas, etc.)
-- Orquestrador injeta só as cápsulas relevantes pra economizar tokens.

CREATE TABLE IF NOT EXISTS ia_atendimento_capsulas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id uuid NOT NULL REFERENCES ia_atendimento_perfis(id) ON DELETE CASCADE,
  agencia_id uuid NOT NULL REFERENCES agencias(id) ON DELETE CASCADE,
  slug text NOT NULL,
  nome text NOT NULL,
  icone text NOT NULL DEFAULT 'ti-package',
  cor text NOT NULL DEFAULT '#00E19A',
  ativa boolean NOT NULL DEFAULT true,
  conteudo text NOT NULL DEFAULT '',
  keywords text[] NOT NULL DEFAULT ARRAY[]::text[],
  ordem int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(perfil_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_ia_capsulas_perfil ON ia_atendimento_capsulas(perfil_id) WHERE ativa;
CREATE INDEX IF NOT EXISTS idx_ia_capsulas_agencia ON ia_atendimento_capsulas(agencia_id);

ALTER TABLE ia_atendimento_capsulas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ia_capsulas_sel ON ia_atendimento_capsulas;
CREATE POLICY ia_capsulas_sel ON ia_atendimento_capsulas
  FOR SELECT USING (agencia_id = auth_agencia_id());

DROP POLICY IF EXISTS ia_capsulas_mod ON ia_atendimento_capsulas;
CREATE POLICY ia_capsulas_mod ON ia_atendimento_capsulas
  FOR ALL USING (agencia_id = auth_agencia_id())
  WITH CHECK (agencia_id = auth_agencia_id());

-- Coluna no perfil pra IDENTIDADE/OBJETIVO/REGRAS separados (modular)
ALTER TABLE ia_atendimento_perfis
  ADD COLUMN IF NOT EXISTS identidade text,
  ADD COLUMN IF NOT EXISTS objetivo text,
  ADD COLUMN IF NOT EXISTS regras_globais text,
  ADD COLUMN IF NOT EXISTS modo_modular boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN ia_atendimento_perfis.modo_modular IS 'Se true, usa IDENTIDADE+OBJETIVO+REGRAS+CAPSULAS em vez do system_prompt monolítico.';
