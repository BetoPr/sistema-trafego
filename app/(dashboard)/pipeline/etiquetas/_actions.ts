"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/crm/permissions";
import { createServiceClient } from "@/lib/supabase/service";

export async function setEtiquetasContato(contatoId: string, etiquetaIds: string[]): Promise<{ ok: boolean; msg?: string }> {
  const ctx = await requireAuth();
  const sb = createServiceClient();

  // Confirma contato pertence à agência
  const { data: ct } = await sb.from("contatos").select("id").eq("id", contatoId).eq("agencia_id", ctx.agenciaId).maybeSingle();
  if (!ct) return { ok: false, msg: "Contato não encontrado" };

  await sb.from("contato_etiquetas").delete().eq("contato_id", contatoId);

  if (etiquetaIds.length > 0) {
    const rows = etiquetaIds.map((eid) => ({ contato_id: contatoId, etiqueta_id: eid }));
    const { error } = await sb.from("contato_etiquetas").insert(rows);
    if (error) return { ok: false, msg: error.message };
  }

  revalidatePath("/pipeline/etiquetas");
  return { ok: true };
}
