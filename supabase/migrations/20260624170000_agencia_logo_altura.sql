ALTER TABLE agencias
  ADD COLUMN IF NOT EXISTS logo_altura int NOT NULL DEFAULT 36;
COMMENT ON COLUMN agencias.logo_altura IS 'Altura em px da logo na sidebar (24-80).';
