"use client";

import { useActionState } from "react";
import { criarClienteAction, type ClienteFormState } from "../actions";
import { ClienteFields } from "../_form-fields";

export function NovoClienteForm() {
  const [state, action] = useActionState<ClienteFormState, FormData>(
    criarClienteAction,
    undefined,
  );

  return (
    <form action={action}>
      <ClienteFields
        fieldErrors={state?.fieldErrors}
        globalError={state?.error}
        submitLabel="Criar cliente"
        submitLabelPending="Salvando..."
        cancelHref="/clientes"
      />
    </form>
  );
}
