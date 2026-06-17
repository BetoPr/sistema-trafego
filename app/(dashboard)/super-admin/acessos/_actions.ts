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
  const tipoCliente = String(formData.get("tipo_cliente") || "").trim() || null;
  const role = (String(formData.get("role") || "atendente") as Role);

  if (!nome || !email || !senha) redirect("/super-admin/acessos?erro=campos");
  if (senha.length < 6) redirect("/super-admin/acessos?erro=senha_curta");

  const sb = createServiceClient();

  // Cada acesso tem SEMPRE uma agencia propria isolada — nunca reaproveita uma
  // existente (reaproveitar vazava dashboard + conversas entre clientes).
  // A agencia e o limite de isolamento (RLS por agencia_id); fica interna e nao
  // aparece mais na tela. "tipo_cliente" e so um rotulo do acesso.
  // slug e NOT NULL e unico — gera a partir do nome + sufixo aleatorio
  const slugBase = nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "cliente";
  const slug = `${slugBase}-${crypto.randomUUID().slice(0, 8)}`;
  const { data: ag, error: agErr } = await sb
    .from("agencias")
    .insert({ nome, slug })
    .select("id")
    .single();
  if (agErr || !ag) {
    redirect(`/super-admin/acessos?erro=db&msg=${encodeURIComponent(agErr?.message || "Falha criando espaco do cliente")}`);
  }
  const agenciaId = ag.id as string;

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
    tipo_cliente: tipoCliente,
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
  const role = String(formData.get("role") || "");
  // NAO troca mais de agencia (reatribuir vazava dados entre clientes).
  // So atualiza o rotulo "tipo_cliente".
  patch.tipo_cliente = String(formData.get("tipo_cliente") || "").trim() || null;
  if (nome) patch.nome = nome;
  if (telefone !== undefined) patch.telefone = telefone;
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

  await audit({ agenciaId: ctx.agenciaId || "", usuarioId: ctx.userId, acao: "update", entidade: "usuario_super", entidadeId: id, payload: patch });
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

export async function restaurarAcesso(formData: FormData) {
  await requireRole("super_admin");
  const id = String(formData.get("id") || "");
  const sb = createServiceClient();
  await sb.from("usuarios").update({ deleted_at: null, ativo: true }).eq("id", id);
  revalidatePath("/super-admin/acessos");
  redirect("/super-admin/acessos?ok=restaurado");
}

// --- COBRANÇAS ---

import { dispararCobranca, marcarPago as mp, estenderVencimento as ev } from "@/lib/super-admin/cobrancas";

export async function cobrarAgencia(formData: FormData) {
  const ctx = await requireRole("super_admin");
  const agenciaId = String(formData.get("agencia_id") || "");
  if (!agenciaId) redirect("/super-admin/acessos?erro=id");
  const r = await dispararCobranca({ agenciaId, motivo: "manual" });
  await audit({ agenciaId, usuarioId: ctx.userId, acao: "cobrar", entidade: "agencia", entidadeId: agenciaId, payload: r as unknown as Record<string, unknown> });
  revalidatePath("/super-admin/acessos");
  if (r.ok) redirect("/super-admin/acessos?ok=cobranca_enviada");
  redirect(`/super-admin/acessos?erro=cobranca&msg=${encodeURIComponent(r.motivo || r.erro || "Falha")}`);
}

export async function marcarPagoAgencia(formData: FormData) {
  const ctx = await requireRole("super_admin");
  const agenciaId = String(formData.get("agencia_id") || "");
  const meses = Math.max(1, parseInt(String(formData.get("meses") || "1"), 10));
  if (!agenciaId) redirect("/super-admin/acessos?erro=id");
  const r = await mp(agenciaId, meses);
  await audit({ agenciaId, usuarioId: ctx.userId, acao: "marcar_pago", entidade: "agencia", entidadeId: agenciaId, payload: { meses, vencimento_em: r.vencimento_em } });
  revalidatePath("/super-admin/acessos");
  redirect("/super-admin/acessos?ok=pago_marcado");
}

export async function estenderVencimentoAgencia(formData: FormData) {
  const ctx = await requireRole("super_admin");
  const agenciaId = String(formData.get("agencia_id") || "");
  const meses = Math.max(1, parseInt(String(formData.get("meses") || "1"), 10));
  if (!agenciaId) redirect("/super-admin/acessos?erro=id");
  const r = await ev(agenciaId, meses);
  await audit({ agenciaId, usuarioId: ctx.userId, acao: "estender_vencimento", entidade: "agencia", entidadeId: agenciaId, payload: { meses, vencimento_em: r.vencimento_em } });
  revalidatePath("/super-admin/acessos");
  redirect("/super-admin/acessos?ok=vencimento_estendido");
}

export async function atualizarCobrancaAgencia(formData: FormData) {
  const ctx = await requireRole("super_admin");
  const agenciaId = String(formData.get("agencia_id") || "");
  if (!agenciaId) redirect("/super-admin/acessos?erro=id");
  const sb = createServiceClient();
  const valorRaw = String(formData.get("valor_mensal") || "").replace(",", ".").trim();
  const valor = valorRaw ? Number(valorRaw) : null;
  const whats = String(formData.get("whatsapp_cobranca") || "").trim() || null;
  const venc = String(formData.get("vencimento_em") || "").trim() || null;
  const cobrancaAtiva = formData.get("cobranca_ativa") === "on";
  const acessoBloqueado = formData.get("acesso_bloqueado") === "on";

  const patch: Record<string, unknown> = {
    cobranca_ativa: cobrancaAtiva,
    acesso_bloqueado: acessoBloqueado,
  };
  if (valor !== null && !isNaN(valor)) patch.valor_mensal = valor;
  if (whats !== null) patch.whatsapp_cobranca = whats;
  if (venc !== null) patch.vencimento_em = venc;

  const { error } = await sb.from("agencias").update(patch).eq("id", agenciaId);
  if (error) redirect(`/super-admin/acessos?erro=db&msg=${encodeURIComponent(error.message)}`);
  await audit({ agenciaId, usuarioId: ctx.userId, acao: "update", entidade: "agencia_cobranca", entidadeId: agenciaId, payload: patch });
  revalidatePath("/super-admin/acessos");
  redirect("/super-admin/acessos?ok=cobranca_atualizada");
}

export async function atualizarConfigCobranca(formData: FormData) {
  const ctx = await requireRole("super_admin");
  const sb = createServiceClient();
  const canalId = String(formData.get("canal_id") || "").trim() || null;
  const template = String(formData.get("template_texto") || "").trim();
  const horario = String(formData.get("horario") || "09:00:00").trim();
  const patch: Record<string, unknown> = { atualizado_em: new Date().toISOString() };
  if (canalId) patch.canal_id = canalId;
  if (template) patch.template_texto = template;
  if (horario) patch.horario = horario;
  const { error } = await sb.from("super_admin_cobranca_config").update(patch).eq("id", 1);
  if (error) redirect(`/super-admin/acessos?erro=db&msg=${encodeURIComponent(error.message)}`);
  await audit({ agenciaId: ctx.agenciaId, usuarioId: ctx.userId, acao: "update", entidade: "super_admin_cobranca_config", entidadeId: "1", payload: patch });
  revalidatePath("/super-admin/acessos");
  redirect("/super-admin/acessos?ok=config_atualizada");
}
