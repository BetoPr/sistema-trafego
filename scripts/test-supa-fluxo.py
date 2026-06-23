"""Aplica migration etiqueta_pai_id no Supabase Cloud + setup teste + simula fluxo end-to-end via webhook UAZAPI no VPS."""
import psycopg2, json, time, paramiko

SUPA_URL = "postgresql://postgres.nnswiakwjvoqwcjscbqq:yO1Y1EgU2XHyX7LW@aws-1-sa-east-1.pooler.supabase.com:5432/postgres"
HOST = "187.127.5.81"; USER = "root"; PASSWORD = "Jj@28186310104"

CONTATO_NUM = "558191594716"

print("=" * 70)
print("1) Conecta Supabase Cloud")
print("=" * 70)
conn = psycopg2.connect(SUPA_URL)
conn.autocommit = True
cur = conn.cursor()

print("=" * 70)
print("2) Aplica migration etiqueta_pai_id")
print("=" * 70)
cur.execute("""
ALTER TABLE etiquetas ADD COLUMN IF NOT EXISTS etiqueta_pai_id uuid REFERENCES etiquetas(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_etiquetas_pai ON etiquetas(etiqueta_pai_id) WHERE etiqueta_pai_id IS NOT NULL;
""")
cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='etiquetas' AND column_name='etiqueta_pai_id';")
print("Coluna criada:", cur.fetchone())

print("=" * 70)
print("3) Localiza contato Roberto Mkt (558191594716)")
print("=" * 70)
cur.execute(f"SELECT c.id, c.nome, c.agencia_id FROM contatos c WHERE c.whatsapp LIKE %s OR c.wa_id LIKE %s ORDER BY c.created_at DESC LIMIT 5;", (f'%{CONTATO_NUM}%', f'%{CONTATO_NUM}%'))
contatos = cur.fetchall()
for c in contatos: print(c)
# Pega contato "Roberto Mkt"
contato = next((c for c in contatos if 'Mkt' in (c[1] or '')), contatos[0] if contatos else None)
CONTATO_ID, _, AGENCIA_ID = contato
print(f"Usando: {CONTATO_ID} agencia={AGENCIA_ID}")

print("=" * 70)
print("4) Ticket + canal + perfil IA")
print("=" * 70)
cur.execute("SELECT id, numero, status, ia_pausada, ia_perfil_id, canal_id FROM tickets WHERE contato_id=%s ORDER BY created_at DESC LIMIT 3;", (CONTATO_ID,))
tickets = cur.fetchall()
for t in tickets: print(t)
TICKET_ID = tickets[0][0]
CANAL_ID = tickets[0][5]

cur.execute("SELECT id, nome, ativo, whatsapp_teste_lista, canais_ativos FROM ia_atendimento_perfis WHERE agencia_id=%s AND ativo=true;", (AGENCIA_ID,))
print("Perfis IA ativos:", cur.fetchall())

cur.execute("SELECT id, status, padrao FROM canais WHERE id=%s;", (CANAL_ID,))
print("Canal:", cur.fetchone())

print("=" * 70)
print("5) Setup Pasta + filhas com gatilhos")
print("=" * 70)
cur.execute("""
DO $$
DECLARE v_pasta uuid; v_bebe uuid; v_mofo uuid;
BEGIN
  SELECT id INTO v_pasta FROM etiquetas WHERE agencia_id=%s AND nome='Restauracao' AND etiqueta_pai_id IS NULL LIMIT 1;
  IF v_pasta IS NULL THEN
    INSERT INTO etiquetas(agencia_id, nome, cor, categoria, ativo) VALUES(%s, 'Restauracao', '#00E19A', 'etiqueta', true) RETURNING id INTO v_pasta;
  END IF;
  SELECT id INTO v_bebe FROM etiquetas WHERE agencia_id=%s AND nome='Restauracao/Bebe' LIMIT 1;
  IF v_bebe IS NULL THEN
    INSERT INTO etiquetas(agencia_id, nome, cor, categoria, ativo, etiqueta_pai_id, palavra_gatilho) VALUES(%s, 'Restauracao/Bebe', '#ec4899', 'etiqueta', true, v_pasta, 'biscoito') RETURNING id INTO v_bebe;
  ELSE
    UPDATE etiquetas SET etiqueta_pai_id=v_pasta, palavra_gatilho='biscoito', ativo=true WHERE id=v_bebe;
  END IF;
  SELECT id INTO v_mofo FROM etiquetas WHERE agencia_id=%s AND nome='Restauracao/Mofo' LIMIT 1;
  IF v_mofo IS NULL THEN
    INSERT INTO etiquetas(agencia_id, nome, cor, categoria, ativo, etiqueta_pai_id, palavra_gatilho) VALUES(%s, 'Restauracao/Mofo', '#8b5cf6', 'etiqueta', true, v_pasta, 'bolacha') RETURNING id INTO v_mofo;
  ELSE
    UPDATE etiquetas SET etiqueta_pai_id=v_pasta, palavra_gatilho='bolacha', ativo=true WHERE id=v_mofo;
  END IF;
END $$;
""", (AGENCIA_ID,)*6)

