import Link from "next/link";
import { requireUserWithAgencia } from "@/lib/auth";
import { PerfilForm } from "./_components/PerfilForm";
import { AgenciaForm } from "./_components/AgenciaForm";
import { ConfigToggles } from "./_components/ConfigToggles";

const ATALHOS = [
  { href: "/configuracoes/servicos", label: "Serviços", icon: "ti-package", cor: "#F4B860", desc: "Catálogo de serviços/produtos da agência" },
  { href: "/configuracoes/ia", label: "API IA", icon: "ti-key", cor: "#9B7DBF", desc: "Chaves Groq/OpenAI/Anthropic + transcrição áudio" },
  { href: "/configuracoes/ia-prompts", label: "Prompts IA", icon: "ti-sparkles", cor: "#9B7DBF", desc: "Personalize resumo, sentimento e reescrita" },
  { href: "/analise-ias", label: "Análise de IAs", icon: "ti-chart-histogram", cor: "#6FA8DC", desc: "Uso de tokens + performance dos perfis" },
  { href: "/configuracoes/mcp", label: "MCP / API", icon: "ti-plug-connected", cor: "#00E19A", desc: "Tokens pra Claude Desktop / Code consultar seu CRM" },
  { href: "/configuracoes/asaas", label: "Asaas", icon: "ti-credit-card", cor: "#5B8BA6", desc: "Cobranças PIX e cartão" },
  { href: "/configuracoes/webhooks", label: "Webhooks", icon: "ti-webhook", cor: "#00E19A", desc: "Notifique sistemas externos" },
  { href: "/integracoes", label: "Integrações", icon: "ti-plug", cor: "#00E19A", desc: "Meta Ads, Google Ads" },
  { href: "/auditoria", label: "Log de Auditoria", icon: "ti-file-text", cor: "#C97064", desc: "Histórico de ações no sistema" },
];

export default async function ConfiguracoesPage() {
  const { usuario } = await requireUserWithAgencia();
  const agencia = Array.isArray(usuario.agencias) ? usuario.agencias[0] : usuario.agencias;
  const inicial = usuario.nome.charAt(0).toUpperCase() || "U";

  return (
    <section className="mk-page">
      <div className="mk-page-head">
        <div className="mk-eyebrow">Conta</div>
        <h1 className="mk-page-title">Configurações</h1>
        <p className="mk-page-sub">Gerencie seu perfil, agência e preferências.</p>
      </div>

      <div className="grid-2">
        <div className="mk-card mk-card-lg">
          <h3 className="card-title">Perfil</h3>
          <p className="card-sub" style={{ marginBottom: 18 }}>Seu nome aparece nos relatórios.</p>
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: 14, background: "var(--mk-surface-2)", borderRadius: 11, marginBottom: 18 }}>
            <div style={{ width: 60, height: 60, borderRadius: "50%", background: "linear-gradient(135deg, #00E19A, #8B6F47)", display: "flex", alignItems: "center", justifyContent: "center", color: "#FFFDF8", fontSize: 22, fontWeight: 600 }}>
              {inicial}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--mk-text)" }}>{usuario.nome}</div>
              <div style={{ fontSize: 11.5, color: "var(--mk-text-muted)" }}>{usuario.email}</div>
            </div>
          </div>
          <PerfilForm nome={usuario.nome} email={usuario.email} />
        </div>

        <div className="mk-card mk-card-lg">
          <h3 className="card-title">Agência</h3>
          <p className="card-sub" style={{ marginBottom: 18 }}>Dados da sua agência.</p>
          <AgenciaForm nome={agencia?.nome ?? ""} slug={agencia?.slug ?? ""} />
        </div>
      </div>

      <div className="mk-card mk-card-lg">
        <h3 className="card-title">Preferências</h3>
        <ConfigToggles />
      </div>

      {/* Atalhos pras configurações avançadas (saíram do sidebar) */}
      <div className="mk-card mk-card-lg" style={{ marginTop: 14 }}>
        <h3 className="card-title" style={{ marginBottom: 4 }}>Mais configurações</h3>
        <p className="card-sub" style={{ marginBottom: 16 }}>IA, pagamentos, integrações e auditoria.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
          {ATALHOS.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              data-guide={`config-${a.href.split("/").pop() || ""}`}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 10, border: "0.5px solid var(--mk-border)", background: "var(--mk-surface)", textDecoration: "none", color: "var(--mk-text)", transition: "border-color 0.15s ease" }}
            >
              <span style={{ width: 34, height: 34, borderRadius: 9, background: `${a.cor}22`, color: a.cor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
                <i className={`ti ${a.icon}`} />
              </span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 12.5, fontWeight: 600 }}>{a.label}</span>
                <span style={{ display: "block", fontSize: 10.5, color: "var(--mk-text-muted)", marginTop: 1 }}>{a.desc}</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
