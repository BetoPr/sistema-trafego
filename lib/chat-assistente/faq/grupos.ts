export const GRUPOS = `# Grupos WhatsApp

Rota: /grupos

Lista todos grupos que o número conectado participa. Pode: listar JIDs, ver participantes, exportar XLS.

Útil pra: pegar JID pra **Resumo IA** (/ia-atendimento aba Ferramentas > Envio de resumo), exportar membros pra envio em massa.

## Listar grupos
1. **Conexão** (canal WhatsApp) — escolhe
2. **Listar IDs dos Grupos**
3. Tabela: ID (JID, formato 12345-67890@g.us — clica copia), Nome, Membros (count)

## Listar participantes
1. Lista grupos primeiro
2. Dropdown Grupos → escolhe
3. **Listar Participantes**
4. Tabela: Número, Admin (🛡️ badge se admin)

## Exportar XLS
- Com grupo selecionado → exporta participantes
- Sem grupo → exporta lista de grupos

## Pra que serve JID
Principal uso: campo "JID do grupo" na config Resumo IA. IA manda resumo automático no grupo quando transfere ticket pra humano.

## Limites
Sem limite. Listagem mostra todos sem paginação (assume < 500).

## Precisa ser admin?
Não pra listar/exportar. Sim se quiser enviar como bot do grupo (depende regra do grupo).

## Enviar msg direto pro grupo
Sem botão na UI. Workarounds:
- Ferramenta IA custom "enviar pro grupo" (aba Ferramentas em /ia-atendimento)
- /atendimentos > Nova conversa → cola JID no campo telefone → cria ticket pro grupo
`;
