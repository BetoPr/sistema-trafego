import Link from "next/link";

interface EmptyStateProps {
  icon: string;
  iconColor?: string;
  iconBg?: string;
  titulo: string;
  descricao?: string;
  ctaLabel?: string;
  ctaHref?: string;
}

export function EmptyState({
  icon,
  iconColor = "#9B7DBF",
  iconBg = "rgba(155, 125, 191, 0.2)",
  titulo,
  descricao,
  ctaLabel,
  ctaHref,
}: EmptyStateProps) {
  return (
    <div className="mk-card mk-card-lg" style={{ textAlign: "center", padding: "60px 30px" }}>
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: "50%",
          background: iconBg,
          color: iconColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 16px",
        }}
      >
        <i className={`ti ${icon}`} style={{ fontSize: 32 }} />
      </div>
      <h3 style={{ fontSize: 17, fontWeight: 600, color: "var(--mk-text)", marginBottom: 8 }}>
        {titulo}
      </h3>
      {descricao && (
        <p style={{ fontSize: 12.5, color: "var(--mk-text-secondary)", maxWidth: 480, margin: "0 auto 16px", lineHeight: 1.6 }}>
          {descricao}
        </p>
      )}
      {ctaLabel && ctaHref && (
        <Link href={ctaHref} className="cta-btn" style={{ margin: "8px auto 0", display: "inline-flex" }}>
          <i className="ti ti-plug" style={{ fontSize: 14 }} />
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}
