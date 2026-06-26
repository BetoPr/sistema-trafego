"""
Setup automatico do WAHA na VPS Sonar (187.127.5.81).

Faz tudo via SSH:
1. Cria Postgres user/db waha + pg_hba.conf
2. Cria /home/deploy/waha + docker-compose.yml + .env
3. Copia nginx-waha.conf + ativa
4. (Pula SSL - precisa rodar certbot interativo depois)
5. Levanta container WAHA
6. Testa /api/sessions

Pre-requisitos:
- DNS A record waha.sonarcrm.com.br -> 187.127.5.81 ja criado
- infra/waha/docker-compose.yml + nginx-waha.conf prontos no repo

Pos-rodar este script:
1. SSH na VPS: certbot --nginx -d waha.sonarcrm.com.br
2. Add SONAR_WAHA_BASE_URL e SONAR_WAHA_API_KEY no
   /home/deploy/sonar/.env.production.local
3. Aplicar migration Supabase (canais.provider)
4. Reiniciar Sonar: sudo -u deploy pm2 restart sonar
"""
import paramiko
import sys
import io
import secrets
import uuid
import os
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

HOST = "187.127.5.81"
USER = "root"
PASSWORD = "Jj@28186310104"

REPO_ROOT = Path(__file__).resolve().parent.parent
COMPOSE_LOCAL = REPO_ROOT / "infra" / "waha" / "docker-compose.yml"
NGINX_LOCAL = REPO_ROOT / "infra" / "waha" / "nginx-waha.conf"

# Geracao de secrets locais (escritos so na VPS)
WAHA_API_KEY = uuid.uuid4().hex  # 32 chars sem hifens
WAHA_DASH_PASS = secrets.token_urlsafe(16)
PG_WAHA_PASS = secrets.token_urlsafe(20)


def run(ssh, cmd, sudo=False, ignore_err=False):
    """Roda comando + retorna stdout. Se ignore_err=False e exit!=0, sai."""
    final = cmd
    print(f"\n$ {cmd[:120]}{'...' if len(cmd) > 120 else ''}")
    stdin, stdout, stderr = ssh.exec_command(final, get_pty=False, timeout=120)
    out = stdout.read().decode(errors="replace")
    err = stderr.read().decode(errors="replace")
    rc = stdout.channel.recv_exit_status()
    if out:
        print(out, end="")
    if err and (rc != 0 or "warning" not in err.lower()):
        print(f"[stderr] {err}", end="")
    if rc != 0 and not ignore_err:
        sys.exit(f"[ERRO] cmd falhou (rc={rc})")
    return out


def put_file(ssh, local: Path, remote: str, mode: int = 0o644):
    """Upload arquivo local pra remote via SFTP."""
    print(f"\n>> upload {local.name} -> {remote}")
    sftp = ssh.open_sftp()
    sftp.put(str(local), remote)
    sftp.chmod(remote, mode)
    sftp.close()


def put_text(ssh, content: str, remote: str, mode: int = 0o644):
    """Escreve string como arquivo remoto."""
    print(f">> write {remote} ({len(content)} bytes)")
    sftp = ssh.open_sftp()
    with sftp.open(remote, "w") as f:
        f.write(content)
    sftp.chmod(remote, mode)
    sftp.close()


