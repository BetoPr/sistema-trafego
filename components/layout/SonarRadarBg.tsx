/**
 * Radar girando como fundo de tela cheia. Usado atrás de formulários
 * (login) e qualquer fundo decorativo. Self-contained.
 *
 * Uso:
 *   <SonarRadarBg size={900} opacity={0.4} spinSeconds={14} />
 */

const KEYFRAMES = `
@keyframes sonarBgSpin { to { transform: rotate(360deg); } }
@keyframes sonarBeamSweep { 0%{opacity:0;transform:translate(-50%,-50%) rotate(0)} 12%{opacity:.85} 100%{opacity:0;transform:translate(-50%,-50%) rotate(380deg)} }
@media (prefers-reduced-motion: reduce) {
  .sonar-bg-spin, .sonar-beam { animation: none !important; }
}`;

export interface SonarRadarBgProps {
  size?: number;
  opacity?: number;
  spinSeconds?: number;
  className?: string;
  /** Feixe de varredura entrando uma vez na monta (ex: tela de login). */
  beam?: boolean;
  beamSize?: number;
  beamDurationSeconds?: number;
}

export default function SonarRadarBg({
  size = 900,
  opacity = 0.35,
  spinSeconds = 14,
  className,
  beam = false,
  beamSize,
  beamDurationSeconds = 1.6,
}: SonarRadarBgProps) {
  const bSize = beamSize ?? Math.round(size * 0.6);
  return (
    <div
      aria-hidden="true"
      className={className}
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
          "repeating-radial-gradient(circle, transparent 0 12%, rgba(45,212,160,.10) 12% calc(12% + 1px))",
        WebkitMaskImage: "radial-gradient(circle, #000 60%, transparent 92%)",
        maskImage: "radial-gradient(circle, #000 60%, transparent 92%)",
        zIndex: 0,
      }}
    >
      <style>{KEYFRAMES}</style>
      <div
        className="sonar-bg-spin"
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          animation: `sonarBgSpin ${spinSeconds}s linear infinite`,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background:
              "conic-gradient(from 0deg, transparent 0 275deg, rgba(45,212,160,.05) 300deg, rgba(94,234,212,.22) 360deg)",
          }}
        />
        <div
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
        <div
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
      </div>
      {beam && (
        <div
          className="sonar-beam"
          aria-hidden="true"
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: bSize,
            height: bSize,
            borderRadius: "50%",
            pointerEvents: "none",
            background:
              "conic-gradient(from 0deg, transparent 0 305deg, rgba(94,234,212,0) 320deg, rgba(94,234,212,.55) 360deg)",
            WebkitMaskImage: "radial-gradient(circle, #000 26%, transparent 75%)",
            maskImage: "radial-gradient(circle, #000 26%, transparent 75%)",
            animation: `sonarBeamSweep ${beamDurationSeconds}s ease-out both`,
          }}
        />
      )}
    </div>
  );
}
