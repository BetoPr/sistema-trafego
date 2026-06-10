"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/crm/permissions";
import { createServiceClient } from "@/lib/supabase/service";
import { audit } from "@/lib/crm/audit";

function digits(s: string): string {
  return s.replace(/\D/g, "");
}

export async function criarContato(formData: FormData) {
  const ctx = await requireAuth();
  const nome = String(formData.get("nome") || "").trim();
  const whatsapp = digits(String(formData.get("whatsapp") || ""));
  const email = String(formData.get("email") || "").trim() || null;
  const empresa = String(formData.get("empresa") || "").trim() || null;
  const cidade = String(formData.get("cidade") || "").trim() || null;

  if (!nome) redirect("/contatos?erro=nome_vazio");

  const sb = createServiceClient();
  const waId = whatsapp ? `${whatsapp}@s.whatsapp.net` : null;
  const { data, error } = await sb
    .from("contatos")
    .insert({
      agencia_id: ctx.agenciaId,
      nome,
      primeiro_nome: nome.split(" ")[0],
      whatsapp: whatsapp || null,
      wa_id: waId,
      email,
      empresa,
      cidade,
    })
    .select("id")
    .single();
  if (error) redirect(`/contatos?erro=db&msg=${encodeURIComponent(error.message)}`);

  await audit({ agenciaId: ctx.agenciaId, usuarioId: ctx.userId, acao: "create", entidade: "contato", entidadeId: data.id });
  revalidatePath("/contatos");
  redirect("/contatos?ok=criado");
}

export async function atualizarContato(formData: FormData) {
  const ctx = await requireAuth();
  const id = String(formData.get("id") || "");
  const nome = String(formData.get("nome") || "").trim();
  const whatsapp = digits(String(formData.get("whatsapp") || ""));

  const patch: Record<string, unknown> = {
    nome,
    primeiro_nome: nome.split(" ")[0],
    whatsapp: whatsapp || null,
    wa_id: whatsapp ? `${whatsapp}@s.whatsapp.net` : null,
    updated_at: new Date().toISOString(),
  };
  // Email/empresa/cidade saíram do form de edição — só atualiza se o campo
  // vier no form (preserva valores existentes de outras fontes).
  if (formData.has("email")) patch.email = String(formData.get("email") || "").trim() || null;
  if (formData.has("empresa")) patch.empresa = String(formData.get("empresa") || "").trim() || null;
  if (formData.has("cidade")) patch.cidade = String(formData.get("cidade") || "").trim() || null;

  const sb = createServiceClient();
  const { error } = await sb
    .from("contatos")
    .update(patch)
    .eq("id", id)
    .eq("agencia_id", ctx.agenciaId);
  if (error) redirect(`/contatos?erro=db&msg=${encodeURIComponent(error.message)}`);
  await audit({ agenciaId: ctx.agenciaId, usuarioId: ctx.userId, acao: "update", entidade: "contato", entidadeId: id });
  revalidatePath("/contatos");
  redirect("/contatos?ok=atualizado");
}

export async function deletarContato(formData: FormData) {
  const ctx = await requireAuth();
  const id = String(formData.get("id") || "");
  const sb = createServiceClient();
  await sb
    .from("contatos")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("agencia_id", ctx.agenciaId);
  await audit({ agenciaId: ctx.agenciaId, usuarioId: ctx.userId, acao: "delete", entidade: "contato", entidadeId: id });
  revalidatePath("/contatos");
  redirect("/contatos?ok=deletado");
}
