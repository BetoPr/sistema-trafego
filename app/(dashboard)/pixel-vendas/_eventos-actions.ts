"use server";

import { requireSuperAdmin } from "@/lib/crm/permissions";
import { setCapiConfig, getCapiConfig, CAPI_CONFIG_DEFAULT } from "@/lib/crm/capi-palavras";
import { revalidatePath } from "next/cache";

export async function salvarConfigEventos(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  try {
    const ctx = await requireSuperAdmin();
    const palavrasRaw = String(formData.get("palavras") || "").trim();
    const leadAtivo = formData.get("lead_ativo") === "1";
    const addAtivo = formData.get("addtocart_ativo") === "1";
    const palavras = palavrasRaw
      ? palavrasRaw.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
      : CAPI_CONFIG_DEFAULT.addtocart_palavras;
    await setCapiConfig(ctx.agenciaId, {
      lead_ativo: leadAtivo,
      addtocart_ativo: addAtivo,
      addtocart_palavras: palavras,
    });
    revalidatePath("/pixel-vendas");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "erro ao salvar" };
  }
}

export async function lerConfigEventos() {
  const ctx = await requireSuperAdmin();
  return getCapiConfig(ctx.agenciaId);
}
