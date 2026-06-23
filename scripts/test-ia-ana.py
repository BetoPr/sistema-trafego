"""Testa IA Ana respondendo no contato Jose Roberto (agencia aaaa)."""
import psycopg2, json, time, urllib.request

SUPA = "postgresql://postgres.nnswiakwjvoqwcjscbqq:yO1Y1EgU2XHyX7LW@aws-1-sa-east-1.pooler.supabase.com:5432/postgres"
NUM = "558191594716"

conn = psycopg2.connect(SUPA); conn.autocommit = True; cur = conn.cursor()

CONTATO = "2b613bdd-5017-45e0-8114-0eed202fd7b4"  # Jose Roberto agencia aaaa
AGENCIA = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
PERFIL  = "d2a328c4-41de-4e0f-93ad-bc07c685a675"  # Ana

# Tickets do contato
cur.execute("SELECT id, numero, status, ia_pausada, ia_perfil_id, canal_id, fila_id FROM tickets WHERE contato_id=%s ORDER BY created_at DESC LIMIT 3;", (CONTATO,))
tickets = cur.fetchall()
print("Tickets Jose Roberto:")
for t in tickets: print(" ", t)
TICKET = tickets[0][0]
CANAL = tickets[0][5]

# Setup etiquetas para essa agencia tambem (Ana)
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
END $$;
""", (AGENCIA,)*4)

# Limpa etiquetas Restauracao do contato
cur.execute("DELETE FROM contato_etiquetas WHERE contato_id=%s AND etiqueta_id IN (SELECT id FROM etiquetas WHERE agencia_id=%s AND nome LIKE 'Restauracao%%');", (CONTATO, AGENCIA))
print("Removidos:", cur.rowcount)

# Reativa IA + limpa buffer trava
cur.execute("UPDATE tickets SET ia_pausada=false, ia_reset_em=NOW() WHERE id=%s;", (TICKET,))
cur.execute("UPDATE ia_atendimento_buffer SET trava_processando=false, processar_apos=NOW() WHERE ticket_id=%s;", (TICKET,))

# Conta mensagens atendente antes
cur.execute("SELECT COUNT(*) FROM mensagens WHERE ticket_id=%s AND autor='atendente';", (TICKET,))
msgs_antes = cur.fetchone()[0]
print("Msgs atendente antes:", msgs_antes)

# Pega secret
cur.execute("SELECT webhook_secret FROM canais WHERE id=%s;", (CANAL,))
SECRET = cur.fetchone()[0]

# Dispara webhook biscoito
payload = {
  "EventType": "messages",
  "message": {
    "id": f"WAFAKE{int(time.time())}",
    "sender": f"{NUM}@s.whatsapp.net",
    "fromMe": False,
    "text": "biscoito",
    "messageType": "extendedTextMessage",
    "messageTimestamp": int(time.time()),
    "isGroup": False,
    "chatid": f"{NUM}@s.whatsapp.net"
  }
}
req = urllib.request.Request(
    f"https://sonarcrm.com.br/api/webhooks/uazapi/{SECRET}",
    data=json.dumps(payload).encode(),
    headers={"Content-Type": "application/json"},
    method="POST",
)
resp = urllib.request.urlopen(req, timeout=30)
print("Webhook:", resp.status, resp.read().decode())

print("Aguarda 12s pra IA processar (debounce + gateway Groq)...")
time.sleep(12)

# Verifica etiquetas aplicadas
cur.execute("SELECT e.nome, e.etiqueta_pai_id IS NOT NULL FROM contato_etiquetas ce JOIN etiquetas e ON e.id=ce.etiqueta_id WHERE ce.contato_id=%s AND e.nome LIKE 'Restauracao%%';", (CONTATO,))
etqs = cur.fetchall()
print("Etiquetas aplicadas:", etqs)
heranca_ok = any(n=='Restauracao' for n,_ in etqs) and any(n=='Restauracao/Bebe' for n,_ in etqs)

# Verifica msgs atendente depois (IA respondeu?)
cur.execute("SELECT id, autor, conteudo, created_at FROM mensagens WHERE ticket_id=%s ORDER BY created_at DESC LIMIT 4;", (TICKET,))
print("Ultimas msgs:")
for r in cur.fetchall(): print(" ", r)

cur.execute("SELECT COUNT(*) FROM mensagens WHERE ticket_id=%s AND autor='atendente';", (TICKET,))
msgs_depois = cur.fetchone()[0]
print(f"Msgs atendente: antes={msgs_antes} depois={msgs_depois}")
ia_respondeu = msgs_depois > msgs_antes

# Logs IA
cur.execute("SELECT evento, payload->>'motivo' AS motivo, created_at FROM ia_atendimento_log WHERE ticket_id=%s ORDER BY created_at DESC LIMIT 8;", (TICKET,))
print("Logs IA:")
for r in cur.fetchall(): print(" ", r)

# Buffer state
cur.execute("SELECT mensagens_pendentes, trava_processando, processar_apos FROM ia_atendimento_buffer WHERE ticket_id=%s;", (TICKET,))
print("Buffer:", cur.fetchone())

print()
print("=" * 60)
print("HERANCA PASTA-MAE:", "SUCESSO" if heranca_ok else "FALHOU")
print("IA RESPONDEU:    ", "SUCESSO" if ia_respondeu else "FALHOU")
print("=" * 60)

cur.close(); conn.close()
