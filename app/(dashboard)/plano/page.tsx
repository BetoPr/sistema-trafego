import { requireAuth } from "@/lib/crm/permissions";
import { createServiceClient } from "@/lib/supabase/service";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

interface FAQ {
  pergunta: string;
  resposta: string;
}

const FAQS: FAQ[] = [
  {
    pergunta: "Quantos canais WhatsApp posso conectar?",
    resposta:
      "Ilimitados. Cada conexão de número (Business ou comum) cobra R$ 29/mês. Os canais aparecem no atendimento, envio em massa e cobrança — todos no mesmo painel.",
  },
  {
    pergunta: "O sistema importa meus contatos e etiquetas do WhatsApp Business?",
    resposta:
      "Sim. Em Contatos → Importar do WhatsApp, o sistema puxa todos os contatos que já trocaram mensagem com o número conectado + todas as etiquetas (com a cor original do Business). Idempotente: rodar de novo não duplica.",
  },
  {
    pergunta: "Como funciona a IA no atendimento?",
    resposta:
      "Análise de sentimento por conversa (bom/neutro/ruim) com whisper para áudios. No Dashboard, o botão Copiar Prompt gera um relatório HTML pronto pra ChatGPT/Claude com KPIs, conversas críticas e recomendações — você cola e tem análise estratégica em segundos.",
  },
  {
    pergunta: "Tem follow-up automático?",
    resposta:
      "Sim, em dois sabores: (1) sequências por etiqueta — assim que uma etiqueta é aplicada, dispara uma cadência de mensagens com delay anti-ban e quiet hours; (2) follow-up avulso por contato — agenda 1 a 3 mensagens em rajada (intervalo mínimo de 2s) pra disparar em data/hora específica. Os dois cancelam sozinhos se o cliente responder antes.",
  },
  {
    pergunta: "Cliente entrou pelo anúncio do Instagram/Facebook, o sistema sabe?",
    resposta:
      "Sim. O parser captura referral de CTWA (Click-to-WhatsApp) e mostra no topo do chat o card com nome da campanha, criativo, plataforma. Permite atribuir vendas a anúncios específicos.",
  },
  {
    pergunta: "Posso enviar em massa sem ser banido?",
    resposta:
      "Sim. Envio em Massa tem janela horária, delay aleatório entre mensagens, teto diário e variações de texto. Combinado com o número Business em boa reputação, fica bem mais seguro que ferramentas de disparo cru.",
  },
  {
    pergunta: "Quantos atendentes posso ter?",
    resposta:
      "Ilimitados. Cria em Usuários, divide em Filas/Equipes, controla permissões. Cada um vê só os tickets atribuídos ou da fila dele.",
  },
  {
    pergunta: "Reações do WhatsApp aparecem certinho?",
    resposta:
      "Sim. Quando você ou o cliente reage a uma mensagem pelo WhatsApp Business, a reação anexa na mensagem original em vez de criar uma nova. No CRM, dá pra reagir com qualquer emoji clicando direto na mensagem.",
  },
  {
    pergunta: "Tem dashboard com métricas reais?",
    resposta:
      "Sim. Vendas fechadas, ticket médio, conversões por etiqueta, sentimento agregado, ROI de campanhas Meta Ads (sync nativo) — tudo filtrável por período e serviço. Exporta PDF/Excel.",
  },
  {
    pergunta: "O sistema funciona como app no celular?",
    resposta:
      "Sim. É PWA instalável: abre no Chrome do Android ou Safari do iPhone → Adicionar à Tela Inicial → vira app standalone com ícone e splash screen.",
  },
  {
    pergunta: "Posso recuperar um cliente excluído?",
    resposta:
      "Sim. Exclusão é soft delete — fica no filtro Excluídos com botão Restaurar. Mesmo um usuário deletado pode voltar sem perder histórico.",
  },
  {
    pergunta: "Como funciona a cobrança da assinatura?",
    resposta:
      "R$ 29 por mês por número conectado. Cobrança mensal no dia que combinarmos (você escolhe). Notificação de vencimento direto no seu WhatsApp.",
  },
];

