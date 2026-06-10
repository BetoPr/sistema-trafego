"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/crm/permissions";
import { createServiceClient } from "@/lib/supabase/service";
import { audit } from "@/lib/crm/audit";
import { PERMISSOES_MENU } from "@/lib/crm/permissions";

type Role = "super_admin" | "admin" | "atendente";

function parsePermissoes(formData: FormData): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const p of PERMISSOES_MENU) {
    out[p] = formData.get(`perm_${p}`) === "on";
  }
  return out;
}

function parseHorario(formData: FormData): Record<string, { status: string; p1?: string; p2?: string }> {
  const dias = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];
  const out: Record<string, { status: string; p1?: string; p2?: string }> = {};
  for (const d of dias) {
    const status = String(formData.get(`hor_${d}_status`) || "Aberto");
    const p1 = String(formData.get(`hor_${d}_p1`) || "") || undefined;
    const p2 = String(formData.get(`hor_${d}_p2`) || "") || undefined;
    out[d] = { status, p1, p2 };
  }
  return out;
}

/** Sincroniza usuario_equipes com os checkboxes name="equipes" do form. */
async function syncEquipes(sb: ReturnType<typeof createServiceClient>, usuarioId: string, formData: FormData) {
  const equipeIds = formData.getAll("equipes").map(String).filter(Boolean);
  await sb.from("usuario_equipes").delete().eq("usuario_id", usuarioId);
  if (equipeIds.length > 0) {
    await sb.from("usuario_equipes").insert(equipeIds.map((equipe_id) => ({ usuario_id: usuarioId, equipe_id })));
  }
}

export async function criarUsuario(formData: FormData) {
  const ctx = await requireAdmin();
  const nome = String(formData.get("nome") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const senha = String(formData.get("senha") || "");
  const telefone = String(formData.get("telefone") || "").trim() || null;
  const role = (String(formData.get("role") || "atendente") as Role);
  const restrito = formData.get("restrito") === "on";

  if (!nome || !email || !senha) redirect("/usuarios?erro=campos_obrigatorios");
  if (senha.length < 6) redirect("/usuarios?erro=senha_curta");
  if (role === "super_admin" && ctx.role !== "super_admin") redirect("/usuarios?erro=permissao_negada");

  const sb = createServiceClient();

  // Cria no auth.
  const { data: created, error: authErr } = await sb.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome },
  });
  if (authErr || !created.user) {
    redirect(`/usuarios?erro=auth&msg=${encodeURIComponent(authErr?.message || "Erro auth")}`);
  }

  const perms = parsePermissoes(formData);
  const horario = parseHorario(formData);

  const { error } = await sb.from("usuarios").insert({
    id: created.user.id,
    agencia_id: ctx.agenciaId,
    nome,
    email,
    role,
    telefone,
    restrito,
    permissoes_menu: perms,
    horario_atendimento: horario,
    ativo: true,
  });

  if (error) {
    // Rollback do auth.
    try { await sb.auth.admin.deleteUser(created.user.id); } catch {}
    redirect(`/usuarios?erro=db&msg=${encodeURIComponent(error.message)}`);
  }

  await syncEquipes(sb, created.user.id, formData);

  await audit({
    agenciaId: ctx.agenciaId,
    usuarioId: ctx.userId,
    acao: "create",
    entidade: "usuario",
    entidadeId: created.user.id,
    payload: { email, role },
  });

  revalidatePath("/usuarios");
  redirect("/usuarios?ok=criado");
}

export async function atualizarUsuario(formData: FormData) {
  const ctx = await requireAdmin();
  const id = String(formData.get("id") || "");
  const nome = String(formData.get("nome") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const novaSenha = String(formData.get("senha") || "");
  const telefone = String(formData.get("telefone") || "").trim() || null;
  const role = (String(formData.get("role") || "atendente") as Role);
  const restrito = formData.get("restrito") === "on";

  if (!id || !nome || !email) redirect("/usuarios?erro=campos_obrigatorios");
  if (role === "super_admin" && ctx.role !== "super_admin") redirect("/usuarios?erro=permissao_negada");

  const sb = createServiceClient();

  if (novaSenha) {
    if (novaSenha.length < 6) redirect("/usuarios?erro=senha_curta");
    await sb.auth.admin.updateUserById(id, { password: novaSenha });
  }
  if (email) {
    await sb.auth.admin.updateUserById(id, { email });
  }

  const perms = parsePermissoes(formData);
  const horario = parseHorario(formData);

  const { error } = await sb
    .from("usuarios")
    .update({
      nome,
      email,
      role,
      telefone,
      restrito,
      permissoes_menu: perms,
      horario_atendimento: horario,
    })
    .eq("id", id)
    .eq("agencia_id", ctx.agenciaId);

  if (error) redirect(`/usuarios?erro=db&msg=${encodeURIComponent(error.message)}`);

  await syncEquipes(sb, id, formData);

  await audit({
    agenciaId: ctx.agenciaId,
    usuarioId: ctx.userId,
    acao: "update",
    entidade: "usuario",
    entidadeId: id,
  });

  revalidatePath("/usuarios");
  redirect("/usuarios?ok=atualizado");
}

export async function alternarAtivo(formData: FormData) {
  const ctx = await requireAdmin();
  const id = String(formData.get("id") || "");
  const ativo = formData.get("ativo") === "true";
  const sb = createServiceClient();
  await sb.from("usuarios").update({ ativo: !ativo }).eq("id", id).eq("agencia_id", ctx.agenciaId);
  await audit({ agenciaId: ctx.agenciaId, usuarioId: ctx.userId, acao: "update", entidade: "usuario", entidadeId: id, payload: { ativo: !ativo } });
  revalidatePath("/usuarios");
  redirect("/usuarios?ok=ativo_alterado");
}

export async function softDeleteUsuario(formData: FormData) {
  const ctx = await requireAdmin();
  const id = String(formData.get("id") || "");
  if (id === ctx.userId) redirect("/usuarios?erro=autodelete");
  const sb = createServiceClient();
  await sb
    .from("usuarios")
    .update({ ativo: false, deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("agencia_id", ctx.agenciaId);
  await audit({ agenciaId: ctx.agenciaId, usuarioId: ctx.userId, acao: "delete", entidade: "usuario", entidadeId: id });
  revalidatePath("/usuarios");
  redirect("/usuarios?ok=deletado");
}
