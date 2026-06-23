"use client";

import { useState } from "react";
import { salvarJanelaComercial } from "./_actions";

export interface JanelaInicial {
  inicio: string;
  fim: string;
  almocoAtivo: boolean;
  almocoInicio: string;
  almocoFim: string;
}

// 00:00, 00:30, … 23:30
const HORAS: string[] = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, "0");
  const m = i % 2 === 0 ? "00" : "30";
  return `${h}:${m}`;
});

const selStyle: React.CSSProperties = {
  padding: "5px 8px", borderRadius: 7, border: "0.5px solid var(--mk-border)",
  background: "var(--mk-surface-2)", color: "var(--mk-text)", fontSize: 12, fontFamily: "inherit", colorScheme: "dark",
};

/** Dropdowns de horário comercial + almoço (canto direito do header do Follow-up). */
export function JanelaComercial({ inicial }: { inicial: JanelaInicial }) {
  const [almoco, setAlmoco] = useState(inicial.almocoAtivo);
  const [salvo, setSalvo] = useState(false);
  const [salvando, setSalvando] = useState(false);

  async function onSubmit(fd: FormData) {
    setSalvando(true);
    fd.set("almoco_ativo", almoco ? "true" : "false");
    try {
      await salvarJanelaComercial(fd);
      setSalvo(true);
      setTimeout(() => setSalvo(false), 2500);
    } finally {
      setSalvando(false);
    }
  }

  const Sel = ({ name, def }: { name: string; def: string }) => (
    <select name={name} defaultValue={def} style={selStyle}>
      {HORAS.map((h) => <option key={h} value={h}>{h}</option>)}
    </select>
  );

  return (
    <form action={onSubmit} className="mk-card" style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8, minWidth: 250 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--mk-text-secondary)", marginRight: 2 }}>
          <i className="ti ti-clock-hour-8" style={{ color: "var(--mk-accent)" }} /> Horário comercial
        </span>
        <Sel name="inicio" def={inicial.inicio} />
        <span style={{ fontSize: 11, color: "var(--mk-text-muted)" }}>às</span>
        <Sel name="fim" def={inicial.fim} />
      </div>

      <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--mk-text-secondary)", cursor: "pointer" }}>
        <input type="checkbox" checked={almoco} onChange={(e) => setAlmoco(e.target.checked)} /> Horário de almoço
      </label>

      {almoco && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: "var(--mk-text-muted)", minWidth: 44 }}>almoço</span>
          <Sel name="almoco_inicio" def={inicial.almocoInicio} />
          <span style={{ fontSize: 11, color: "var(--mk-text-muted)" }}>volta</span>
          <Sel name="almoco_fim" def={inicial.almocoFim} />
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button type="submit" className="cta-btn" style={{ fontSize: 11.5, padding: "5px 12px" }} disabled={salvando}>
          <i className={`ti ${salvando ? "ti-loader-2" : "ti-device-floppy"}`} /> {salvando ? "Salvando…" : "Salvar"}
        </button>
        {salvo && <span style={{ fontSize: 11, color: "#00E19A" }}><i className="ti ti-circle-check" /> salvo</span>}
        <span style={{ fontSize: 10, color: "var(--mk-text-muted)", marginLeft: "auto" }}>fora disso, o follow-up adia</span>
      </div>
    </form>
  );
}
