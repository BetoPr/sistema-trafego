-- Detector de plataforma do aparelho conectado (iOS / Android / Web).
-- UAZAPI expoe `plataform` por instancia (/instance/all): smba=Business Android,
-- smbi=Business iOS, android/iphone=WhatsApp normal, web/desktop. Guardamos pra
-- mostrar badge no canal e o aviso de notificacao de sync so quando for iOS.
-- Aplicada via MCP em 2026-06-18.
alter table public.canais add column if not exists wa_plataforma text;

comment on column public.canais.wa_plataforma is
  'Plataforma do aparelho conectado (campo UAZAPI plataform): smba=WhatsApp Business Android, smbi=WhatsApp Business iOS, android/iphone=WhatsApp normal, web/desktop. Usado pra avisos por SO (ex: notificacao de sync no iOS).';
