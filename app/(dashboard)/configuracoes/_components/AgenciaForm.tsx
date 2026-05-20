"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { atualizarAgenciaAction, type ConfigState } from "../actions";

export function AgenciaForm({ nome, slug }: { nome: string; slug: string }) {
  const [state, action, pending] = useActionState<ConfigState, FormData>(atualizarAgenciaAction, undefined);

  useEffect(() => {
    if (state?.ok) toast.success("Agência atualizada.");
    if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <label htmlFor="agencia-nome" style={{ display: "block", fontSize: 12, color: "var(--mk-text-secondary)", marginBottom: 6 }}>
          Nome da agência
        </label>
        <input
          id="agencia-nome"
          name="nome"
          defaultValue={nome}
          required
          style={{
            width: "100%", padding: "8px 12px", borderRadius: 8,
            border: "0.5px solid var(--mk-border)", background: "var(--mk-surface-2)",
            color: "var(--mk-text)", fontSize: 13, fontFamily: "inherit",
          }}
        />
      </div>
      <div>
        <label htmlFor="agencia-slug" style={{ display: "block", fontSize: 12, color: "var(--mk-text-secondary)", marginBottom: 6 }}>
          Slug
        </label>
        <input
          id="agencia-slug"
          defaultValue={slug}
          disabled
          style={{
            width: "100%", padding: "8px 12px", borderRadius: 8,
            border: "0.5px solid var(--mk-border)", background: "var(--mk-surface-2)",
            color: "var(--mk-text-muted)", fontSize: 13, fontFamily: "inherit",
          }}
        />
        <p style={{ fontSize: 10.5, color: "var(--mk-text-muted)", marginTop: 4 }}>
          Slug é definido na criação e não pode mudar.
        </p>
      </div>
      <button type="submit" disabled={pending} className="cta-btn" style={{ alignSelf: "flex-start" }}>
        {pending ? "Salvando..." : "Salvar agência"}
      </button>
    </form>
  );
}
