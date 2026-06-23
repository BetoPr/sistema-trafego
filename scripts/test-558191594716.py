import paramiko

HOST = "187.127.5.81"
USER = "root"
PASSWORD = "Jj@28186310104"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASSWORD, timeout=30)

# Run SQL queries on the local Postgres
def sql(q):
    cmd = f'sudo -u postgres psql -d sonar -t -A -F "|" -c "{q}"'
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode()
    err = stderr.read().decode()
    return out, err

NUM = "558191594716"

print("=" * 80)
print("1) Contato + ticket atual")
print("=" * 80)
q = f"""SELECT c.id, c.nome, c.whatsapp, c.wa_id, c.agencia_id
        FROM contatos c
        WHERE c.whatsapp LIKE '%{NUM}%' OR c.wa_id LIKE '%{NUM}%'
        LIMIT 3;"""
o, e = sql(q)
print(o)
if e.strip():
    print("ERR:", e)

print("=" * 80)
print("2) Etiquetas + gatilhos (Restauracao, Bebe, Mofo)")
print("=" * 80)
q = """SELECT id, nome, etiqueta_pai_id, palavra_gatilho, ativo, categoria
       FROM etiquetas
       WHERE nome ILIKE '%restaura%' OR nome ILIKE '%bebe%' OR nome ILIKE '%bebê%' OR nome ILIKE '%mofo%'
       ORDER BY etiqueta_pai_id NULLS FIRST, nome;"""
o, e = sql(q)
print(o)
if e.strip():
    print("ERR:", e)

print("=" * 80)
print("3) Tickets do contato")
print("=" * 80)
q = f"""SELECT t.id, t.numero, t.status, t.ia_pausada, t.ia_perfil_id, t.ia_reset_em, t.canal_id, t.contato_id
        FROM tickets t
        JOIN contatos c ON c.id = t.contato_id
        WHERE c.whatsapp LIKE '%{NUM}%' OR c.wa_id LIKE '%{NUM}%'
        ORDER BY t.created_at DESC
        LIMIT 3;"""
o, e = sql(q)
print(o)
if e.strip():
    print("ERR:", e)

print("=" * 80)
print("4) Perfil IA + canal")
print("=" * 80)
q = """SELECT p.id, p.nome, p.ativo, p.delay_debounce_seg, p.pausa_se_humano_responder, p.canais_ativos, p.whatsapp_teste_lista
       FROM ia_atendimento_perfis p
       WHERE p.ativo = true LIMIT 3;"""
o, e = sql(q)
print(o)
if e.strip():
    print("ERR:", e)

print("=" * 80)
print("5) Etiquetas atuais do contato")
print("=" * 80)
q = f"""SELECT e.nome, e.etiqueta_pai_id, ce.created_at
        FROM contato_etiquetas ce
        JOIN etiquetas e ON e.id = ce.etiqueta_id
        JOIN contatos c ON c.id = ce.contato_id
        WHERE c.whatsapp LIKE '%{NUM}%' OR c.wa_id LIKE '%{NUM}%'
        ORDER BY ce.created_at DESC;"""
o, e = sql(q)
print(o)
if e.strip():
    print("ERR:", e)

ssh.close()