cur.execute("SELECT id, nome, etiqueta_pai_id, palavra_gatilho, ativo FROM etiquetas WHERE agencia_id=%s AND nome LIKE 'Restauracao%%' ORDER BY etiqueta_pai_id NULLS FIRST;", (AGENCIA_ID,))
print("Etiquetas configuradas:")
for r in cur.fetchall(): print(" ", r)

print("=" * 70)
print("6) Limpa contato_etiquetas anteriores")
print("=" * 70)
cur.execute("DELETE FROM contato_etiquetas WHERE contato_id=%s AND etiqueta_id IN (SELECT id FROM etiquetas WHERE agencia_id=%s AND nome LIKE 'Restauracao%%');", (CONTATO_ID, AGENCIA_ID))
print("Removidos:", cur.rowcount)

print("=" * 70)
print("7) Pega webhook_secret do canal")
print("=" * 70)
cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='canais' ORDER BY ordinal_position;")
print("Colunas canais:", [c[0] for c in cur.fetchall()])

cur.execute("SELECT webhook_secret FROM canais WHERE id=%s;", (CANAL_ID,))
sec_row = cur.fetchone()
SECRET = sec_row[0] if sec_row else None
print("Secret:", SECRET[:20] + "..." if SECRET else "NULL")

if not SECRET:
    print("ABORT: canal sem webhook_secret")
    exit(1)

print("=" * 70)
print("8) Reativa IA no ticket (ia_pausada=false + reset_em=now)")
print("=" * 70)
cur.execute("UPDATE tickets SET ia_pausada=false, ia_reset_em=NOW() WHERE id=%s RETURNING ia_pausada, ia_reset_em;", (TICKET_ID,))
print("Update:", cur.fetchone())

print("=" * 70)
print("9) Dispara webhook UAZAPI no app prod (sonarcrm.com.br) simulando msg cliente 'biscoito'")
print("=" * 70)
payload = {
  "EventType": "messages",
  "message": {
    "id": f"WAFAKE{int(time.time())}",
    "sender": f"{CONTATO_NUM}@s.whatsapp.net",
    "fromMe": False,
    "text": "biscoito",
    "messageType": "extendedTextMessage",
    "messageTimestamp": int(time.time()),
    "isGroup": False,
    "chatid": f"{CONTATO_NUM}@s.whatsapp.net"
  }
}
import urllib.request
req = urllib.request.Request(
    f"https://sonarcrm.com.br/api/webhooks/uazapi/{SECRET}",
    data=json.dumps(payload).encode(),
    headers={"Content-Type": "application/json"},
    method="POST",
)
try:
    resp = urllib.request.urlopen(req, timeout=30)
    print("HTTP", resp.status, resp.read().decode())
except Exception as e:
    print("ERR webhook:", e)

print("Aguardando 6s ingest + gatilho rodar...")
time.sleep(6)

print("=" * 70)
print("10) Verifica contato_etiquetas (deve ter Restauracao + Restauracao/Bebe)")
print("=" * 70)
cur.execute("""
SELECT e.nome, e.etiqueta_pai_id IS NOT NULL AS eh_filha
FROM contato_etiquetas ce JOIN etiquetas e ON e.id=ce.etiqueta_id
WHERE ce.contato_id=%s AND e.nome LIKE 'Restauracao%%';
""", (CONTATO_ID,))
rows = cur.fetchall()
print("Aplicadas:")
for r in rows: print(" ", r)

nomes = {r[0] for r in rows}
sucesso = 'Restauracao' in nomes and 'Restauracao/Bebe' in nomes
print()
print(">>> RESULTADO HERANCA PASTA-MAE:", "SUCESSO" if sucesso else "FALHOU")

print("=" * 70)
print("11) Verifica se IA respondeu (msg do atendente apos webhook)")
print("=" * 70)
cur.execute("SELECT id, autor, conteudo, created_at FROM mensagens WHERE ticket_id=%s ORDER BY created_at DESC LIMIT 5;", (TICKET_ID,))
for r in cur.fetchall(): print(" ", r)

cur.execute("SELECT evento, payload, created_at FROM ia_atendimento_log WHERE ticket_id=%s ORDER BY created_at DESC LIMIT 5;", (TICKET_ID,))
print("Logs IA:")
for r in cur.fetchall(): print(" ", r)

cur.close()
conn.close()
