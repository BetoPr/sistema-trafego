import type { CriativoTop } from "@/lib/meta-ads/queries";

function fmtMoeda(v: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
}

export function CriativosTop({ itens }: { itens: CriativoTop[] }) {
  return (
    <div className="mk-card mk-card-lg" style={{ marginTop: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <i className="ti ti-photo" style={{ fontSize: 16, color: "var(--mk-accent-2)" }} />
        <h3 className="card-title" style={{ margin: 0 }}>Top Criativos</h3>
        <span style={{ marginLeft: "auto", fontSize: 10.5, color: "var(--mk-text-muted)" }}>por gasto</span>
      </div>

      {itens.length === 0 ? (
        <div style={{ padding: 24, textAlign: "center", color: "var(--mk-text-muted)", fontSize: 12.5 }}>
          Sem anúncios com gasto no período.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: 12,
          }}
        >
          {itens.map((c) => (
            <div
              key={c.anuncio_id}
              style={{
                background: "var(--mk-surface-2)",
                border: ".5px solid var(--mk-border)",
                borderRadius: 10,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  aspectRatio: "1 / 1",
                  background: "var(--mk-bg-deep)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                {c.thumbnail_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.thumbnail_url}
                    alt={c.nome}
                    loading="lazy"
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                ) : (
                  <i className="ti ti-photo-off" style={{ fontSize: 28, color: "var(--mk-text-muted)" }} />
                )}
              </div>
              <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 4 }}>
                <div
                  title={c.nome}
                  style={{
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: "var(--mk-text)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    minHeight: 28,
                    lineHeight: 1.3,
                  }}
                >
                  {c.nome}
                </div>
                <div
                  title={c.campanha_nome}
                  style={{ fontSize: 10, color: "var(--mk-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                >
                  <i className="ti ti-speakerphone" style={{ fontSize: 9, marginRight: 3 }} />
                  {c.campanha_nome}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 11 }}>
                  <span style={{ color: "var(--mk-text)", fontWeight: 700 }}>{fmtMoeda(c.gasto)}</span>
                  <span style={{ color: "var(--mk-text-muted)" }}>
                    {c.leads > 0 ? `${c.leads} leads` : c.conversoes > 0 ? `${c.conversoes} conv` : "—"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
