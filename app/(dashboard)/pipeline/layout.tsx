import { PipelineTabs } from "./_tabs";

export default function PipelineLayout({ children }: { children: React.ReactNode }) {
  return (
    <section className="mk-page" style={{ paddingBottom: 0 }}>
      <div className="mk-page-head" style={{ marginBottom: 8 }}>
        <div className="mk-eyebrow">RECURSOS · PIPELINE</div>
        <h1 className="mk-page-title" style={{ display: "inline-flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          Pipeline
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, padding: "3px 9px", borderRadius: 999, background: "rgba(255,181,71,0.15)", color: "#FFB547", border: "1px solid rgba(255,181,71,0.4)", textTransform: "uppercase" }}>
            <i className="ti ti-tool" style={{ fontSize: 10, marginRight: 4 }} /> Em desenvolvimento
          </span>
        </h1>
        <p className="mk-page-sub">Funis, etapas, dashboards e organização por etiquetas.</p>
      </div>

      <PipelineTabs />

      {children}
    </section>
  );
}
