"""Lê últimas linhas do log PM2 do app sonar no VPS."""
import paramiko
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

HOST = "187.127.5.81"
USER = "root"
PASSWORD = "Jj@28186310104"

CMD = "sudo -u deploy pm2 logs sonar --lines 100 --nostream 2>&1 | tail -100"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASSWORD, timeout=30)
stdin, stdout, stderr = ssh.exec_command(CMD, timeout=30)
print(stdout.read().decode(errors="replace"))
ssh.close()
