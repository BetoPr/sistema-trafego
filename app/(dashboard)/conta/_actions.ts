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

export async function salvarAvatar(formData: FormData) {
  const ctx = await requireAuth();
  const file = formData.get("foto") as File | null;
  if (!file || file.size === 0) redirect("/conta?erro=foto");
  if (!file!.type.startsWith("image/")) redirect("/conta?erro=foto_tipo");
  if (file!.size > 5 * 1024 * 1024) redirect("/conta?erro=foto_grande");

  const sb = createServiceClient();
  const ext = (file!.name.split(".").pop() || "jpg").toLowerCase().slice(0, 5);
  const path = `${ctx.userId}/${crypto.randomUUID()}.${ext}`;
  const buf = Buffer.from(await file!.arrayBuffer());

  const { error: upErr } = await sb.storage.from("avatares").upload(path, buf, { contentType: file!.type, upsert: false });
  if (upErr) redirect(`/conta?erro=upload&msg=${encodeURIComponent(upErr.message)}`);

  const { data: pub } = sb.storage.from("avatares").getPublicUrl(path);

  // Pega a foto antiga pra apagar do storage depois de trocar (best-effort).
  const { data: atual } = await sb.from("usuarios").select("avatar_url").eq("id", ctx.userId).maybeSingle();
  await sb.from("usuarios").update({ avatar_url: pub.publicUrl }).eq("id", ctx.userId);
  if (atual?.avatar_url && atual.avatar_url.includes("/avatares/")) {
    const oldPath = atual.avatar_url.split("/avatares/")[1];
    if (oldPath) { try { await sb.storage.from("avatares").remove([decodeURIComponent(oldPath)]); } catch {} }
  }

  await audit({ agenciaId: ctx.agenciaId, usuarioId: ctx.userId, acao: "update", entidade: "usuario_avatar", entidadeId: ctx.userId });
  revalidatePath("/conta");
  revalidatePath("/", "layout");
  redirect("/conta?ok=foto");
}

export async function removerAvatar() {
  const ctx = await requireAuth();
  const sb = createServiceClient();
  const { data: atual } = await sb.from("usuarios").select("avatar_url").eq("id", ctx.userId).maybeSingle();
  await sb.from("usuarios").update({ avatar_url: null }).eq("id", ctx.userId);
  if (atual?.avatar_url && atual.avatar_url.includes("/avatares/")) {
    const oldPath = atual.avatar_url.split("/avatares/")[1];
    if (oldPath) { try { await sb.storage.from("avatares").remove([decodeURIComponent(oldPath)]); } catch {} }
  }
  await audit({ agenciaId: ctx.agenciaId, usuarioId: ctx.userId, acao: "update", entidade: "usuario_avatar", entidadeId: ctx.userId });
  revalidatePath("/conta");
  revalidatePath("/", "layout");
  redirect("/conta?ok=foto_removida");
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
