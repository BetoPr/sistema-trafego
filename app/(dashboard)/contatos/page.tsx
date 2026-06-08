import Link from "next/link";
import { requireAuth } from "@/lib/crm/permissions";
import { createServiceClient } from "@/lib/supabase/service";
import { criarContato, atualizarContato, deletarContato } from "./_actions";

interface PageProps {
  searchParams: Promise<{ ok?: string; erro?: string; msg?: string; editar?: string; novo?: string; q?: string }>;
}

function fmtWhats(n: string | null): string {
  if (!n) return "—";
  if (n.length === 13) return `+${n.slice(0, 2)} (${n.slice(2, 4)}) ${n.slice(4, 9)}-${n.slice(9)}`;
  if (n.length === 12) return `+${n.slice(0, 2)} (${n.slice(2, 4)}) ${n.slice(4, 8)}-${n.slice(8)}`;
  return n;
}

export default async function ContatosPage({ searchParams }: PageProps) {
  const ctx = await requireAuth();
  const sp = await searchParams;
  const sb = createServiceClient();

  let q = sb
    .from("contatos")
    .select("id, nome, whatsapp, email, empresa, cidade, foto_url, created_at, etiquetas:contato_etiquetas(etiqueta:etiquetas(id, nome, cor))")
    .eq("agencia_id", ctx.agenciaId)
    .is("deleted_at", null);

  if (sp.q) {
    q = q.or(`nome.ilike.%${sp.q}%,whatsapp.ilike.%${sp.q}%,email.ilike.%${sp.q}%,empresa.ilike.%${sp.q}%`);
  }

  const { data: contatos } = await q.order("nome").limit(200);

  const editando = sp.editar ? contatos?.find((c) => c.id === sp.editar) : null;
  const mostrarForm = !!editando || sp.novo === "1";

  return (
    <section className="mk-page">
      <div className="mk-page-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div className="mk-eyebrow">Atendimento</div>
          <h1 className="mk-page-title">Contatos</h1>
          <p className="mk-page-sub">Base de contatos da agência. Importação CSV em breve.</p>
        </div>
        {!mostrarForm && <Link href="/contatos?novo=1" className="cta-btn"><i className="ti ti-plus" /> Adicionar contato</Link>}
      </div>

      {sp.ok && <Banner tipo="ok">{labelOk(sp.ok)}</Banner>}
      {sp.erro && <Banner tipo="erro">{labelErr(sp.erro)} {sp.msg && `— ${decodeURIComponent(sp.msg)}`}</Banner>}

      <form method="get" style={{ marginBottom: 14, display: "flex", gap: 8 }}>
        <input name="q" defaultValue={sp.q || ""} placeholder="Buscar nome, número, email…" style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "0.5px solid var(--mk-border)", background: "var(--mk-surface-2)", color: "var(--mk-text)", fontSize: 12.5 }} />
        <button type="submit" className="ghost-btn"><i className="ti ti-search" /></button>
      </form>

      {mostrarForm && (
        <div className="mk-card mk-card-lg" style={{ marginBottom: 14 }}>
          <h3 className="card-title" style={{ marginBottom: 14 }}>{editando ? `Editar — ${editando.nome}` : "Novo contato"}</h3>
          <form action={editando ? atualizarContato : criarContato} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {editando && <input type="hidden" name="id" value={editando.id} />}
            <div style={grid2}>
              <Field label="Nome" name="nome" defaultValue={editando?.nome ?? ""} required />
              <Field label="WhatsApp" name="whatsapp" defaultValue={editando?.whatsapp ?? ""} placeholder="5511999999999" />
            </div>
            <div style={grid2}>
              <Field label="Email" name="email" type="email" defaultValue={editando?.email ?? ""} />
              <Field label="Empresa" name="empresa" defaultValue={editando?.empresa ?? ""} />
            </div>
            <Field label="Cidade" name="cidade" defaultValue={editando?.cidade ?? ""} />
            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" className="cta-btn"><i className="ti ti-device-floppy" /> {editando ? "Salvar" : "Criar"}</button>
              <Link href="/contatos" className="ghost-btn">Cancelar</Link>
            </div>
          </form>
        </div>
      )}

      <div className="mk-card mk-card-lg">
        <h3 className="card-title" style={{ marginBottom: 14 }}>Contatos ({contatos?.length || 0})</h3>
        {!contatos || contatos.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: "var(--mk-text-muted)", fontSize: 13 }}>Sem contatos.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 12.5 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--mk-text-muted)", fontSize: 11 }}>
                <th style={thLi}>Nome</th>
                <th style={thLi}>WhatsApp</th>
                <th style={thLi}>Email</th>
                <th style={thLi}>Empresa</th>
                <th style={thLi}>Tags</th>
                <th style={thLi}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {contatos.map((c) => {
                const tags = ((c.etiquetas as unknown as Array<{ etiqueta: { id: string; nome: string; cor: string } | { id: string; nome: string; cor: string }[] | null }> | null) || [])
                  .map((e) => (Array.isArray(e.etiqueta) ? e.etiqueta[0] : e.etiqueta))
                  .filter((e): e is { id: string; nome: string; cor: string } => !!e);
                return (
                  <tr key={c.id} style={{ borderTop: "0.5px solid var(--mk-border)" }}>
                    <td style={tdLi}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(155,125,191,0.2)", color: "#9B7DBF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600 }}>
                          {c.nome.slice(0, 2).toUpperCase()}
                        </div>
                        {c.nome}
                      </div>
                    </td>
                    <td style={{ ...tdLi, fontFamily: "monospace", fontSize: 11.5 }}>{fmtWhats(c.whatsapp)}</td>
                    <td style={tdLi}>{c.email || "—"}</td>
                    <td style={tdLi}>{c.empresa || "—"}</td>
                    <td style={tdLi}>
                      {tags.length > 0 ? (
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          {tags.map((t) => t && (
                            <span key={t.id} style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: `${t.cor}33`, color: t.cor, border: `0.5px solid ${t.cor}` }}>{t.nome}</span>
                          ))}
                        </div>
                      ) : "—"}
                    </td>
                    <td style={tdLi}>
                      <Link href={`/contatos?editar=${c.id}`} className="ghost-btn" style={iconBtn}><i className="ti ti-edit" /></Link>
                      <form action={deletarContato} style={{ display: "inline", marginLeft: 4 }}>
                        <input type="hidden" name="id" value={c.id} />
                        <button type="submit" className="ghost-btn" style={{ ...iconBtn, color: "#C97064" }}><i className="ti ti-trash" /></button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

function labelOk(k: string) { return ({ criado: "Contato criado.", atualizado: "Atualizado.", deletado: "Removido." } as Record<string, string>)[k] || "OK."; }
function labelErr(k: string) { return ({ nome_vazio: "Nome obrigatório.", db: "Erro no banco." } as Record<string, string>)[k] || "Erro."; }

function Banner({ tipo, children }: { tipo: "ok" | "erro"; children: React.ReactNode }) {
  const cor = tipo === "ok" ? "#6B8E4E" : "#C97064";
  return <div style={{ background: tipo === "ok" ? "rgba(107,142,78,0.12)" : "rgba(201,112,100,0.12)", borderLeft: `3px solid ${cor}`, padding: "10px 14px", borderRadius: 8, fontSize: 12, color: "var(--mk-text-secondary)", marginBottom: 14 }}><i className={`ti ${tipo === "ok" ? "ti-circle-check" : "ti-alert-triangle"}`} style={{ marginRight: 8, color: cor }} />{children}</div>;
}

function Field({ label, name, defaultValue, placeholder, required, type = "text" }: { label: string; name: string; defaultValue?: string; placeholder?: string; required?: boolean; type?: string }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 11, color: "var(--mk-text-muted)", marginBottom: 4, fontFamily: "monospace" }}>{label}{required && <span style={{ color: "#C97064" }}> *</span>}</label>
      <input type={type} name={name} defaultValue={defaultValue} placeholder={placeholder} required={required} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "0.5px solid var(--mk-border)", background: "var(--mk-surface-2)", color: "var(--mk-text)", fontSize: 12.5 }} />
    </div>
  );
}

const grid2: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 };
const iconBtn: React.CSSProperties = { fontSize: 11, padding: "4px 10px" };
const thLi: React.CSSProperties = { padding: "8px 10px" };
const tdLi: React.CSSProperties = { padding: "10px" };
