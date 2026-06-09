"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const PRESETS = [
  { id: "hoje", label: "Hoje" },
  { id: "7d", label: "7 dias" },
  { id: "30d", label: "30 dias" },
] as const;

export function PeriodoToggle({ view }: { view: "campanhas" | "atendimentos" }) {
  const router = useRouter();
  const sp = useSearchParams();
  const periodoAtual = sp.get("periodo") || "30d";
  const deAtual = sp.get("de") || "";
  const ateAtual = sp.get("ate") || "";
  const customAtivo = !!(deAtual && ateAtual);

  const [showCustom, setShowCustom] = useState(customAtivo);
  const [de, setDe] = useState(deAtual);
  const [ate, setAte] = useState(ateAtual);

  function aplicarPreset(id: string) {
    const params = new URLSearchParams(sp.toString());
    params.set("view", view);
    params.set("periodo", id);
    params.delete("de");
    params.delete("ate");
    router.push(`/dashboard?${params.toString()}`);
    setShowCustom(false);
  }

  function aplicarCustom() {
    if (!de || !ate) return;
    const params = new URLSearchParams(sp.toString());
    params.set("view", view);
    params.set("de", de);
    params.set("ate", ate);
    params.delete("periodo");
    router.push(`/dashboard?${params.toString()}`);
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
      <div style={{ display: "flex", gap: 4, padding: 4, background: "var(--mk-surface)", borderRadius: 10, border: "0.5px solid var(--mk-border)" }}>
        {PRESETS.map((p) => {
          const active = !customAtivo && p.id === periodoAtual;
          return (
            <button
              key={p.id}
              onClick={() => aplicarPreset(p.id)}
              style={{ padding: "5px 12px", fontSize: 12, borderRadius: 6, border: 0, background: active ? "var(--mk-surface-2)" : "transparent", color: active ? "var(--mk-text)" : "var(--mk-text-muted)", fontWeight: active ? 600 : 400, cursor: "pointer" }}
            >
              {p.label}
            </button>
          );
        })}
        <button
          onClick={() => setShowCustom((s) => !s)}
          style={{ padding: "5px 12px", fontSize: 12, borderRadius: 6, border: 0, background: customAtivo || showCustom ? "var(--mk-surface-2)" : "transparent", color: customAtivo || showCustom ? "var(--mk-text)" : "var(--mk-text-muted)", fontWeight: customAtivo ? 600 : 400, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
        >
          <i className="ti ti-calendar" /> Período X a Y
        </button>
      </div>

      {showCustom && (
        <div style={{ display: "flex", gap: 6, alignItems: "center", padding: 4, background: "var(--mk-surface)", borderRadius: 10, border: "0.5px solid var(--mk-border)" }}>
          <input
            type="date"
            value={de}
            onChange={(e) => setDe(e.target.value)}
            style={{ background: "var(--mk-surface-2)", border: "0.5px solid var(--mk-border)", borderRadius: 6, padding: "5px 8px", color: "var(--mk-text)", fontSize: 11.5, colorScheme: "dark" }}
          />
          <span style={{ fontSize: 11, color: "var(--mk-text-muted)" }}>até</span>
          <input
            type="date"
            value={ate}
            onChange={(e) => setAte(e.target.value)}
            style={{ background: "var(--mk-surface-2)", border: "0.5px solid var(--mk-border)", borderRadius: 6, padding: "5px 8px", color: "var(--mk-text)", fontSize: 11.5, colorScheme: "dark" }}
          />
          <button
            onClick={aplicarCustom}
            disabled={!de || !ate}
            style={{ padding: "5px 10px", fontSize: 11, borderRadius: 6, border: "0.5px solid var(--mk-accent)", background: "var(--mk-accent)", color: "#1a1a1a", cursor: de && ate ? "pointer" : "not-allowed", opacity: de && ate ? 1 : 0.5, fontWeight: 600 }}
          >
            Aplicar
          </button>
        </div>
      )}
    </div>
  );
}

export function ViewToggle({ atual }: { atual: "campanhas" | "atendimentos" }) {
  const router = useRouter();
  const sp = useSearchParams();

  function trocar(view: "campanhas" | "atendimentos") {
    const params = new URLSearchParams(sp.toString());
    params.set("view", view);
    router.push(`/dashboard?${params.toString()}`);
  }

  return (
    <div style={{ display: "flex", gap: 4, padding: 4, background: "var(--mk-surface)", borderRadius: 10, border: "0.5px solid var(--mk-border)", marginBottom: 10, width: "fit-content" }}>
      {(["campanhas", "atendimentos"] as const).map((v) => {
        const active = v === atual;
        return (
          <button
            key={v}
            onClick={() => trocar(v)}
            style={{ padding: "6px 14px", fontSize: 12, borderRadius: 6, border: 0, background: active ? "var(--mk-surface-2)" : "transparent", color: active ? "var(--mk-text)" : "var(--mk-text-muted)", fontWeight: active ? 600 : 400, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
          >
            <i className={`ti ${v === "campanhas" ? "ti-speakerphone" : "ti-messages"}`} />
            {v === "campanhas" ? "Campanhas" : "Atendimentos"}
          </button>
        );
      })}
    </div>
  );
}
