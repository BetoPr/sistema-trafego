/**
 * SonarLogo — brand oficial Sonar:
 * - Símbolo: hexágono outline verde + letra "S" verde estilizada + bolhinhas decorativas
 * - Wordmark: "sonar." (so branco · nar. verde)
 * - Cor accent: #00E19A
 *
 * Uso:
 *   <SonarLogo fontSize={22} />
 *   <SonarLogo collapsed />     // só o símbolo
 */
import type { CSSProperties } from "react";

const ACCENT = "#00E19A";

function SonarMark({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden="true"
      style={{ flex: "none" }}
    >
      {/* Hexágono outline */}
      <polygon
        points="50,4 91.5,27 91.5,73 50,96 8.5,73 8.5,27"
        fill="none"
        stroke={ACCENT}
        strokeWidth={4}
        strokeLinejoin="round"
      />
      {/* Letra S estilizada — fonte bold em verde */}
      <text
        x="50"
        y="74"
        textAnchor="middle"
        fontFamily="Inter, system-ui, -apple-system, sans-serif"
        fontSize="64"
        fontWeight={900}
        fontStyle="italic"
        fill={ACCENT}
        style={{ letterSpacing: "-0.04em" }}
      >
        S
      </text>
      {/* Bolhinhas decorativas (splash effect) */}
      <circle cx={70} cy={36} r={3} fill={ACCENT} />
      <circle cx={75} cy={42} r={1.6} fill={ACCENT} />
    </svg>
  );
}

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
  const markSize = Math.round(fontSize * 1.6);

  const wordmarkStyle: CSSProperties = {
    fontSize,
    fontWeight: 800,
    letterSpacing: "-0.04em",
    lineHeight: 1,
    fontFamily: "inherit",
  };

  const content = collapsed ? (
    <SonarMark size={markSize} />
  ) : (
    <span style={{ display: "inline-flex", alignItems: "center", gap: Math.round(fontSize * 0.4) }}>
      <SonarMark size={markSize} />
      <span style={{ ...wordmarkStyle, color: letterColor }}>
        so<span style={{ color: ACCENT }}>nar.</span>
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
