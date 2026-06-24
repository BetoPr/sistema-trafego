-- MCP Server: tokens por agencia/usuario pra autorizar acesso multi-tenant
CREATE TABLE IF NOT EXISTS mcp_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agencia_id uuid NOT NULL REFERENCES agencias(id) ON DELETE CASCADE,
  usuario_id uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  nome text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  prefix text NOT NULL,
  scopes text[] NOT NULL DEFAULT ARRAY['read'],
  ativo boolean NOT NULL DEFAULT true,
  ultima_uso_em timestamptz,
  expira_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  revogado_em timestamptz
);
CREATE INDEX IF NOT EXISTS idx_mcp_tokens_agencia ON mcp_tokens(agencia_id) WHERE ativo;
CREATE INDEX IF NOT EXISTS idx_mcp_tokens_hash ON mcp_tokens(token_hash) WHERE ativo;
