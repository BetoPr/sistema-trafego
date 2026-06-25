export const CONFIG_ETIQUETAS = `# Etiquetas — Pasta + Etiqueta + Automática

Rota: /configuracoes/etiquetas

## Pasta vs Etiqueta
- **Pasta** (etiqueta-mãe) — agrupa similares. Ex: "Tráfego Pago"
- **Etiqueta** (filha) — dentro da pasta. Ex: "Camp Verão", "Camp Inverno"

Hierarquia visual:
- Tráfego Pago (pasta)
  - Camp Verão 2026
  - Camp Inverno 2026
- Suporte (pasta)
  - Cliente irritado
  - Bug reportado

Pasta = etiqueta-mãe sem ser filha de ninguém. Não tem tipo "pasta" no banco — é etiqueta normal que outras apontam pra ela.

## Criar etiqueta
Topo: **NOVA ETIQUETA** form:
- **Nome** (input texto)
- **Pai** (dropdown — escolhe pasta ou deixa raiz)
- **Cor** — paleta 6 swatches + color picker custom

**Criar**.

## Editar (palavras-chave gatilho + mensagem auto)
Linha → ✏️ Editar (Balão).

### Palavras-chave gatilho (automática)
Seção **Palavras-chave gatilho**:
- Input por palavra/regex (ex: desconto, reclamação, cancelar)
- **+ Adicionar mais** linha nova
- **Remover** por linha

Cliente manda msg com qualquer palavra/regex → etiqueta aplicada **automaticamente** no contato.

Aceita regex simples. Ex: \`(desc|promo)\` casa "desconto" ou "promoção".

### Mensagem automática (textarea)
Quando etiqueta aplicada (manual ou auto), IA pode usar essa msg como resposta padrão.

Hoje serve mais como **referência interna** — IA só dispara auto em fluxos configurados em ferramentas (/ia-atendimento).

### Cor + Ativo
- **Cor** color picker + hex manual
- ☑️ **Ativo** — desativada some da UI mas tickets antigos preservam

## Mover pra outra pasta
Linha → dropdown **Pasta** → escolhe destino.

## Deletar
🗑️ → confirma.
`;
