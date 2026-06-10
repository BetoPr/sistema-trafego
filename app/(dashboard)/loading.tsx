/**
 * Loading global do dashboard — aparece INSTANTANEAMENTE em qualquer navegação
 * enquanto o server component da rota carrega. Sem ele, o clique parecia morto
 * por 1-2s (tela congelada até o RSC responder).
 */
export default function DashboardLoading() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", flexDirection: "column", gap: 14 }}>
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: "50%",
          border: "3px solid var(--mk-border)",
          borderTopColor: "var(--mk-accent)",
          animation: "mk-spin 0.7s linear infinite",
        }}
      />
      <div style={{ fontSize: 12, color: "var(--mk-text-muted)" }}>Carregando…</div>
      <style>{`@keyframes mk-spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}
