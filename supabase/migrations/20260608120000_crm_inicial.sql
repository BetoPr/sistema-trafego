-- =========================================================================
-- CRM MVP — Migration única
-- Sistema de Atendimento WhatsApp (UAZAPI) + Asaas
-- =========================================================================
--
-- Princípios:
-- 1. Multi-tenant por agencia_id (tenant existente do Sistema Tráfego).
-- 2. Roles: super_admin > admin > atendente.
-- 3. RLS em toda tabela: matched via current_agencia_id().
-- 4. Tokens sensíveis (UAZAPI admin, instance, Asaas) em BYTEA criptografados
--    app-level (AES-256-GCM em lib/crypto/tokens.ts) — pgcrypto NÃO usado.
-- 5. Numeração ticket/canal sequencial por agência via tabelas de sequência.
-- 6. Bucket Storage crm-media criado no fim.
-- =========================================================================

-- =========================================================================
-- 0. EXTENSÕES e HELPERS
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Helper: agencia do usuário autenticado.
CREATE OR REPLACE FUNCTION current_agencia_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT agencia_id FROM usuarios WHERE id = auth.uid();
$$;

-- Helper: role do usuário autenticado.
CREATE OR REPLACE FUNCTION current_user_role() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM usuarios WHERE id = auth.uid();
$$;

-- Helper: super_admin global vê tudo.
CREATE OR REPLACE FUNCTION is_super_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND role = 'super_admin');
$$;

-- =========================================================================
-- 1. USUARIOS — alterar role + adicionar colunas
-- =========================================================================

-- Drop check antigo (owner/admin/editor/viewer).
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_role_check;

-- Migra roles antigas pra novas.
UPDATE usuarios SET role = 'admin' WHERE role IN ('owner','editor','viewer');

-- Promove dono do sistema a super_admin.
UPDATE usuarios SET role = 'super_admin'
  WHERE email IN ('jj.rroberto2010@gmail.com','contato@infinitycomercialia.com');

-- Recria check.
ALTER TABLE usuarios ADD CONSTRAINT usuarios_role_check
  CHECK (role IN ('super_admin','admin','atendente'));

-- Default novo.
ALTER TABLE usuarios ALTER COLUMN role SET DEFAULT 'atendente';

-- Colunas novas.
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS telefone text,
  ADD COLUMN IF NOT EXISTS restrito boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS permissoes_menu jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS horario_atendimento jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS online boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ultimo_login timestamptz,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- =========================================================================
-- 2. SUPER ADMIN — servidores UAZAPI
-- =========================================================================

CREATE TABLE super_admin_servidores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agencia_id uuid NOT NULL REFERENCES agencias(id) ON DELETE CASCADE,
  nome text NOT NULL,
  plataforma text NOT NULL DEFAULT 'uazapi' CHECK (plataforma IN ('uazapi')),
  base_url text NOT NULL,
  admin_token_encrypted bytea NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sas_agencia ON super_admin_servidores(agencia_id);

ALTER TABLE super_admin_servidores ENABLE ROW LEVEL SECURITY;

CREATE POLICY sas_sa_all ON super_admin_servidores
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- =========================================================================
-- 3. ESTRUTURA ORG — filas, equipes, carteiras
-- =========================================================================

CREATE TABLE filas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agencia_id uuid NOT NULL REFERENCES agencias(id) ON DELETE CASCADE,
  nome text NOT NULL,
  cor text DEFAULT '#9B7DBF',
  descricao text,
  ordem integer NOT NULL DEFAULT 0,
  ativa boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_filas_agencia ON filas(agencia_id);

ALTER TABLE filas ENABLE ROW LEVEL SECURITY;
CREATE POLICY filas_tenant ON filas
  USING (agencia_id = current_agencia_id() OR is_super_admin())
  WITH CHECK (agencia_id = current_agencia_id() OR is_super_admin());

CREATE TABLE equipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agencia_id uuid NOT NULL REFERENCES agencias(id) ON DELETE CASCADE,
  nome text NOT NULL,
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_equipes_agencia ON equipes(agencia_id);

