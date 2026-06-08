"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/crm/permissions";
import { createServiceClient } from "@/lib/supabase/service";
import { audit } from "@/lib/crm/audit";

function normalizarComando(s: string): string {
  let c = s.trim();
  if (!c.startsWith("/")) c = "/" + c;
  return c.replace(/\s+/g, "_").toLowerCase();
}

export async function criarMensagemRapida(formData: FormData) {
  const ctx = await requireAuth();
  const comando = normalizarComando(String(formData.get("comando") || ""));
  const conteudo = String(formData.get("conteudo") || "").trim();
  const global = formData.get("global") === "on";

  if (comando.length < 2 || !conteudo) redirect("/mensagens-rapidas?erro=campos");
  if (global && ctx.role !== "admin" && ctx.role !== "super_admin") redirect("/mensagens-rapidas?erro=permissao");

  const sb = createServiceClient();
  const { data, error } = await sb
    .from("mensagens_rapidas")
    .insert({
      agencia_id: ctx.agenciaId,
      usuario_id: global ? null : ctx.userId,
      comando,
      conteudo,
      global,
    })
    .select("id")
    .single();
  if (error) redirect(`/mensagens-rapidas?erro=db&msg=${encodeURIComponent(error.message)}`);
  await audit({ agenciaId: ctx.agenciaId, usuarioId: ctx.userId, acao: "create", entidade: "mensagem_rapida", entidadeId: data.id, payload: { comando, global } });
  revalidatePath("/mensagens-rapidas");
  redirect("/mensagens-rapidas?ok=criada");
}

export async function atualizarMensagemRapida(formData: FormData) {
  const ctx = await requireAuth();
  const id = String(formData.get("id") || "");
  const comando = normalizarComando(String(formData.get("comando") || ""));
  const conteudo = String(formData.get("conteudo") || "").trim();

  const sb = createServiceClient();
  const { error } = await sb
    .from("mensagens_rapidas")
    .update({ comando, conteudo, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("agencia_id", ctx.agenciaId);
  if (error) redirect(`/mensagens-rapidas?erro=db&msg=${encodeURIComponent(error.message)}`);
  await audit({ agenciaId: ctx.agenciaId, usuarioId: ctx.userId, acao: "update", entidade: "mensagem_rapida", entidadeId: id });
  revalidatePath("/mensagens-rapidas");
  redirect("/mensagens-rapidas?ok=atualizada");
}

export async function deletarMensagemRapida(formData: FormData) {
  const ctx = await requireAuth();
  const id = String(formData.get("id") || "");
  const sb = createServiceClient();
  await sb.from("mensagens_rapidas").delete().eq("id", id).eq("agencia_id", ctx.agenciaId);
  await audit({ agenciaId: ctx.agenciaId, usuarioId: ctx.userId, acao: "delete", entidade: "mensagem_rapida", entidadeId: id });
  revalidatePath("/mensagens-rapidas");
  redirect("/mensagens-rapidas?ok=deletada");
}
