import Link from "next/link";
import { requireUserWithAgencia } from "@/lib/auth";

export default async function IntegracoesPage() {
  const { supabase } = await requireUserWithAgencia();
  const { data: integracoes } = await supabase
    .from("integracoes")
    .select("id, plataforma, account_name, status")
    .eq("status", "ativa");

  const metaCount = integracoes?.filter((i) => i.plataforma === "meta_ads").length ?? 0;
  const googleCount = integracoes?.filter((i) => i.plataforma === "google_ads").length ?? 0;

  return (
    <section className="mk-page">
      <div className="mk-page-head">
        <div className="mk-eyebrow">Conexões</div>
        <h1 className="mk-page-title">Integrações</h1>
        <p className="mk-page-sub">
          Conecte plataformas de anúncios para ver dados reais no dashboard.
        </p>
      </div>

      <div className="grid-2">
        <PlataformaCard
          nome="Meta Ads"
          desc="Facebook, Instagram, Messenger e WhatsApp Ads. Conecte via OAuth oficial."
          icon="ti-brand-meta"
          iconBg="linear-gradient(135deg, #1877F2, #4FB1F0)"
          conectada={metaCount > 0}
          contas={metaCount}
          href="/integracoes/meta"
          dificuldade="Fácil — ~5 min"
          complexidade="green"
        />
        <PlataformaCard
          nome="Google Ads"
          desc="Search, Display, YouTube e Discovery. Requer Developer Token (aprovação Google)."
          icon="ti-brand-google"
          iconBg="linear-gradient(135deg, #4285F4, #34A853)"
          conectada={googleCount > 0}
          contas={googleCount}
          href="/integracoes/google"
          dificuldade="Médio — 1-2 semanas (aprovação)"
          complexidade="amber"
        />
      </div>

      <div className="mk-card mk-card-lg" style={{ marginTop: 14 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: "rgba(155, 125, 191, 0.25)", color: "#9B7DBF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <i className="ti ti-info-circle" style={{ fontSize: 20 }} />
          </div>
          <div>
            <h3 className="card-title" style={{ marginBottom: 4 }}>Como funcionam as integrações</h3>
            <p className="card-sub" style={{ marginBottom: 0, fontSize: 12, color: "var(--mk-text-secondary)", lineHeight: 1.6 }}>
              Cada plataforma exige uma <strong>app no portal de desenvolvedores</strong> dela. Você cria a app uma única vez (não é por cliente),
              e depois cada cliente da agência conecta a própria conta de anúncios em 1 clique via OAuth.
              Os wizards abaixo te guiam passo a passo. Tokens são criptografados (AES-256-GCM) antes de irem ao banco.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function PlataformaCard({
  nome,
  desc,
  icon,
  iconBg,
  conectada,
  contas,
  href,
  dificuldade,
  complexidade,
}: {
  nome: string;
  desc: string;
  icon: string;
  iconBg: string;
  conectada: boolean;
  contas: number;
  href: string;
  dificuldade: string;
  complexidade: "green" | "amber" | "red";
}) {
  return (
    <div className="mk-card mk-card-lg">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div style={{ width: 52, height: 52, borderRadius: 12, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", color: "#FFFDF8" }}>
          <i className={`ti ${icon}`} style={{ fontSize: 28 }} />
        </div>
        <span className={`mk-badge ${conectada ? "b-green" : "b-amber"}`}>
          {conectada ? `● ${contas} conta(s)` : "● Disponível"}
        </span>
      </div>
      <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--mk-text)", marginBottom: 4 }}>{nome}</h3>
      <p style={{ fontSize: 12, color: "var(--mk-text-secondary)", marginBottom: 12, lineHeight: 1.5 }}>{desc}</p>
      <div style={{ fontSize: 11, color: "var(--mk-text-muted)", marginBottom: 16 }}>
        <i className="ti ti-clock" style={{ fontSize: 12, marginRight: 4, verticalAlign: -1, color: complexidade === "green" ? "#6B8E4E" : complexidade === "amber" ? "#C9A876" : "#C97064" }} />
        {dificuldade}
      </div>
      <Link href={href} className="cta-btn" style={{ width: "100%", justifyContent: "center" }}>
        {conectada ? "Gerenciar" : "Conectar"}
        <i className="ti ti-arrow-right" style={{ fontSize: 14 }} />
      </Link>
    </div>
  );
}
