# STATUS DA SESSÃO — Sonar CRM (sistema-trafego)

> Handoff pra retomar depois do `/compact`. Atualizado: **19/06/2026 ~19h BR**.
> Tudo abaixo já está **deployado em produção** (auto-push → Vercel), salvo o que estiver em ⏳ PENDENTE.

---

## ✅ FEITO (esta sessão)

### Filtros de Atendimentos — `aeb12b4`
- Badge fantasma "1 filtro" no load corrigido (default `[aberto, pendente]`).
- "Mostrar todos" agora limpa TODOS os recortes (status + conexão/fila/usuário/etiqueta/período).

### Follow-up com IA — reformulado (`65a1240`, `ff47a7a`, `277e04f`, `35d6910`, `f60aa0e`)
- **Só "Follow-up com IA"** (abas Sequências/Fila removidas; cron manual desligado, reversível; NÃO mexe no follow-up automático da IA de atendimento).
- Busca por **preset**: Hoje · 7 dias · 15 dias · Período (X→Y). Acabou o teto de 30d (trazia ~28; agora ~108). Quantidade até 500. Status Abertos/Pendentes/Ambos. Filtro por **etiqueta** e **conexão**.
- **Limite de análises/min** interno (teto TPM Groq) — não exposto na UI.
- Card: **👁️ olho** (espia histórico), **🔗 abrir no atendimento**, **contador de follow-ups enviados** (IA é avisada, não repete, fecha com pergunta).
- **Regenerar com tom**: Direto · Emocional · Na dor · Contextualizado · Simpático.
- **Etiquetar** (balão busca + multi + "Marcar") — cria "Em follow-up"/"Follow-up feito" se faltarem (find-or-create, não duplica). Enviar auto-marca "Em follow-up".
- **Descartar**: checkbox "fechar ticket" → encerra; sem marcar → cooldown 12h (`tickets.follow_up_ia_snooze_ate`).
- **Widget flutuante GLOBAL**: o motor da análise subiu pro layout (`_crm-overlays.tsx`). Roda em qualquer aba sem cancelar. Botão launcher liga/desliga, **portal no body** (não rola junto com a página), **drag livre** com margem (sem snap), colapsa sem saltar.
- **Cadência** (`f60aa0e`): por card ou "Cadência padrão → Aplicar a todos": **1/2/3 follow-ups** com tempos (2º após Xh, 3º após Yd) — 2º/3º gerados pela IA e agendados via `follow_up_avulsos` (cancela se cliente responder). **Dividir em 2 mensagens** (checkbox).

### Contatos — `5e90caa`, `f5f96e9`, `e1db8e3`, `f60aa0e`
- Limite **500 → 5000** + paginação no client (blocos de 300, "Carregar mais"; busca varre todos). Tinha 1074, mostrava 500.
- Banner grande "Primeiro passo" removido. Avisos de import (etiqueta pode não subir / iOS) junto do botão.
- **Editar contato = BALÃO** (fundo embaçado, não navega): nome + WhatsApp + etiquetas ao vivo + **log de fechamentos** (TOTAL · SERVIÇOS(QTD) · FECHAMENTOS · ÚLTIMO no quadrado verde, + lista com serviço/qtd/data/valor). Vale no painel E na tabela de contatos.

### Canais — `d987162`
- **Detector de plataforma** (iOS/Android/Web) via campo `plataform` do UAZAPI (`smba`=Android Business, `smbi`=iOS Business). Badge no card; **aviso de notificação só no card iOS** (Android/Web nada). Coluna `canais.wa_plataforma`.

### Espiar — `7d323c6`, `35d6910`
- Imagem (lightbox) + **áudio tocável** + transcrição + **documentos baixáveis** + "Carregando" animado. Nos 3 espiar (follow-up, lista, pendentes). Componente `_espiar-msg.tsx` (`BolhaEspiada`, `DocBaixar`).
- Docs baixáveis também no **chat** aberto.

### Atendimentos UI — `61a2a92`, `ce18416`, `35d6910`
- Abas **Privados/Grupos removidas**.
- **Divisória conversas↔chat redimensionável** (arrasta, salva no localStorage, 2-cliques reseta).
- Abas Abertos/Pendentes/Fechados viram **ícone+contador** quando a coluna fica < 300px.

### IA de Atendimento + Painel — `61a2a92`, `dbb4f25`
- **Modo teste não marca IA** em pendentes fora da whitelist (não acende toggle/ícone do robô). Fix no `executor.adicionarAoBuffer`.
- Banner "Modo teste ativo" removido (selo TESTE já indica).
- Painel: "Inscrever em sequência ativa" removido; "Log do ticket" movido pra aba **Perfil**.

### #7 Aviso "aba alterada" — `ff47a7a`
- Toast amarelo global quando Mensagens Rápidas é alterada (`crm:aba-alterada` + `AvisaAlteracao`). Portal no body.

### Auditoria/segurança (sessão anterior)
- 6 críticos + 10 altos + médios CORRIGIDOS. Relatório `docs/AUDITORIA-CRM.md`.

---

## ⏳ PENDENTE (backlog, ordem sugerida)

