import { requireAdmin } from "@/lib/crm/permissions";
import { createServiceClient } from "@/lib/supabase/service";
import { FollowUpClient } from "./_client";

export const dynamic = "force-dynamic";

export default async function FollowUpPage() {
  const ctx = await requireAdmin();
  const sb = createServiceClient();

  const [{ data: sequencias }, { data: fila }] = await Promise.all([
    sb
      .from("follow_up_sequencias")
      .select("id, nome, descricao, ativo, delay_min_seg, delay_max_seg, janela_inicio, janela_fim, teto_dia, etapas:follow_up_etapas(id, ordem, apos_horas, mensagens)")
      .eq("agencia_id", ctx.agenciaId)
      .order("created_at", { ascending: false }),
    sb
      .from("follow_up_inscricoes")
      .select("id, status, etapa_atual, proximo_envio_em, criado_em, sequencia:follow_up_sequencias(nome), contato:contatos(nome, whatsapp)")
      .eq("agencia_id", ctx.agenciaId)
      .in("status", ["ativo", "pausado"])
      .order("proximo_envio_em", { ascending: true })
      .limit(200),
  ]);

  return (
    <section className="mk-page">
      <div className="mk-page-head">
        <div className="mk-eyebrow">Atendimentos</div>
        <h1 className="mk-page-title">Follow-up</h1>
        <p className="mk-page-sub">Sequências automáticas de mensagens. Pausa sozinho quando o cliente responde.</p>
      </div>

      <FollowUpClient
        sequencias={(sequencias as never) || []}
        fila={(fila as never) || []}
      />
    </section>
  );
}
