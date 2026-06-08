import { requireAuth } from "@/lib/crm/permissions";
import { createServiceClient } from "@/lib/supabase/service";

export default async function GaleriaPage() {
  const ctx = await requireAuth();
  const sb = createServiceClient();

  const { data: lista } = await sb.storage
    .from("crm-media")
    .list(ctx.agenciaId, { limit: 200, sortBy: { column: "created_at", order: "desc" } });

  return (
    <section className="mk-page">
      <div className="mk-page-head">
        <div className="mk-eyebrow">Comunicação</div>
        <h1 className="mk-page-title">Galeria</h1>
        <p className="mk-page-sub">Mídias armazenadas no bucket crm-media (áudios, imagens, docs recebidos via WhatsApp).</p>
      </div>

      <div className="mk-card mk-card-lg">
        <h3 className="card-title" style={{ marginBottom: 14 }}>Arquivos ({lista?.length || 0})</h3>
        {!lista || lista.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: "var(--mk-text-muted)", fontSize: 13 }}>
            Sem mídias. Mensagens com áudio/imagem entrando via UAZAPI alimentam aqui automaticamente.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
            {lista.map((f) => (
              <div key={f.name} style={{ padding: "10px 12px", borderRadius: 8, border: "0.5px solid var(--mk-border)", background: "var(--mk-surface)" }}>
                <div style={{ fontSize: 11, fontFamily: "monospace", color: "var(--mk-text-secondary)", wordBreak: "break-all" }}>
                  {f.name}
                </div>
                {f.metadata?.size && (
                  <div style={{ fontSize: 10, color: "var(--mk-text-muted)", marginTop: 4 }}>
                    {(f.metadata.size / 1024).toFixed(1)} KB
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
