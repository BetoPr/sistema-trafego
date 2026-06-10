"use client";

import { useFormStatus } from "react-dom";

/**
 * Botão de submit pra forms de server action com:
 * - estado pending (spinner + disabled) → impossível clicar 2x
 * - confirm opcional antes de enviar
 */
export function SubmitIconBtn({
  icon,
  title,
  color,
  confirmMsg,
}: {
  icon: string;
  title: string;
  color?: string;
  confirmMsg?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      title={title}
      onClick={(e) => {
        if (confirmMsg && !confirm(confirmMsg)) e.preventDefault();
      }}
      className="ghost-btn"
      style={{ fontSize: 11, padding: "4px 8px", color: pending ? "var(--mk-text-muted)" : color, opacity: pending ? 0.6 : 1, cursor: pending ? "wait" : "pointer" }}
    >
      <i
        className={`ti ${pending ? "ti-loader-2" : icon}`}
        style={pending ? { animation: "spin 0.8s linear infinite", display: "inline-block" } : undefined}
      />
      {pending && <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>}
    </button>
  );
}
