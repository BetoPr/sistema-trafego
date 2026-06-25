export const CONFIG_ASAAS = `# Asaas — Pagamentos (PIX + Cartão)

Rota: /configuracoes/asaas

Conecta CRM com Asaas pra cobrar cliente direto pelo chat de Atendimentos (PIX QR code, copia-cola, link cartão).

## Configurar
Form:
- **API Key** (password — pega no painel Asaas)
- **Ambiente** (Produção / Sandbox)
- ☑️ **Ativo**

**Salvar**.

## Chave PIX padrão
Seção PIX:
- **Tipo de chave** (EVP / CPF / CNPJ / E-mail / Telefone)
- **Chave PIX**
- **Nome recebedor**
- **Mensagem padrão** (descrição da cobrança)

## CPF/CNPJ padrão pra cobrança nominal
Seção:
- **CPF/CNPJ** fallback titular
- **Nome padrão** fallback nome

Usado quando cobrança não tem dados do cliente.

## Mensagem auto pós-pagamento
Campo textarea. Quando Asaas notifica pagamento confirmado, CRM manda essa msg pro cliente no chat.

Ex: "Pagamento recebido! Bem-vindo(a). Em breve nossa equipe entra em contato."

## Como usar a cobrança no chat
1. /atendimentos > ticket > painel direito > seção Cobrança
2. (ou botão verde "$ Cobrança" no topo do chat)
3. Balão: Tipo (PIX/Cartão), Valor, Descrição, Parcelas (cartão)
4. **Gerar** → retorna QR code + copia-cola (PIX) ou link (cartão)
5. **Enviar pro cliente no chat** — manda mensagem com tudo

Precisa Asaas ☑️ Ativo aqui pra funcionar.
`;
