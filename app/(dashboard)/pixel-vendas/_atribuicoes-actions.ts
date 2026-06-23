"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/crm/permissions";
import { createServiceClient } from "@/lib/supabase/service";
import { audit } from "@/lib/crm/audit";

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
