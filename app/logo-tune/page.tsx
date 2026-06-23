"use client";

import { useState } from "react";
import SonarLogo from "@/components/layout/SonarLogo";

export default function LogoTunePage() {
  const [bgRadarSize, setBgRadarSize] = useState(520);
  const [bgRadarOpacity, setBgRadarOpacity] = useState(0.95);
  const [fontSize, setFontSize] = useState(18);
  const [frameHeight, setFrameHeight] = useState(52);
  const [frameWidth, setFrameWidth] = useState(212);
  const [maskInner, setMaskInner] = useState(52);
  const [maskOuter, setMaskOuter] = useState(92);
  const [offsetY, setOffsetY] = useState(0);

  return (
    <div style={{ minHeight: "100vh", background: "#06100c", color: "#f2f5f4", padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>Logo Tune — SONAR</h1>
      <p style={{ fontSize: 12, color: "#9aa69e", marginBottom: 24 }}>
        Mexe os sliders. Quando ficar bom, copia os valores embaixo e me manda.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 32, alignItems: "start" }}>
        {/* PREVIEW */}
        <div>
          <div style={{ fontSize: 11, color: "#5eead4", letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 8 }}>
            Preview ({frameWidth} × {frameHeight})
          </div>
          <div style={{ background: "linear-gradient(180deg,#0a100e,#070b09)", padding: 20, borderRadius: 12 }}>
            <div
              style={{
                width: frameWidth,
                height: frameHeight,
                position: "relative",
                overflow: "hidden",
                borderBottom: "1px solid rgba(245,158,11,0.6)",
                background: "transparent",
              }}
            >
              <div style={{ position: "absolute", inset: 0, transform: `translateY(${offsetY}px)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <CustomSonarLogo
                  fontSize={fontSize}
                  bgRadarSize={bgRadarSize}
                  bgRadarOpacity={bgRadarOpacity}
                  maskInner={maskInner}
                  maskOuter={maskOuter}
                />
              </div>
            </div>
            <div style={{ fontSize: 10, color: "#9aa69e", marginTop: 6 }}>Linha laranja = border-bottom do `.mk-logo`</div>
          </div>

          <div style={{ marginTop: 24 }}>
            <div style={{ fontSize: 11, color: "#5eead4", letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 8 }}>
              Componente padrão (referência — `<SonarLogo />` atual)
            </div>
            <div style={{ background: "linear-gradient(180deg,#0a100e,#070b09)", padding: 20, borderRadius: 12 }}>
              <div style={{ width: frameWidth, height: frameHeight, position: "relative", overflow: "hidden", borderBottom: "1px solid rgba(245,158,11,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <SonarLogo fontSize={18} bgRadarSize={520} bgRadarOpacity={0.95} />
              </div>
            </div>
          </div>
        </div>

        {/* CONTROLES */}
        <div style={{ background: "#0b1311", border: "1px solid rgba(45,212,160,.14)", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          <Slider label="bgRadarSize" value={bgRadarSize} min={100} max={1200} step={10} onChange={setBgRadarSize} />
          <Slider label="bgRadarOpacity" value={bgRadarOpacity} min={0} max={1} step={0.05} onChange={setBgRadarOpacity} />
          <Slider label="fontSize" value={fontSize} min={10} max={48} step={1} onChange={setFontSize} />
          <Slider label="frameHeight" value={frameHeight} min={32} max={120} step={1} onChange={setFrameHeight} />
          <Slider label="frameWidth (largura sidebar)" value={frameWidth} min={150} max={400} step={1} onChange={setFrameWidth} />
          <Slider label="offsetY (mover logo vertical)" value={offsetY} min={-30} max={30} step={1} onChange={setOffsetY} />
          <hr style={{ border: 0, borderTop: "0.5px solid rgba(255,255,255,0.1)", margin: "4px 0" }} />
          <Slider label="maskInner % (opaco até)" value={maskInner} min={0} max={100} step={1} onChange={setMaskInner} />
          <Slider label="maskOuter % (some até)" value={maskOuter} min={0} max={100} step={1} onChange={setMaskOuter} />

          <div style={{ marginTop: 10, padding: 12, background: "#040706", borderRadius: 8, fontSize: 11, fontFamily: "monospace", whiteSpace: "pre-wrap" }}>
            {JSON.stringify(
              {
                bgRadarSize,
                bgRadarOpacity: Number(bgRadarOpacity.toFixed(2)),
                fontSize,
                frameHeight,
                offsetY,
                maskInner,
                maskOuter,
              },
              null,
              2,
            )}
          </div>
          <button
            onClick={() => {
              const cfg = {
                bgRadarSize,
                bgRadarOpacity: Number(bgRadarOpacity.toFixed(2)),
                fontSize,
                frameHeight,
                offsetY,
                maskInner,
                maskOuter,
              };
              navigator.clipboard.writeText(JSON.stringify(cfg, null, 2));
              alert("Config copiada!");
            }}
            style={{ background: "#4DECB3", color: "#04140d", padding: "8px 14px", borderRadius: 8, border: 0, fontWeight: 700, cursor: "pointer", fontSize: 13 }}
          >
            Copiar JSON
          </button>
        </div>
      </div>
    </div>
  );
}

function Slider({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11 }}>
      <span style={{ color: "#9aa69e", display: "flex", justifyContent: "space-between" }}>
        <span>{label}</span>
        <span style={{ color: "#5eead4", fontFamily: "monospace" }}>{value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: "100%" }}
      />
    </label>
  );
}

function CustomSonarLogo({
  fontSize,
  bgRadarSize,
  bgRadarOpacity,
  maskInner,
  maskOuter,
}: {
  fontSize: number;
  bgRadarSize: number;
  bgRadarOpacity: number;
  maskInner: number;
  maskOuter: number;
}) {
  const oSize = Math.round(fontSize * 1.2);
  const maskGradient = `radial-gradient(circle, #000 ${maskInner}%, transparent ${maskOuter}%)`;
  const keyframes = `
    @keyframes ltSweep { to { transform: rotate(360deg); } }
    @keyframes ltSpin  { to { transform: rotate(360deg); } }
    @keyframes ltBlip  { 0%,42% { opacity: 0; } 56% { opacity: .9; } 100% { opacity: 0; } }
  `;
  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
      <style>{keyframes}</style>
      {/* bg radar */}
      <span
        aria-hidden
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: bgRadarSize,
          height: bgRadarSize,
          opacity: bgRadarOpacity,
          pointerEvents: "none",
          transform: "translate(-50%,-50%)",
          borderRadius: "50%",
          background: "repeating-radial-gradient(circle, transparent 0 15%, rgba(45,212,160,.09) 15% calc(15% + 1px))",
          WebkitMaskImage: maskGradient,
          maskImage: maskGradient,
        }}
      >
        <span style={{ position: "absolute", inset: 0, borderRadius: "50%", animation: "ltSpin 8s linear infinite" }}>
          <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "conic-gradient(from 0deg, transparent 0 275deg, rgba(45,212,160,.04) 300deg, rgba(94,234,212,.22) 360deg)" }} />
          <span style={{ position: "absolute", left: "50%", top: 0, width: 1, height: "100%", background: "rgba(45,212,160,.08)", transform: "translateX(-50%)" }} />
          <span style={{ position: "absolute", left: 0, top: "50%", width: "100%", height: 1, background: "rgba(45,212,160,.08)", transform: "translateY(-50%)" }} />
        </span>
      </span>

      {/* SONAR text */}
      <span style={{ position: "relative", zIndex: 2, display: "inline-flex", alignItems: "center" }}>
        <span style={{ fontWeight: 800, letterSpacing: ".16em", color: "#f2f5f4", lineHeight: 1, fontSize }}>S</span>
        <span
          style={{
            position: "relative",
            display: "inline-block",
            width: oSize,
            height: oSize,
            margin: "0 1px",
            borderRadius: "50%",
            background:
              "repeating-radial-gradient(circle, transparent 0 28%, rgba(45,212,160,.18) 28% calc(28% + 1px), transparent calc(28% + 1px) 56%, rgba(45,212,160,.18) 56% calc(56% + 1px))",
            boxShadow: "inset 0 0 0 1px rgba(45,212,160,.32), 0 0 14px rgba(45,212,160,.12)",
          }}
        >
          <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "conic-gradient(from 0deg, transparent 0 290deg, rgba(45,212,160,.06) 315deg, rgba(94,234,212,.6) 360deg)", WebkitMaskImage: "radial-gradient(circle, #000 58%, transparent 73%)", maskImage: "radial-gradient(circle, #000 58%, transparent 73%)", animation: "ltSweep 2.6s linear infinite" }} />
          <span style={{ position: "absolute", left: "50%", top: "50%", width: 4, height: 4, borderRadius: "50%", background: "#5eead4", transform: "translate(-50%,-50%)", boxShadow: "0 0 6px #2dd4a0" }} />
          <span style={{ position: "absolute", left: "67%", top: "33%", width: 5, height: 5, borderRadius: "50%", background: "#5eead4", transform: "translate(-50%,-50%)", animation: "ltBlip 2.6s ease-in-out infinite" }} />
        </span>
        <span style={{ fontWeight: 800, letterSpacing: ".16em", color: "#f2f5f4", lineHeight: 1, fontSize }}>NAR</span>
      </span>
    </span>
  );
}