ALTER TABLE equipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY equipes_tenant ON equipes
  USING (agencia_id = current_agencia_id() OR is_super_admin())
  WITH CHECK (agencia_id = current_agencia_id() OR is_super_admin());

CREATE TABLE usuario_filas (
  usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  fila_id uuid NOT NULL REFERENCES filas(id) ON DELETE CASCADE,
  PRIMARY KEY (usuario_id, fila_id)
);

ALTER TABLE usuario_filas ENABLE ROW LEVEL SECURITY;
CREATE POLICY uf_tenant ON usuario_filas
  USING (EXISTS (SELECT 1 FROM filas f WHERE f.id = fila_id
    AND (f.agencia_id = current_agencia_id() OR is_super_admin())));

CREATE TABLE usuario_equipes (
  usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  equipe_id uuid NOT NULL REFERENCES equipes(id) ON DELETE CASCADE,
  PRIMARY KEY (usuario_id, equipe_id)
);

ALTER TABLE usuario_equipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY ue_tenant ON usuario_equipes
  USING (EXISTS (SELECT 1 FROM equipes e WHERE e.id = equipe_id
    AND (e.agencia_id = current_agencia_id() OR is_super_admin())));

CREATE TABLE carteiras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agencia_id uuid NOT NULL REFERENCES agencias(id) ON DELETE CASCADE,
  usuario_id uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  nome text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_carteiras_agencia ON carteiras(agencia_id);

ALTER TABLE carteiras ENABLE ROW LEVEL SECURITY;
CREATE POLICY carteiras_tenant ON carteiras
  USING (agencia_id = current_agencia_id() OR is_super_admin())
  WITH CHECK (agencia_id = current_agencia_id() OR is_super_admin());

-- =========================================================================
-- 4. SEQUÊNCIAS por agência (canais, tickets)
-- =========================================================================

CREATE TABLE canal_sequences (
  agencia_id uuid PRIMARY KEY REFERENCES agencias(id) ON DELETE CASCADE,
  ultimo integer NOT NULL DEFAULT 0
);

CREATE TABLE ticket_sequences (
  agencia_id uuid PRIMARY KEY REFERENCES agencias(id) ON DELETE CASCADE,
  ultimo integer NOT NULL DEFAULT 0
);

CREATE OR REPLACE FUNCTION next_canal_numero(p_agencia_id uuid) RETURNS integer
LANGUAGE plpgsql AS $$
DECLARE n integer;
BEGIN
  INSERT INTO canal_sequences (agencia_id, ultimo) VALUES (p_agencia_id, 1)
    ON CONFLICT (agencia_id) DO UPDATE SET ultimo = canal_sequences.ultimo + 1
    RETURNING ultimo INTO n;
  RETURN n;
END $$;

CREATE OR REPLACE FUNCTION next_ticket_numero(p_agencia_id uuid) RETURNS integer
LANGUAGE plpgsql AS $$
DECLARE n integer;
BEGIN
  INSERT INTO ticket_sequences (agencia_id, ultimo) VALUES (p_agencia_id, 1)
    ON CONFLICT (agencia_id) DO UPDATE SET ultimo = ticket_sequences.ultimo + 1
    RETURNING ultimo INTO n;
  RETURN n;
END $$;

-- =========================================================================
-- 5. CANAIS (instâncias UAZAPI por cliente WhatsApp)
-- =========================================================================

CREATE TABLE canais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agencia_id uuid NOT NULL REFERENCES agencias(id) ON DELETE CASCADE,
  servidor_id uuid REFERENCES super_admin_servidores(id) ON DELETE RESTRICT,
  numero integer NOT NULL,
  nome text NOT NULL,
  tipo text NOT NULL DEFAULT 'uazapi' CHECK (tipo IN ('uazapi')),
  status text NOT NULL DEFAULT 'pending_qr'
    CHECK (status IN ('pending_qr','connected','disconnected','error')),
  instance_id text,
  instance_token_encrypted bytea,
  webhook_secret text NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  numero_conectado text,
  nome_perfil text,
  foto_perfil_url text,
  padrao boolean NOT NULL DEFAULT false,
  fila_id uuid REFERENCES filas(id) ON DELETE SET NULL,
  usuario_id uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  mensagem_despedida text,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  qr_code_atual text,
  qr_atualizado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agencia_id, numero)
);