def main():
    if not COMPOSE_LOCAL.exists():
        sys.exit(f"Falta {COMPOSE_LOCAL}")
    if not NGINX_LOCAL.exists():
        sys.exit(f"Falta {NGINX_LOCAL}")

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f"SSH {USER}@{HOST}...")
    ssh.connect(HOST, username=USER, password=PASSWORD, timeout=30)

    # 1. Postgres: cria user + db waha_sessions
    print("\n========== 1. Postgres setup ==========")
    sql = f"""
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'waha') THEN
    CREATE ROLE waha LOGIN PASSWORD '{PG_WAHA_PASS}';
  ELSE
    ALTER ROLE waha WITH PASSWORD '{PG_WAHA_PASS}';
  END IF;
END $$;
"""
    run(ssh, f"sudo -u postgres psql -c \"{sql.strip().replace(chr(10), ' ')}\"", ignore_err=True)
    # CREATE DATABASE precisa fora de DO block
    run(ssh, "sudo -u postgres psql -tc \"SELECT 1 FROM pg_database WHERE datname='waha_sessions'\" | grep -q 1 || sudo -u postgres createdb -O waha waha_sessions", ignore_err=True)

    # Configura pg_hba.conf pra Docker bridge (172.17.0.0/16 padrao)
    run(ssh, "grep -q 'host    waha_sessions   waha    172.17.0.0/16' /etc/postgresql/16/main/pg_hba.conf || echo 'host    waha_sessions   waha    172.17.0.0/16    md5' >> /etc/postgresql/16/main/pg_hba.conf")
    # Postgres listener publico pra Docker
    run(ssh, "grep -q \"^listen_addresses = '\\*'\" /etc/postgresql/16/main/postgresql.conf || sed -i \"s/^#listen_addresses.*/listen_addresses = '*'/\" /etc/postgresql/16/main/postgresql.conf")
    run(ssh, "systemctl reload postgresql")

    # 2. Pasta + arquivos
    print("\n========== 2. /home/deploy/waha setup ==========")
    run(ssh, "mkdir -p /home/deploy/waha/sessions /home/deploy/waha/media && chown -R deploy:deploy /home/deploy/waha")

    put_file(ssh, COMPOSE_LOCAL, "/home/deploy/waha/docker-compose.yml")
    run(ssh, "chown deploy:deploy /home/deploy/waha/docker-compose.yml")

    env_content = f"""WAHA_API_KEY={WAHA_API_KEY}
WAHA_DASHBOARD_USERNAME=admin
WAHA_DASHBOARD_PASSWORD={WAHA_DASH_PASS}
WAHA_POSTGRES_URL=postgresql://waha:{PG_WAHA_PASS}@host.docker.internal:5432/waha_sessions
"""
    put_text(ssh, env_content, "/home/deploy/waha/.env", mode=0o600)
    run(ssh, "chown deploy:deploy /home/deploy/waha/.env")

    # 3. Nginx vhost
    print("\n========== 3. Nginx vhost ==========")
    put_file(ssh, NGINX_LOCAL, "/etc/nginx/sites-available/waha")
    run(ssh, "ln -sf /etc/nginx/sites-available/waha /etc/nginx/sites-enabled/waha")
    run(ssh, "nginx -t", ignore_err=False)
    run(ssh, "systemctl reload nginx")

    # 4. Sobe container
    print("\n========== 4. docker compose up ==========")
    run(ssh, "cd /home/deploy/waha && docker compose pull", ignore_err=True)
    run(ssh, "cd /home/deploy/waha && docker compose up -d")

    # Espera ~10s pro container inicializar
    run(ssh, "sleep 10")

    # 5. Smoke test interno
    print("\n========== 5. Smoke test ==========")
    out = run(ssh,
              f"curl -fs -H 'X-Api-Key: {WAHA_API_KEY}' http://localhost:3001/api/sessions || echo 'FALHOU'",
              ignore_err=True)
    if "FALHOU" in out:
        print("\n[!!!] Container nao respondeu. Veja logs com:")
        print(f"  ssh root@{HOST} 'cd /home/deploy/waha && docker compose logs --tail 80 waha'")
    else:
        print("✅ WAHA respondeu em localhost:3001")

    # 6. Resumo final
    print("\n\n" + "=" * 60)
    print("SETUP WAHA OK. Proximos passos manuais:")
    print("=" * 60)
    print(f"\n1) Rodar Certbot SSL (precisa DNS waha.sonarcrm.com.br ja apontando):")
    print(f"   ssh root@{HOST}")
    print(f"   certbot --nginx -d waha.sonarcrm.com.br")
    print(f"\n2) Add no /home/deploy/sonar/.env.production.local:")
    print(f"   SONAR_WAHA_BASE_URL=https://waha.sonarcrm.com.br")
    print(f"   SONAR_WAHA_API_KEY={WAHA_API_KEY}")
    print(f"\n3) Aplicar migration Supabase (canais.provider):")
    print(f"   psql <SUPABASE_URL> -f supabase/migrations/20260625200000_canais_provider_waha.sql")
    print(f"\n4) Reiniciar Sonar:")
    print(f"   ssh root@{HOST} 'sudo -u deploy pm2 restart sonar'")
    print(f"\n--- CREDENCIAIS GERADAS (salvar em local seguro) ---")
    print(f"WAHA_API_KEY:             {WAHA_API_KEY}")
    print(f"WAHA_DASHBOARD_PASSWORD:  {WAHA_DASH_PASS}")
    print(f"POSTGRES waha senha:      {PG_WAHA_PASS}")
    print(f"Dashboard WAHA:           https://waha.sonarcrm.com.br/dashboard (login: admin)")

    ssh.close()


if __name__ == "__main__":
    main()
