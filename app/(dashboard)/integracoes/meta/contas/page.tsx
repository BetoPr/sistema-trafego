import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyPending } from "@/lib/oauth/pending";
import { requireUserWithAgencia } from "@/lib/auth";
import { salvarContaSelecionada, cancelar } from "./actions";

export default async function MetaContasPage() {
  await requireUserWithAgencia();

  const cookieStore = await cookies();
  const pendingRaw = cookieStore.get("meta_pending")?.value;
  if (!pendingRaw) redirect("/integracoes/meta?erro=sessao_expirada");

  let pending;
  try {
    pending = verifyPending(pendingRaw);
  } catch {
    redirect("/integracoes/meta?erro=cookie_invalido");
  }

  // Busca nome do cliente
  const { supabase } = await requireUserWithAgencia();
  const { data: cliente } = await supabase
    .from("clientes")
    .select("id, nome")
    .eq("id", pending.cliente_id)
    .maybeSingle();

  return (
    <section className="mk-page">
      <div className="mk-page-head">
        <Link
          href="/integracoes/meta"
          style={{
            fontSize: 12,
            color: "var(--mk-accent)",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            marginBottom: 8,
          }}
        >
          <i className="ti ti-arrow-left" style={{ fontSize: 13 }} />
          Voltar
        </Link>
        <div className="mk-eyebrow">Meta Ads · Selecionar conta</div>
        <h1 className="mk-page-title">Escolha a conta de anúncios</h1>
        <p className="mk-page-sub">
          Conectando ao cliente <strong>{cliente?.nome || "—"}</strong>. Selecione qual
          ad account Meta vai sincronizar com este cliente.
        </p>
      </div>

      <div className="mk-card mk-card-lg">
        <h3 className="card-title" style={{ marginBottom: 14 }}>
          {pending.ad_accounts.length} conta(s) disponível(eis)
        </h3>

        <form action={salvarContaSelecionada}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {pending.ad_accounts.map((acc, idx) => (
              <label
                key={acc.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: "0.5px solid var(--mk-border)",
                  background: "var(--mk-surface)",
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  name="account_id"
                  value={acc.account_id}
                  defaultChecked={idx === 0}
                  required
                  style={{ accentColor: "var(--mk-accent)" }}
                />
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--mk-text)",
                    }}
                  >
                    {acc.name}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--mk-text-muted)",
                      fontFamily: "monospace",
                      marginTop: 2,
                    }}
                  >
                    {acc.id} · {acc.currency || "—"}
                    {acc.business_name ? ` · ${acc.business_name}` : ""}
                  </div>
                </div>
              </label>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 8,
              marginTop: 18,
            }}
          >
            <button type="submit" formAction={cancelar} className="ghost-btn">
              <i className="ti ti-x" style={{ fontSize: 13 }} /> Cancelar
            </button>
            <button type="submit" className="cta-btn">
              <i className="ti ti-check" style={{ fontSize: 14 }} /> Conectar conta
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
