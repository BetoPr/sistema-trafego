export const EQUIPES = `# Equipes — agrupamento de Usuários

Rota: /equipes

**Apenas admin acessa.**

Agrupamento lógico de Usuários CRM. Ex: "Equipe Vendas", "Equipe Suporte". Útil pra atribuir tickets ou organizar permissões.

## Criar
Form lateral:
- **Nome** (ex: "Equipe Suporte")
- **Descrição** (opcional)

**Criar**.

## Atribuir usuários
Em /usuarios → edita usuário → seção **Equipes** → marca checkboxes.

Um usuário pode estar em **várias equipes**.

## Editar
Linha → ✏️ Editar. Muda nome/descrição.

## Deletar
Linha → 🗑️. Usuários ficam sem equipe (não são deletados).

## Pra que serve equipe
- Atribuir tickets a equipe inteira (rotear)
- Filtros visuais
- Permissões agrupadas (roadmap)
`;