CREATE INDEX idx_canais_agencia ON canais(agencia_id);
CREATE INDEX idx_canais_instance ON canais(instance_id);

ALTER TABLE canais ENABLE ROW LEVEL SECURITY;
CREATE POLICY canais_tenant ON canais
  USING (agencia_id = current_agencia_id() OR is_super_admin())
  WITH CHECK (agencia_id = current_agencia_id() OR is_super_admin());

CREATE OR REPLACE FUNCTION assign_canal_numero() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.numero IS NULL OR NEW.numero = 0 THEN
    NEW.numero := next_canal_numero(NEW.agencia_id);
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_canais_numero BEFORE INSERT ON canais
  FOR EACH ROW EXECUTE FUNCTION assign_canal_numero();

-- =========================================================================
-- 6. CONTATOS + ETIQUETAS
-- =========================================================================

CREATE TABLE contatos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agencia_id uuid NOT NULL REFERENCES agencias(id) ON DELETE CASCADE,
  wa_id text,
  lid text,
  nome text,
  primeiro_nome text,
  sobrenome text,
  email text,
  telefone text,
  whatsapp text,
  empresa text,
  cidade text,
  estado text,
  cep text,
  cpf text,
  nascimento date,
  instagram_pk text,
  telegram text,
  foto_url text,
  bloqueado boolean NOT NULL DEFAULT false,
  bloqueado_chatbot boolean NOT NULL DEFAULT false,
  carteira_id uuid REFERENCES carteiras(id) ON DELETE SET NULL,
  custom jsonb NOT NULL DEFAULT '{}'::jsonb,
  privado boolean NOT NULL DEFAULT false,
  ia_habilitada boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX idx_contatos_agencia ON contatos(agencia_id);
CREATE INDEX idx_contatos_wa_id ON contatos(agencia_id, wa_id);
CREATE INDEX idx_contatos_whatsapp ON contatos(agencia_id, whatsapp);

ALTER TABLE contatos ENABLE ROW LEVEL SECURITY;
CREATE POLICY contatos_tenant ON contatos
  USING (agencia_id = current_agencia_id() OR is_super_admin())
  WITH CHECK (agencia_id = current_agencia_id() OR is_super_admin());

CREATE TABLE etiquetas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agencia_id uuid NOT NULL REFERENCES agencias(id) ON DELETE CASCADE,
  nome text NOT NULL,
  cor text NOT NULL DEFAULT '#C9A876',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_etiquetas_agencia ON etiquetas(agencia_id);

ALTER TABLE etiquetas ENABLE ROW LEVEL SECURITY;
CREATE POLICY etiquetas_tenant ON etiquetas
  USING (agencia_id = current_agencia_id() OR is_super_admin())
  WITH CHECK (agencia_id = current_agencia_id() OR is_super_admin());

CREATE TABLE contato_etiquetas (
  contato_id uuid NOT NULL REFERENCES contatos(id) ON DELETE CASCADE,
  etiqueta_id uuid NOT NULL REFERENCES etiquetas(id) ON DELETE CASCADE,
  PRIMARY KEY (contato_id, etiqueta_id)
);

ALTER TABLE contato_etiquetas ENABLE ROW LEVEL SECURITY;
CREATE POLICY ce_tenant ON contato_etiquetas
  USING (EXISTS (SELECT 1 FROM contatos c WHERE c.id = contato_id
    AND (c.agencia_id = current_agencia_id() OR is_super_admin())));

-- =========================================================================
-- 7. TICKETS + MENSAGENS
-- =========================================================================

