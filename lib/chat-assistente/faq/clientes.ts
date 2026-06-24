export const CLIENTES = `# Clientes

Cadastro de **empresas cliente** da agencia (nao confundir com contatos WhatsApp).

## Pra que serve
- Agrupa multiplos contatos sob 1 cliente final.
- Vincula campanhas Meta a 1 cliente especifico (filtra metricas).
- Relatorios podem ser enviados por cliente.

## Como criar
- /clientes > Novo cliente. Nome, email opcional, telefone opcional.
- Soft delete via botao Excluir (recupera no super-admin).

## Vincular
- **Campanhas Meta**: na integracao, escolhe ad_account e atribui a 1 cliente.
- **Contatos WhatsApp**: edita contato e seleciona cliente.

## Dashboard por cliente
- Filtro nao existe ainda (usa filtro cross-aba topbar por Pasta/Etiqueta).

## Soft delete
- Cliente deletado: campanhas e contatos vinculados ficam orfaos mas nao somem.
`;
