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
      "Por padrão, 1 canal por agência. Se quiser conectar mais de um número (cada número adicional cobra R$ 29/mês), fale comigo no WhatsApp: https://wa.me/5581991594716 que eu libero pra você.",
  },
  {
    pergunta: "O sistema importa meus contatos e etiquetas do WhatsApp Business?",
    resposta:
      "Sim. Em Contatos → Importar do WhatsApp, o sistema puxa todos os contatos que já trocaram mensagem com o número conectado + todas as etiquetas com a cor original do Business. Idempotente: rodar de novo não duplica.",
  },
  {
    pergunta: "Como funciona a IA no atendimento?",
    resposta:
      "Análise de sentimento por conversa (bom/neutro/ruim) e transcrição de áudio via Whisper. No Dashboard, o botão Copiar Prompt gera um prompt pronto com KPIs, conversas críticas e recomendações pra você colar no ChatGPT/Claude e ter análise estratégica em segundos.",
  },
  {
    pergunta: "Tem follow-up automático?",
    resposta:
      "Sim, em dois modos: (1) sequências por etiqueta — assim que uma etiqueta é aplicada num contato, dispara uma cadência de mensagens com delay anti-ban e janela horária; (2) follow-up avulso por contato — agenda 1 a 3 mensagens em rajada (intervalo mínimo de 2s entre cada) pra disparar em data/hora específica. Os dois cancelam sozinhos se o cliente responder antes do disparo.",
  },
  {
    pergunta: "Posso enviar em massa sem ser banido?",
    resposta:
      "Sim. Envio em Massa tem janela horária configurável, delay aleatório entre mensagens, teto diário e variações de texto pra reduzir padrão. Combinado com número Business em boa reputação, fica bem mais seguro que ferramentas de disparo cru.",
  },
  {
    pergunta: "Quantos atendentes posso ter?",
    resposta:
      "Ilimitados. Cria em Usuários, divide em Filas/Equipes, controla permissões por menu. Cada atendente vê só os tickets atribuídos ou da fila dele.",
  },
  {
    pergunta: "Reações do WhatsApp aparecem certinho?",
    resposta:
      "Sim. Quando você ou o cliente reage a uma mensagem pelo WhatsApp Business, a reação anexa direto na mensagem original — não vira mensagem nova. No CRM, dá pra reagir com qualquer emoji clicando direto na mensagem.",
  },
  {
    pergunta: "Tenho controle financeiro das vendas?",
    resposta:
      "Sim. Cada fechamento vira um ticket fechado com valor, serviço e quantidade. Dashboard agrega total, ticket médio, conversões e ranking de serviços — tudo filtrável por período. Exporta CSV pra contabilidade.",
  },
  {
    pergunta: "O sistema funciona como app no celular?",
    resposta:
      "Sim. É PWA instalável: abre no Chrome do Android ou Safari do iPhone → Adicionar à Tela Inicial → vira app standalone com ícone e splash screen, sem precisar de Play Store.",
  },
  {
    pergunta: "Posso recuperar um usuário excluído?",
    resposta:
      "Sim. Toda exclusão é soft delete — fica no filtro Excluídos com botão Restaurar. Mesmo um usuário deletado pode voltar sem perder histórico de ações.",
  },
  {
    pergunta: "Mensagens rápidas pra respostas frequentes?",
    resposta:
      "Sim. Cadastra atalhos em Mensagens Rápidas com texto + mídia anexada. Durante o atendimento, digita o atalho e a resposta vai inteira (com a mídia). Salva minutos por dia.",
  },
  {
    pergunta: "E se a mídia do WhatsApp não baixar?",
    resposta:
      "O sistema tem 3 camadas de retry: tentativa no webhook + cron de backoff (5min, 30min) + botão manual ilimitado por mensagem. Após muitas falhas marca como 'perdida' e ainda permite re-tentativa quando o cliente reenviar.",
  },
  {
    pergunta: "Como funciona a cobrança da assinatura?",
    resposta:
      "R$ 29 por mês por número conectado. Cobrança mensal no dia que combinarmos (você escolhe). Notificação de vencimento direto no seu WhatsApp 1 dia antes do vencimento. Pagamento via PIX manual por enquanto.",
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
          <a
            href={`https://wa.me/5581991594716?text=${encodeURIComponent("Olá! Quero pagar minha mensalidade do Sonar CRM.")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="cta-btn"
            style={{ fontSize: 13, padding: "10px 18px" }}
            title="Abre WhatsApp do administrador para pagamento"
          >
            <i className="ti ti-brand-whatsapp" style={{ marginRight: 6, color: "#25D366" }} />
            Pagar plano
          </a>
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
