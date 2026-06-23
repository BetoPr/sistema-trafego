"""Deploy: git pull + build + pm2 restart no VPS Sonar."""
import paramiko
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

HOST = "187.127.5.81"
USER = "root"
PASSWORD = "Jj@28186310104"  # noqa: secret local-only

CMD = (
    "cd /home/deploy/sonar && "
    "sudo -u deploy git pull origin main 2>&1 && "
    "sudo -u deploy bash -lc 'cd /home/deploy/sonar && npm run build' 2>&1 && "
    "sudo -u deploy pm2 restart sonar 2>&1 && "
    "sudo -u deploy pm2 status sonar"
)

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASSWORD, timeout=30)
    stdin, stdout, stderr = ssh.exec_command(CMD, timeout=300)
    for line in iter(stdout.readline, ""):
        print(line, end="")
        sys.stdout.flush()
    err = stderr.read().decode()
    if err:
        print("STDERR:", err)
    ssh.close()

if __name__ == "__main__":
    main()
