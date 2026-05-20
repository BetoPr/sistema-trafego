import Link from "next/link";
import { requireUserWithAgencia } from "@/lib/auth";
import { excluirClienteAction } from "./actions";

export default async function ClientesPage() {
  const { supabase } = await requireUserWithAgencia();
  const { data: clientes } = await supabase
    .from("clientes")
    .select("id, nome, slug, segmento, status, created_at")
    .is("deleted_at", null)
    .order("nome");

  const lista = clientes ?? [];

  return (
    <section className="mk-page">
      <div className="mk-page-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
        <div>
          <div className="mk-eyebrow">CRM</div>
          <h1 className="mk-page-title">Clientes</h1>
          <p className="mk-page-sub">{lista.length} cliente(s) ativo(s) sob sua gestão.</p>
        </div>
        <Link href="/clientes/novo" className="cta-btn">
          <i className="ti ti-plus" style={{ fontSize: 14 }} />
          Novo cliente
        </Link>
      </div>

      {lista.length === 0 ? (
        <div className="mk-card mk-card-lg" style={{ textAlign: "center", padding: "60px 30px" }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(139, 111, 71, 0.18)", color: "#C9A876", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <i className="ti ti-users" style={{ fontSize: 32 }} />
          </div>
          <h3 style={{ fontSize: 17, fontWeight: 600, color: "var(--mk-text)", marginBottom: 8 }}>
            Nenhum cliente cadastrado
          </h3>
          <p style={{ fontSize: 12.5, color: "var(--mk-text-secondary)", maxWidth: 460, margin: "0 auto 16px" }}>
            Cadastre seu primeiro cliente para começar a organizar campanhas e integrações.
          </p>
          <Link href="/clientes/novo" className="cta-btn" style={{ display: "inline-flex", margin: "8px auto 0" }}>
            <i className="ti ti-plus" style={{ fontSize: 14 }} />
            Cadastrar primeiro cliente
          </Link>
        </div>
      ) : (
        <div className="grid-3">
          {lista.map((c) => {
            const iniciais = c.nome.split(" ").map((p: string) => p[0]).join("").slice(0, 2).toUpperCase();
            return (
              <div key={c.id} className="mk-card">
                <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 14 }}>
                  <div className="row-avatar" style={{ width: 44, height: 44, fontSize: 14, background: "linear-gradient(135deg, #8B6F47, #C9A876)" }}>
                    {iniciais}
                  </div>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--mk-text)" }}>{c.nome}</div>
                    <div style={{ fontSize: 11, color: "var(--mk-text-muted)" }}>{c.segmento ?? "—"}</div>
                  </div>
                </div>
                <div style={{ borderTop: "0.5px solid var(--mk-border-soft)", paddingTop: 11, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className={`mk-badge ${c.status === "ativo" ? "b-green" : "b-amber"}`}>
                    {c.status}
                  </span>
                  <form action={excluirClienteAction}>
                    <input type="hidden" name="id" value={c.id} />
                    <button
                      type="submit"
                      className="ghost-btn"
                      style={{ color: "#C97064", borderColor: "rgba(201,112,100,0.3)" }}
                    >
                      <i className="ti ti-trash" style={{ fontSize: 13 }} />
                      Excluir
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
