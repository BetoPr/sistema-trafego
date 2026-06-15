"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import { requireRole } from "@/lib/crm/permissions";
import { audit } from "@/lib/crm/audit";

type Role = "super_admin" | "admin" | "atendente";

function parsePermissoes(formData: FormData): Record<string, boolean> {
  const perms: Record<string, boolean> = {};
  for (const [k, v] of formData.entries()) {
    if (k.startsWith("perm_")) perms[k.replace("perm_", "")] = v === "on";
  }
  return perms;
}

export async function criarAcesso(formData: FormData) {
  const ctx = await requireRole("super_admin");
  const nome = String(formData.get("nome") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const senha = String(formData.get("senha") || "");
  const telefone = String(formData.get("telefone") || "").trim() || null;
  const agenciaId = String(formData.get("agencia_id") || "");
  const role = (String(formData.get("role") || "atendente") as Role);

  if (!nome || !email || !senha || !agenciaId) redirect("/super-admin/acessos?erro=campos");
  if (senha.length < 6) redirect("/super-admin/acessos?erro=senha_curta");

  const sb = createServiceClient();

  const { data: created, error: authErr } = await sb.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome },
  });
  if (authErr || !created.user) {
    redirect(`/super-admin/acessos?erro=auth&msg=${encodeURIComponent(authErr?.message || "Erro auth")}`);
  }

  const perms = parsePermissoes(formData);

  const { error } = await sb.from("usuarios").insert({
    id: created.user.id,
    agencia_id: agenciaId,
    nome,
    email,
    role,
    telefone,
    restrito: false,
    permissoes_menu: perms,
    ativo: true,
  });

  if (error) {
    try { await sb.auth.admin.deleteUser(created.user.id); } catch {}
    redirect(`/super-admin/acessos?erro=db&msg=${encodeURIComponent(error.message)}`);
  }

  await audit({ agenciaId, usuarioId: ctx.userId, acao: "create", entidade: "usuario_super", entidadeId: created.user.id, payload: { email, role } });
  revalidatePath("/super-admin/acessos");
  redirect("/super-admin/acessos?ok=criado");
}

export async function atualizarAcesso(formData: FormData) {
  const ctx = await requireRole("super_admin");
  const id = String(formData.get("id") || "");
  if (!id) redirect("/super-admin/acessos?erro=id");

  const sb = createServiceClient();
  const patch: Record<string, unknown> = {};
  const nome = String(formData.get("nome") || "").trim();
  const telefone = String(formData.get("telefone") || "").trim() || null;
  const agenciaId = String(formData.get("agencia_id") || "");
  const role = String(formData.get("role") || "");
  if (nome) patch.nome = nome;
  if (telefone !== undefined) patch.telefone = telefone;
  if (agenciaId) patch.agencia_id = agenciaId;
  if (role) patch.role = role;
  patch.permissoes_menu = parsePermissoes(formData);

  const novaSenha = String(formData.get("senha") || "");
  if (novaSenha) {
    if (novaSenha.length < 6) redirect("/super-admin/acessos?erro=senha_curta");
    try { await sb.auth.admin.updateUserById(id, { password: novaSenha }); } catch (e) {
      redirect(`/super-admin/acessos?erro=auth&msg=${encodeURIComponent(e instanceof Error ? e.message : String(e))}`);
    }
  }

  const { error } = await sb.from("usuarios").update(patch).eq("id", id);
  if (error) redirect(`/super-admin/acessos?erro=db&msg=${encodeURIComponent(error.message)}`);

  await audit({ agenciaId: agenciaId || "", usuarioId: ctx.userId, acao: "update", entidade: "usuario_super", entidadeId: id, payload: patch });
  revalidatePath("/super-admin/acessos");
  redirect("/super-admin/acessos?ok=atualizado");
}

export async function alternarAtivoAcesso(formData: FormData) {
  await requireRole("super_admin");
  const id = String(formData.get("id") || "");
  const ativoAtual = formData.get("ativo") === "true";
  const sb = createServiceClient();
  await sb.from("usuarios").update({ ativo: !ativoAtual }).eq("id", id);
  revalidatePath("/super-admin/acessos");
  redirect("/super-admin/acessos?ok=alterado");
}

export async function deletarAcesso(formData: FormData) {
  await requireRole("super_admin");
  const id = String(formData.get("id") || "");
  const sb = createServiceClient();
  await sb.from("usuarios").update({ deleted_at: new Date().toISOString(), ativo: false }).eq("id", id);
  // Não apaga do auth — preserva pra restaurar se quiser
  revalidatePath("/super-admin/acessos");
  redirect("/super-admin/acessos?ok=deletado");
}
