"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/crm/permissions";
import { createServiceClient } from "@/lib/supabase/service";
import { audit } from "@/lib/crm/audit";

export async function criarFila(formData: FormData) {
  const ctx = await requireAdmin();
  const nome = String(formData.get("nome") || "").trim();
  const cor = String(formData.get("cor") || "#9B7DBF").trim();
  const descricao = String(formData.get("descricao") || "").trim() || null;

  if (!nome) redirect("/filas?erro=nome_vazio");

  const sb = createServiceClient();
  const { data: novo, error } = await sb
    .from("filas")
    .insert({ agencia_id: ctx.agenciaId, nome, cor, descricao })
    .select("id")
    .single();

  if (error) redirect(`/filas?erro=db&msg=${encodeURIComponent(error.message)}`);

  await audit({
    agenciaId: ctx.agenciaId,
    usuarioId: ctx.userId,
    acao: "create",
    entidade: "fila",
    entidadeId: novo.id,
    payload: { nome },
  });
  revalidatePath("/filas");
  redirect("/filas?ok=criada");
}

export async function atualizarFila(formData: FormData) {
  const ctx = await requireAdmin();
  const id = String(formData.get("id") || "");
  const nome = String(formData.get("nome") || "").trim();
  const cor = String(formData.get("cor") || "#9B7DBF").trim();
  const descricao = String(formData.get("descricao") || "").trim() || null;
  const ativa = formData.get("ativa") === "on";
  if (!id || !nome) redirect("/filas?erro=nome_vazio");

  const sb = createServiceClient();
  const { data: atual } = await sb
    .from("filas")
    .select("fixa")
    .eq("id", id)
    .eq("agencia_id", ctx.agenciaId)
    .maybeSingle();
  if (!atual) redirect("/filas?erro=db&msg=Fila+nao+encontrada");

  // Em filas fixas: ignora rename. Trigger DB também bloqueia (defesa em camada).
  const patch: Record<string, unknown> = { cor, descricao, ativa };
  if (!atual.fixa) patch.nome = nome;

  const { error } = await sb
    .from("filas")
    .update(patch)
    .eq("id", id)
    .eq("agencia_id", ctx.agenciaId);
  if (error) redirect(`/filas?erro=db&msg=${encodeURIComponent(error.message)}`);

  await audit({
    agenciaId: ctx.agenciaId,
    usuarioId: ctx.userId,
    acao: "update",
    entidade: "fila",
    entidadeId: id,
  });
  revalidatePath("/filas");
  redirect("/filas?ok=atualizada");
}

export async function deletarFila(formData: FormData) {
  const ctx = await requireAdmin();
  const id = String(formData.get("id") || "");
  if (!id) redirect("/filas?erro=db");
  const sb = createServiceClient();

  // Bloqueia delete de fila fixa antes de tentar (UX melhor que erro de trigger).
  const { data: atual } = await sb
    .from("filas")
    .select("fixa, nome")
    .eq("id", id)
    .eq("agencia_id", ctx.agenciaId)
    .maybeSingle();
  if (atual?.fixa) {
    redirect(`/filas?erro=fila_fixa&msg=${encodeURIComponent(`Fila "${atual.nome}" e fixa do sistema.`)}`);
  }

  const { error } = await sb.from("filas").delete().eq("id", id).eq("agencia_id", ctx.agenciaId);
  if (error) redirect(`/filas?erro=db&msg=${encodeURIComponent(error.message)}`);
  await audit({
    agenciaId: ctx.agenciaId,
    usuarioId: ctx.userId,
    acao: "delete",
    entidade: "fila",
    entidadeId: id,
  });
  revalidatePath("/filas");
  redirect("/filas?ok=deletada");
}
