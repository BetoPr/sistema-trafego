"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/crm/permissions";
import { createServiceClient } from "@/lib/supabase/service";
import { audit } from "@/lib/crm/audit";

export async function criarEquipe(formData: FormData) {
  const ctx = await requireAdmin();
  const nome = String(formData.get("nome") || "").trim();
  const descricao = String(formData.get("descricao") || "").trim() || null;
  if (!nome) redirect("/equipes?erro=nome_vazio");

  const sb = createServiceClient();
  const { data: novo, error } = await sb
    .from("equipes")
    .insert({ agencia_id: ctx.agenciaId, nome, descricao })
    .select("id")
    .single();

  if (error) redirect(`/equipes?erro=db&msg=${encodeURIComponent(error.message)}`);
  await audit({ agenciaId: ctx.agenciaId, usuarioId: ctx.userId, acao: "create", entidade: "equipe", entidadeId: novo.id });
  revalidatePath("/equipes");
  redirect("/equipes?ok=criada");
}

export async function atualizarEquipe(formData: FormData) {
  const ctx = await requireAdmin();
  const id = String(formData.get("id") || "");
  const nome = String(formData.get("nome") || "").trim();
  const descricao = String(formData.get("descricao") || "").trim() || null;
  const sb = createServiceClient();
  const { error } = await sb.from("equipes").update({ nome, descricao }).eq("id", id).eq("agencia_id", ctx.agenciaId);
  if (error) redirect(`/equipes?erro=db&msg=${encodeURIComponent(error.message)}`);
  await audit({ agenciaId: ctx.agenciaId, usuarioId: ctx.userId, acao: "update", entidade: "equipe", entidadeId: id });
  revalidatePath("/equipes");
  redirect("/equipes?ok=atualizada");
}

export async function deletarEquipe(formData: FormData) {
  const ctx = await requireAdmin();
  const id = String(formData.get("id") || "");
  const sb = createServiceClient();
  const { error } = await sb.from("equipes").delete().eq("id", id).eq("agencia_id", ctx.agenciaId);
  if (error) redirect(`/equipes?erro=db&msg=${encodeURIComponent(error.message)}`);
  await audit({ agenciaId: ctx.agenciaId, usuarioId: ctx.userId, acao: "delete", entidade: "equipe", entidadeId: id });
  revalidatePath("/equipes");
  redirect("/equipes?ok=deletada");
}
