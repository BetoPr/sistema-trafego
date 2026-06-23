export default function LoadingAnaliseIAs() {
  return (
    <section className="mk-page">
      <div className="mk-page-head">
        <div className="mk-eyebrow">Configuração · IA</div>
        <h1 className="mk-page-title">Análise de IAs</h1>
        <p className="mk-page-sub">Carregando…</p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: 10,
          marginBottom: 14,
        }}
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <Skel key={i} h={70} />
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
          gap: 10,
          marginBottom: 14,
        }}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <Skel key={i} h={70} />
        ))}
      </div>

      <Skel h={70} />
      <Skel h={150} />
      <Skel h={180} />

      <style>{`
        @keyframes pulse-load { 0%,100%{opacity:.55} 50%{opacity:.95} }
      `}</style>
    </section>
  );
}

function Skel({ h }: { h: number }) {
  return (
    <div
      className="mk-card"
      style={{
        height: h,
        marginBottom: 10,
        background:
          "linear-gradient(90deg, var(--mk-surface) 0%, var(--mk-surface-2) 50%, var(--mk-surface) 100%)",
        animation: "pulse-load 1.4s ease-in-out infinite",
      }}
    />
  );
}
