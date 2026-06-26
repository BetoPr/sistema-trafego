/**
 * Loading da página de Instâncias.
 *
 * `listarInstanciasServidores` faz fetch nos servidores UAZAPI (rede, lento).
 * Sem este boundary, o App Router segura a navegação até o RSC resolver e a
 * tela parece "travada" (clique não navega; só abrir em nova aba dava feedback).
 * Com o loading, a navegação acontece na hora mostrando o esqueleto.
 */
export default function Loading() {
  return (
    <section className="mk-page">
      <div className="mk-page-head">
        <div className="mk-eyebrow" style={{ color: "#C97064" }}>Super Admin · Acesso exclusivo</div>
        <h1 className="mk-page-title">Instâncias</h1>
        <p className="mk-page-sub">Carregando instâncias dos servidores…</p>
      </div>

      <div className="mk-card mk-card-lg">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: 40, color: "var(--mk-text-muted)", fontSize: 13 }}>
          <i className="ti ti-loader-2" style={{ fontSize: 20, animation: "spin 0.7s linear infinite" }} />
          Buscando instâncias…
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      </div>
    </section>
  );
}
