export const CONFIG_IA = `# Configurações de API (IA) — Multi-chave Groq/OpenAI/Anthropic + Prompts

Rota: /configuracoes/ia + /configuracoes/ia-prompts

## API IA Multi-chave
Cards por provider: **Groq / OpenAI / Anthropic**.

### Por que ter várias chaves
**Rotação + fallback.** Se 1 chave atingir limite diário, sistema usa próxima da fila. Aumenta capacidade total + reduz risco de IA parar.

Útil pra Groq: limite gratuito por chave generoso, várias chaves multiplicam.

### Adicionar chave
Card do provider → **+ Adicionar chave** (expande form):
- **Apelido** (opcional — ex: "Groq pessoal", "OpenAI agência")
- **Chave** (campo password)

**Adicionar chave**.

### Ações por chave
- **Testar** — chamada dummy ao provider, OK ou erro
- **Revelar** (toggle) — mostra chave em texto claro
- **Editar** inline — muda apelido / chave nova (vazio = mantém)
- 🗑️ **Deletar** — sistema usa próxima da fila automático

### Limite diário follow-ups por chave
Campo **Máx. follow-ups/dia** → digita número → **Salvar**.
- 0 = ilimitado
- 100 = para de usar depois de 100 follow-ups/dia

Não conta atendimentos normais — só follow-ups automáticos.

### Provider padrão (chat vs transcrição)
Provider Card topo da página:
- **Provider chat** — padrão IA conversar (Groq / OpenAI / Anthropic)
- **Provider transcrição** — padrão pra áudio (geralmente OpenAI Whisper)

## Prompts IA — /configuracoes/ia-prompts
3 prompts internos customizáveis:
- **Sentimento** — analisa humor do cliente (Atendimentos > painel direito > Atend. > Analisar sentimento)
- **Resumo** — gera resumo de conversa (Resumo pra grupo em /ia-atendimento)
- **Sugestão** — IA Assist pra atendente (Atendimentos > input > IA Assist)

Cada prompt:
- **Escopo** — agência (só sua) ou global (super_admin)
- **Modelo Groq** — padrão llama-3.3-70b
- **Conteúdo** — textarea editável

**Salvar** persiste override agência.
**Voltar ao default** remove override, usa global.
`;
