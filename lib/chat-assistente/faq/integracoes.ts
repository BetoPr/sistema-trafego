export const INTEGRACOES = `# Integrações + Canais (WhatsApp UAZAPI, Meta Ads, Google Ads)

## Canais (WhatsApp) — /canais
**Apenas admin / super_admin acessa.**

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

QR não conecta? Cheque: celular com internet, câmera focada, WhatsApp atualizado, servidor UAZAPI ativo (super_admin verifica /super-admin/servidores).

### Conectar por código (sem QR)
Suporta no client.ts mas UI ainda não expõe. Hoje só QR.

### Cards de canal — ações
- ⭐ Definir como padrão
- 🔗 Revalidar webhook (reconfigura URL no UAZAPI quando msgs param)
- 🔄 Transferir tickets (move TODOS tickets pra outro canal — irreversível, faça quando ninguém atendendo)
- ♻️ Reconectar (se WhatsApp ainda logado no celular = só sincroniza, sem QR; se caiu = QR novo)
- 🔌 Desconectar (status disconnected, WhatsApp do celular intacto, dá pra reconectar)
- 🗑️ Deletar (apaga DB + remove instância UAZAPI — irreversível, considere Transferir tickets antes)

### Plataforma (iOS/Android/Web)
Detectada automático. iOS mostra aviso: desativar notificações do WhatsApp Business no iPhone (iOS pausa app em bg).

### Múltiplos canais
- Plano padrão: **1 sessão/conta**. Super_admin = ilimitado.
- Pricing: R$29/mês padrão. R$19 cada extra (2-7). LITE R$138 (até 100 msg/dia). PRO R$195 (até 300/dia).
- Mensagens de todos canais caem unificado em /atendimentos.
- Cada ticket tem badge do canal.
- Filtrar: Atendimentos > Filtros > Conexões.

### Backfill mídias
Topo página → **Baixar mídias pendentes**. Lotes de 30. Progresso live (✅ X / ⚠️ Y / ⏳ Z). Para após 2 falhas seguidas (UAZAPI não consegue). Mídias > 7 dias geralmente não recupera.

### Webhook
Configurado automático ao criar canal. URL: NEXT_PUBLIC_APP_URL/api/webhooks/uazapi/{secret}. Eventos: messages, messages_update, connection. Exclui wasSentByApi (evita loop).

Revalidar quando msgs param de chegar de repente.

### FAQ comum
- WhatsApp Business e comum funcionam ambos.
- WhatsApp do celular continua funcionando (CRM espelha igual WhatsApp Web).
- Não recomendado fazer envio massa pra estranhos (risco ban).
- Mensagens não chegam: 1) status CONECTADO 2) Revalidar webhook 3) teste de outro número 4) super_admin verifica servidor UAZAPI.
- Quem acessa: só admin / super_admin. Operador comum não vê.

---

## Meta Ads — /integracoes/meta
- **Conectar Meta Ads** → OAuth Facebook → autoriza → seleciona ad accounts.
- **Sincronizar** → puxa campanhas, ad sets, ads, métricas (gasto, impressões, cliques, conversões).
- **Sincronizar Pages** → puxa fanpages vinculadas.
- **Desconectar** → revoga OAuth. Métricas antigas ficam.

## Google Ads — /integracoes/google
Wizard pré-OAuth existe mas integração real é roadmap futuro.

## Asaas (pagamentos) — /configuracoes/asaas
Detalhes em area config-asaas.

Cobrar pelo chat: /atendimentos > ticket > painel direito > Cobrança (precisa Asaas ativo).
`;
