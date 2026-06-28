-- Migration: campo online_manual no usuarios.
--
-- Quando online_manual = false, usuario marcou "Ficar offline" no menu
-- de perfil. Heartbeat continua batendo mas NAO seta online=true.
-- Cron pode setar offline normalmente.

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS online_manual boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN usuarios.online_manual IS
  'Se false, usuario escolheu ficar offline manualmente. Heartbeat nao reativa.';
