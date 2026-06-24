-- Chat assistente: 2 bots (suporte + dados) por usuario/agencia
CREATE TABLE IF NOT EXISTS chat_sessoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agencia_id uuid NOT NULL REFERENCES agencias(id) ON DELETE CASCADE,
  usuario_id uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  bot text NOT NULL CHECK (bot IN ('suporte','dados')),
  titulo text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chat_sessoes_agencia ON chat_sessoes(agencia_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessoes_user ON chat_sessoes(usuario_id, bot, updated_at DESC);

CREATE TABLE IF NOT EXISTS chat_mensagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sessao_id uuid NOT NULL REFERENCES chat_sessoes(id) ON DELETE CASCADE,
  papel text NOT NULL CHECK (papel IN ('user','assistant','tool')),
  conteudo text NOT NULL,
  tool_calls jsonb,
  tokens_in int,
  tokens_out int,
  modelo text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chat_msgs_sessao ON chat_mensagens(sessao_id, created_at);
