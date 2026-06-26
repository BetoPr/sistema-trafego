# WAHA — Setup VPS Hostinger

WAHA self-hosted ao lado do Sonar CRM na VPS 187.127.5.81.

## Especs alvo
- VPS Hostinger 2 vCPU / 7.8 GB RAM / 96 GB SSD / Ubuntu 24.04
- Docker 29.6 já instalado
- Postgres local em 5432 (compartilhado)
- Nginx 1.24 com SSL via Let's Encrypt
- Subdomínio `waha.sonarcrm.com.br`

## Capacidade estimada (NOWEB engine)
- ~50 sessões WhatsApp confortáveis nesse tier (8 GB RAM)
- Pra >60 sessões → upgrade pra 16 GB RAM
- Cada sessão consome ~80-120 MB RAM + ~10-50 MB Postgres

## Passo a passo de instalação

### 1. DNS (manual no Hostinger DNS)
Criar A record:
```
waha.sonarcrm.com.br → 187.127.5.81 (TTL 300)
```
Aguardar propagação (~5-30 min).

### 2. Criar usuário + DB Postgres pro WAHA
```bash
ssh root@187.127.5.81
sudo -u postgres psql

CREATE USER waha WITH PASSWORD '<SENHA_FORTE>';
CREATE DATABASE waha_sessions OWNER waha;
GRANT ALL PRIVILEGES ON DATABASE waha_sessions TO waha;
\q
```

Editar `pg_hba.conf` (provavelmente `/etc/postgresql/16/main/pg_hba.conf`) e adicionar:
```
host    waha_sessions   waha    172.17.0.0/16    md5
```
Reiniciar Postgres: `systemctl restart postgresql`.

### 3. Subir container WAHA
```bash
mkdir -p /home/deploy/waha && cd /home/deploy/waha
# Copia docker-compose.yml + cria .env (gera WAHA_API_KEY com uuidgen)
echo "WAHA_API_KEY=$(uuidgen | tr -d '-')" > .env
echo "WAHA_DASHBOARD_USERNAME=admin" >> .env
echo "WAHA_DASHBOARD_PASSWORD=$(openssl rand -hex 16)" >> .env
echo "WAHA_POSTGRES_URL=postgresql://waha:<SENHA_FORTE>@host.docker.internal:5432/waha_sessions" >> .env
chmod 600 .env

# Copia docker-compose.yml dessa pasta pra /home/deploy/waha/
docker compose pull
docker compose up -d
docker compose logs -f
```

Verificar funcionando:
```bash
curl -H "X-Api-Key: <WAHA_API_KEY>" http://localhost:3001/api/sessions
# Deve retornar []
```

### 4. Nginx vhost
Copiar `nginx-waha.conf` pra `/etc/nginx/sites-available/waha` e ativar:
```bash
ln -s /etc/nginx/sites-available/waha /etc/nginx/sites-enabled/waha
nginx -t && systemctl reload nginx
```

### 5. SSL via Certbot
```bash
certbot --nginx -d waha.sonarcrm.com.br
# Vai automaticamente preencher ssl_certificate no vhost
```

### 6. Env vars no Sonar (.env.production.local)
Adicionar em `/home/deploy/sonar/.env.production.local`:
```env
SONAR_WAHA_BASE_URL=https://waha.sonarcrm.com.br
SONAR_WAHA_API_KEY=<WAHA_API_KEY>  # mesmo do .env do WAHA
```
Reiniciar Sonar: `sudo -u deploy pm2 restart sonar`.

### 7. Aplicar migration Supabase
```bash
psql "<SUPABASE_CLOUD_URL>" -f supabase/migrations/20260625200000_canais_provider_waha.sql
```
Ou aplica via Supabase Studio web.

### 8. Smoke test
- Login no CRM como admin
- Canais > + Adicionar canal
- Sistema cria session WAHA + mostra QR
- Escaneia no celular
- Status muda pra ✅ CONECTADO
- Manda mensagem do celular pra outro número (loop)
- Mensagem aparece em /atendimentos

## Operação

### Logs WAHA
```bash
cd /home/deploy/waha
docker compose logs -f waha
```

### Restart
```bash
docker compose restart waha
```

### Update WAHA
```bash
docker compose pull
docker compose up -d
```

### Backup sessions
WAHA grava sessions em 2 lugares:
1. `./sessions/` (auth files, criptografado)
2. Postgres `waha_sessions.*` (state, key history)

Backup os 2:
```bash
tar czf waha-sessions-$(date +%Y%m%d).tar.gz /home/deploy/waha/sessions/
pg_dump -U waha waha_sessions > waha-db-$(date +%Y%m%d).sql
```

## Troubleshooting

- **Container não sobe** → `docker compose logs waha` — geralmente é Postgres inacessível ou WAHA_API_KEY vazio.
- **QR não aparece** → checar `WHATSAPP_DEFAULT_ENGINE=NOWEB` + permissões da pasta sessions.
- **Mensagens não chegam no Sonar** → webhook URL no WAHA tem que apontar pra `https://sonarcrm.com.br/api/webhooks/waha/{secret}`. Sonar configura automático ao criar canal.
- **Número WhatsApp banido** → mesmo risco UAZAPI. Práticas anti-ban iguais.
