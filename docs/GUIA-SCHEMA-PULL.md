# #7 — Trazer o schema real do banco pras migrations

**Problema:** a maioria das tabelas foi criada direto no Supabase (cloud) ao longo do projeto, então `supabase/migrations/` está incompleto. Um ambiente novo (clone) **não reproduz** o banco. Não afeta a produção rodando — só reprodutibilidade/backup do schema.

**Por que eu (Claude) não fiz sozinho:** precisa do **Supabase CLI autenticado + a senha do banco**, que eu não tenho. São 5 comandos seu, ~3 min.

## Passo a passo (rode no terminal, na pasta do projeto)

```bash
# 1. Instala o CLI (uma vez)
npm i -g supabase   # ou: scoop install supabase / brew install supabase

# 2. Login (abre o navegador)
supabase login

# 3. Linka este projeto ao cloud (ref do projeto "Sistema Trafego")
supabase link --project-ref nnswiakwjvoqwcjscbqq
# vai pedir a SENHA DO BANCO → pega em: Supabase → Project Settings →
# Database → Connection string / Database password (Reset se não souber)

# 4. Puxa o schema atual do cloud pra uma migration nova
supabase db pull
# gera supabase/migrations/<timestamp>_remote_schema.sql com TUDO

# 5. Commita
git add supabase/migrations && git commit -m "chore(db): schema real via db pull (#7 auditoria)"
```

## Verificar
- Conferir que o arquivo gerado tem as tabelas que faltavam: `follow_up_*`, `ia_atendimento_*`, `meta_leads`, colunas novas de `tickets`/`etiquetas`/`agencias`.
- (Opcional) testar reprodução: `supabase start` (local) + `supabase db reset` aplica todas as migrations do zero.

## Cuidado
- O `db pull` **só lê** o schema (não muda nada no cloud).
- Não commitar a senha do banco em lugar nenhum.
- As funções/índices que apliquei via migration (`dedup_contatos_agencia`, `uq_mensagens_agencia_wamsg`, `uq_contatos_agencia_waid`) já estão como arquivos em `supabase/migrations/` — o `db pull` pode duplicar; se duplicar, apague os arquivos antigos e fique com o do pull.
