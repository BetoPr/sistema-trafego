"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

async function ctx() {
  const sb = await createClient();
  const { data: auth } = await sb.auth.getUser();
  if (!auth?.user) redirect("/login");
  const svc = createServiceClient();
  const { data: u } = await svc.from("usuarios").select("agencia_id").eq("id", auth.user.id).single();
  if (!u) redirect("/login");
  return { userId: auth.user.id, agenciaId: u.agencia_id, svc };
}

export async function toggleServicosHabilitados(formData: FormData) {
  const c = await ctx();
  const habilitado = formData.get("habilitado") === "1";
  await c.svc.from("agencias").update({ servicos_habilitados: habilitado }).eq("id", c.agenciaId);
  revalidatePath("/configuracoes/servicos");
  revalidatePath("/atendimentos");
}

export async function criarServico(formData: FormData) {
  const c = await ctx();
  const nome = String(formData.get("nome") || "").trim();
  if (!nome) return;
  const { error } = await c.svc.from("servicos").insert({ agencia_id: c.agenciaId, nome });
  if (error && !error.message.includes("duplicate")) {
    console.error("criarServico", error);
  }
  revalidatePath("/configuracoes/servicos");
}

export async function renomearServico(formData: FormData) {
  const c = await ctx();
  const id = String(formData.get("id"));
  const nome = String(formData.get("nome") || "").trim();
  if (!id || !nome) return;
  await c.svc.from("servicos").update({ nome }).eq("id", id).eq("agencia_id", c.agenciaId);
  revalidatePath("/configuracoes/servicos");
}

export async function toggleServicoAtivo(formData: FormData) {
  const c = await ctx();
  const id = String(formData.get("id"));
  const ativo = formData.get("ativo") === "1";
  await c.svc.from("servicos").update({ ativo }).eq("id", id).eq("agencia_id", c.agenciaId);
  revalidatePath("/configuracoes/servicos");
}

export async function excluirServico(formData: FormData) {
  const c = await ctx();
  const id = String(formData.get("id"));
  if (!id) return;
  await c.svc.from("servicos").delete().eq("id", id).eq("agencia_id", c.agenciaId);
  revalidatePath("/configuracoes/servicos");
}
