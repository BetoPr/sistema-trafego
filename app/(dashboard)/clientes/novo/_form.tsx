"use client";

import { useActionState } from "react";
import Link from "next/link";
import { criarClienteAction, type ClienteFormState } from "../actions";

export function NovoClienteForm() {
  const [state, action, pending] = useActionState<ClienteFormState, FormData>(
    criarClienteAction,
    undefined
  );

  return (
    <form action={action} className="mk-card mk-card-lg" style={{ maxWidth: 560 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label htmlFor="nome" style={{ display: "block", fontSize: 12, color: "var(--mk-text-secondary)", marginBottom: 6 }}>
            Nome do cliente *
          </label>
          <input
            id="nome"
            name="nome"
            required
            placeholder="Ex: Bruno Odonto"
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: 8,
              border: "0.5px solid var(--mk-border)",
              background: "var(--mk-surface-2)",
              color: "var(--mk-text)",
              fontSize: 13,
              fontFamily: "inherit",
            }}
          />
          {state?.fieldErrors?.nome && (
            <p style={{ fontSize: 11, color: "#C97064", marginTop: 4 }}>{state.fieldErrors.nome}</p>
          )}
        </div>

        <div>
          <label htmlFor="segmento" style={{ display: "block", fontSize: 12, color: "var(--mk-text-secondary)", marginBottom: 6 }}>
            Segmento
          </label>
          <input
            id="segmento"
            name="segmento"
            placeholder="Ex: e-commerce, infoproduto, saúde"
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: 8,
              border: "0.5px solid var(--mk-border)",
              background: "var(--mk-surface-2)",
              color: "var(--mk-text)",
              fontSize: 13,
              fontFamily: "inherit",
            }}
          />
        </div>

        {state?.error && (
          <p style={{ fontSize: 12, color: "#C97064" }}>{state.error}</p>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <button type="submit" disabled={pending} className="cta-btn">
            {pending ? "Salvando..." : "Criar cliente"}
          </button>
          <Link href="/clientes" className="ghost-btn">Cancelar</Link>
        </div>
      </div>
    </form>
  );
}
