"use client";

import { revogarTokenMCP } from "./_actions";

export function RevogarBtn({ id, nome }: { id: string; nome: string }) {
  return (
    <form
      action={revogarTokenMCP}
      style={{ display: "inline" }}
      onSubmit={(e) => {
        if (!confirm(`Revogar "${nome}"? O token deixa de funcionar imediatamente.`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="ghost-btn" style={{ fontSize: 11, color: "#C97064" }}>
        <i className="ti ti-trash" /> Revogar
      </button>
    </form>
  );
}
