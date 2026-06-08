"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/crm/permissions";
import { createServiceClient } from "@/lib/supabase/service";
import { audit } from "@/lib/crm/audit";

export async function salvarPerfilProprio(formData: FormData) {
  const ctx = await requireAuth();
  const nome = String(formData.get("nome") || "").trim();
  const telefone = String(formData.get("telefone") || "").trim() || null;
  if (!nome) redirect("/conta?erro=nome");
  const sb = createServiceClient();
  await sb.from("usuarios").update({ nome, telefone }).eq("id", ctx.userId);
  await audit({ agenciaId: ctx.agenciaId, usuarioId: ctx.userId, acao: "update", entidade: "usuario_propria", entidadeId: ctx.userId });
  revalidatePath("/conta");
  redirect("/conta?ok=perfil");
}

export async function alterarSenha(formData: FormData) {
  const ctx = await requireAuth();
  const nova = String(formData.get("nova") || "");
  const confirma = String(formData.get("confirma") || "");
  if (nova.length < 6) redirect("/conta?erro=senha_curta");
  if (nova !== confirma) redirect("/conta?erro=senha_diferente");
  const sb = createServiceClient();
  const { error } = await sb.auth.admin.updateUserById(ctx.userId, { password: nova });
  if (error) redirect(`/conta?erro=auth&msg=${encodeURIComponent(error.message)}`);
  await audit({ agenciaId: ctx.agenciaId, usuarioId: ctx.userId, acao: "config_change", entidade: "senha" });
  redirect("/conta?ok=senha");
}
