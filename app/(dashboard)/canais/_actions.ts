"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/crm/permissions";
import { createServiceClient } from "@/lib/supabase/service";
import { encryptToken, decryptToken, byteaToBuffer } from "@/lib/crypto/tokens";
import {
  adminInitInstance,
  adminDeleteInstance,
  instanceConnect,
  instanceGetMe,
  instanceGetStatus,
  instanceDisconnect,
  instanceSetWebhook,
} from "@/lib/uazapi/client";
import { audit } from "@/lib/crm/audit";

interface ServidorRow {
  id: string;
  base_url: string;
  admin_token_encrypted: unknown;
}

async function getServidorAtivo(): Promise<{ id: string; baseUrl: string; adminToken: string }> {
  const sb = createServiceClient();
  const { data } = await sb
    .from("super_admin_servidores")
    .select("id, base_url, admin_token_encrypted")
    .eq("ativo", true)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (!data) throw new Error("Nenhum servidor UAZAPI ativo. Super Admin precisa cadastrar em /super-admin/servidores.");
  const s = data as ServidorRow;
  return {
    id: s.id,
    baseUrl: s.base_url,
    adminToken: decryptToken(byteaToBuffer(s.admin_token_encrypted)),
  };
}

function webhookUrl(secret: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || "";
  return `${base.replace(/\/$/, "")}/api/webhooks/uazapi/${secret}`;
}

export async function criarCanal(formData: FormData) {
  const ctx = await requireAdmin();
  const nome = String(formData.get("nome") || "").trim();
  const padrao = formData.get("padrao") === "on";
  const filaId = String(formData.get("fila_id") || "") || null;
  const usuarioId = String(formData.get("usuario_id") || "") || null;
  const mensagemDespedida = String(formData.get("mensagem_despedida") || "").trim() || null;

  if (!nome) redirect("/canais?erro=nome_vazio");

  const sb = createServiceClient();
  let servidor: { id: string; baseUrl: string; adminToken: string };
  try {
    servidor = await getServidorAtivo();
  } catch (e) {
    redirect(`/canais?erro=sem_servidor&msg=${encodeURIComponent(e instanceof Error ? e.message : String(e))}`);
  }

  // Cria instância no servidor UAZAPI.
  let instanceId: string;
  let instanceToken: string;
  try {
    const inst = await adminInitInstance(
      { baseUrl: servidor.baseUrl, adminToken: servidor.adminToken },
      { name: nome, systemName: "Sistema Trafego CRM" },
    );
    instanceId = inst.id;
    instanceToken = inst.token || "";
    if (!instanceId || !instanceToken) {
      throw new Error("UAZAPI não retornou id/token da instância.");
    }
  } catch (e) {
    redirect(`/canais?erro=uazapi&msg=${encodeURIComponent(e instanceof Error ? e.message : String(e))}`);
  }

  // Se padrao=true, desmarca outros.
  if (padrao) {
    await sb.from("canais").update({ padrao: false }).eq("agencia_id", ctx.agenciaId).eq("padrao", true);
  }

  const tokenCripto = encryptToken(instanceToken);

  const { data: novo, error } = await sb
    .from("canais")
    .insert({
      agencia_id: ctx.agenciaId,
      servidor_id: servidor.id,
      nome,
      tipo: "uazapi",
      status: "pending_qr",
      instance_id: instanceId,
      instance_token_encrypted: tokenCripto,
      padrao,
      fila_id: filaId,
      usuario_id: usuarioId,
      mensagem_despedida: mensagemDespedida,
    })
    .select("id, webhook_secret")
    .single();

  if (error) {
    redirect(`/canais?erro=db&msg=${encodeURIComponent(error.message)}`);
  }

  // Configura webhook da instância pro nosso endpoint.
  try {
    await instanceSetWebhook(
      { baseUrl: servidor.baseUrl, token: instanceToken },
      webhookUrl(novo.webhook_secret),
      ["messages", "messages_update", "connection"],
    );
  } catch (e) {
    console.error("[canais] setWebhook falhou:", e);
    // Não bloqueia — pode ser revalidado depois.
  }

  await audit({
    agenciaId: ctx.agenciaId,
    usuarioId: ctx.userId,
    acao: "create",
    entidade: "canal",
    entidadeId: novo.id,
    payload: { nome, instanceId },
  });

  revalidatePath("/canais");
  redirect(`/canais?ok=criado&id=${novo.id}`);
}

