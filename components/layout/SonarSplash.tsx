"use client";

/**
 * Splash de entrada SONAR — ping de sonar com 3 aneis se expandindo + logo
 * pulsando. Mostra UMA vez por sessao (sessionStorage). Auto-some depois de
 * ~2.4s. Self-contained.
 */
import { useEffect, useState } from "react";
import SonarLogo from "./SonarLogo";

const KEYFRAMES = `
@keyframes sonarPingExpand { 0%{opacity:.7;width:26px;height:26px} 100%{opacity:0;width:520px;height:520px} }
@keyframes sonarSplashLogoPop { 0%{opacity:0;transform:scale(.6)} 70%{opacity:1;transform:scale(1.06)} 100%{opacity:1;transform:scale(1)} }
@keyframes sonarSplashFadeOut { from{opacity:1} to{opacity:0;visibility:hidden} }
@media (prefers-reduced-motion: reduce) {
  .sonar-splash-ring { animation: none !important; opacity: 0 !important; }
}
`;

export default function SonarSplash() {
  const [ativo, setAtivo] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem("sonar_splash_visto") === "1") return;
      sessionStorage.setItem("sonar_splash_visto", "1");
    } catch {
      // localStorage bloqueado → skip
      return;
    }
    setAtivo(true);
    const fade = setTimeout(() => setFadeOut(true), 2000);
    const remove = setTimeout(() => setAtivo(false), 2600);
    return () => {
      clearTimeout(fade);
      clearTimeout(remove);
    };
  }, []);

  if (!ativo) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "radial-gradient(130% 150% at 50% 50%, #0f2c21, #040706 70%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: fadeOut ? "sonarSplashFadeOut 0.6s ease both" : undefined,
        pointerEvents: "none",
      }}
    >
      <style>{KEYFRAMES}</style>
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {/* Tres pings expandindo (staggered) */}
        <span
          className="sonar-splash-ring"
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%,-50%)",
            borderRadius: "50%",
            border: "1px solid rgba(94,234,212,.55)",
            animation: "sonarPingExpand 1.4s cubic-bezier(.22,.9,.36,1) infinite",
          }}
        />
        <span
          className="sonar-splash-ring"
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%,-50%)",
            borderRadius: "50%",
            border: "1px solid rgba(94,234,212,.45)",
            animation: "sonarPingExpand 1.4s cubic-bezier(.22,.9,.36,1) .22s infinite",
          }}
        />
        <span
          className="sonar-splash-ring"
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%,-50%)",
            borderRadius: "50%",
            border: "1px solid rgba(94,234,212,.35)",
            animation: "sonarPingExpand 1.4s cubic-bezier(.22,.9,.36,1) .44s infinite",
          }}
        />
        {/* Logo pulsando */}
        <div style={{ position: "relative", zIndex: 2, animation: "sonarSplashLogoPop 0.7s ease both" }}>
          <SonarLogo fontSize={44} bgRadarSize={420} bgRadarOpacity={0.7} spinSeconds={6} />
        </div>
      </div>
    </div>
  );
}
