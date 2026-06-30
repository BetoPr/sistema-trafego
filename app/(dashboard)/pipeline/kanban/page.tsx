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

  let colunas: Array<{ id: string; nome: string; cor: string; ordem: number; nota: string | null }> = [];
  let cards: Array<{ id: string; coluna_id: string; titulo: string; descricao: string | null; ordem: number; valor: number | null; numero: number | null; numero_global: number | null; contato_id: string | null; foto_url: string | null; fechado: boolean }> = [];
  let etiquetas: Array<{ id: string; nome: string; cor: string }> = [];
  let regrasPorColuna: Record<string, string[]> = {};
  let contatos: Array<{ id: string; nome: string; whatsapp: string | null; foto_url: string | null }> = [];

  if (quadroAtivoId) {
    const [{ data: cols }, { data: cds }, { data: etqs }, { data: cts }] = await Promise.all([
      sb.from("kanban_colunas").select("id, nome, cor, ordem, nota").eq("quadro_id", quadroAtivoId).order("ordem"),
      sb.from("kanban_cards").select("id, coluna_id, titulo, descricao, ordem, valor, numero, numero_global, contato_id, contatos(foto_url)").eq("agencia_id", ctx.agenciaId).order("ordem"),
      sb.from("etiquetas").select("id, nome, cor, categoria, ativo").eq("agencia_id", ctx.agenciaId).eq("ativo", true).order("nome"),
      sb.from("contatos").select("id, nome, whatsapp, foto_url").eq("agencia_id", ctx.agenciaId).order("nome").limit(500),
    ]);
    colunas = (cols || []) as typeof colunas;
    const colIds = new Set(colunas.map((c) => c.id));
    // Pega contatos com ticket em status='fechado' pra marcar cards como fechados
    const contatosComCardId = new Set(
      (cds || []).map((c) => (c as { contato_id: string | null }).contato_id).filter(Boolean) as string[]
    );
    const contatosFechados = new Set<string>();
    if (contatosComCardId.size > 0) {
      const { data: tks } = await sb
        .from("tickets")
        .select("contato_id, status")
        .eq("agencia_id", ctx.agenciaId)
        .eq("status", "fechado")
        .in("contato_id", Array.from(contatosComCardId));
      for (const t of (tks || []) as Array<{ contato_id: string }>) contatosFechados.add(t.contato_id);
    }

    cards = (((cds || []) as Array<{ id: string; coluna_id: string; titulo: string; descricao: string | null; ordem: number; valor: number | null; numero: number | null; numero_global: number | null; contato_id: string | null; contatos: { foto_url: string | null } | { foto_url: string | null }[] | null }>)
      .filter((c) => colIds.has(c.coluna_id))
      .map((c) => {
        const ct = Array.isArray(c.contatos) ? c.contatos[0] : c.contatos;
        return {
          id: c.id, coluna_id: c.coluna_id, titulo: c.titulo, descricao: c.descricao,
          ordem: c.ordem, valor: c.valor, numero: c.numero, numero_global: c.numero_global, contato_id: c.contato_id,
          foto_url: ct?.foto_url ?? null,
          fechado: c.contato_id ? contatosFechados.has(c.contato_id) : false,
        };
      }));
    etiquetas = ((etqs || []) as Array<{ id: string; nome: string; cor: string | null; categoria: string | null }>)
      .filter((e) => (e.categoria || "etiqueta") === "etiqueta")
      .map((e) => ({ id: e.id, nome: e.nome, cor: e.cor || "#00E19A" }));
    contatos = ((cts || []) as typeof contatos);

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
      contatos={contatos}
    />
  );
}
