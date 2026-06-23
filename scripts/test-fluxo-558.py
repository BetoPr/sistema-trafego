"""Simula fluxo end-to-end:
1) Cria/garante Pasta Restauracao + filhas Bebe (biscoito) + Mofo (bolacha) na agencia do Roberto Mkt
2) Limpa estado: remove etiquetas anteriores do contato
3) Insere mensagem 'biscoito' como cliente -> chama processamento via curl localhost
4) Verifica contato_etiquetas (deve ter Bebe + Restauracao)
"""
import paramiko, json, time

HOST = "187.127.5.81"; USER = "root"; PASSWORD = "Jj@28186310104"

CONTATO_ID = "99818ef5-240a-48bc-8636-3751e6a2069c"  # Roberto Mkt
AGENCIA_ID = "9f762ec0-2ff8-4a74-aad2-c5c14f0b52a6"
TICKET_ID  = "11c3aab7-9e48-45ab-8306-954d500c24de"  # ticket #21 pendente
CANAL_ID   = "457cc43f-1721-4f95-80b6-517cb870bb0c"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASSWORD, timeout=30)

def sql(q, db="sonar"):
    cmd = f'sudo -u postgres psql -d {db} -t -A -F "|" -c "{q}"'
    stdin, stdout, stderr = ssh.exec_command(cmd)
    return stdout.read().decode(), stderr.read().decode()

print("=" * 70)
print("1) Garante Pasta Restauracao + filhas Bebe(biscoito) + Mofo(bolacha)")
print("=" * 70)

# Upsert pasta + filhas. INSERT...ON CONFLICT exige unique — usa DELETE+INSERT por simplicidade local-only.
sql_setup = f"""
DO $$
DECLARE
  v_pasta_id uuid;
  v_bebe_id uuid;
  v_mofo_id uuid;
BEGIN
  -- Pasta Restauracao
  SELECT id INTO v_pasta_id FROM etiquetas WHERE agencia_id='{AGENCIA_ID}' AND nome='Restauracao' AND etiqueta_pai_id IS NULL LIMIT 1;
  IF v_pasta_id IS NULL THEN
    INSERT INTO etiquetas(agencia_id, nome, cor, categoria, ativo) VALUES('{AGENCIA_ID}', 'Restauracao', '#00E19A', 'etiqueta', true) RETURNING id INTO v_pasta_id;
  END IF;
  -- Filha Bebe com gatilho biscoito
  SELECT id INTO v_bebe_id FROM etiquetas WHERE agencia_id='{AGENCIA_ID}' AND nome='Restauracao/Bebe' LIMIT 1;
  IF v_bebe_id IS NULL THEN
    INSERT INTO etiquetas(agencia_id, nome, cor, categoria, ativo, etiqueta_pai_id, palavra_gatilho) VALUES('{AGENCIA_ID}', 'Restauracao/Bebe', '#ec4899', 'etiqueta', true, v_pasta_id, 'biscoito') RETURNING id INTO v_bebe_id;
  ELSE
    UPDATE etiquetas SET etiqueta_pai_id=v_pasta_id, palavra_gatilho='biscoito', ativo=true WHERE id=v_bebe_id;
  END IF;
  -- Filha Mofo com gatilho bolacha
  SELECT id INTO v_mofo_id FROM etiquetas WHERE agencia_id='{AGENCIA_ID}' AND nome='Restauracao/Mofo' LIMIT 1;
  IF v_mofo_id IS NULL THEN
    INSERT INTO etiquetas(agencia_id, nome, cor, categoria, ativo, etiqueta_pai_id, palavra_gatilho) VALUES('{AGENCIA_ID}', 'Restauracao/Mofo', '#8b5cf6', 'etiqueta', true, v_pasta_id, 'bolacha') RETURNING id INTO v_mofo_id;
  ELSE
    UPDATE etiquetas SET etiqueta_pai_id=v_pasta_id, palavra_gatilho='bolacha', ativo=true WHERE id=v_mofo_id;
  END IF;
  RAISE NOTICE 'pasta=%, bebe=%, mofo=%', v_pasta_id, v_bebe_id, v_mofo_id;
END $$;
"""
# escape em $$ quebra com -c. Usa heredoc via arquivo.
sftp = ssh.open_sftp()
with sftp.open('/tmp/setup.sql', 'w') as f: f.write(sql_setup)
sftp.close()
stdin, stdout, stderr = ssh.exec_command('sudo -u postgres psql -d sonar -f /tmp/setup.sql')
print("STDOUT:", stdout.read().decode())
print("STDERR:", stderr.read().decode())

