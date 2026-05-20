import Link from "next/link";
import { WizardGoogle } from "./_wizard";

export default function GoogleIntegracaoPage() {
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
        <div className="mk-eyebrow">Conexão · Google Ads</div>
        <h1 className="mk-page-title">Conectar Google Ads</h1>
        <p className="mk-page-sub">
          Processo mais longo: precisa Developer Token aprovado pelo Google (1-2 semanas).
        </p>
      </div>
      <WizardGoogle />
    </section>
  );
}
