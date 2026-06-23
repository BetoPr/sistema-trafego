"""Roda SQL no Supabase via psql do VPS (workaround MCP desconectado)."""
import paramiko
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

if len(sys.argv) < 2:
    print("uso: python run-sql.py <arquivo.sql>", file=sys.stderr)
    sys.exit(1)

with open(sys.argv[1], "r", encoding="utf-8") as f:
    sql_local = f.read()

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("187.127.5.81", username="root", password="Jj@28186310104", timeout=30)

sftp = ssh.open_sftp()
remote = "/tmp/_run.sql"
with sftp.open(remote, "w") as rf:
    rf.write(sql_local)
sftp.close()

cmd = (
    "PGPASSWORD='yO1Y1EgU2XHyX7LW' psql "
    "'postgresql://postgres.nnswiakwjvoqwcjscbqq@aws-1-sa-east-1.pooler.supabase.com:5432/postgres' "
    "-v ON_ERROR_STOP=1 -f /tmp/_run.sql 2>&1"
)
stdin, stdout, stderr = ssh.exec_command(cmd, timeout=120)
print(stdout.read().decode(errors="replace"))
ssh.close()
