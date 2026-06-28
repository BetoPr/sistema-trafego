import { requireAuth } from "@/lib/crm/permissions";
import { createServiceClient } from "@/lib/supabase/service";
import { KanbanClient } from "./_client";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ quadro?: string }>;
}

export default async function KanbanPage({ searchParams }: PageProps) {
  const ctx = await requireAuth();
  const sp = await searchParams;
  const sb = createServiceClient();

  const { data: quadros } = await sb
    .from("kanban_quadros")
    .select("id, nome, descricao, cor")
    .eq("agencia_id", ctx.agenciaId)
    .is("deleted_at", null)
    .order("ordem")
    .order("criado_em", { ascending: false });

  const quadrosLista = (quadros || []) as Array<{ id: string; nome: string; descricao: string | null; cor: string }>;
  const quadroAtivoId = sp.quadro && quadrosLista.some((q) => q.id === sp.quadro) ? sp.quadro : quadrosLista[0]?.id ?? null;

  let colunas: Array<{ id: string; nome: string; cor: string; ordem: number }> = [];
  let cards: Array<{ id: string; coluna_id: string; titulo: string; descricao: string | null; ordem: number; valor: number | null }> = [];
  let etiquetas: Array<{ id: string; nome: string; cor: string }> = [];
  let regrasPorColuna: Record<string, string[]> = {};

  if (quadroAtivoId) {
    const [{ data: cols }, { data: cds }, { data: etqs }] = await Promise.all([
      sb.from("kanban_colunas").select("id, nome, cor, ordem").eq("quadro_id", quadroAtivoId).order("ordem"),
      sb.from("kanban_cards").select("id, coluna_id, titulo, descricao, ordem, valor").eq("agencia_id", ctx.agenciaId).order("ordem"),
      sb.from("etiquetas").select("id, nome, cor, categoria, ativo").eq("agencia_id", ctx.agenciaId).eq("ativo", true).order("nome"),
    ]);
    colunas = (cols || []) as typeof colunas;
    const colIds = new Set(colunas.map((c) => c.id));
    cards = ((cds || []) as typeof cards).filter((c) => colIds.has(c.coluna_id));
    etiquetas = ((etqs || []) as Array<{ id: string; nome: string; cor: string | null; categoria: string | null }>)
      .filter((e) => (e.categoria || "etiqueta") === "etiqueta")
      .map((e) => ({ id: e.id, nome: e.nome, cor: e.cor || "#00E19A" }));

    if (colunas.length > 0) {
      const { data: regras } = await sb
        .from("kanban_regras_entrada")
        .select("coluna_id, etiqueta_id")
        .in("coluna_id", Array.from(colIds));
      for (const r of (regras || []) as Array<{ coluna_id: string; etiqueta_id: string }>) {
        if (!regrasPorColuna[r.coluna_id]) regrasPorColuna[r.coluna_id] = [];
        regrasPorColuna[r.coluna_id].push(r.etiqueta_id);
      }
    }
  }

  return (
    <KanbanClient
      quadros={quadrosLista}
      quadroAtivoId={quadroAtivoId}
      colunas={colunas}
      cards={cards}
      etiquetas={etiquetas}
      regrasPorColuna={regrasPorColuna}
    />
  );
}
