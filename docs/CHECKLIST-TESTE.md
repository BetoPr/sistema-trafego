# ✅ Checklist de teste — Sonar CRM

> Tudo que entrou nesta rodada. Marque conforme testar. Tudo já está **em produção** (deploy automático).
> Login teste: `jj.rroberto2010@gmail.com` · Agência "Teste" (canal Innova & AI Studio).

---

## 1) Follow-up com IA  (`/follow-up`)
- [ ] Buscar com preset **15 dias · Ambos · 120** → traz as conversas paradas.
- [ ] **Analisar com IA** → resume e sugere a 1ª mensagem.
- [ ] **Botão "Parar"** (ao lado de "Analisando X/Y") → para; as que faltam continuam como "a analisar".
- [ ] Se estourar o **limite diário do Groq (429)** → aparece mensagem clara (não o erro técnico) e a análise pausa.
- [ ] Num card que "vale": trocar **tom** + **Regenerar**; **👁️ olho** (espiar histórico); **Etiquetar**.
- [ ] **Cadência DENTRO do card:** marcar **2 ou 3 follow-ups** → a IA **sugere o texto do 2º/3º** (editável) + escolher **tempo de cada**; checkbox **"Dividir a 1ª em 2 envios"**.
- [ ] **Enviar** → chega o 1º; 2º/3º ficam **agendados** (cancelam se o cliente responder).
- [ ] **Descartar** com checkbox "fechar ticket" (encerra) ou sem (some por 12h).
- [ ] As instruções do topo estão **legíveis** (não apagadas) e **sem** a barra "Cadência padrão" antiga.

## 2) Widget flutuante de Follow-up
- [ ] Disparar Analisar e **sair pra Atendimentos** → a análise continua + **bolinha flutuante** com progresso.
- [ ] Arrastar a bolinha (fica onde soltar) · abrir/fechar.

## 3) Abas flutuantes  (dentro de `/atendimentos`)
- [ ] Botão redondo flutuante (canto inf. direito) → abre painel com **4 abas: Mensagens Rápidas · Contatos · Grupos · Envio em Massa**.
- [ ] **Redimensionar** o balão arrastando **bordas laterais / base / cantos de baixo**; mover pela barra de cima.
- [ ] **Mensagens Rápidas**: mensagem ocupa a linha inteira (sem quebrar 1 letra/linha); botão **"Inserir"** joga o texto na conversa aberta.
- [ ] **Contatos**: lista enxuta (avatar + nome + número + total fechado + etiquetas).
- [ ] **Grupos / Envio em Massa**: campos empilham, nada vaza.
- [ ] Mexer numa Mensagem Rápida dentro do balão → **toast "aba alterada"** aparece (e **só** aí, não na página normal).

## 4) Atendimentos — UI
- [ ] **Nova conversa**: botão (ícone **verde**) ao lado do sino → digita número → abre o chat.
- [ ] **Pílula de data** no scroll do chat (Hoje/Ontem/dia) — some ~4s após parar.
- [ ] **Menu 3-pontinhos** do chat só com o que funciona (sem placeholders).
- [ ] Encolher a coluna de conversas → **"Filtros" vira só ícone** (não vaza) e abas viram ícone+contador.
- [ ] **Divisória** conversas↔chat redimensionável (2 cliques resetam).
- [ ] **Fundo do chat** com colagem sutil de ícones (não cinza chapado).
- [ ] **Editar contato = balão** (lápis no painel/contatos) com etiquetas + **log de fechamentos** (TOTAL · SERVIÇOS · FECHAMENTOS · ÚLTIMO).
- [ ] **Espiar**: imagem (lightbox) + áudio tocável + transcrição + documento baixável.

## 5) Contatos  (`/contatos`)
- [ ] Mostra **mais de 500** (limite 5000) com "Carregar mais"; busca varre todos.
- [ ] Editar pelo **balão** (não navega).

## 6) Canais  (`/canais`)
- [ ] Card mostra **número conectado + foto de perfil** (entra em Canais → sincroniza sozinho).
- [ ] Badge de **plataforma** (Android/iOS/Web); aviso de iOS só no card iOS.

## 7) Configurações de API (IA)  (`/configuracoes` → card "Configurações de API (IA)")
- [ ] Tela única com **chaves (Groq/OpenAI/Anthropic) + Transcrição de áudio**. Sumiu o "GroqCloud" duplicado (rota antiga redireciona).
- [ ] **1 chave Groq** faz transcrição (Whisper Large v3) + resumo/análise (Llama 3.3 70B).
- [ ] Dropdown de **modelos sem campos em branco** (lista única ordenada).

## 8) Análise de IAs  (`/analise-ias` — sidebar → Configuração) 🆕
- [ ] Roda uma **análise de follow-up** (ou um resumo/transcrição) e depois abre o hub → o uso **aparece** (pode levar segundos).
- [ ] Dropdown **provedor** (Todos/GroqCloud/OpenAI) + período (Hoje/7d/30d).
- [ ] Cards: tokens, **custo estimado**, chamadas, % sucesso, áudio; barra **"limite diário de chat (Groq)"** (usado hoje / 100k).
- [ ] Tabelas **por sessão**, **por provedor**, **por usuário/atendente**; **médias por cliente e por ticket**; gráfico **por dia**.
- [ ] **Log** + **Exportar CSV** + **Exportar PDF** (abre o PDF pra mandar pro Claude).

---

## ⏳ Ainda falta (próxima rodada)
- **Fase 2 (IA):** várias chaves Groq (3 = 300k/dia) + botão **"usar OpenAI em tudo"** (transcrição opcional p/ OpenAI) + fallback automático entre chaves/provedores.
- **Fase 3 (IA):** limites rígidos (TPM/TPD por chave) + **80 follow-ups/dia** configurável.
- **E — Balão de mídias** (aba Links/Imagens/Docs no contato).
- Confirmar se "Selecione um ticket à esquerda" ainda aparece no rodapé (no deploy novo).
