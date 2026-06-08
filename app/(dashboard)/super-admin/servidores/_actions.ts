"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/crm/permissions";
import { encryptToken, decryptToken, byteaToBuffer, bufferToBytea } from "@/lib/crypto/tokens";
import { createServiceClient } from "@/lib/supabase/service";
import { adminGetGlobalWebhook, adminSetGlobalWebhook } from "@/lib/uazapi/client";
import { audit } from "@/lib/crm/audit";

export async function criarServidor(formData: FormData) {
  const ctx = await requireSuperAdmin();
  const nome = String(formData.get("nome") || "").trim();
  const baseUrl = String(formData.get("base_url") || "").trim();
  const adminToken = String(formData.get("admin_token") || "").trim();
  const observacoes = String(formData.get("observacoes") || "").trim() || null;

  if (!nome || !baseUrl || !adminToken) {
    redirect("/super-admin/servidores?erro=campos_obrigatorios");
  }
  if (!baseUrl.startsWith("https://")) {
    redirect("/super-admin/servidores?erro=base_url_invalida");
  }

  const sb = createServiceClient();
  const cripto = encryptToken(adminToken);

  const { data: novo, error } = await sb
    .from("super_admin_servidores")
    .insert({
      agencia_id: ctx.agenciaId,
      nome,
      plataforma: "uazapi",
      base_url: baseUrl.replace(/\/$/, ""),
      admin_token_encrypted: bufferToBytea(cripto),
      observacoes,
      ativo: true,
    })
    .select("id")
    .single();

  if (error) {
    await audit({
      agenciaId: ctx.agenciaId,
      usuarioId: ctx.userId,
      acao: "create",
      entidade: "super_admin_servidor",
      status: 500,
      payload: { erro: error.message },
    });
    redirect(`/super-admin/servidores?erro=db_error&msg=${encodeURIComponent(error.message)}`);
  }

  await audit({
    agenciaId: ctx.agenciaId,
    usuarioId: ctx.userId,
    acao: "create",
    entidade: "super_admin_servidor",
    entidadeId: novo.id,
    payload: { nome, baseUrl },
  });

  revalidatePath("/super-admin/servidores");
  redirect("/super-admin/servidores?ok=criado");
}

export async function atualizarServidor(formData: FormData) {
  const ctx = await requireSuperAdmin();
  const id = String(formData.get("id") || "");
  const nome = String(formData.get("nome") || "").trim();
  const baseUrl = String(formData.get("base_url") || "").trim();
  const adminToken = String(formData.get("admin_token") || "").trim();
  const observacoes = String(formData.get("observacoes") || "").trim() || null;
  const ativo = formData.get("ativo") === "on";

  const sb = createServiceClient();
  const patch: Record<string, unknown> = {
    nome,
    base_url: baseUrl.replace(/\/$/, ""),
    observacoes,
    ativo,
    updated_at: new Date().toISOString(),
  };

  if (adminToken && adminToken !== "•••GUARDADO•••") {
    patch.admin_token_encrypted = bufferToBytea(encryptToken(adminToken));
  }

  const { error } = await sb.from("super_admin_servidores").update(patch).eq("id", id);
  if (error) {
    redirect(`/super-admin/servidores?erro=db_error&msg=${encodeURIComponent(error.message)}`);
  }

  await audit({
    agenciaId: ctx.agenciaId,
    usuarioId: ctx.userId,
    acao: "update",
    entidade: "super_admin_servidor",
    entidadeId: id,
  });

  revalidatePath("/super-admin/servidores");
  redirect("/super-admin/servidores?ok=atualizado");
}

export async function deletarServidor(formData: FormData) {
  const ctx = await requireSuperAdmin();
  const id = String(formData.get("id") || "");
  const sb = createServiceClient();
  const { error } = await sb.from("super_admin_servidores").delete().eq("id", id);
  if (error) {
    redirect(`/super-admin/servidores?erro=db_error&msg=${encodeURIComponent(error.message)}`);
  }
  await audit({
    agenciaId: ctx.agenciaId,
    usuarioId: ctx.userId,
    acao: "delete",
    entidade: "super_admin_servidor",
    entidadeId: id,
  });
  revalidatePath("/super-admin/servidores");
  redirect("/super-admin/servidores?ok=deletado");
}

/**
 * Testa conectividade com servidor UAZAPI via /globalwebhook GET.
 * Não persiste — retorna pelo redirect.
 */
export async function testarServidor(formData: FormData) {
  const ctx = await requireSuperAdmin();
  const id = String(formData.get("id") || "");
  const sb = createServiceClient();

  const { data: s } = await sb
    .from("super_admin_servidores")
    .select("base_url, admin_token_encrypted")
    .eq("id", id)
    .single();

  if (!s) redirect("/super-admin/servidores?erro=nao_encontrado");

  try {
    const adminToken = decryptToken(byteaToBuffer(s.admin_token_encrypted));
    const r = await adminGetGlobalWebhook({ baseUrl: s.base_url, adminToken });
    await audit({
      agenciaId: ctx.agenciaId,
      usuarioId: ctx.userId,
      acao: "view",
      entidade: "super_admin_servidor",
      entidadeId: id,
      payload: { teste: "ok", webhook: r },
    });
    redirect(`/super-admin/servidores?ok=teste_ok&msg=${encodeURIComponent(`Webhook global: ${r?.url || "(não configurado)"}`)}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    redirect(`/super-admin/servidores?erro=teste_falhou&msg=${encodeURIComponent(msg)}`);
  }
}

/**
 * Configura webhook global do servidor UAZAPI pra apontar pro nosso /api/webhooks/uazapi/[secret].
 * Cada canal terá um secret próprio, mas o webhook global aponta pra um path "router"
 * — usaremos webhook por instância em vez do global por enquanto.
 *
 * Este endpoint serve só pra LER a config atual.
 */
