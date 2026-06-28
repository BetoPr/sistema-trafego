"use client";

export function TrancadoBanner() {
  return (
    <div style={{
      background: "linear-gradient(135deg, rgba(255,92,114,0.10), rgba(255,181,71,0.08))",
      border: "1px solid rgba(255,92,114,0.35)",
      borderRadius: 14,
      padding: "18px 22px",
      marginBottom: 18,
      display: "flex",
      alignItems: "flex-start",
      gap: 14,
    }}>
      <i className="ti ti-lock" style={{ fontSize: 28, color: "#FF5C72", flexShrink: 0, marginTop: 2 }} />
      <div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#FF5C72", marginBottom: 4 }}>
          Sua licença está trancada
        </div>
        <div style={{ fontSize: 13, color: "var(--mk-text)", lineHeight: 1.6 }}>
          O acesso ao restante do CRM está temporariamente bloqueado até a regularização do pagamento.
          Suas mensagens continuam chegando e nada é apagado. Pague aqui mesmo via WhatsApp e o cadeado
          é removido na hora.
        </div>
      </div>
    </div>
  );
}