CREATE TABLE tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agencia_id uuid NOT NULL REFERENCES agencias(id) ON DELETE CASCADE,
  numero integer NOT NULL,
  contato_id uuid NOT NULL REFERENCES contatos(id) ON DELETE CASCADE,
  canal_id uuid REFERENCES canais(id) ON DELETE SET NULL,
  fila_id uuid REFERENCES filas(id) ON DELETE SET NULL,
  usuario_id uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('aberto','pendente','fechado')),
  valor_fechado numeric(12,2),
  protocolo text,
  avaliacao_nota integer,
  avaliacao_comentario text,
  sentimento text CHECK (sentimento IS NULL OR sentimento IN ('ruim','bom','muito_bom')),
  sentimento_confianca integer,
  sentimento_motivo text,
  sentimento_atualizado_em timestamptz,
  resumo text,
  resumo_atualizado_em timestamptz,
  motivo_pausa text,
  ultima_mensagem_em timestamptz,
  ultima_mensagem_preview text,
  primeira_resposta_em timestamptz,
  fechado_em timestamptz,
  fechado_por uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agencia_id, numero)
);

CREATE INDEX idx_tickets_agencia_status ON tickets(agencia_id, status);
CREATE INDEX idx_tickets_contato ON tickets(contato_id);
CREATE INDEX idx_tickets_usuario ON tickets(usuario_id);
CREATE INDEX idx_tickets_canal ON tickets(canal_id);

ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY tickets_tenant ON tickets
  USING (agencia_id = current_agencia_id() OR is_super_admin())
  WITH CHECK (agencia_id = current_agencia_id() OR is_super_admin());

CREATE OR REPLACE FUNCTION assign_ticket_numero() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.numero IS NULL OR NEW.numero = 0 THEN
    NEW.numero := next_ticket_numero(NEW.agencia_id);
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_tickets_numero BEFORE INSERT ON tickets
  FOR EACH ROW EXECUTE FUNCTION assign_ticket_numero();

