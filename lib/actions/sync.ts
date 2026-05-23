"use server";

import { revalidatePath } from "next/cache";
import { requireUserWithAgencia } from "@/lib/auth";
import { syncAllForAgencia, type SyncAllResult } from "@/lib/meta-ads/sync-all";

export async function sincronizarTudoAction(): Promise<SyncAllResult> {
  const { usuario } = await requireUserWithAgencia();
  const result = await syncAllForAgencia(usuario.agencia_id);

  revalidatePath("/dashboard");
  revalidatePath("/campanhas");
  revalidatePath("/criativos");
  revalidatePath("/publico");
  revalidatePath("/relatorios");
  revalidatePath("/integracoes/meta");

  return result;
}
