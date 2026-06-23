import Link from "next/link";
import { requireAdmin } from "@/lib/crm/permissions";
import { createServiceClient } from "@/lib/supabase/service";
import { EtiquetasManager } from "./_client";

export default async function EtiquetasConfigPage() {
  const ctx = await requireAdmin();
  const sb = createServiceClient();

  const [etiquetasQ, vincQ, campsQ] = await Promise.all([
    sb
      .from("etiquetas")
      .select("id, nome, cor, categoria, palavra_gatilho, mensagem_resposta, ativo")
      .eq("agencia_id", ctx.agenciaId)
      .order("nome"),
    sb
      .from("etiqueta_campanhas")
      .select("etiqueta_id, campanha_id")
      .eq("agencia_id", ctx.agenciaId),
    sb
      .from("campanhas")
      .select("id, nome, plataforma_id, status")
      .eq("agencia_id", ctx.agenciaId)
      .order("nome"),
  ]);

  const etiquetas = (etiquetasQ.data || [])
    .filter((e) => (e.categoria || "etiqueta") === "etiqueta")
    .map((e) => ({
      id: e.id as string,
      nome: e.nome as string,
      cor: (e.cor as string) || "#00E19A",
      palavra_gatilho: (e.palavra_gatilho as string | null) ?? null,
      mensagem_resposta: (e.mensagem_resposta as string | null) ?? null,
      ativo: (e.ativo as boolean | null) ?? true,
    }));

  const campanhas = (campsQ.data || []).map((c) => ({
    id: c.id as string,
    nome: (c.nome as string) || "(sem nome)",
    status: (c.status as string | null) ?? null,
  }));

  const vinculos: Record<string, string[]> = {};
  for (const v of vincQ.data || []) {
    const eid = v.etiqueta_id as string;
    if (!vinculos[eid]) vinculos[eid] = [];
    vinculos[eid].push(v.campanha_id as string);
  }

  return (
    <section className="mk-page">
      <div className="mk-page-head">
        <Link href="/configuracoes" style={{ fontSize: 12, color: "var(--mk-accent)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
          <i className="ti ti-arrow-left" /> Voltar
        </Link>
        <div className="mk-eyebrow">Configuração</div>
        <h1 className="mk-page-title">Etiquetas</h1>
        <p className="mk-page-sub">
          Gerencie as etiquetas usadas pra organizar os atendimentos. Vincule etiquetas a campanhas Meta pra marcar automaticamente quem chegou via cada anúncio.
        </p>
      </div>

      <div className="mk-card mk-card-lg">
        <EtiquetasManager inicial={etiquetas} campanhas={campanhas} vinculos={vinculos} />
      </div>
    </section>
  );
}
