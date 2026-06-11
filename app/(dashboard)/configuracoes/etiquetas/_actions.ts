"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/crm/permissions";
import { createServiceClient } from "@/lib/supabase/service";
import { audit } from "@/lib/crm/audit";

export async function criarEtiqueta(nome: string, cor: string): Promise<{ ok: boolean; id?: string; msg?: string }> {
  const ctx = await requireAdmin();
  const n = nome.trim();
  if (!n) return { ok: false, msg: "Nome obrigatório." };
  const sb = createServiceClient();
  const { data, error } = await sb
    .from("etiquetas")
    .insert({ agencia_id: ctx.agenciaId, nome: n, cor: cor || "#10b981", categoria: "etiqueta" })
    .select("id")
    .single();
  if (error) return { ok: false, msg: error.message };
  void audit({ agenciaId: ctx.agenciaId, usuarioId: ctx.userId, acao: "create", entidade: "etiqueta", entidadeId: data.id, payload: { nome: n, cor } });
  revalidatePath("/configuracoes/etiquetas");
  return { ok: true, id: data.id };
}
