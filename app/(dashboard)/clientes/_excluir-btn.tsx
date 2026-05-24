"use client";

import { useRef, useTransition } from "react";
import { excluirClienteAction } from "./actions";

interface Props {
  clienteId: string;
  clienteNome: string;
  variant?: "icon" | "full";
}

export function ExcluirClienteBotao({ clienteId, clienteNome, variant = "full" }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  function handleClick() {
    const ok = window.confirm(
      `Excluir cliente "${clienteNome}"?\n\nIntegrações e dados associados serão preservados mas o cliente some das listagens.`,
    );
    if (!ok) return;
    startTransition(() => formRef.current?.requestSubmit());
  }

  return (
    <form ref={formRef} action={excluirClienteAction}>
      <input type="hidden" name="id" value={clienteId} />
      <input type="hidden" name="confirm" value={`delete-${clienteId}`} />
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="ghost-btn"
        style={{ color: "#C97064", borderColor: "rgba(201,112,100,0.3)" }}
        title={`Excluir ${clienteNome}`}
      >
        <i className="ti ti-trash" style={{ fontSize: 13 }} />
        {variant === "full" && (pending ? "Excluindo..." : "Excluir")}
      </button>
    </form>
  );
}
