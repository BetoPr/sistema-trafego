"use client";

import { useActionState } from "react";
import { editarClienteAction, type ClienteFormState } from "../../actions";
import { ClienteFields, type ClienteFormDefaults } from "../../_form-fields";

interface Props {
  clienteId: string;
  defaults: ClienteFormDefaults;
}

export function EditarClienteForm({ clienteId, defaults }: Props) {
  const action = editarClienteAction.bind(null, clienteId);
  const [state, formAction] = useActionState<ClienteFormState, FormData>(
    action,
    undefined,
  );

  return (
    <form action={formAction}>
      <ClienteFields
        defaults={defaults}
        fieldErrors={state?.fieldErrors}
        globalError={state?.error}
        submitLabel="Salvar alterações"
        submitLabelPending="Salvando..."
        cancelHref={`/clientes/${clienteId}`}
      />
    </form>
  );
}
