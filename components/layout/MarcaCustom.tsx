"use client";

import SonarLogo from "@/components/layout/SonarLogo";

export type LogoModo = "texto" | "logo" | "logo_texto";
export type LogoLayout = "horizontal" | "vertical";

interface Props {
  nome: string;
  logoUrl?: string | null;
  modo: LogoModo;
  layout: LogoLayout;
  /** Se true (sidebar colapsada), forca so logo OU iniciais. */
  compacto?: boolean;
}

export function MarcaCustom({ nome, logoUrl, modo, layout, compacto }: Props) {
  const semLogo = !logoUrl;
  const efetivoModo: LogoModo = semLogo ? "texto" : modo;

  if (compacto) {
    if (logoUrl) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt={nome} style={{ width: 32, height: 32, objectFit: "contain", display: "block" }} />
      );
    }
    return <SonarLogo fontSize={14} bgRadarOpacity={0.9} bgRadarSize={160} />;
  }

  if (efetivoModo === "texto") {
    return logoUrl ? null : <SonarLogo fontSize={18} bgRadarOpacity={0.9} bgRadarSize={220} />;
  }

  if (efetivoModo === "logo") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={logoUrl!} alt={nome} style={{ height: 36, width: "auto", maxWidth: 180, objectFit: "contain", display: "block" }} />
    );
  }

  // logo_texto
  const containerStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: layout === "vertical" ? "column" : "row",
    alignItems: "center",
    gap: layout === "vertical" ? 6 : 10,
  };
  return (
    <div style={containerStyle}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logoUrl!} alt={nome} style={{ height: layout === "vertical" ? 40 : 32, width: "auto", maxWidth: 180, objectFit: "contain", display: "block" }} />
      <span style={{ fontSize: layout === "vertical" ? 13 : 15, fontWeight: 700, color: "var(--mk-text)", lineHeight: 1.1 }}>{nome}</span>
    </div>
  );
}
