export const CONFIG_ETIQUETAS = `# Etiquetas (Pasta / Etiqueta)

Hierarquia de 2 niveis pra organizar contatos, campanhas, anuncios.

## Pasta vs Etiqueta
- **Pasta**: etiqueta-mae que agrupa filhas. Ex: "Restauracao".
- **Etiqueta**: filha de uma Pasta OU solta. Ex: "Restauracao/Bebe", "Restauracao/Mofo".

## Criar
- /configuracoes/etiquetas > Nova etiqueta.
- Nome (ex: "Restauracao" pra Pasta, "Restauracao/Bebe" pra Filha).
- Cor + Pasta-mae opcional (select no card).
- Salva. Pasta-mae com filhas vira automatic Pasta.

## Heranca automatica
- Aplicar **filha** num contato/campanha → Pasta-mae e aplicada junto.
- Ex: aplicar "Restauracao/Bebe" → tambem aplica "Restauracao".

## Gatilho de palavra-chave (Biscoito)
- Cada etiqueta pode ter \`palavra_gatilho\` (varias separadas por virgula).
- Quando cliente envia mensagem com a palavra, etiqueta + Pasta-mae aplicadas automatic.
- \`mensagem_resposta\` opcional: dispara resposta automatica na 1a vez que aplica.

## Aplicar manual
- Edita contato > campo Etiquetas > marca/desmarca.

## Em Pixel & Vendas
- Vincula Pasta a campanha Meta + Etiqueta a anuncio/conjunto.
- Lead via CTWA recebe Pasta + Etiqueta automatic.

## Editar/trocar Pasta-mae
- Lista etiquetas > Select coluna direita > escolhe Pasta nova.
- Pasta (etiqueta-mae com filhas) NAO tem select — mostra chip "Pasta" estatico.

## Excluir
- Cuidado: deletar Pasta nao deleta filhas (orfaos). Filhas viram "soltas".

## Cores
- Picker rapido com 8 cores padrao. Hex custom opcional.

## Padrao de nome
- "Pasta" sozinho ou "Pasta/Filha" (barra como separador).

## Problemas
- Filha nao puxa Pasta-mae: bug ja fix. Reaplica etiqueta.
- Duplicata: nomes parecidos com/sem acento. Padroniza UMA forma.
`;