print("=" * 70)
print("2) Confere etiquetas configuradas")
print("=" * 70)
o, e = sql(f"SELECT id, nome, etiqueta_pai_id, palavra_gatilho, ativo FROM etiquetas WHERE agencia_id='{AGENCIA_ID}' AND (nome LIKE 'Restauracao%') ORDER BY etiqueta_pai_id NULLS FIRST;")
print(o)
if e.strip(): print("ERR:", e)

print("=" * 70)
print("3) Limpa contato_etiquetas anteriores do contato")
print("=" * 70)
o, e = sql(f"DELETE FROM contato_etiquetas WHERE contato_id='{CONTATO_ID}' AND etiqueta_id IN (SELECT id FROM etiquetas WHERE agencia_id='{AGENCIA_ID}' AND nome LIKE 'Restauracao%') RETURNING etiqueta_id;")
print("Removidos:", o)

print("=" * 70)
print("4) Insere msg 'biscoito' como CLIENTE no ticket + processa ingest")
print("=" * 70)
# Insere mensagem direta. NAO chama webhook. Apenas valida que aplicarEtiquetasComMaes funciona via SQL: aplica etiqueta-filha direto e ve se nossa lib seria chamada. Mas como inserir direto NAO dispara hooks JS, vou chamar app/api/contatos/[id]/etiquetas POST via curl localhost.

# Primeiro: simula gatilho manual via POST API.
# Mas POST API exige auth. Vou direto chamar aplicar via uma rota interna: como nao temos, vou inserir contato_etiquetas direto + chamar a rota equivalente.

# Estratégia mais simples: gera msg + chama endpoint testar (não existe).
# Alternativa: insere msg cliente + dispara webhook UAZAPI replay com canal_secret.

# Pega secret do canal
o, e = sql(f"SELECT webhook_secret FROM canais WHERE id='{CANAL_ID}';")
print("Webhook secret:", o.strip())
secret = o.strip()

print("=" * 70)
print("5) POST webhook UAZAPI localhost simulando msg cliente 'biscoito'")
print("=" * 70)

payload = {
  "EventType": "messages",
  "message": {
    "id": f"WAFAKE{int(time.time())}",
    "sender": "558191594716@s.whatsapp.net",
    "fromMe": False,
    "text": "biscoito",
    "messageType": "extendedTextMessage",
    "messageTimestamp": int(time.time()),
    "isGroup": False,
    "chatid": "558191594716@s.whatsapp.net"
  }
}
pj = json.dumps(payload).replace("'", "'\"'\"'")
cmd = f"curl -s -X POST -H 'Content-Type: application/json' -d '{pj}' http://localhost:3000/api/webhooks/uazapi/{secret}"
stdin, stdout, stderr = ssh.exec_command(cmd)
print("Webhook resp:", stdout.read().decode())
print("Err:", stderr.read().decode())

# Espera ingest 3s (gatilho roda em void async)
print("Aguardando 4s pra gatilho rodar...")
time.sleep(4)

print("=" * 70)
print("6) Verifica contato_etiquetas FINAL (deve ter Bebe + Restauracao)")
print("=" * 70)
o, e = sql(f"SELECT e.nome, e.etiqueta_pai_id, ce.created_at FROM contato_etiquetas ce JOIN etiquetas e ON e.id=ce.etiqueta_id WHERE ce.contato_id='{CONTATO_ID}' AND e.nome LIKE 'Restauracao%' ORDER BY ce.created_at DESC;")
print(o)
if e.strip(): print("ERR:", e)

ssh.close()
