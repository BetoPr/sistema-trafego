export const FILAS = `# Filas — organização de tickets

Rota: /filas

**Apenas admin acessa.**

Categorias pra organizar tickets em Atendimentos. Ex: "Vendas", "Suporte", "Cobrança". Ticket pode ser transferido entre filas.

## Criar fila
Form lateral:
- **Nome** (ex: "Vendas")
- **Cor** (color picker — padrão roxo #9B7DBF)
- **Descrição** (opcional)

**Criar**.

## Filas FIXAS (cadeado 🔒)
Filas do sistema — **não dá pra deletar/renomear**:
- **🤖 IA Atendendo** — tickets onde IA tá respondendo sozinha
- **👤 Atendimento Humano** — tickets onde alguém da equipe assumiu

Pode editar **cor e descrição** delas. Não dá pra editar nome nem deletar.

## Editar
Linha → ✏️ Editar. Cor + Ativa (toggle) editáveis em todas (mesmo fixas).

## Deletar
Linha → 🗑️ Deletar (não aparece em fixas). Tickets na fila deletada voltam pra **Atendimento Humano** (fila padrão fixa).

## Como ticket muda de fila
- IA respondendo → "IA Atendendo"
- Humano manda msg → "Atendimento Humano" (auto)
- Transferir manual: /atendimentos > chat > Transferir > Pra fila
- IA chama tool "transferir_para_humano" → muda automático
`;
