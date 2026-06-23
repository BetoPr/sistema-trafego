-- E1: Etiqueta <-> Campanha (N:M)
-- Uma etiqueta pode estar vinculada a varias campanhas Meta.
-- Quando lead chega via ad com click-id, busca campanha do anuncio -> aplica etiquetas vinculadas.

CREATE TABLE IF NOT EXISTS etiqueta_campanhas (
  etiqueta_id uuid NOT NULL REFERENCES etiquetas(id) ON DELETE CASCADE,
  campanha_id uuid NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE,
  agencia_id uuid NOT NULL REFERENCES agencias(id) ON DELETE CASCADE,
  criado_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (etiqueta_id, campanha_id)
);

CREATE INDEX IF NOT EXISTS etiqueta_campanhas_campanha_idx ON etiqueta_campanhas(campanha_id);
CREATE INDEX IF NOT EXISTS etiqueta_campanhas_agencia_idx ON etiqueta_campanhas(agencia_id);
CREATE INDEX IF NOT EXISTS etiqueta_campanhas_etiqueta_idx ON etiqueta_campanhas(etiqueta_id);

ALTER TABLE etiqueta_campanhas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS etiqueta_campanhas_tenant ON etiqueta_campanhas;
CREATE POLICY etiqueta_campanhas_tenant ON etiqueta_campanhas
  USING ((agencia_id = current_agencia_id()) OR is_super_admin())
  WITH CHECK ((agencia_id = current_agencia_id()) OR is_super_admin());

COMMENT ON TABLE etiqueta_campanhas IS
  'N:M etiqueta <-> campanha Meta. Lead com click-id de campanha vinculada recebe a etiqueta automaticamente. Permite Dashboard mostrar % vendas por etiqueta (= performance da campanha) e filtros cross-aba.';
