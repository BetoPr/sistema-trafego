-- Hierarquia Pasta -> Etiqueta (2 niveis). Pasta = etiqueta-mae com filhas.
ALTER TABLE etiquetas
  ADD COLUMN IF NOT EXISTS etiqueta_pai_id uuid REFERENCES etiquetas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_etiquetas_pai ON etiquetas(etiqueta_pai_id) WHERE etiqueta_pai_id IS NOT NULL;
