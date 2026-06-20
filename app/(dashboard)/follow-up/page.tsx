import { requireAdmin } from "@/lib/crm/permissions";
import { createServiceClient } from "@/lib/supabase/service";
import { parseJanela } from "@/lib/crm/janela-comercial";
import { FollowUpClient } from "./_client";
import { JanelaComercial } from "./_janela-comercial";

export const dynamic = "force-dynamic";

export default async function FollowUpPage() {
  const ctx = await requireAdmin();
  const sb = createServiceClient();

  const [{ data: etiquetas }, { data: canais }, { data: cfg }] = await Promise.all([
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
    sb
      .from("configuracoes_agencia")
      .select("ia")
      .eq("agencia_id", ctx.agenciaId)
      .maybeSingle(),
  ]);

  const jp = parseJanela(cfg?.ia);
  const janelaInicial = {
    inicio: jp?.inicio || "08:00",
    fim: jp?.fim || "18:00",
    almocoAtivo: jp?.almocoAtivo ?? false,
    almocoInicio: jp?.almocoInicio || "12:00",
    almocoFim: jp?.almocoFim || "13:00",
  };

  return (
    <section className="mk-page">
      <div className="mk-page-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div style={{ minWidth: 260, flex: 1 }}>
          <div className="mk-eyebrow">Atendimentos</div>
          <h1 className="mk-page-title">Follow-up com IA</h1>
          <p className="mk-page-sub">Recupera conversas paradas: a IA lê o histórico, resume e sugere a mensagem — você revisa e aprova. Pausa sozinho quando o cliente responde.</p>
        </div>
        <JanelaComercial inicial={janelaInicial} />
      </div>

      <FollowUpClient
        etiquetas={(etiquetas as never) || []}
        canais={(canais as never) || []}
      />
    </section>
  );
}
