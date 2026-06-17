"use client";

/**
 * Animacao de sucesso: check SVG com glow pulsante ao redor.
 * Aparece no centro da tela como overlay, some sozinho apos ~1.6s.
 */

interface Props {
  open: boolean;
  mensagem?: string;
  onClose?: () => void;
}

export function CheckSucesso({ open, mensagem = "Configurado!", onClose }: Props) {
  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(4px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 18,
        zIndex: 9999,
        animation: "check-fade-in 0.2s ease",
        cursor: "pointer",
      }}
    >
      <div style={{ position: "relative", width: 140, height: 140 }}>
        {/* Glow pulsante atras */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(16,185,129,0.6), transparent 70%)",
            filter: "blur(20px)",
            animation: "check-glow-pulse 1.4s ease-in-out infinite",
          }}
        />
        {/* Aneis expansivos */}
        <div
          style={{
            position: "absolute",
            inset: 8,
            borderRadius: "50%",
            border: "2px solid rgba(16,185,129,0.6)",
            animation: "check-ring-expand 1.4s ease-out infinite",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 8,
            borderRadius: "50%",
            border: "2px solid rgba(16,185,129,0.6)",
            animation: "check-ring-expand 1.4s ease-out 0.5s infinite",
            opacity: 0,
          }}
        />

        {/* SVG check */}
        <svg
          width="140"
          height="140"
          viewBox="0 0 140 140"
          style={{ position: "relative", zIndex: 1 }}
        >
          {/* Circulo de fundo com gradiente */}
          <defs>
            <linearGradient id="check-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
            <filter id="check-shadow">
              <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
              <feOffset dx="0" dy="4" result="offsetblur" />
              <feFlood floodColor="#10b981" floodOpacity="0.5" />
              <feComposite in2="offsetblur" operator="in" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <circle
            cx="70"
            cy="70"
            r="56"
            fill="url(#check-grad)"
            filter="url(#check-shadow)"
            style={{
              transformOrigin: "70px 70px",
              animation: "check-circle-pop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both",
            }}
          />
          {/* Check stroke animado */}
          <path
            d="M 44 72 L 62 90 L 96 54"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="9"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="80"
            strokeDashoffset="80"
            style={{
              animation: "check-draw 0.45s ease-out 0.3s forwards",
            }}
          />
        </svg>
      </div>

      <div
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: "#FFFFFF",
          textShadow: "0 2px 12px rgba(16,185,129,0.5)",
          letterSpacing: 0.3,
          animation: "check-text-rise 0.45s ease 0.5s both",
        }}
      >
        {mensagem}
      </div>

      <style>{`
        @keyframes check-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes check-circle-pop {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); }
        }
        @keyframes check-draw {
          to { stroke-dashoffset: 0; }
        }
        @keyframes check-glow-pulse {
          0%, 100% { opacity: 0.5; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1.1); }
        }
        @keyframes check-ring-expand {
          0% { transform: scale(0.85); opacity: 1; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        @keyframes check-text-rise {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
