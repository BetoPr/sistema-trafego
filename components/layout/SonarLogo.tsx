/**
 * SonarLogo — wordmark "SONAR" com a letra "O" como radar nítido (varredura
 * forte) + radar maior de fundo (anéis, crosshair, varredura sutil) girando
 * devagar. Self-contained: zero deps, zero CSS externo.
 *
 * Uso típico:
 *   <SonarLogo frameHeight={64} fontSize={18} bgRadarOpacity={0.85} />
 *   <SonarLogo collapsed frameHeight={56} fontSize={18} />
 */
import type { CSSProperties } from "react";

const GREEN = "#2dd4a0";
const GREEN_BRIGHT = "#5eead4";
const LETTER_COLOR = "#f2f5f4";

const KEYFRAMES = `
@keyframes sonarSweep { to { transform: rotate(360deg); } }
@keyframes sonarSpin  { to { transform: rotate(360deg); } }
@keyframes sonarBlip  { 0%,42% { opacity: 0; } 56% { opacity: .9; } 100% { opacity: 0; } }
@media (prefers-reduced-motion: reduce) {
  .sonar-sweep, .sonar-spin, .sonar-blip { animation: none !important; }
}`;

function Radar({ size = 34, sweepSeconds = 2.6 }: { size?: number; sweepSeconds?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{
        position: "relative",
        display: "inline-block",
        width: size,
        height: size,
        flex: "none",
        borderRadius: "50%",
        background:
          "repeating-radial-gradient(circle, transparent 0 28%, rgba(45,212,160,.18) 28% calc(28% + 1px), transparent calc(28% + 1px) 56%, rgba(45,212,160,.18) 56% calc(56% + 1px))",
        boxShadow: "inset 0 0 0 1px rgba(45,212,160,.32), 0 0 14px rgba(45,212,160,.12)",
      }}
    >
      <span
        className="sonar-sweep"
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          background:
            "conic-gradient(from 0deg, transparent 0 290deg, rgba(45,212,160,.06) 315deg, rgba(94,234,212,.6) 360deg)",
          WebkitMaskImage: "radial-gradient(circle, #000 58%, transparent 73%)",
          maskImage: "radial-gradient(circle, #000 58%, transparent 73%)",
          animation: `sonarSweep ${sweepSeconds}s linear infinite`,
        }}
      />
      <span
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 4,
          height: 4,
          borderRadius: "50%",
          background: GREEN_BRIGHT,
          transform: "translate(-50%,-50%)",
          boxShadow: `0 0 6px ${GREEN}`,
        }}
      />
      <span
        className="sonar-blip"
        style={{
          position: "absolute",
          left: "67%",
          top: "33%",
          width: 5,
          height: 5,
          borderRadius: "50%",
          background: GREEN_BRIGHT,
          transform: "translate(-50%,-50%)",
          animation: `sonarBlip ${sweepSeconds}s ease-in-out infinite`,
        }}
      />
    </span>
  );
}

function BackgroundRadar({
  size = 165,
  opacity = 0.85,
  spinSeconds = 8,
}: {
  size?: number;
  opacity?: number;
  spinSeconds?: number;
}) {
  return (
    <span
      aria-hidden="true"
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        width: size,
        height: size,
        opacity,
        pointerEvents: "none",
        transform: "translate(-50%,-50%)",
        borderRadius: "50%",
        background:
          "repeating-radial-gradient(circle, transparent 0 15%, rgba(45,212,160,.09) 15% calc(15% + 1px))",
        WebkitMaskImage: "radial-gradient(circle, #000 52%, transparent 92%)",
        maskImage: "radial-gradient(circle, #000 52%, transparent 92%)",
      }}
    >
      <span
        className="sonar-spin"
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          animation: `sonarSpin ${spinSeconds}s linear infinite`,
        }}
      >
        <span
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background:
              "conic-gradient(from 0deg, transparent 0 275deg, rgba(45,212,160,.04) 300deg, rgba(94,234,212,.18) 360deg)",
          }}
        />
        <span
          style={{
            position: "absolute",
            left: "50%",
            top: 0,
            width: 1,
            height: "100%",
            background: "rgba(45,212,160,.08)",
            transform: "translateX(-50%)",
          }}
        />
        <span
          style={{
            position: "absolute",
            left: 0,
            top: "50%",
            width: "100%",
            height: 1,
            background: "rgba(45,212,160,.08)",
            transform: "translateY(-50%)",
          }}
        />
      </span>
    </span>
  );
}

export interface SonarLogoProps {
  collapsed?: boolean;
  fontSize?: number;
  letterColor?: string;
  showBackgroundRadar?: boolean;
  bgRadarOpacity?: number;
  bgRadarSize?: number;
  spinSeconds?: number;
  sweepSeconds?: number;
  frameHeight?: number;
}

export default function SonarLogo({
  collapsed = false,
  fontSize = 18,
  letterColor = LETTER_COLOR,
  showBackgroundRadar = true,
  bgRadarOpacity = 0.85,
  bgRadarSize,
  spinSeconds = 8,
  sweepSeconds = 2.6,
  frameHeight,
}: SonarLogoProps) {
  const oSize = Math.round(fontSize * 1.2);
  const bgSize = bgRadarSize ?? Math.round(fontSize * 9);

  const letterStyle: CSSProperties = {
    fontWeight: 800,
    letterSpacing: ".16em",
    color: letterColor,
    lineHeight: 1,
    fontSize,
    fontFamily: "inherit",
    position: "relative",
    zIndex: 2,
  };

  const content = collapsed ? (
    <span
      role="img"
      aria-label="SONAR"
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <style>{KEYFRAMES}</style>
      <Radar size={Math.round(fontSize * 2.6)} sweepSeconds={sweepSeconds} />
    </span>
  ) : (
    <span
      role="img"
      aria-label="SONAR"
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <style>{KEYFRAMES}</style>
      {showBackgroundRadar && (
        <BackgroundRadar size={bgSize} opacity={bgRadarOpacity} spinSeconds={spinSeconds} />
      )}
      <span style={{ position: "relative", zIndex: 2, display: "inline-flex", alignItems: "center" }}>
        <span style={letterStyle}>S</span>
        <span style={{ position: "relative", zIndex: 2, margin: "0 1px" }}>
          <Radar size={oSize} sweepSeconds={sweepSeconds} />
        </span>
        <span style={letterStyle}>NAR</span>
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
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {content}
      </div>
    );
  }

  return content;
}
