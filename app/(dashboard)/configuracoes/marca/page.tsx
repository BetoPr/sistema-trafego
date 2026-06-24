import { requireUserWithAgencia } from "@/lib/auth";
import { salvarMarca } from "./_actions";
import { MarcaCliente } from "./_client";

export default async function MarcaPage({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const sp = await searchParams;
  const { supabase, usuario } = await requireUserWithAgencia();
  const { data: ag } = await supabase
    .from("agencias")
    .select("nome, logo_url, logo_modo, logo_layout")
    .eq("id", usuario.agencia_id)
    .single();

  return (
    <section className="mk-page">
      <div className="mk-page-head">
        <div className="mk-eyebrow">Configurações</div>
        <h1 className="mk-page-title">Marca / Logo</h1>
        <p className="mk-page-sub">Personalize o logo que aparece na sidebar e em e-mails. Multi-agência: cada agência tem sua marca.</p>
      </div>

      {sp.ok === "salvo" && (
        <div style={{ marginBottom: 14, padding: 12, background: "rgba(0,225,154,.10)", border: ".5px solid rgba(0,225,154,.32)", borderRadius: 9, fontSize: 12.5, color: "#00E19A" }}>
          <i className="ti ti-circle-check" /> Marca atualizada. Recarregue a página pra ver na sidebar.
        </div>
      )}

      <MarcaCliente
        nome={ag?.nome || "Sonar"}
        logoUrl={ag?.logo_url ?? null}
        modo={(ag?.logo_modo as "texto" | "logo" | "logo_texto") || "texto"}
        layout={(ag?.logo_layout as "horizontal" | "vertical") || "horizontal"}
        action={salvarMarca}
      />
    </section>
  );
}
