-- R2: Hierarquia de etiquetas (Linha -> Variantes).
-- Etiqueta-mãe agrupa varias etiquetas-filhas (ex: "Restauracao" tem filhas
-- "Restauracao/Bebe", "Restauracao/Mofo", "Restauracao/Casal").
-- Cada filha esta vinculada a 1 campanha Meta via etiqueta_campanhas.
-- Quando auto-etiquetagem aplica uma filha, aplica a mae junto.

ALTER TABLE etiquetas
  ADD COLUMN IF NOT EXISTS etiqueta_pai_id uuid REFERENCES etiquetas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS etiquetas_pai_idx ON etiquetas(etiqueta_pai_id) WHERE etiqueta_pai_id IS NOT NULL;

COMMENT ON COLUMN etiquetas.etiqueta_pai_id IS
  'FK self-ref. Quando preenchido, esta etiqueta eh "filha" (variante) da etiqueta-mae (Linha). Auto-etiquetagem aplica mae junto.';
