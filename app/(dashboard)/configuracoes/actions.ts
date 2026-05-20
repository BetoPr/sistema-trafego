"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUserWithAgencia } from "@/lib/auth";

export type ConfigState = { ok?: boolean; error?: string } | undefined;

const PerfilSchema = z.object({
  nome: z.string().trim().min(2, "Nome deve ter no mínimo 2 caracteres.").max(120),
});

const AgenciaSchema = z.object({
  nome: z.string().trim().min(2).max(120),
});

export async function atualizarPerfilAction(
  _prev: ConfigState,
  formData: FormData
): Promise<ConfigState> {
  const parsed = PerfilSchema.safeParse({ nome: formData.get("nome") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase, usuario } = await requireUserWithAgencia();
  const { error } = await supabase
    .from("usuarios")
    .update({ nome: parsed.data.nome })
    .eq("id", usuario.id);

  if (error) return { error: "Erro ao atualizar perfil." };

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function atualizarAgenciaAction(
  _prev: ConfigState,
  formData: FormData
): Promise<ConfigState> {
  const parsed = AgenciaSchema.safeParse({ nome: formData.get("nome") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase, usuario } = await requireUserWithAgencia();
  const { error } = await supabase
    .from("agencias")
    .update({ nome: parsed.data.nome })
    .eq("id", usuario.agencia_id);

  if (error) return { error: "Erro ao atualizar agência." };

  revalidatePath("/", "layout");
  return { ok: true };
}
