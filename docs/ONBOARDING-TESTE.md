# Onboarding de teste — valida tudo (2026-06-19)

Roteiro pra testar e validar as features novas + o núcleo do CRM. Marque ✅ conforme passa.
Tudo já está no ar (produção). Faça na ordem — cada bloco leva poucos minutos.

---

## BLOCO 1 — Follow-up com IA (o que você ainda não testou)

1. Menu → **Follow-up com IA**.
2. Período **15 dias** · Status **Ambos** · Quantidade **120** → **Buscar conversas**.
   - ✅ deve trazer ~108 (não mais 28).
3. **Analisar [N] com IA** → começa a rodar (resumo + sugestão, 1 por vez).
4. **Saia pra outra aba** (ex: Atendimentos) enquanto roda.
   - ✅ aparece um **balão flutuante** (canto inferior direito) com o progresso. **Arraste** ele pela barra de cima.
   - ✅ a análise **continua** rodando (não cancela).
   - clique **Abrir Follow-up** no balão pra voltar.
5. Numa conversa que "vale follow-up": troque o **tom** (Direto/Emocional/Na dor/Contextualizado/Simpático) → **Regenerar**.
6. **👁️ olho** num card → balão com o histórico real (✅ imagem aparece, ✅ áudio toca, ✅ transcrição).
7. **🏷️ Etiquetar** → balão com busca; marque uma + a especial **"Em follow-up"** → **Marcar**.
8. **Enviar** num número seu de teste.
   - ✅ chega no WhatsApp.
   - ✅ o contato fica com a etiqueta **"Em follow-up"** (sem duplicar a etiqueta).
9. **Descartar** com a caixa "fechar ticket" marcada → encerra. Em outro, descarte **sem** marcar → some por 12h.

---

## BLOCO 2 — Contatos + balão de edição

1. Menu → **Contatos**.
   - ✅ não tem mais a caixa grande "Primeiro passo".
   - ✅ aparece **Contatos (1074)** e o botão **"Carregar mais"** embaixo (não corta em 500).
2. Clique no **lápis (Editar)** de um contato.
   - ✅ abre **balão** (fundo embaçado), **sem trocar de página**.
   - ✅ dá pra editar **nome + WhatsApp**, marcar/desmarcar **etiquetas** ao vivo.
   - ✅ mostra o **log de fechamentos do cliente**: total de fechamentos, total R$, último, e cada um com **serviço × qtd · data/hora · valor**.
3. Em **Atendimentos**, abra uma conversa → painel direito → **Perfil → Editar**.
   - ✅ abre o **mesmo balão** (não vai mais pra aba Contatos).

---

## BLOCO 3 — Limpezas de UI

1. **Atendimentos**: ✅ sumiram as abas **Privados/Grupos** do topo.
2. **Atendimentos**: arraste a **linha entre a lista de conversas e o chat** → ✅ redimensiona; recarregue → ✅ manteve a largura (2 cliques na linha = volta ao padrão).
3. Painel do contato → aba **Perfil**: ✅ tem **"Log do ticket"** (veio da aba Util).
4. Painel → aba **Util**: ✅ **não** tem mais "Inscrever em sequência ativa".
5. **IA de Atendimento**: ✅ sumiu o banner amarelo "Modo teste ativo…" (o selo **TESTE** no card já indica).

---

## BLOCO 4 — Modo teste da IA (pendentes)

1. Deixe um perfil de IA **ativo em modo teste** (com whitelist) e mande msg de um número **fora** da whitelist.
   - ✅ o ticket chega em **Pendentes** **sem** o ícone de robô / sem "IA ativa" (a IA ignora e não aparece ligada).
2. Mande de um número **dentro** da whitelist → ✅ a IA responde normal.

---

## BLOCO 5 — Aviso "aba alterada"

1. Vá em **Mensagens Rápidas** → crie ou exclua um atalho.
   - ✅ aparece um **balãozinho amarelo** no topo: "Aba Mensagens Rápidas alterada — atualize Atendimentos".
2. Volte pra **Atendimentos** e recarregue → a mudança aparece.

---

## BLOCO 6 — Núcleo do CRM (importante, provavelmente não testado)

- [ ] **IA atendendo sozinha**: número de fora manda msg → IA responde. Teste 2-3 msgs rápidas (junta), "transferir pra humano", comando **LIMPAR**, e **pausar IA** no painel.
- [ ] **IA manda imagem da galeria** (ferramenta antes/depois).
- [ ] **Resumo + Sentimento** no painel (aba Atend.) + **Análise de Comportamento** (uso de tokens/gasto).
- [ ] **Transcrição de áudio** (cliente manda áudio → vira texto no chat e no espiar).
- [ ] **Fechar ticket com valor** → entra no **Dashboard** + no **log de fechamentos** (e some no balão de edição do contato).
- [ ] **Envio em massa** · **Grupos** (listar/enviar).
- [ ] **Cobrança/Asaas** (gerar cobrança no chat).
- [ ] **Meta Ads**: sync de campanhas + **/leads-meta** + card de campanha no chat (clique-no-anúncio) + backfill de mídia.

---

### Como me reportar
Pra cada bloco, me diga **o que passou** e **o que travou** (com print se der). Eu verifico no backend (banco/logs) em tempo real e conserto na hora.
