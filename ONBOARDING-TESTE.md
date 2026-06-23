# Onboarding de Teste — Sonar CRM

Guia passo a passo pra testar tudo que entregamos nas últimas ondas. Cada bloco é independente. Se algo falhar, copia o erro do console (F12) ou da página que cair em erro 500 e me manda.

URL base: **https://sonarcrm.com.br**

---

## 1) Brand novo no ar

Onde: qualquer página.

- [ ] Sidebar mostra logo **hexágono + S verde** (sem o radar antigo)
- [ ] Favicon na aba do navegador também é o hexágono
- [ ] PWA "Adicionar à tela inicial" usa o mesmo ícone

---

## 2) Sidebar reorganizada

- [ ] Em **Tráfego (Ads)**: aparecem **Pixel & Campanhas**, **Relatórios**, **Alertas**
- [ ] Em **Administração**: aparece **Clientes** (pra editar Teste01)
- [ ] Cor de destaque dos itens ativos: verde `#00E19A` (sem roxo)

---

## 3) Alertas Inteligentes (Meta Ads → WhatsApp)

URL: `/alertas`

### Criar primeiro alerta

1. Clica **+ Novo**
2. Preenche:
   - Nome: `Teste gasto dia`
   - Tipo: **Gasto do dia**
   - Limite: `1,00` (vai bater fácil pra ver disparar)
   - Conta Meta Ads: escolhe a sua
   - WhatsApp destino: seu número (`5527XXXXXXXXX`)
   - Canal de envio: deixa **padrão**
3. Confere **Preview do WhatsApp** ao vivo embaixo — deve mostrar bolha verde estilo zap real
4. Clica botão **emoji** ao lado do label "Mensagem" — adiciona algum
5. **Criar alerta**

### Testar disparo

1. No card do alerta criado, clica **Testar agora**
2. Espera ~5s, recebe no WhatsApp:
   ```
   Olá! 🚨 O gasto diário da conta XXX bateu R$ Y (limite R$ 1,00). Considere ajustar o orçamento.
   ```

- [ ] Mensagem chegou
- [ ] Coluna "último disparo" preencheu
- [ ] Anti-spam: clicar Testar de novo NÃO dispara (24h trava)

---

## 4) Análise de IAs (bug 500 corrigido)

URL: `/analise-ias`

- [ ] Página abre sem "Server Components render" error
- [ ] KPIs aparecem: Tokens, Custo (em USD), Chamadas, Sucesso, etc.
- [ ] Gráfico "Tokens por dia" renderiza
- [ ] Botão **Copiar prompt** abre menu **ChatGPT / Claude**
  - [ ] Clicar ChatGPT → copia prompt + abre `chatgpt.com` em nova aba
  - [ ] Clicar Claude → copia prompt + abre `claude.ai` em nova aba

---

## 5) Pixel & Campanhas

URL: `/pixel-vendas`

### Toggle master

1. Rolagem até **Eventos automáticos pro Meta**
2. Toggle **Pixel ativado** liga/desliga
   - [ ] Quando off: Lead/ICP/Venda ficam **dim** + desabilitados

### Lead / ICP / Venda

- [ ] Caixa **Lead** vem ligada por padrão (1ª msg com click-id)
- [ ] **ICP** vem desligado — ligar mostra campo de palavras-chave
- [ ] **Venda** mostra linha informativa (auto via Fechamento, sempre on)

### Sem seções removidas

- [ ] **Desempenho por campanha**: NÃO existe mais (Dashboard cobre)
- [ ] **Alarmes**: NÃO aparecem (aba Alertas assume)

---

## 6) Etiquetas Hierárquicas (Linha → Variante)

URL: `/configuracoes/etiquetas`

### Criar Linha

1. No form NOVA ETIQUETA:
   - Nome: `Restauração`
   - Pai: deixa **Linha (sem mãe)**
   - Cor: verde
   - **Criar**

### Criar Variantes

1. Nome: `Restauração/Bebê`, Pai: **Restauração** → Criar
2. Nome: `Restauração/Mofo`, Pai: **Restauração** → Criar
3. Nome: `Restauração/Casal`, Pai: **Restauração** → Criar

- [ ] Lista mostra `Restauração` (com ícone 📁) e suas 3 variantes indentadas
- [ ] Cada linha tem dropdown pra trocar de pai
- [ ] Tentar fazer Restauração virar filha de Bebê → bloqueia ("já é Linha com filhas")

---

## 7) Etiqueta ↔ Campanha / Conjunto (em Pixel & Campanhas)

URL: `/pixel-vendas` → rola até **Etiquetas por campanha / conjunto**

### Vincular variante a campanha

1. Encontra uma campanha Meta na lista (ex.: "Camp Bebê 2026")
2. Clica botão **+ Vincular etiqueta** na linha da campanha
3. Marca `Restauração/Bebê`
4. **Salvar**

