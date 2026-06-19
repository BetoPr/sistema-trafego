import { requireAdmin } from "@/lib/crm/permissions";
import { createServiceClient } from "@/lib/supabase/service";
import { FollowUpClient } from "./_client";

export const dynamic = "force-dynamic";

export default async function FollowUpPage() {
  const ctx = await requireAdmin();
  const sb = createServiceClient();

  const [{ data: etiquetas }, { data: canais }] = await Promise.all([
    sb
      .from("etiquetas")
      .select("id, nome, cor")
      .eq("agencia_id", ctx.agenciaId)
      .or("categoria.eq.etiqueta,categoria.is.null")
      .eq("ativo", true)
      .order("nome"),
    sb
      .from("canais")
      .select("id, nome, status")
      .eq("agencia_id", ctx.agenciaId)
      .order("nome"),
  ]);

  return (
    <section className="mk-page">
      <div className="mk-page-head">
        <div className="mk-eyebrow">Atendimentos</div>
        <h1 className="mk-page-title">Follow-up com IA</h1>
        <p className="mk-page-sub">Recupera conversas paradas: a IA lê o histórico, resume e sugere a mensagem — você revisa e aprova. Pausa sozinho quando o cliente responde.</p>
      </div>

      <FollowUpClient
        etiquetas={(etiquetas as never) || []}
        canais={(canais as never) || []}
      />
    </section>
  );
}
