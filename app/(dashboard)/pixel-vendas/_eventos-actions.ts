"use server";

import { requireSuperAdmin } from "@/lib/crm/permissions";
import { setCapiConfig, getCapiConfig } from "@/lib/crm/capi-palavras";
import { revalidatePath } from "next/cache";

export async function salvarConfigEventos(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  try {
    const ctx = await requireSuperAdmin();
    const palavrasRaw = String(formData.get("palavras") || "").trim();
    const pixelAtivo = formData.get("pixel_ativo") === "1";
    const leadAtivo = formData.get("lead_ativo") === "1";
    const icpAtivo = formData.get("icp_ativo") === "1";
    const palavras = palavrasRaw
      ? palavrasRaw.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
      : [];
    await setCapiConfig(ctx.agenciaId, {
      pixel_ativo: pixelAtivo,
      lead_ativo: leadAtivo,
      icp_ativo: icpAtivo,
      icp_palavras: palavras,
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
