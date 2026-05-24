import Link from "next/link";
import { requireUserWithAgencia } from "@/lib/auth";
import { ClientesLista, type ClienteListItem } from "./_lista";

export default async function ClientesPage() {
  const { supabase, usuario } = await requireUserWithAgencia();

  const { data: clientesRaw } = await supabase
    .from("clientes")
    .select("id, nome, slug, segmento, status, valor_mensal, created_at")
    .eq("agencia_id", usuario.agencia_id)
    .is("deleted_at", null)
    .order("nome");

  const { data: integsRaw } = await supabase
    .from("integracoes")
    .select("cliente_id, status, ultima_sync")
    .eq("agencia_id", usuario.agencia_id);

  const integsByCliente = new Map<
    string,
    { ativas: number; ultima_sync: string | null }
  >();
  for (const i of integsRaw ?? []) {
    const cur = integsByCliente.get(i.cliente_id) ?? { ativas: 0, ultima_sync: null };
    if (i.status === "ativa") cur.ativas += 1;
    if (i.ultima_sync && (!cur.ultima_sync || i.ultima_sync > cur.ultima_sync)) {
      cur.ultima_sync = i.ultima_sync;
    }
    integsByCliente.set(i.cliente_id, cur);
  }

  const lista: ClienteListItem[] = (clientesRaw ?? []).map((c) => {
    const info = integsByCliente.get(c.id);
    return {
      id: c.id,
      nome: c.nome,
      slug: c.slug,
      segmento: c.segmento,
      status: c.status,
      valor_mensal: c.valor_mensal != null ? Number(c.valor_mensal) : null,
      integracoes_ativas: info?.ativas ?? 0,
      ultima_sync: info?.ultima_sync ?? null,
      created_at: c.created_at,
    };
  });

  return (
    <section className="mk-page">
      <div
        className="mk-page-head"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div className="mk-eyebrow">CRM</div>
          <h1 className="mk-page-title">Clientes</h1>
          <p className="mk-page-sub">{lista.length} cliente(s) sob sua gestão.</p>
        </div>
        <Link href="/clientes/novo" className="cta-btn">
          <i className="ti ti-plus" style={{ fontSize: 14 }} />
          Novo cliente
        </Link>
      </div>

      {lista.length === 0 ? (
        <div
          className="mk-card mk-card-lg"
          style={{ textAlign: "center", padding: "60px 30px" }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: "rgba(139, 111, 71, 0.18)",
              color: "#C9A876",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <i className="ti ti-users" style={{ fontSize: 32 }} />
          </div>
          <h3
            style={{
              fontSize: 17,
              fontWeight: 600,
              color: "var(--mk-text)",
              marginBottom: 8,
            }}
          >
            Nenhum cliente cadastrado
          </h3>
          <p
            style={{
              fontSize: 12.5,
              color: "var(--mk-text-secondary)",
              maxWidth: 460,
              margin: "0 auto 16px",
            }}
          >
            Cadastre seu primeiro cliente pra começar a organizar campanhas e
            integrações Meta Ads.
          </p>
          <Link
            href="/clientes/novo"
            className="cta-btn"
            style={{ display: "inline-flex", margin: "8px auto 0" }}
          >
            <i className="ti ti-plus" style={{ fontSize: 14 }} />
            Cadastrar primeiro cliente
          </Link>
        </div>
      ) : (
        <ClientesLista clientes={lista} />
      )}
    </section>
  );
}
