/**
 * Aurora decorativa de fundo — 2 esferas radiais com blur que respiram lentamente.
 * Inspirado no mockup do Sonar Dashboard. Self-contained, zero deps, respeita
 * `prefers-reduced-motion`.
 *
 * Posicionada como `position: fixed` cobrindo viewport, atrás de tudo
 * (z-index: 0; pointer-events: none).
 */

const KEYFRAMES = `
@keyframes auroraA { 0%,100% { transform: translate(-6%, -3%) scale(1); } 50% { transform: translate(7%, 5%) scale(1.18); } }
@keyframes auroraB { 0%,100% { transform: translate(6%, 3%) scale(1.12); } 50% { transform: translate(-7%, -5%) scale(1); } }
@media (prefers-reduced-motion: reduce) {
  .aurora-a, .aurora-b { animation: none !important; }
}`;

export default function AuroraBg() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 0,
        overflow: "hidden",
      }}
    >
      <style>{KEYFRAMES}</style>
      <div
        className="aurora-a"
        style={{
          position: "absolute",
          top: "-14%",
          left: "30%",
          width: 760,
          height: 760,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(16,185,129,0.13), transparent 62%)",
          filter: "blur(34px)",
          animation: "auroraA 18s ease-in-out infinite",
        }}
      />
      <div
        className="aurora-b"
        style={{
          position: "absolute",
          bottom: "-22%",
          right: "4%",
          width: 680,
          height: 680,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(13,148,136,0.11), transparent 62%)",
          filter: "blur(40px)",
          animation: "auroraB 22s ease-in-out infinite",
        }}
      />
    </div>
  );
}
