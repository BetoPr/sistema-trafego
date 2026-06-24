export const CONTATOS = `# Contatos

Cadastro de contatos WhatsApp (clientes da agencia).

## O que tem
- Nome, numero, etiquetas, ultima mensagem, data de cadastro, cliente_id (vinculacao).
- Aniversario opcional.
- Aba **Midias/Docs**: arquivos enviados/recebidos por esse contato.

## Como criar
- Manual: botao **Novo contato** em /contatos. Nome + numero.
- Automatico: quando cliente manda 1a mensagem, ja vira contato.
- Import em massa: /contatos/importar (CSV).

## Editar
- Click no contato abre Balao com nome, etiquetas, vincular cliente, follow-up agendado.
- **Follow-up avulso**: agenda mensagem unica pra esse contato em data X.

## Buscar
- Input no topo. Busca por nome ou numero.

## Etiquetas
- Aplica pasta + etiqueta inline. Pasta-mae aplicada automatico ao aplicar filha.

## Vincular a cliente
- Cliente = cadastro de empresa cliente da agencia. Contato pode vincular a 1 cliente.
- Util pra relatorios filtrados por cliente.

## Soft delete
- Deletar contato faz soft delete (deleted_at). Recupera no super-admin se precisar.
`;
