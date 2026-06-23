"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/crm/permissions";
import { createServiceClient } from "@/lib/supabase/service";
import { audit } from "@/lib/crm/audit";

export async function criarEtiqueta(nome: string, cor: string): Promise<{ ok: boolean; id?: string; msg?: string }> {
  const ctx = await requireAdmin();
  const n = nome.trim();
  if (!n) return { ok: false, msg: "Nome obrigatório." };
  const sb = createServiceClient();
  const { data, error } = await sb
    .from("etiquetas")
    .insert({ agencia_id: ctx.agenciaId, nome: n, cor: cor || "#00E19A", categoria: "etiqueta" })
    .select("id")
    .single();
  if (error) return { ok: false, msg: error.message };
  void audit({ agenciaId: ctx.agenciaId, usuarioId: ctx.userId, acao: "create", entidade: "etiqueta", entidadeId: data.id, payload: { nome: n, cor } });
  revalidatePath("/configuracoes/etiquetas");
  return { ok: true, id: data.id };
}

/**
 * Substitui o conjunto de campanhas vinculadas à etiqueta.
 * Toda primeira mensagem de lead com click-id de uma dessas campanhas
 * vai receber a etiqueta automaticamente (worker em lib/crm/ingest.ts).
 */
export async function vincularCampanhasEtiqueta(
  etiquetaId: string,
  campanhaIds: string[],
): Promise<{ ok: boolean; msg?: string }> {
  const ctx = await requireAdmin();
  const sb = createServiceClient();

  // confirma que a etiqueta pertence à agência (defesa em profundidade)
  const { data: et } = await sb
    .from("etiquetas")
    .select("id, agencia_id")
    .eq("id", etiquetaId)
    .eq("agencia_id", ctx.agenciaId)
    .maybeSingle();
  if (!et) return { ok: false, msg: "Etiqueta não encontrada." };

  // confirma que todas as campanhas pertencem à mesma agência
  const ids = campanhaIds.filter(Boolean);
  if (ids.length > 0) {
    const { data: camps } = await sb
      .from("campanhas")
      .select("id")
      .eq("agencia_id", ctx.agenciaId)
      .in("id", ids);
    const validos = new Set((camps || []).map((c) => c.id as string));
    for (const cid of ids) {
      if (!validos.has(cid)) return { ok: false, msg: `Campanha ${cid} não pertence à agência.` };
    }
  }

  const { error: delErr } = await sb.from("etiqueta_campanhas").delete().eq("etiqueta_id", etiquetaId);
  if (delErr) return { ok: false, msg: delErr.message };

  if (ids.length > 0) {
    const rows = ids.map((cid) => ({
      etiqueta_id: etiquetaId,
      campanha_id: cid,
      agencia_id: ctx.agenciaId,
    }));
    const { error: insErr } = await sb.from("etiqueta_campanhas").insert(rows);
    if (insErr) return { ok: false, msg: insErr.message };
  }

  void audit({
    agenciaId: ctx.agenciaId,
    usuarioId: ctx.userId,
    acao: "update",
    entidade: "etiqueta_campanhas",
    entidadeId: etiquetaId,
    payload: { campanha_ids: ids },
  });
  revalidatePath("/configuracoes/etiquetas");
  return { ok: true };
}
