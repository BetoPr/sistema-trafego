/**
 * SonarLogo — brand oficial Sonar (formato LP aprovado pelo Roberto, 26/06):
 * - Símbolo: PNG do S verde sólido (`/sonar-mark.png`), com leve drop-shadow verde
 * - Wordmark: "sonar." em Poppins bold, ponto verde de assinatura
 * - Cor accent: #00E19A
 *
 * Uso:
 *   <SonarLogo fontSize={22} />
 *   <SonarLogo collapsed />     // só o símbolo
 */
import type { CSSProperties } from "react";

const ACCENT = "#00E19A";

export interface SonarLogoProps {
  collapsed?: boolean;
  fontSize?: number;
  letterColor?: string;
  /** Mantidas por compatibilidade com call sites antigos; ignoradas no novo design. */
  showBackgroundRadar?: boolean;
  bgRadarOpacity?: number;
  bgRadarSize?: number;
  spinSeconds?: number;
  sweepSeconds?: number;
  frameHeight?: number;
}

export default function SonarLogo({
  collapsed = false,
  fontSize = 22,
  letterColor = "#fff",
  frameHeight,
}: SonarLogoProps) {
  const markSize = Math.round(fontSize * 2);

  const wordmarkStyle: CSSProperties = {
    fontSize,
    fontWeight: 700,
    letterSpacing: "-0.04em",
    lineHeight: 1,
    fontFamily: "inherit",
    color: letterColor,
  };

  const markImg = (
    <img
      src="/sonar-mark.png"
      alt="Sonar"
      width={markSize}
      height={markSize}
      style={{
        height: markSize,
        width: "auto",
        marginRight: collapsed ? 0 : -Math.round(fontSize * 0.25),
        filter: `drop-shadow(0 0 8px ${ACCENT}40)`,
        flex: "none",
      }}
    />
  );

  const content = collapsed ? (
    markImg
  ) : (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 0 }}>
      {markImg}
      <span style={wordmarkStyle}>
        sonar<span style={{ color: ACCENT }}>.</span>
      </span>
    </span>
  );

  if (frameHeight != null) {
    return (
      <div
        style={{
          position: "relative",
          width: "100%",
          height: frameHeight,
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "flex-start",
        }}
      >
        {content}
      </div>
    );
  }
  return content;
}
