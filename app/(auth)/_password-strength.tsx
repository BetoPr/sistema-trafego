"use client";

import { useMemo } from "react";

/**
 * Avalia senha em 5 nivel: Muito fraca, Fraca, Boa, Forte, Excelente.
 * Criterios:
 *   - 8+ caracteres
 *   - maiuscula
 *   - minuscula
 *   - numero
 *   - especial
 *   - bonus 12+ caracteres
 */
export type ResultadoSenha = {
  ok: boolean;
  score: number; // 0..5
  nivel: string;
  cor: string;
  regras: { label: string; ok: boolean }[];
};

const FRACAS = new Set([
  "12345678", "password", "senha123", "qwerty123", "abc12345",
  "11111111", "00000000", "12341234", "admin123", "sonar123",
]);

export function validarSenhaForte(s: string): ResultadoSenha {
  const regras = [
    { label: "Mínimo 8 caracteres", ok: s.length >= 8 },
    { label: "Letra maiúscula (A-Z)", ok: /[A-Z]/.test(s) },
    { label: "Letra minúscula (a-z)", ok: /[a-z]/.test(s) },
    { label: "Número (0-9)", ok: /[0-9]/.test(s) },
    { label: "Caractere especial (!@#$...)", ok: /[^A-Za-z0-9]/.test(s) },
  ];
  let score = regras.filter((r) => r.ok).length;
  if (s.length >= 12 && score === 5) score = 6; // bonus
  if (FRACAS.has(s.toLowerCase())) score = Math.min(score, 1);

  let nivel = "—";
  let cor = "#44504C";
  if (s.length === 0) { nivel = "—"; cor = "#44504C"; }
  else if (score <= 2) { nivel = "Muito fraca"; cor = "#FF5C72"; }
  else if (score === 3) { nivel = "Fraca"; cor = "#F59E0B"; }
  else if (score === 4) { nivel = "Boa"; cor = "#FBBF24"; }
  else if (score === 5) { nivel = "Forte"; cor = "#00E19A"; }
  else if (score >= 6) { nivel = "Excelente"; cor = "#00E19A"; }

  const ok = regras.every((r) => r.ok);
  return { ok, score, nivel, cor, regras };
}

export function ForcaSenha({ senha }: { senha: string }) {
  const r = useMemo(() => validarSenhaForte(senha), [senha]);
  if (!senha) return null;
  const barras = 5;
  const preenchidas = Math.min(r.score, barras);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
      {/* Barra de força */}
      <div style={{ display: "flex", gap: 4 }}>
        {Array.from({ length: barras }).map((_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 5,
              borderRadius: 3,
              background: i < preenchidas ? r.cor : "#1F2926",
              transition: "background 200ms ease",
            }}
          />
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 11, color: "#A6B0AC" }}>Força da senha:</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: r.cor }}>{r.nivel}</span>
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 4 }}>
        {r.regras.map((rule, i) => (
          <li
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              color: rule.ok ? "#00E19A" : "#6B7A75",
              transition: "color 200ms ease",
            }}
          >
            <i className={`ti ${rule.ok ? "ti-circle-check-filled" : "ti-circle"}`} style={{ fontSize: 13 }} />
            {rule.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
