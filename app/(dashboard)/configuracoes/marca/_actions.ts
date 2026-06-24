"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/crm/permissions";
import { createServiceClient } from "@/lib/supabase/service";
import { audit } from "@/lib/crm/audit";

export async function salvarMarca(formData: FormData): Promise<void> {
  const ctx = await requireAdmin();
  const modo = String(formData.get("modo") || "texto") as "texto" | "logo" | "logo_texto";
  const layout = String(formData.get("layout") || "horizontal") as "horizontal" | "vertical";
  const alturaRaw = Number(formData.get("altura") || 36);
  const altura = Math.max(24, Math.min(80, Math.round(Number.isFinite(alturaRaw) ? alturaRaw : 36)));
  const removerLogo = formData.get("remover_logo") === "1";
  const arquivo = formData.get("logo") as File | null;

  const sb = createServiceClient();
  const patch: Record<string, unknown> = {
    logo_modo: ["texto", "logo", "logo_texto"].includes(modo) ? modo : "texto",
    logo_layout: ["horizontal", "vertical"].includes(layout) ? layout : "horizontal",
    logo_altura: altura,
  };

  if (removerLogo) {
    patch.logo_url = null;
    patch.logo_modo = "texto";
  } else if (arquivo && arquivo.size > 0 && arquivo.size <= 2 * 1024 * 1024) {
    const ext = (arquivo.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${ctx.agenciaId}/logo-${Date.now()}.${ext}`;
    const buf = Buffer.from(await arquivo.arrayBuffer());
    const { error: upErr } = await sb.storage
      .from("agencia-assets")
      .upload(path, buf, { contentType: arquivo.type, upsert: true });
    if (!upErr) {
      const { data: pub } = sb.storage.from("agencia-assets").getPublicUrl(path);
      patch.logo_url = pub.publicUrl;
    }
  }

  await sb.from("agencias").update(patch).eq("id", ctx.agenciaId);
  void audit({ agenciaId: ctx.agenciaId, usuarioId: ctx.userId, acao: "update", entidade: "agencia_marca", payload: { modo, layout, alterou_logo: !!arquivo && !removerLogo, removeu_logo: removerLogo } });

  revalidatePath("/configuracoes/marca");
  revalidatePath("/", "layout");
  redirect("/configuracoes/marca?ok=salvo");
}
