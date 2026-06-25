export const IA_ATENDIMENTO = `# IA Atendimento — bot do WhatsApp

Rota: /ia-atendimento

## Como começar a rodar IA no meu WhatsApp
1. Conectar WhatsApp em /canais (QR code).
2. /ia-atendimento → **+ Novo perfil**.
3. Escolhe template (Vendedor / Suporte / Tráfego pago/Biscoito) OU em branco.
4. Preenche: Nome, ✅ Ativo, Descrição, **Chave API** (Groq/OpenAI/Anthropic), **Testar chave**, **Modelo**.
5. Aba **Comportamento** → escolhe Prompt Único OU Modular.
6. Aba **Configurações** → debounce, max msg, max tokens, whitelist.
7. **Canais conectados** → quais WhatsApp essa IA atende (vazio = todos).
8. **Salvar**.

Teste antes em aba **Chat de Teste** (não custo zero — usa contexto fake mas gasta tokens reais).

## Lista de perfis
Botões por card: toggle ativo, ✏️ editar, 📋 duplicar (sem chave + inativo), 🗑️ deletar (apaga perfil + ferramentas + logs + cápsulas + sequências — irreversível).

## Templates pré-feitos (globais, não editáveis)
- **Vendedor** — foco conversão, fechamento
- **Suporte** — paciente, técnico, escala humano fácil
- **Tráfego pago / Biscoito** — entrega lead magnet automático

## Chave API
- Sistema valida prefixo: sk-* (OpenAI), gsk_* (Groq), sk-ant-* (Anthropic).
- Botão 👁️ ver/ocultar. Botão 🔄 Trocar.
- **Testar chave** faz chamada dummy → retorna tokens + latência ou erro.

Onde criar chave:
- Groq (recomendado começar — rápido + grátis): https://console.groq.com
- OpenAI: https://platform.openai.com
- Anthropic Claude: https://console.anthropic.com

## Modelo
Cada modelo tem: ⭐ custo, ⚡ velocidade, contexto (tokens), **suporta_ferramentas**, "melhor pra"/"evitar".

**Importante:** modelos sem "suporta_ferramentas" não chamam tools (aplicar etiqueta, transferir humano, galeria, biscoito).

Recomendações:
- Começar barato: Groq Llama 3.3 70B
- Qualidade média: GPT-4o mini ou Claude Haiku 4.5
- Top: Claude Sonnet 4.6 ou Opus 4.8

## Único vs Modular
- **Único** — 1 prompt gigante com tudo. Simples, gasta muito token.
- **Modular** — divide em IDENTIDADE + OBJETIVO + REGRAS GLOBAIS + cápsulas (FAQ, Produtos, etc.). IA injeta só cápsula que bater por keyword. **Economiza ~85% tokens.**

Toggle "Ativar modo modular" em aba Comportamento. Salva sozinho (autoSalvar).

## Cápsulas
7 templates: FAQ, Produtos, Horários, Políticas, Endereços, Promoções, Pagamento.

Cada cápsula tem:
- Nome + conteúdo
- **Keywords** (palavras que disparam — match local, custo zero)
- Toggle ativa/inativa
- 🗑️ deletar

Se nenhuma bater: IA recebe só Identidade+Objetivo+Regras + fallback (lista resumida das cápsulas).

## Placeholders dinâmicos (botão {...} acima textarea)
- {nome_cliente}, {hora_atual}, {data_hoje}, {saudacao}, {nome_agencia}

## Configurações IA
- **Debounce** (s) — espera última msg cliente. Sem debounce = responde cada mensagem isolada. Recomendado 5-15s.
- **Delay min/max resposta** — simula digitação humana. Recomendado min=2, max=10.
- **Max mensagens** — quebra em vários balões. Recomendado 2-3.
- **Separador blocos** — quebra-linha / traço / linha-em-branco.
- **Bullets** ☑️ — permite IA usar listas com • / -.
- **Max tokens** — limite resposta. Recomendado 300-500.
- **Temperatura** 0-2 — 0.5-0.7 recomendado. <0.3 robótico, >1.5 alucina.
- **Pausa se humano responder** ☑️ — sempre ON.
- **Timezone** — padrão America/Sao_Paulo. Afeta {hora_atual}, {saudacao}, tool consultar_data.

## Whitelist produção
Textarea "Números autorizados" — só responde os listados. Vazio = todos.

Formato: 5581999999999 / (81) 99999-9999 / +55 81 9 9999-9999 (sistema normaliza).

Quando usar:
- Testar IA em produção sem afetar clientes reais
- Lançamento controlado

IA não responde? Cheque: DDD+9 inicial, salvou config, canal conectado, perfil ativo, canal selecionado nas Conexões.

## Ferramentas (tools)
Aba **Ferramentas** → **+ Adicionar ferramenta**. Form: Nome, Descrição (IA lê pra decidir quando chamar), Ação (dropdown), Parâmetros JSON.

Ações:
- **Aplicar etiqueta** — IA aplica tag no contato
- **Transferir pra fila**
- **Transferir pra humano** — pausa IA + muda fila pra Atendimento Humano + (opcional) dispara Resumo pra grupo
- **Marcar qualificado**
- **Criar nota**
- **Consultar data** — IA pega hora/dia/saudação atuais via timezone configurado
- **Enviar imagem galeria** — IA escolhe imagem do catálogo (tags + descrição) e manda no chat

Template Biscoito tráfego pago já vem com tool "Manda Biscoito".

Toggle 🟢/⚫ liga/desliga. ✏️ edita. 🗑️ deleta.

## Follow-up sequências (automático)
Aba **Follow-up** → **+ Nova sequência**. Define: Nome, Etiqueta em progresso, Etiqueta encerrado, Janela envio (HH:MM-HH:MM), Finalizar ticket ao terminar.

Etapas (até 6 por sequência): Delay antes (seg), Tipo (texto/imagem/vídeo/áudio/doc), Conteúdo. Drag-drop reordena.

Limites: 5 sequências/perfil × 6 etapas.

Quando começa: ao IA mandar primeira resposta num ticket.
Quando cancela: cliente respondeu → cancelado_por_resposta + remove etiqueta "Em follow-up".

## Resumo pra grupo (ao transferir humano)
Aba Ferramentas → seção **Envio de resumo** → **Configurar resumo**. Balão: ☑️ Ativo, Modelo (Groq llama-3.3-70b padrão), Destino (Grupo JID OU telefone), Canal, Prompt customizável, Disparar em (transferir_humano / manual).

Botão **Testar** gera amostra. **Salvar**.

JID grupo: pega em /grupos.

Resumo não usa chave principal do perfil — usa Groq separado (não conta consumo).

## Etiquetas automáticas que IA aplica
Aba **Etiquetas** → escolhe etiqueta + textarea "Descrição de uso" (explica pra IA quando aplicar). IA chama tool aplicar_etiqueta com base nisso.

IA pode criar etiqueta nova que não existe (cinza padrão).

## Chat de Teste
Aba **Chat de Teste** dentro do edit perfil. Mostra:
- Tokens IN/OUT consumidos
- Cápsulas usadas (modular)
- Tool calls (cards roxos com nome + args JSON) — **mostra mas não executa de verdade** (não aplica etiqueta no DB, não transfere)
- Erros

Histórico localStorage. Comando **LIMPAR** zera tudo.

Consome tokens reais. Pra testar grátis: usa modelo Groq.

## Uso de Tokens (aba Análise)
- Card KPI: respostas, tokens IN/OUT, custo total USD
- Filtro intervalo: 24h/7d/30d/total
- Mini-gráfico 7 dias
- Uso por ticket (top 20 mais caros)
- Logs (últimas 50 ações: resposta/tool_call/erro/pausa_humano)

Custo USD (cobrado pelo provider). Multi-chave + limite/dia configura em /configuracoes/ia.

## FAQ comum
- IA pausou e não retoma sozinha: liga manual em /atendimentos > ticket > painel > Atend. > toggle IA.
- IA respondendo robótica: aumenta delay min/max, debounce, max_msgs=1.
- IA alucinando: reduz temperatura (<0.3), usa modo modular, adiciona FAQ explícito.
- Cliente xinga IA: adiciona regra "se hostil, chama transferir_para_humano com motivo".
- IA esquece contexto: modelo com contexto maior (Claude 200k, GPT-4o 128k).
`;
