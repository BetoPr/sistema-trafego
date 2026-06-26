/**
 * Wrapper visual para páginas legais (Termos / Privacidade).
 * Estilo idêntico ao das páginas estáticas em sonar-lp/.
 */
import type { ReactNode } from "react";
import Link from "next/link";

export function LegalShell({
  tag,
  title,
  subtitle,
  voltarHref = "/",
  voltarTexto = "Voltar pro CRM",
  outroLinkHref,
  outroLinkTexto,
  children,
}: {
  tag: string;
  title: string;
  subtitle: string;
  voltarHref?: string;
  voltarTexto?: string;
  outroLinkHref: string;
  outroLinkTexto: string;
  children: ReactNode;
}) {
  return (
    <div style={pageStyle}>
      <div style={wrapStyle}>
        <Link href={voltarHref} style={backStyle}>
          <i className="ti ti-arrow-left" /> {voltarTexto}
        </Link>

        <div style={headStyle}>
          <div style={headGradient} />
          <span style={tagStyle}>{tag}</span>
          <h1 style={h1Style}>{title}</h1>
          <p style={metaStyle} dangerouslySetInnerHTML={{ __html: subtitle }} />
        </div>

        {children}

        <div style={footStyle}>
          Sonar CRM · <Link href={outroLinkHref} style={footLink}>{outroLinkTexto}</Link> · <a href="https://sonarcrm.com.br" style={footLink}>sonarcrm.com.br</a>
        </div>
      </div>
    </div>
  );
}

export function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <>
      <h2 style={h2Style}>
        <span style={h2Mark} />
        {titulo}
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>{children}</div>
    </>
  );
}

export function P({ children }: { children: ReactNode }) {
  return <p style={pStyle}>{children}</p>;
}

export function Lista({ items }: { items: ReactNode[] }) {
  return (
    <ul style={ulStyle}>
      {items.map((it, i) => (
        <li key={i} style={liStyle}>
          <span style={liDot} />
          {it}
        </li>
      ))}
    </ul>
  );
}

export function Aviso({ tipo = "info", children }: { tipo?: "info" | "warning"; children: ReactNode }) {
  const cor = tipo === "warning" ? "#FFB547" : "#FFB547";
  return (
    <div
      style={{
        background: `${cor}15`,
        border: `1px solid ${cor}50`,
        borderRadius: 12,
        padding: "16px 18px",
        margin: "14px 0 18px",
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
      }}
    >
      <i
        className={`ti ${tipo === "warning" ? "ti-alert-triangle" : "ti-info-circle"}`}
        style={{ color: cor, fontSize: 22, flexShrink: 0, marginTop: 2 }}
      />
      <div style={{ color: "#A6B0AC", fontSize: 14, lineHeight: 1.6 }}>{children}</div>
    </div>
  );
}

export function ContatoCard() {
  return (
    <div style={contatoStyle}>
      <div style={contatoRow}>
        <i className="ti ti-mail" style={contatoIco} />
        <span><b style={contatoB}>Email:</b> <a href="mailto:jj.rroberto2010@gmail.com" style={linkStyle}>jj.rroberto2010@gmail.com</a></span>
      </div>
      <div style={contatoRow}>
        <i className="ti ti-brand-whatsapp" style={contatoIco} />
        <span><b style={contatoB}>WhatsApp:</b> <a href="https://wa.me/5581991594716" style={linkStyle}>(81) 99159-4716</a></span>
      </div>
      <div style={contatoRow}>
        <i className="ti ti-map-pin" style={contatoIco} />
        <span><b style={contatoB}>Endereço:</b> R. Prof. Aloísio Pessoa de Araújo, 75 — Boa Viagem, Recife — PE, 51021-410</span>
      </div>
    </div>
  );
}

// ---------------- Styles ----------------
const pageStyle: React.CSSProperties = {
  background: "#060A08",
  color: "#F0F5F2",
  fontFamily: "Inter, -apple-system, 'Segoe UI', Roboto, sans-serif",
  lineHeight: 1.7,
  padding: "60px 24px 120px",
  minHeight: "100vh",
};

const wrapStyle: React.CSSProperties = {
  maxWidth: 820,
  margin: "0 auto",
};

const backStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  color: "#00E19A",
  fontWeight: 600,
  fontSize: 14,
  textDecoration: "none",
  marginBottom: 32,
};

const headStyle: React.CSSProperties = {
  background: "#0D1311",
  border: "1px solid #1F2926",
  borderRadius: 18,
  padding: 32,
  marginBottom: 40,
  position: "relative",
  overflow: "hidden",
};

const headGradient: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  background: "radial-gradient(circle at 100% 0%, rgba(0,225,154,0.10), transparent 50%)",
  pointerEvents: "none",
};

const tagStyle: React.CSSProperties = {
  display: "inline-block",
  background: "rgba(0,225,154,0.10)",
  color: "#00E19A",
  border: "1px solid rgba(0,225,154,0.30)",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: 1,
  padding: "5px 14px",
  borderRadius: 20,
  textTransform: "uppercase",
  marginBottom: 16,
  position: "relative",
  zIndex: 1,
};

const h1Style: React.CSSProperties = {
  fontSize: "clamp(30px, 4.5vw, 44px)",
  fontWeight: 700,
  letterSpacing: "-1.2px",
  lineHeight: 1.1,
  marginBottom: 14,
  position: "relative",
  zIndex: 1,
};

const metaStyle: React.CSSProperties = {
  color: "#A6B0AC",
  fontSize: 14,
  lineHeight: 1.6,
  position: "relative",
  zIndex: 1,
};

const h2Style: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 700,
  margin: "36px 0 14px",
  color: "#F0F5F2",
  letterSpacing: "-0.4px",
  display: "flex",
  alignItems: "center",
  gap: 10,
};

const h2Mark: React.CSSProperties = {
  display: "inline-block",
  width: 4,
  height: 22,
  background: "#00E19A",
  borderRadius: 2,
};

const pStyle: React.CSSProperties = {
  fontSize: 15,
  color: "#A6B0AC",
  marginBottom: 14,
};

const ulStyle: React.CSSProperties = {
  listStyle: "none",
  margin: "10px 0 18px",
  padding: 0,
};

const liStyle: React.CSSProperties = {
  position: "relative",
  paddingLeft: 22,
  marginBottom: 8,
  fontSize: 15,
  color: "#A6B0AC",
};

const liDot: React.CSSProperties = {
  position: "absolute",
  left: 0,
  top: 10,
  width: 8,
  height: 8,
  background: "#00E19A",
  borderRadius: 2,
};

const linkStyle: React.CSSProperties = { color: "#00E19A" };

const footStyle: React.CSSProperties = {
  marginTop: 60,
  paddingTop: 28,
  borderTop: "1px solid #1F2926",
  textAlign: "center" as const,
  fontSize: 13,
  color: "#6B7A75",
};

const footLink: React.CSSProperties = {
  color: "#00E19A",
  fontWeight: 600,
  textDecoration: "none",
};

const contatoStyle: React.CSSProperties = {
  background: "#0D1311",
  border: "1px solid #1F2926",
  borderRadius: 14,
  padding: "22px 26px",
  margin: "18px 0 0",
};

const contatoRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "6px 0",
  fontSize: 14,
};

const contatoIco: React.CSSProperties = {
  color: "#00E19A",
  fontSize: 18,
};

const contatoB: React.CSSProperties = {
  color: "#F0F5F2",
  marginRight: 4,
};