CREATE TABLE mensagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  agencia_id uuid NOT NULL REFERENCES agencias(id) ON DELETE CASCADE,
  autor text NOT NULL CHECK (autor IN ('cliente','atendente','sistema','bot')),
  usuario_id uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  tipo text NOT NULL CHECK (tipo IN
    ('texto','audio','imagem','documento','video','sticker','localizacao','contato','template','interactive')),
  conteudo text,
  midia_url text,
  midia_mime text,
  midia_filename text,
  transcricao text,
  transcricao_modelo text,
  wa_message_id text,
  status text NOT NULL DEFAULT 'enviada'
    CHECK (status IN ('pendente','enviada','entregue','lida','falha')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mensagens_ticket ON mensagens(ticket_id, created_at);
CREATE INDEX idx_mensagens_agencia ON mensagens(agencia_id, created_at);
CREATE INDEX idx_mensagens_wa ON mensagens(wa_message_id);
CREATE INDEX idx_mensagens_busca ON mensagens USING gin (to_tsvector('portuguese', coalesce(conteudo,'') || ' ' || coalesce(transcricao,'')));

ALTER TABLE mensagens ENABLE ROW LEVEL SECURITY;
CREATE POLICY mensagens_tenant ON mensagens
  USING (agencia_id = current_agencia_id() OR is_super_admin())
  WITH CHECK (agencia_id = current_agencia_id() OR is_super_admin());

CREATE OR REPLACE FUNCTION bump_ticket_ultima_msg() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  UPDATE tickets
     SET ultima_mensagem_em = NEW.created_at,
         ultima_mensagem_preview = LEFT(coalesce(NEW.conteudo, NEW.transcricao, '[' || NEW.tipo || ']'), 200),
         updated_at = now()
   WHERE id = NEW.ticket_id;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_mensagens_bump AFTER INSERT ON mensagens
  FOR EACH ROW EXECUTE FUNCTION bump_ticket_ultima_msg();

-- =========================================================================
-- 8. NOTAS + PROTOCOLOS
-- =========================================================================

CREATE TABLE notas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  agencia_id uuid NOT NULL REFERENCES agencias(id) ON DELETE CASCADE,
  usuario_id uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  conteudo text NOT NULL,
  anexos jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notas_ticket ON notas(ticket_id);

ALTER TABLE notas ENABLE ROW LEVEL SECURITY;
CREATE POLICY notas_tenant ON notas
  USING (agencia_id = current_agencia_id() OR is_super_admin())
  WITH CHECK (agencia_id = current_agencia_id() OR is_super_admin());

CREATE TABLE protocolos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  agencia_id uuid NOT NULL REFERENCES agencias(id) ON DELETE CASCADE,
  numero text NOT NULL,
  enviado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE protocolos ENABLE ROW LEVEL SECURITY;
CREATE POLICY protocolos_tenant ON protocolos
  USING (agencia_id = current_agencia_id() OR is_super_admin())
  WITH CHECK (agencia_id = current_agencia_id() OR is_super_admin());

-- =========================================================================
-- 9. MENSAGENS RÁPIDAS (slash commands)
-- =========================================================================

CREATE TABLE mensagens_rapidas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agencia_id uuid NOT NULL REFERENCES agencias(id) ON DELETE CASCADE,
  usuario_id uuid REFERENCES usuarios(id) ON DELETE CASCADE,
  comando text NOT NULL,
  conteudo text NOT NULL,
  anexos jsonb NOT NULL DEFAULT '[]'::jsonb,
  global boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_mr_agencia_comando ON mensagens_rapidas(agencia_id, usuario_id, comando);

ALTER TABLE mensagens_rapidas ENABLE ROW LEVEL SECURITY;
CREATE POLICY mr_tenant ON mensagens_rapidas
  USING (agencia_id = current_agencia_id() OR is_super_admin())
  WITH CHECK (agencia_id = current_agencia_id() OR is_super_admin());

-- =========================================================================
-- 10. IA — prompts editáveis + log execuções
-- =========================================================================

CREATE TABLE ia_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agencia_id uuid REFERENCES agencias(id) ON DELETE CASCADE,
  chave text NOT NULL CHECK (chave IN ('sentimento','resumo','sugestao_resposta')),
  nome text NOT NULL,
  conteudo text NOT NULL,
  modelo_default text,
  ativo boolean NOT NULL DEFAULT true,
  atualizado_por uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_ia_prompts ON ia_prompts(coalesce(agencia_id, '00000000-0000-0000-0000-000000000000'::uuid), chave);

ALTER TABLE ia_prompts ENABLE ROW LEVEL SECURITY;

-- Super admin gerencia globais (agencia_id NULL). Admin gerencia da sua agência.
CREATE POLICY ia_prompts_read ON ia_prompts FOR SELECT
  USING (agencia_id IS NULL OR agencia_id = current_agencia_id() OR is_super_admin());

CREATE POLICY ia_prompts_write ON ia_prompts FOR ALL
  USING (
    (agencia_id IS NULL AND is_super_admin())
    OR (agencia_id = current_agencia_id() AND current_user_role() IN ('admin','super_admin'))
  )
  WITH CHECK (
    (agencia_id IS NULL AND is_super_admin())
    OR (agencia_id = current_agencia_id() AND current_user_role() IN ('admin','super_admin'))
  );

CREATE TABLE ia_execucoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agencia_id uuid NOT NULL REFERENCES agencias(id) ON DELETE CASCADE,
  ticket_id uuid REFERENCES tickets(id) ON DELETE SET NULL,
  tipo text NOT NULL,
  modelo text,
  prompt_usado text,
  entrada_chars integer,
  resultado jsonb,
  custo_tokens integer,
  erro text,
  duracao_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_iae_ticket ON ia_execucoes(ticket_id);
CREATE INDEX idx_iae_agencia ON ia_execucoes(agencia_id, created_at);

ALTER TABLE ia_execucoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY iae_tenant ON ia_execucoes
  USING (agencia_id = current_agencia_id() OR is_super_admin())
  WITH CHECK (agencia_id = current_agencia_id() OR is_super_admin());

-- Seed prompts globais default.
INSERT INTO ia_prompts (agencia_id, chave, nome, conteudo, modelo_default) VALUES
  (NULL, 'sentimento', 'Análise de sentimento (default)', $prompt$Você analisa conversas WhatsApp entre atendente e cliente.
Classifique o sentimento GERAL DO CLIENTE em UMA das 3 categorias:
- "ruim" (frustrado, irritado, decepcionado, ameaça abandono)
- "bom" (neutro/positivo, dúvidas resolvidas, sem fricção)
- "muito_bom" (entusiasmado, elogio, intenção clara de comprar, gratidão)

Considere tom, emojis, velocidade de resposta, pedidos repetidos, palavras-chave.
Ignore mensagens do atendente exceto pra contexto.

Responda APENAS JSON: {"sentimento":"ruim|bom|muito_bom","confianca":0-100,"motivo":"1 frase"}$prompt$, 'llama-3.3-70b-versatile'),
  (NULL, 'resumo', 'Resumo da conversa (default)', $prompt$Resuma a conversa WhatsApp abaixo em até 6 bullets diretos, em PT-BR.
Inclua: motivo do contato, dores do cliente, soluções/respostas dadas pelo atendente, pendências, próximos passos sugeridos.
Não invente. Se algum item não existir, omita.
Responda em markdown puro.$prompt$, 'llama-3.3-70b-versatile')
ON CONFLICT DO NOTHING;

-- =========================================================================
-- 11. ASAAS
-- =========================================================================

CREATE TABLE asaas_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agencia_id uuid NOT NULL UNIQUE REFERENCES agencias(id) ON DELETE CASCADE,
  api_key_encrypted bytea,
  ambiente text NOT NULL DEFAULT 'producao' CHECK (ambiente IN ('producao','sandbox')),
  pix_tipo_chave text CHECK (pix_tipo_chave IN ('EVP','CPF','CNPJ','EMAIL','PHONE')),
  pix_chave text,
  pix_nome_recebedor text,
  pix_mensagem_padrao text,
  webhook_secret text NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  mensagem_pagamento_auto text DEFAULT 'Recebi seu pagamento! 😊 Em breve daremos sequência.',
  ativo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE asaas_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY asaas_cfg_tenant ON asaas_config
  USING (agencia_id = current_agencia_id() OR is_super_admin())
  WITH CHECK (agencia_id = current_agencia_id() OR is_super_admin());

CREATE TABLE asaas_cobrancas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agencia_id uuid NOT NULL REFERENCES agencias(id) ON DELETE CASCADE,
  ticket_id uuid REFERENCES tickets(id) ON DELETE SET NULL,
  contato_id uuid REFERENCES contatos(id) ON DELETE SET NULL,
  asaas_id text,
  tipo text NOT NULL CHECK (tipo IN ('pix','cartao','boleto')),
  valor numeric(12,2) NOT NULL,
  parcelas integer DEFAULT 1,
  descricao text,
  status text NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente','confirmada','recebida','vencida','cancelada','estornada')),
  qr_code text,
  copia_cola text,
  link_pagamento text,
  data_vencimento date,
  pago_em timestamptz,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_asaas_cobr_ticket ON asaas_cobrancas(ticket_id);
CREATE INDEX idx_asaas_cobr_asaas ON asaas_cobrancas(asaas_id);

ALTER TABLE asaas_cobrancas ENABLE ROW LEVEL SECURITY;
CREATE POLICY asaas_cobr_tenant ON asaas_cobrancas
  USING (agencia_id = current_agencia_id() OR is_super_admin())
  WITH CHECK (agencia_id = current_agencia_id() OR is_super_admin());

-- =========================================================================
-- 12. WEBHOOKS OUT (sistema → externo)
-- =========================================================================

CREATE TABLE webhooks_out (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agencia_id uuid NOT NULL REFERENCES agencias(id) ON DELETE CASCADE,
  nome text NOT NULL,
  url text NOT NULL,
  eventos text[] NOT NULL DEFAULT '{}',
  secret text NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_wh_agencia ON webhooks_out(agencia_id);

ALTER TABLE webhooks_out ENABLE ROW LEVEL SECURITY;
CREATE POLICY wh_tenant ON webhooks_out
  USING (agencia_id = current_agencia_id() OR is_super_admin())
  WITH CHECK (agencia_id = current_agencia_id() OR is_super_admin());

CREATE TABLE webhooks_out_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id uuid NOT NULL REFERENCES webhooks_out(id) ON DELETE CASCADE,
  agencia_id uuid NOT NULL REFERENCES agencias(id) ON DELETE CASCADE,
  evento text NOT NULL,
  payload jsonb,
  status_code integer,
  resposta text,
  erro text,
  tentativa integer NOT NULL DEFAULT 1,
  duracao_ms integer,
  enviado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_whl_webhook ON webhooks_out_logs(webhook_id, enviado_em DESC);
CREATE INDEX idx_whl_agencia ON webhooks_out_logs(agencia_id, enviado_em DESC);

ALTER TABLE webhooks_out_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY whl_tenant ON webhooks_out_logs
  USING (agencia_id = current_agencia_id() OR is_super_admin())
  WITH CHECK (agencia_id = current_agencia_id() OR is_super_admin());

-- =========================================================================
-- 13. AUDIT LOGS
-- =========================================================================

CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agencia_id uuid REFERENCES agencias(id) ON DELETE SET NULL,
  usuario_id uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  tenant_label text,
  acao text NOT NULL,
  entidade text,
  entidade_id text,
  metodo text,
  caminho text,
  status integer,
  ip text,
  user_agent text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_agencia ON audit_logs(agencia_id, created_at DESC);
CREATE INDEX idx_audit_usuario ON audit_logs(usuario_id, created_at DESC);
CREATE INDEX idx_audit_entidade ON audit_logs(entidade, entidade_id);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_tenant ON audit_logs FOR SELECT
  USING (agencia_id = current_agencia_id() OR is_super_admin());

CREATE POLICY audit_insert ON audit_logs FOR INSERT
  WITH CHECK (true);

-- =========================================================================
-- 14. CONFIGURAÇÕES por agência
-- =========================================================================

CREATE TABLE configuracoes_agencia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agencia_id uuid NOT NULL UNIQUE REFERENCES agencias(id) ON DELETE CASCADE,
  geral jsonb NOT NULL DEFAULT '{}'::jsonb,
  smtp jsonb NOT NULL DEFAULT '{}'::jsonb,
  a2f jsonb NOT NULL DEFAULT '{}'::jsonb,
  ia jsonb NOT NULL DEFAULT '{}'::jsonb,
  integracoes jsonb NOT NULL DEFAULT '{}'::jsonb,
  groq_key_encrypted bytea,
  openai_key_encrypted bytea,
  anthropic_key_encrypted bytea,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE configuracoes_agencia ENABLE ROW LEVEL SECURITY;
CREATE POLICY cfg_tenant ON configuracoes_agencia
  USING (agencia_id = current_agencia_id() OR is_super_admin())
  WITH CHECK (agencia_id = current_agencia_id() OR is_super_admin());

-- =========================================================================
-- 15. STORAGE BUCKET — crm-media
-- =========================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('crm-media', 'crm-media', false, 20971520)  -- 20MB
ON CONFLICT (id) DO NOTHING;

-- Policy: usuários autenticados podem ler/escrever na agência deles.
-- Path convention: <agencia_id>/<ticket_id>/<filename>
DROP POLICY IF EXISTS "crm_media_select" ON storage.objects;
DROP POLICY IF EXISTS "crm_media_insert" ON storage.objects;
DROP POLICY IF EXISTS "crm_media_update" ON storage.objects;
DROP POLICY IF EXISTS "crm_media_delete" ON storage.objects;

CREATE POLICY "crm_media_select" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'crm-media'
    AND (split_part(name, '/', 1)::uuid = current_agencia_id() OR is_super_admin())
  );

CREATE POLICY "crm_media_insert" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'crm-media'
    AND (split_part(name, '/', 1)::uuid = current_agencia_id() OR is_super_admin())
  );

CREATE POLICY "crm_media_update" ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'crm-media'
    AND (split_part(name, '/', 1)::uuid = current_agencia_id() OR is_super_admin())
  );

CREATE POLICY "crm_media_delete" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'crm-media'
    AND (split_part(name, '/', 1)::uuid = current_agencia_id() OR is_super_admin())
  );

-- =========================================================================
-- 16. REALTIME — habilitar replicação pra chat
-- =========================================================================

DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE mensagens; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE tickets;   EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE canais;    EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE notas;     EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- =========================================================================
-- FIM
-- =========================================================================
