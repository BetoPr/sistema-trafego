import { requireAuth } from "@/lib/crm/permissions";
import { createServiceClient } from "@/lib/supabase/service";
import { decryptToken, byteaToBuffer } from "@/lib/crypto/tokens";
import { instanceListGroups } from "@/lib/uazapi/client";

interface PageProps {
  searchParams: Promise<{ canal?: string }>;
}

export default async function GruposPage({ searchParams }: PageProps) {
  const ctx = await requireAuth();
  const sp = await searchParams;
  const sb = createServiceClient();

  const { data: canais } = await sb
    .from("canais")
    .select("id, nome, status, instance_token_encrypted, servidor:super_admin_servidores(base_url)")
    .eq("agencia_id", ctx.agenciaId)
    .eq("status", "connected")
    .order("numero");

  const canalSel = sp.canal ? canais?.find((c) => c.id === sp.canal) : canais?.[0];
  let grupos: Array<{ id: string; subject: string; participantsCount?: number }> = [];
  let erro: string | null = null;

  if (canalSel) {
    try {
      const baseUrl = (canalSel as unknown as { servidor: { base_url: string } }).servidor.base_url;
      const token = decryptToken(byteaToBuffer(canalSel.instance_token_encrypted));
      const r = await instanceListGroups({ baseUrl, token });
      grupos = r.map((g) => ({ id: g.id, subject: g.subject, participantsCount: g.participants?.length }));
    } catch (e) {
      erro = e instanceof Error ? e.message : String(e);
    }
  }

  return (
    <section className="mk-page">
      <div className="mk-page-head">
        <div className="mk-eyebrow">Comunicação</div>
        <h1 className="mk-page-title">Grupos</h1>
        <p className="mk-page-sub">Liste grupos WhatsApp do canal conectado.</p>
      </div>

      <form method="get" style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 11, color: "var(--mk-text-muted)", display: "block", marginBottom: 4 }}>Canal</label>
        <select name="canal" defaultValue={canalSel?.id || ""} style={{ padding: "8px 12px", borderRadius: 8, border: "0.5px solid var(--mk-border)", background: "var(--mk-surface-2)", color: "var(--mk-text)", fontSize: 12.5, minWidth: 280 }}>
          {(canais || []).length === 0 ? <option value="">Nenhum canal conectado</option> : null}
          {canais?.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        <button type="submit" className="ghost-btn" style={{ marginLeft: 8 }}>Listar</button>
      </form>

      {erro && <div style={{ padding: 12, background: "rgba(201,112,100,0.12)", borderRadius: 8, fontSize: 12, color: "#C97064", marginBottom: 14 }}>UAZAPI erro: {erro}</div>}

      <div className="mk-card mk-card-lg">
        <h3 className="card-title" style={{ marginBottom: 14 }}>Grupos ({grupos.length})</h3>
        {grupos.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: "var(--mk-text-muted)", fontSize: 13 }}>
            {canalSel ? "Sem grupos." : "Selecione um canal conectado acima."}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {grupos.map((g) => (
              <div key={g.id} style={{ display: "flex", gap: 10, padding: "10px 12px", borderRadius: 8, border: "0.5px solid var(--mk-border)", background: "var(--mk-surface)" }}>
                <i className="ti ti-users" style={{ color: "#9B7DBF" }} />
                <div style={{ flex: 1, fontSize: 12.5 }}>{g.subject}</div>
                {g.participantsCount !== undefined && <span style={{ fontSize: 11, color: "var(--mk-text-muted)" }}>{g.participantsCount} membros</span>}
                <span style={{ fontSize: 10, fontFamily: "monospace", color: "var(--mk-text-muted)" }}>{g.id}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