| # | Item | Tamanho | Detalhe |
|---|------|---------|---------|
| **A** | Ícone **"Nova conversa"** ao lado do sino | médio | digita número → inicia conversa avulsa |
| **B** | **Balãozinho de data no scroll** do chat | médio | Hoje/Ontem/dia-da-semana; some 4s após parar; animação aparecer/sumir (estilo WhatsApp) |
| **C** | Limpar **menu 3-pontinhos** do chat | pequeno | deixar só o que é usado no CRM |
| **D** | **Floating tabs ON/OFF** | grande | abrir aba (ex: Mensagens Rápidas) como balão flutuante via botão ON/OFF; aviso "aba alterada" SÓ aparece quando essa aba está aberta como balão; launcher mobile nos 4 cantos |
| **E** | Aba **"Links/Imagens/Docs"** no contato + **balão de mídias** | MUITO grande | balão com Links/Imagens/Docs lado a lado (enviados+recebidos), fundo embaçado. Por item: Baixar, Encaminhar, **Ir para conversa** (no ponto exato), Responder, Favoritar, Fixar, Reagir. **Zoom de imagem com scroll** (frente=aproxima, trás=afasta). "Mídias de todas as conversas" agrupado por dias (Ontem / Semana passada) + botões Pesquisar/Ordenar/Selecionar/Fechar; Selecionar → Favoritar/Download/Encaminhar. **Não é igual WhatsApp, é um balão.** Animação entrando pela esquerda. |
| — | **#7 schema pull** (migrations) | só Roberto | `supabase db pull` — guia em `docs/GUIA-SCHEMA-PULL.md` (precisa CLI + senha do banco) |
| — | Checar **mensagem duplicada** via Claude Chrome | opcional | precisa a extensão do Chrome conectada |

Sugestão: **A + B + C** juntos (rápidos, valor visível) → depois **D** → **E** por último.

---

## 🧭 CONTEXTO TÉCNICO (onde mexer)

- **Provider global** (motor follow-up + widget + avisos): `app/(dashboard)/_crm-overlays.tsx` — exporta `Cand`, `CADENCIA_PADRAO`, `useFollowUpRun`, `avisarAbaAlterada`, `CrmOverlays`. Montado em `app/(dashboard)/layout.tsx`.
- **Follow-up UI**: `app/(dashboard)/follow-up/_client.tsx` (consome o provider; filtros locais) + `page.tsx`.
- **Follow-up API**: `app/api/follow-up/ia/{verificar,regenerar,enviar,descartar}/route.ts`. `enviar` aceita `dividir`. `regenerar` aceita `tom`. Lib: `lib/crm/ia.ts` (`sugerirFollowUpTicket` com `tom`).
- **Cadência extras** agendados via `app/api/contatos/[id]/follow-up-avulso` (tabela `follow_up_avulsos`, worker `lib/crm/follow-up.ts`... wait: avulso tem worker próprio).
- **Espiar**: `app/(dashboard)/atendimentos/_espiar-msg.tsx` (`BolhaEspiada`, `DocBaixar`). Mídia: `_media.tsx` (`MediaPreview`, resolve `/api/media?path=`), `_audio.tsx` (`AudioPlayer`).
- **Editar contato balão**: `_editar-contato-balao.tsx` + `app/api/contatos/[id]/ficha/route.ts`.
- **Painel direito**: `_painel.tsx`. **Shell/resize**: `_shell.tsx`. **Lista/abas/espiar**: `_lista.tsx`. **Chat**: `_chat.tsx` (aqui entra B, C, e onde checar duplicata).
- **Aviso "aba alterada"**: `app/(dashboard)/_avisa-alteracao.tsx` (dispara `avisarAbaAlterada`).
- **Plataforma do canal**: `lib/uazapi/client.ts` (`classificarPlataforma`) + `app/(dashboard)/canais/_actions.ts` (`sincronizarPlataformaCanais`).
- **Migrations novas**: `tickets.follow_up_ia_snooze_ate`, `canais.wa_plataforma` (em `supabase/migrations/`).

---

## ⚠️ REGRAS DO PROJETO (não esquecer)
- **Build antes de cada commit** (`npm run build` na pasta do projeto). Commit dispara **auto-push → Vercel** (hook). NÃO desativar o hook.
- **CHANGELOG.md**: prepender entrada **datada (dia+hora BR)** a cada commit (mais recente no topo).
- **Next 16**: `proxy.ts` (não middleware); `cookies()/headers()/params` são **async**; Recharts só client.
- **Supabase**: `getUser()/getClaims()` pra auth (nunca `getSession()`); `service_role` nunca no browser; multi-tenant por `agencia_id`.
- **Cripto** tokens: `lib/crypto/tokens.ts` (AES-256-GCM), nunca pgcrypto.
- **Modais** = componente `Balao` (`components/ui/Balao.tsx`) — já portaleia no body.
- **Errors em PT-BR**. Login Roberto: jj.rroberto2010@gmail.com / SonarRR2026!Trade. Agência de teste = "Teste" (canal Innova & AI Studio).
- NUNCA: imprimir conteúdo de chaves; commitar `.env.local`; sugerir sincronizar pasta de credenciais com nuvem.

---

## ✅ COMO TESTAR (rápido)
1. **Follow-up com IA**: `/follow-up` → 15 dias · Ambos · 120 → Buscar (~108) → Analisar → num que "vale": tom + Regenerar, olho 👁️, Etiquetar, **Cadência (2 follow-ups, 2º após 1h)** → Enviar → chega 1º + agenda 2º.
2. **Widget**: dispara Analisar, sai pra Atendimentos → bolinha flutuante; arrasta (fica onde soltar); abre/fecha.
3. **Editar contato**: Contatos (ou painel) → lápis → balão com etiquetas + log de fechamentos.
4. **Canais**: badge 🤖 Android (Innova/Restauração); sem aviso iOS.
5. Onboarding completo em `docs/ONBOARDING-TESTE.md`.
