-- E3: extender auto-etiquetagem pra CONJUNTOS de anuncios (alem de campanhas).
-- Estrutura espelhada de etiqueta_campanhas. Auto-etiquetar busca em ambas.

CREATE TABLE IF NOT EXISTS etiqueta_conjuntos (
  etiqueta_id uuid NOT NULL REFERENCES etiquetas(id) ON DELETE CASCADE,
  conjunto_id uuid NOT NULL REFERENCES conjuntos(id) ON DELETE CASCADE,
  agencia_id uuid NOT NULL REFERENCES agencias(id) ON DELETE CASCADE,
  criado_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (etiqueta_id, conjunto_id)
);

CREATE INDEX IF NOT EXISTS etiqueta_conjuntos_conjunto_idx ON etiqueta_conjuntos(conjunto_id);
CREATE INDEX IF NOT EXISTS etiqueta_conjuntos_agencia_idx ON etiqueta_conjuntos(agencia_id);
CREATE INDEX IF NOT EXISTS etiqueta_conjuntos_etiqueta_idx ON etiqueta_conjuntos(etiqueta_id);

ALTER TABLE etiqueta_conjuntos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS etiqueta_conjuntos_tenant ON etiqueta_conjuntos;
CREATE POLICY etiqueta_conjuntos_tenant ON etiqueta_conjuntos
  USING ((agencia_id = current_agencia_id()) OR is_super_admin())
  WITH CHECK ((agencia_id = current_agencia_id()) OR is_super_admin());

COMMENT ON TABLE etiqueta_conjuntos IS
  'N:M etiqueta <-> conjunto Meta. Lead que chega de anuncio cujo conjunto esta vinculado recebe a etiqueta automaticamente. Mais granular que etiqueta_campanhas.';
