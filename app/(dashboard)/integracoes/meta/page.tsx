import Link from "next/link";
import { WizardMeta } from "./_wizard";

export default function MetaIntegracaoPage() {
  return (
    <section className="mk-page">
      <div className="mk-page-head">
        <Link
          href="/integracoes"
          style={{ fontSize: 12, color: "var(--mk-accent)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 8 }}
        >
          <i className="ti ti-arrow-left" style={{ fontSize: 13 }} />
          Voltar para integrações
        </Link>
        <div className="mk-eyebrow">Conexão · Meta Ads</div>
        <h1 className="mk-page-title">Conectar Meta Ads</h1>
        <p className="mk-page-sub">
          Tutorial passo a passo. Você precisa criar uma app no Meta for Developers uma única vez.
        </p>
      </div>
      <WizardMeta />
    </section>
  );
}