export async function conectarCanal(formData: FormData) {
  const ctx = await requireAdmin();
  const id = String(formData.get("id") || "");
  const sb = createServiceClient();

  const { data: canal } = await sb
    .from("canais")
    .select("id, instance_token_encrypted, servidor:super_admin_servidores(id, base_url, admin_token_encrypted)")
    .eq("id", id)
    .eq("agencia_id", ctx.agenciaId)
    .single();
  if (!canal) redirect("/canais?erro=nao_encontrado");

  const servidor = (canal as unknown as { servidor: ServidorRow }).servidor;
  const baseUrl = servidor.base_url;
  const token = decryptToken(byteaToBuffer(canal.instance_token_encrypted));

  try {
    const r = await instanceConnect({ baseUrl, token });
    await sb
      .from("canais")
      .update({
        qr_code_atual: r.qrcode || r.paircode || null,
        qr_atualizado_em: new Date().toISOString(),
        status: r.qrcode ? "pending_qr" : "pending_qr",
      })
      .eq("id", id);
  } catch (e) {
    redirect(`/canais?erro=conectar&msg=${encodeURIComponent(e instanceof Error ? e.message : String(e))}`);
  }

  await audit({ agenciaId: ctx.agenciaId, usuarioId: ctx.userId, acao: "connect", entidade: "canal", entidadeId: id });
  revalidatePath("/canais");
  redirect(`/canais?qr=${id}`);
}

