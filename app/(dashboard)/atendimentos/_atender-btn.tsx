"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  ticketId: string;
}

export function AtenderBotao({ ticketId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function atender() {
    setLoading(true);
    try {
      const r = await fetch(`/api/atendimentos/${ticketId}/atender`, { method: "POST" });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        alert(`Falha: ${j.error || r.statusText}`);
        return;
      }
      router.push(`/atendimentos?tab=aberto&t=${ticketId}`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button onClick={atender} disabled={loading} className="cta-btn" style={{ fontSize: 11 }}>
      <i className="ti ti-arrow-narrow-right" /> {loading ? "Atendendo..." : "Atender"}
    </button>
  );
}
