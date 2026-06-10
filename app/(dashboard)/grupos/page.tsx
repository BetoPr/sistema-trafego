import { requireAuth } from "@/lib/crm/permissions";
import { createServiceClient } from "@/lib/supabase/service";
import { GestaoGrupos } from "./_gestao";

export const dynamic = "force-dynamic";

export default async function GruposPage() {
  const ctx = await requireAuth();
  const sb = createServiceClient();

  const { data: canais } = await sb
    .from("canais")
    .select("id, nome")
    .eq("agencia_id", ctx.agenciaId)
    .eq("status", "connected")
    .order("nome");

  return (
    <section className="mk-page">
      <div className="mk-page-head">
        <div className="mk-eyebrow">Comunicação</div>
        <h1 className="mk-page-title">Grupos</h1>
        <p className="mk-page-sub">Liste grupos, participantes e exporte contatos pra planilha.</p>
      </div>

      <GestaoGrupos canais={(canais || []) as Array<{ id: string; nome: string }>} />
    </section>
  );
}