export async function atualizarStatusCanal(formData: FormData) {
  const ctx = await requireAdmin();
  const id = String(formData.get("id") || "");
  const sb = createServiceClient();

  const { data: canal } = await sb
    .from("canais")
    .select("id, instance_token_encrypted, servidor:super_admin_servidores(base_url)")
    .eq("id", id)
    .eq("agencia_id", ctx.agenciaId)
    .single();
  if (!canal) redirect("/canais?erro=nao_encontrado");

  const baseUrl = (canal as unknown as { servidor: { base_url: string } }).servidor.base_url;
  const token = decryptToken(byteaToBuffer(canal.instance_token_encrypted));

  try {
    const [status, me] = await Promise.all([
      instanceGetStatus({ baseUrl, token }).catch(() => null),
      instanceGetMe({ baseUrl, token }).catch(() => null),
    ]);
    const conectado = (status?.status || "").toLowerCase().includes("connect") && !(status?.status || "").toLowerCase().includes("dis");
    await sb
      .from("canais")
      .update({
        status: conectado ? "connected" : (status?.status || "pending_qr").toLowerCase().includes("dis") ? "disconnected" : "pending_qr",
        numero_conectado: me?.number || status?.number || null,
        nome_perfil: me?.profileName || status?.profileName || null,
        foto_perfil_url: me?.profilePicUrl || status?.profilePicUrl || null,
        qr_code_atual: conectado ? null : (status?.qrcode || null),
        qr_atualizado_em: conectado ? null : new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
  } catch (e) {
    console.error("[canais] atualizar status:", e);
  }

  revalidatePath("/canais");
  redirect("/canais?ok=atualizado");
}

export async function definirPadrao(formData: FormData) {
  const ctx = await requireAdmin();
  const id = String(formData.get("id") || "");
  const sb = createServiceClient();
  await sb.from("canais").update({ padrao: false }).eq("agencia_id", ctx.agenciaId);
  await sb.from("canais").update({ padrao: true }).eq("id", id).eq("agencia_id", ctx.agenciaId);
  await audit({ agenciaId: ctx.agenciaId, usuarioId: ctx.userId, acao: "update", entidade: "canal", entidadeId: id, payload: { padrao: true } });
  revalidatePath("/canais");
  redirect("/canais?ok=padrao_definido");
}

export async function revalidarWebhook(formData: FormData) {
  const ctx = await requireAdmin();
  const id = String(formData.get("id") || "");
  const sb = createServiceClient();
  const { data: canal } = await sb
    .from("canais")
    .select("id, instance_token_encrypted, webhook_secret, servidor:super_admin_servidores(base_url)")
    .eq("id", id)
    .eq("agencia_id", ctx.agenciaId)
    .single();
  if (!canal) redirect("/canais?erro=nao_encontrado");

  const baseUrl = (canal as unknown as { servidor: { base_url: string } }).servidor.base_url;
  const token = decryptToken(byteaToBuffer(canal.instance_token_encrypted));

  try {
    await instanceSetWebhook(
      { baseUrl, token },
      webhookUrl(canal.webhook_secret),
      ["messages", "messages_update", "connection"],
    );
  } catch (e) {
    redirect(`/canais?erro=webhook&msg=${encodeURIComponent(e instanceof Error ? e.message : String(e))}`);
  }
  await audit({ agenciaId: ctx.agenciaId, usuarioId: ctx.userId, acao: "config_change", entidade: "canal", entidadeId: id, payload: { webhook: "revalidado" } });
  revalidatePath("/canais");
  redirect("/canais?ok=webhook_revalidado");
}

export async function desconectarCanal(formData: FormData) {
  const ctx = await requireAdmin();
  const id = String(formData.get("id") || "");
  const sb = createServiceClient();
  const { data: canal } = await sb
    .from("canais")
    .select("id, instance_token_encrypted, servidor:super_admin_servidores(base_url)")
    .eq("id", id)
    .eq("agencia_id", ctx.agenciaId)
    .single();
  if (!canal) redirect("/canais?erro=nao_encontrado");

  const baseUrl = (canal as unknown as { servidor: { base_url: string } }).servidor.base_url;
  const token = decryptToken(byteaToBuffer(canal.instance_token_encrypted));

  try {
    await instanceDisconnect({ baseUrl, token });
  } catch (e) {
    console.error("[canais] disconnect:", e);
  }
  await sb
    .from("canais")
    .update({
      status: "disconnected",
      numero_conectado: null,
      nome_perfil: null,
      foto_perfil_url: null,
      qr_code_atual: null,
    })
    .eq("id", id);

  await audit({ agenciaId: ctx.agenciaId, usuarioId: ctx.userId, acao: "disconnect", entidade: "canal", entidadeId: id });
  revalidatePath("/canais");
  redirect("/canais?ok=desconectado");
}

export async function deletarCanal(formData: FormData) {
  const ctx = await requireAdmin();
  const id = String(formData.get("id") || "");
  const sb = createServiceClient();

  const { data: canal } = await sb
    .from("canais")
    .select("id, instance_id, servidor:super_admin_servidores(base_url, admin_token_encrypted)")
    .eq("id", id)
    .eq("agencia_id", ctx.agenciaId)
    .single();
  if (!canal) redirect("/canais?erro=nao_encontrado");

  const s = (canal as unknown as { servidor: ServidorRow }).servidor;
  try {
    const adminToken = decryptToken(byteaToBuffer(s.admin_token_encrypted));
    if (canal.instance_id) {
      await adminDeleteInstance({ baseUrl: s.base_url, adminToken }, canal.instance_id);
    }
  } catch (e) {
    console.error("[canais] adminDelete:", e);
  }

  await sb.from("canais").delete().eq("id", id).eq("agencia_id", ctx.agenciaId);
  await audit({ agenciaId: ctx.agenciaId, usuarioId: ctx.userId, acao: "delete", entidade: "canal", entidadeId: id });
  revalidatePath("/canais");
  redirect("/canais?ok=deletado");
}