- [ ] Botão muda pra mostrar a etiqueta com cor (badge verde)

### Vincular Conjunto

1. Expande campanha (chevron) → mostra conjuntos
2. Vincula `Restauração/Bebê` no conjunto específico também (opcional)

### Criar nova etiqueta inline

1. Em outra campanha, clica **+ Vincular etiqueta**
2. No rodapé do dropdown, clica **+ Criar nova etiqueta**
3. Nome: `Outra/Teste`, pai: escolhe uma Linha existente → **Criar**
4. Etiqueta criada já fica marcada e vai aparecer salva quando clicar Salvar

### Criar Linha do topo

1. No topo da seção "Etiquetas por campanha / conjunto", clica **+ Nova Linha**
2. Preenche nome + cor → Criar
3. Linha aparece na fileira de chips coloridas no topo

---

## 8) Auto-etiquetagem por campanha (teste real)

Cenário: você já vinculou `Restauração/Bebê` a uma campanha Meta. Espera um lead chegar pelo anúncio dessa campanha (CTWA).

- [ ] Quando chega 1ª mensagem do lead, contato recebe automaticamente `Restauração/Bebê` E `Restauração` (herança da mãe)
- [ ] Se a campanha tiver vínculo no conjunto também, etiqueta do conjunto também aplica

Se quiser testar sem esperar lead real: vou criar uma rota de simulação se você pedir.

---

## 9) Idade do contato

URL: `/atendimentos` → abre uma conversa → ícone **Editar contato** (lápis no header)

### Manual

1. Campo **Idade** ao lado de WhatsApp
2. Digita `35` → **Salvar**
3. Reabre → idade persiste

### Auto (Meta Lead Form)

Só funciona se você adicionar pergunta **idade** no formulário do Meta. Aí o webhook leadgen:
1. Parser extrai `age`/`idade` do field_data
2. Salva em `meta_leads.campos_jsonb._idade`
3. Quando concilia com contato WhatsApp, copia pra `contatos.idade`

---

## 10) Foto de perfil (bug corrigido)

URL: `/atendimentos` → encontra Princess (ou qualquer contato cuja foto sumiu)

### Atualizar manual

1. Abre **Editar contato**
2. Clica **🔄 Atualizar foto de perfil**
3. Espera ~3s
4. Fecha balão → avatar dela aparece

### O que mudou tecnicamente

- Antes: foto vinha em URL temporária `pps.whatsapp.net` (expira ~6h)
- Agora: ao atualizar, baixa e salva no bucket `crm-media`. Avatar resolve via `/api/media` (signed URL renovável)
- Avatar component agora detecta path bucket e busca via fetch

---

## 11) Imagem do WhatsApp do cliente (ImgBB rate-limit corrigido)

Antes: imagens dos clientes paravam de baixar (`imgbb_400: Rate limit reached`).

Agora vão direto pro bucket Supabase.

- [ ] Cliente envia imagem → aparece no chat normalmente
- [ ] Se aquela imagem antiga falhou, clica **Tentar agora** no card "Imagem (X tentativas)"

---

## 12) Abas Flutuantes (verde)

URL: qualquer página dentro do dashboard

1. Olha botão circular no canto inferior (launcher das abas flutuantes)
2. Cor: **verde** (não roxo)
3. Clica → abre painel com 4 abas: Mensagens Rápidas / Contatos / Grupos / Envio em Massa
4. Header do painel: **verde** (não roxo)
5. Aba ativa: **verde**

---

## 13) Spinner análise IA (verde)

URL: `/atendimentos` → abrir uma conversa que a IA esteja analisando

- [ ] Ícone ✨ no canto pisca **verde** (não roxo)
- [ ] Barra de progresso da análise: **verde**

---

## 14) Relatórios

URL: `/relatorios`

- [ ] Cria relatório de teste → Hora qualquer → Formato PDF
- [ ] Clica **Enviar agora** → recebe PDF no WhatsApp
- [ ] Mobile: layout cards 1 coluna

---

## O que NÃO testar ainda (próxima onda)

- **R6** Dashboard de Campanhas com imagens criativos + filtros cross-aba — virá depois
- **Sistema IA Orquestradora + Secretários** — sessão dedicada
- **Templates de mensagens WhatsApp** pré-prontos — sessão dedicada
- **Histórico de tickets antigos** no chat — sessão dedicada
- **Migração Supabase → VPS** — quando terminarmos todas demandas

---

## Reportar problema

Pra cada bug, manda:
1. URL onde aconteceu
2. Print da tela (ou descrição do que aparece)
3. Console do browser (F12 → aba Console) se tiver erro vermelho
4. Email do usuário logado (pra rastrear)