export default async function PlanoPage() {
  const ctx = await requireAuth();
  const sb = createServiceClient();

  // Canais conectados = "instâncias usadas" pra cobrança
  const [{ count: canaisAtivos }, { data: usuarios }, { data: agencia }] = await Promise.all([
    sb.from("canais").select("id", { count: "exact", head: true }).eq("agencia_id", ctx.agenciaId).eq("status", "connected"),
    sb.from("usuarios").select("id", { count: "exact", head: true }).eq("agencia_id", ctx.agenciaId).is("deleted_at", null),
    sb.from("agencias").select("dia_pagamento, valor_mensal, cobranca_ativa").eq("id", ctx.agenciaId).maybeSingle(),
  ]);

  const nCanais = canaisAtivos || 0;
  const nUsuarios = (usuarios as unknown as { count?: number })?.count || 0;
  const valorUnitario = 29;
  const valorMensal = (agencia as { valor_mensal?: number } | null)?.valor_mensal ?? nCanais * valorUnitario;
  const diaPagamento = (agencia as { dia_pagamento?: number } | null)?.dia_pagamento ?? null;

  // Próxima cobrança = próximo dia X
  let proxima: string | null = null;
  if (diaPagamento) {
    const hoje = new Date();
    const ano = hoje.getMonth() === 11 && hoje.getDate() > diaPagamento ? hoje.getFullYear() + 1 : hoje.getFullYear();
    let mes = hoje.getMonth();
    if (hoje.getDate() > diaPagamento) mes = (mes + 1) % 12;
    const data = new Date(ano, mes, diaPagamento);
    proxima = data.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  }

  return (
    <section className="mk-page">
      <div className="mk-page-head">
        <div className="mk-eyebrow">Assinatura</div>
        <h1 className="mk-page-title">Plano Pro</h1>
        <p className="mk-page-sub">Sua assinatura e uso atual.</p>
      </div>

      <div className="meta-card" style={{ marginBottom: 14 }}>
        <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <span className="mk-badge" style={{ background: "rgba(16,185,129,0.20)", color: "#10b981", border: "0.5px solid rgba(16,185,129,0.4)" }}>PRO</span>
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 10 }}>
              {BRL.format(valorUnitario)} <span style={{ fontSize: 13, fontWeight: 400, opacity: 0.7 }}>/mês por conexão</span>
            </div>
            <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>
              {nCanais} canal{nCanais === 1 ? "" : "is"} conectado{nCanais === 1 ? "" : "s"} = <strong>{BRL.format(valorMensal)}/mês</strong>
            </div>
            <div style={{ fontSize: 11.5, opacity: 0.7, marginTop: 4 }}>
              {proxima ? `Próxima cobrança em ${proxima}` : "Dia de cobrança ainda não definido — fale com o super admin"}
            </div>
          </div>
          <a href="https://wa.me/5511999999999?text=Quero%20mudar%20meu%20plano" target="_blank" rel="noopener noreferrer" className="ghost-btn" style={{ color: "#F5EFE4", borderColor: "rgba(245,239,228,0.3)" }}>Mudar plano</a>
        </div>
      </div>

      <div className="grid-3">
        <div className="mk-card">
          <span className="label-tiny">Canais conectados</span>
          <div className="big-num">{nCanais}</div>
          <div style={{ fontSize: 11, color: "var(--mk-text-muted)", marginTop: 8 }}>{BRL.format(valorUnitario)} por canal/mês</div>
        </div>
        <div className="mk-card">
          <span className="label-tiny">Usuários ativos</span>
          <div className="big-num">{nUsuarios}</div>
          <div style={{ fontSize: 11, color: "var(--mk-text-muted)", marginTop: 8 }}>Ilimitado no Pro</div>
        </div>
        <div className="mk-card">
          <span className="label-tiny">Total mensal</span>
          <div className="big-num">{BRL.format(valorMensal)}</div>
          <div style={{ fontSize: 11, color: "var(--mk-text-muted)", marginTop: 8 }}>{diaPagamento ? `Cobra todo dia ${diaPagamento}` : "Dia a definir"}</div>
        </div>
      </div>

      <div className="mk-card mk-card-lg" style={{ marginTop: 18 }}>
        <h3 className="card-title" style={{ marginBottom: 4 }}>
          <i className="ti ti-help-circle" style={{ marginRight: 6, color: "#10b981" }} />
          Perguntas frequentes
        </h3>
        <p style={{ fontSize: 11.5, color: "var(--mk-text-muted)", marginBottom: 14 }}>
          As principais funcionalidades do Sonar e como elas justificam o valor.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {FAQS.map((f, i) => (
            <details
              key={i}
              style={{
                border: "0.5px solid var(--mk-border)",
                borderRadius: 8,
                background: "var(--mk-surface)",
                padding: "10px 14px",
              }}
            >
              <summary
                style={{
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--mk-text)",
                  listStyle: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <i className="ti ti-chevron-right" style={{ color: "#10b981", transition: "transform 0.2s" }} />
                {f.pergunta}
              </summary>
              <div style={{ fontSize: 12.5, color: "var(--mk-text-secondary)", lineHeight: 1.6, marginTop: 8, paddingLeft: 24 }}>
                {f.resposta}
              </div>
            </details>
          ))}
        </div>
        <style>{`
          details[open] > summary > .ti-chevron-right { transform: rotate(90deg); }
        `}</style>
      </div>
    </section>
  );
}
