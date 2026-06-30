import { requireAuth } from "@/lib/crm/permissions";
import { createServiceClient } from "@/lib/supabase/service";
import { EtiquetasKanbanClient } from "./_client";

export const dynamic = "force-dynamic";

export default async function PipelineEtiquetasPage() {
  const ctx = await requireAuth();
  const sb = createServiceClient();

  const [{ data: etqRows }, { data: contatosRows }, { data: linksRows }] = await Promise.all([
    sb.from("etiquetas").select("id, nome, cor, categoria, ativo").eq("agencia_id", ctx.agenciaId).eq("ativo", true).order("nome"),
    sb.from("contatos").select("id, nome, whatsapp, foto_url").eq("agencia_id", ctx.agenciaId).order("nome").limit(2000),
    sb.from("contato_etiquetas").select("contato_id, etiqueta_id, contatos!inner(agencia_id)").eq("contatos.agencia_id", ctx.agenciaId),
  ]);

  const etiquetas = ((etqRows || []) as Array<{ id: string; nome: string; cor: string | null; categoria: string | null }>)
    .filter((e) => (e.categoria || "etiqueta") === "etiqueta")
    .map((e) => ({ id: e.id, nome: e.nome, cor: e.cor || "#00E19A" }));

  const links = (linksRows || []) as Array<{ contato_id: string; etiqueta_id: string }>;
  const contatosPorEtiqueta: Record<string, string[]> = {};
  for (const l of links) {
    if (!contatosPorEtiqueta[l.etiqueta_id]) contatosPorEtiqueta[l.etiqueta_id] = [];
    contatosPorEtiqueta[l.etiqueta_id].push(l.contato_id);
  }

  const contatos = (contatosRows || []).map((c) => ({
    id: c.id as string,
    nome: c.nome as string,
    whatsapp: (c.whatsapp as string | null) ?? null,
    foto_url: (c.foto_url as string | null) ?? null,
  }));

  return (
    <EtiquetasKanbanClient
      etiquetas={etiquetas}
      contatos={contatos}
      contatosPorEtiqueta={contatosPorEtiqueta}
    />
  );
}
