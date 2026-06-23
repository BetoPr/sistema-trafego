"""Tenta acessar /analise-ias com cookie de sessão pra capturar erro real."""
import paramiko, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('187.127.5.81', username='root', password='Jj@28186310104', timeout=30)

# tail logs ao vivo enquanto sobe trace de erro: forcamos um SIGUSR2 pra pm2 reler logs
cmd = """
sudo -u deploy pm2 flush sonar
echo '---FLUSHED---'
# fazer request sem cookie (vai redirecionar) só pra ativar rota; substituir por curl com cookie real eh dificil
curl -s -o /tmp/out.html -w 'status=%{http_code}\\n' https://sonarcrm.com.br/analise-ias
echo '---HIT---'
sleep 2
sudo -u deploy pm2 logs sonar --lines 100 --nostream --raw 2>&1
"""
stdin, stdout, stderr = ssh.exec_command(cmd, timeout=60)
print(stdout.read().decode(errors='replace'))
ssh.close()
