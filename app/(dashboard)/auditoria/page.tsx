import Link from "next/link";
import { requireAdmin } from "@/lib/crm/permissions";
import { createServiceClient } from "@/lib/supabase/service";

interface PageProps {
  searchParams: Promise<{ acao?: string; entidade?: string; usuario?: string; di?: string; df?: string; page?: string }>;
}

const PAGE_SIZE = 50;

export default async function AuditoriaPage({ searchParams }: PageProps) {
  const ctx = await requireAdmin();
  const sp = await searchParams;
  const sb = createServiceClient();
  const page = Math.max(1, Number(sp.page) || 1);

  let q = sb
    .from("audit_logs")
    .select("id, acao, entidade, entidade_id, metodo, caminho, status, ip, payload, created_at, usuario:usuarios(nome, email)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (ctx.role !== "super_admin") q = q.eq("agencia_id", ctx.agenciaId);
  if (sp.acao) q = q.eq("acao", sp.acao);
  if (sp.entidade) q = q.eq("entidade", sp.entidade);
  if (sp.usuario) q = q.eq("usuario_id", sp.usuario);
  if (sp.di) q = q.gte("created_at", sp.di);
  if (sp.df) q = q.lte("created_at", sp.df);

  const { data: logs, count } = await q;
  const total = count || 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const { data: usuarios } = await sb
    .from("usuarios")
    .select("id, nome, email")
    .eq("agencia_id", ctx.agenciaId)
    .is("deleted_at", null)
    .order("nome");

  return (
    <section className="mk-page">
      <div className="mk-page-head">
        <div className="mk-eyebrow">Configuração · Auditoria</div>
        <h1 className="mk-page-title">Log de Auditoria</h1>
        <p className="mk-page-sub">Rastreio de ações no sistema. {total} registro(s).</p>
      </div>

      <form method="get" className="mk-card mk-card-lg" style={{ marginBottom: 14, display: "grid", gridTemplateColumns: "repeat(5, 1fr) auto", gap: 8, alignItems: "end" }}>
        <div><Label>Ação</Label><input name="acao" defaultValue={sp.acao || ""} placeholder="create, update..." style={inp} /></div>
        <div><Label>Entidade</Label><input name="entidade" defaultValue={sp.entidade || ""} placeholder="ticket, canal..." style={inp} /></div>
        <div>
          <Label>Usuário</Label>
          <select name="usuario" defaultValue={sp.usuario || ""} style={inp}>
            <option value="">Todos</option>
            {usuarios?.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </select>
        </div>
        <div><Label>De</Label><input type="date" name="di" defaultValue={sp.di || ""} style={inp} /></div>
        <div><Label>Até</Label><input type="date" name="df" defaultValue={sp.df || ""} style={inp} /></div>
        <button type="submit" className="cta-btn"><i className="ti ti-search" /> Filtrar</button>
      </form>

      <div className="mk-card mk-card-lg">
        {!logs || logs.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: "var(--mk-text-muted)", fontSize: 13 }}>Sem registros.</div>
        ) : (
          <>
            <table style={{ width: "100%", fontSize: 11.5 }}>
              <thead>
                <tr style={{ color: "var(--mk-text-muted)", fontSize: 10.5, textAlign: "left" }}>
                  <th style={th}>Data/Hora</th>
                  <th style={th}>Usuário</th>
                  <th style={th}>Ação</th>
                  <th style={th}>Entidade</th>
                  <th style={th}>Caminho</th>
                  <th style={th}>Status</th>
                  <th style={th}>IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => {
                  const u = l.usuario as unknown as { nome?: string; email?: string } | { nome?: string; email?: string }[] | null;
                  const usr = Array.isArray(u) ? u[0] : u;
                  return (
                    <tr key={l.id} style={{ borderTop: "0.5px solid var(--mk-border)" }}>
                      <td style={td}>{new Date(l.created_at).toLocaleString("pt-BR")}</td>
                      <td style={td}>{usr?.nome || usr?.email || "—"}</td>
                      <td style={td}><span className="mk-badge b-purple" style={{ fontSize: 9.5 }}>{l.acao}</span></td>
                      <td style={td}>{l.entidade || "—"} {l.entidade_id ? <span style={{ color: "var(--mk-text-muted)", fontFamily: "monospace", fontSize: 10 }}>#{String(l.entidade_id).slice(0, 8)}</span> : null}</td>
                      <td style={{ ...td, fontFamily: "monospace", fontSize: 10.5 }}>{l.caminho || "—"}</td>
                      <td style={td}>{l.status ? <span style={{ color: l.status < 300 ? "#00E19A" : "#C97064" }}>{l.status}</span> : "—"}</td>
                      <td style={{ ...td, fontFamily: "monospace", fontSize: 10.5 }}>{l.ip || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14, fontSize: 11 }}>
              <div style={{ color: "var(--mk-text-muted)" }}>Página {page} de {totalPages} · {total} registros</div>
              <div style={{ display: "flex", gap: 4 }}>
                {page > 1 && <Link href={qsLink(sp, page - 1)} className="ghost-btn" style={{ fontSize: 11 }}>← Anterior</Link>}
                {page < totalPages && <Link href={qsLink(sp, page + 1)} className="ghost-btn" style={{ fontSize: 11 }}>Próxima →</Link>}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function qsLink(sp: Record<string, string | undefined>, page: number): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (k !== "page" && v) params.set(k, v);
  }
  params.set("page", String(page));
  return `/auditoria?${params.toString()}`;
}

function Label({ children }: { children: React.ReactNode }) { return <label style={{ display: "block", fontSize: 11, color: "var(--mk-text-muted)", marginBottom: 4, fontFamily: "monospace" }}>{children}</label>; }
const inp: React.CSSProperties = { width: "100%", padding: "8px 12px", borderRadius: 8, border: "0.5px solid var(--mk-border)", background: "var(--mk-surface-2)", color: "var(--mk-text)", fontSize: 12.5 };
const th: React.CSSProperties = { padding: 6 };
const td: React.CSSProperties = { padding: 8, verticalAlign: "middle" };
