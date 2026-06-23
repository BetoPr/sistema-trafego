"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/crm/permissions";
import { createServiceClient } from "@/lib/supabase/service";
import { audit } from "@/lib/crm/audit";

/**
 * Cria etiqueta inline a partir da UI de Pixel & Campanhas.
 * Quando `etiquetaPaiId` informado → cria Variante (filha).
 * Sem pai → cria Linha (mãe). Valida hierarquia 2 níveis.
 */
export async function criarEtiquetaInline(
  nome: string,
  cor: string,
  etiquetaPaiId: string | null = null,
): Promise<{ ok: boolean; id?: string; msg?: string }> {
  const ctx = await requireAdmin();
  const n = nome.trim();
  if (!n) return { ok: false, msg: "Nome obrigatório" };
  const sb = createServiceClient();
  if (etiquetaPaiId) {
    const { data: pai } = await sb
      .from("etiquetas")
      .select("id, etiqueta_pai_id")
      .eq("id", etiquetaPaiId)
      .eq("agencia_id", ctx.agenciaId)
      .maybeSingle();
    if (!pai) return { ok: false, msg: "Linha-mãe inválida" };
    if (pai.etiqueta_pai_id) return { ok: false, msg: "Hierarquia só permite 2 níveis" };
  }
  const { data, error } = await sb
    .from("etiquetas")
    .insert({
      agencia_id: ctx.agenciaId,
      nome: n,
      cor: cor || "#00E19A",
      categoria: "etiqueta",
      etiqueta_pai_id: etiquetaPaiId,
    })
    .select("id")
    .single();
  if (error) return { ok: false, msg: error.message };
  void audit({
    agenciaId: ctx.agenciaId,
    usuarioId: ctx.userId,
    acao: "create",
    entidade: "etiqueta",
    entidadeId: data.id,
    payload: { nome: n, cor, etiqueta_pai_id: etiquetaPaiId, origem: "pixel-vendas" },
  });
  revalidatePath("/pixel-vendas");
  return { ok: true, id: data.id };
}

type Alvo = "campanha" | "conjunto";

/**
 * Substitui o conjunto de etiquetas vinculadas a uma campanha OU conjunto Meta.
 * Idempotente: salva exatamente a lista fornecida.
 */
export async function salvarEtiquetasDoAlvo(
  alvo: Alvo,
  alvoId: string,
  etiquetaIds: string[],
): Promise<{ ok: boolean; msg?: string }> {
  const ctx = await requireAdmin();
  const sb = createServiceClient();
  const tabela = alvo === "campanha" ? "etiqueta_campanhas" : "etiqueta_conjuntos";
  const colId = alvo === "campanha" ? "campanha_id" : "conjunto_id";

  // valida ownership do alvo
  const tabelaAlvo = alvo === "campanha" ? "campanhas" : "conjuntos";
  const { data: alvoRow } = await sb
    .from(tabelaAlvo)
    .select("id, agencia_id")
    .eq("id", alvoId)
    .eq("agencia_id", ctx.agenciaId)
    .maybeSingle();
  if (!alvoRow) return { ok: false, msg: `${alvo} não encontrado(a)` };

  // valida etiquetas
  const ids = etiquetaIds.filter(Boolean);
  if (ids.length > 0) {
    const { data: ets } = await sb
      .from("etiquetas")
      .select("id")
      .eq("agencia_id", ctx.agenciaId)
      .in("id", ids);
    const validos = new Set((ets || []).map((e) => e.id as string));
    for (const e of ids) {
      if (!validos.has(e)) return { ok: false, msg: `Etiqueta ${e} inválida` };
    }
  }

  // replace: deleta vínculos atuais + insere novos
  const { error: delErr } = await sb.from(tabela).delete().eq(colId, alvoId);
  if (delErr) return { ok: false, msg: delErr.message };

  if (ids.length > 0) {
    const rows = ids.map((eid) => ({
      [colId]: alvoId,
      etiqueta_id: eid,
      agencia_id: ctx.agenciaId,
    }));
    const { error: insErr } = await sb.from(tabela).insert(rows);
    if (insErr) return { ok: false, msg: insErr.message };
  }

  void audit({
    agenciaId: ctx.agenciaId,
    usuarioId: ctx.userId,
    acao: "update",
    entidade: tabela,
    entidadeId: alvoId,
    payload: { etiqueta_ids: ids },
  });
  revalidatePath("/pixel-vendas");
  return { ok: true };
}
