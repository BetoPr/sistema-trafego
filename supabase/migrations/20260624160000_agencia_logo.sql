-- Logo customizado por agencia + bucket assets
ALTER TABLE agencias
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS logo_modo text NOT NULL DEFAULT 'texto' CHECK (logo_modo IN ('texto','logo','logo_texto')),
  ADD COLUMN IF NOT EXISTS logo_layout text NOT NULL DEFAULT 'horizontal' CHECK (logo_layout IN ('horizontal','vertical'));

-- Bucket publico pra logos (max 2MB)
INSERT INTO storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
VALUES ('agencia-assets','agencia-assets', true, ARRAY['image/png','image/jpeg','image/webp','image/svg+xml'], 2097152)
ON CONFLICT (id) DO UPDATE SET
  allowed_mime_types = EXCLUDED.allowed_mime_types,
  file_size_limit = EXCLUDED.file_size_limit,
  public = true;
