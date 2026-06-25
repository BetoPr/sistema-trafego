export const INTEGRACOES = `# Canais (WhatsApp UAZAPI)

## Canais (WhatsApp) — /canais
**Apenas Usuários com permissão admin acessam.**

Cada canal = 1 número WhatsApp conectado via UAZAPI.

### Conectar primeiro WhatsApp
1. /canais → **+ Adicionar canal**
2. Form: Nome interno, ☑️ Padrão, Fila, Usuário responsável, Mensagem despedida
3. **Criar** → cria instância UAZAPI + gera QR Code
4. Celular: WhatsApp → ⋮ → Aparelhos conectados → **Conectar aparelho** → escaneia QR
5. Status muda pra ✅ CONECTADO

### QR Code
- TTL **30 segundos**. Gera automático até conectar.
- Contador vermelho < 5s.
- Status verificado a cada 4s.
- Fechou janela? Card → **Ver QR Code** reabre.

QR não conecta? Cheque: celular com internet, câmera focada no QR inteiro, WhatsApp atualizado.

### Cards de canal — ações
- ⭐ Definir como padrão
- 🔗 Revalidar webhook (quando msgs param de chegar)
- 🔄 Transferir tickets (move TODOS tickets pra outro canal — irreversível)
- ♻️ Reconectar (se ainda logado = só sincroniza; se caiu = QR novo)
- 🔌 Desconectar (status disconnected, dá pra reconectar)
- 🗑️ Deletar (apaga DB + instância UAZAPI — irreversível)

### Plataforma (iOS/Android/Web)
Detectada automático. iOS mostra aviso: desativar notificações do WhatsApp Business no iPhone.

### Múltiplos canais
- Plano padrão: **1 sessão/conta**. Extras: R$19 cada (2-7).
- Pricing: R$29/mês padrão. LITE R$138 (até 100 msg/dia). PRO R$195 (até 300/dia).
- Mensagens de todos canais caem unificadas em /atendimentos.
- Filtrar 1 canal: Atendimentos > Filtros > Conexões.

### Backfill mídias
Topo página → **Baixar mídias pendentes**. Lotes de 30. Mídias > 7 dias geralmente não recupera.

### Webhook
Configurado automático ao criar canal. Revalidar quando msgs param.

### FAQ comum
- WhatsApp Business e comum funcionam ambos.
- Celular continua funcionando (CRM espelha igual WhatsApp Web).
- Mensagens não chegam: 1) status CONECTADO 2) Revalidar webhook 3) teste de outro número.

---

## Meta Ads / Google Ads — em fase de testes

Integração com Meta Ads (Facebook/Instagram) e Google Ads **ainda está em fase de testes** e não está liberada pra acesso geral. Em breve.

---

## Asaas (pagamentos) — /configuracoes/asaas
Veja área "config-asaas". Cobrar pelo chat: /atendimentos > ticket > painel direito > Cobrança.
`;
