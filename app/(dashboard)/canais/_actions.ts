"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/crm/permissions";
import { createServiceClient } from "@/lib/supabase/service";
import { encryptToken, decryptToken, byteaToBuffer, bufferToBytea } from "@/lib/crypto/tokens";
import {
  adminCreateInstance,
  instanceDelete,
  instanceConnect,
  instanceGetStatus,
  instanceDisconnect,
  instanceSetWebhook,
  adminListInstances,
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
    const { instance, token } = await adminCreateInstance(
      { baseUrl: servidor.baseUrl, adminToken: servidor.adminToken },
      { name: nome },
    );
    instanceId = instance.id;
    instanceToken = token || "";
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

  const tokenCripto = bufferToBytea(encryptToken(instanceToken));

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

  // Auto-gera QR Code imediatamente pra UX direta
  try {
    const r = await instanceConnect({ baseUrl: servidor.baseUrl, token: instanceToken });
    const qr = r.instance?.qrcode || r.instance?.paircode || null;
    if (qr) {
      const sb2 = createServiceClient();
      await sb2
        .from("canais")
        .update({
          qr_code_atual: qr,
          qr_atualizado_em: new Date().toISOString(),
        })
        .eq("id", novo.id);
    }
  } catch (e) {
    console.error("[canais] auto-connect falhou:", e);
  }

  revalidatePath("/canais");
  redirect(`/canais?ok=criado&qr=${novo.id}`);
}

/**
 * Importa instância UAZAPI já existente (criada/conectada direto no servidor).
 * Usuário cola o instance_token. Sistema chama /instance/status com esse token,
 * salva row em canais com dados já preenchidos + configura webhook.
 */
export async function importarCanalExistente(formData: FormData) {
  const ctx = await requireAdmin();
  const nome = String(formData.get("nome") || "").trim();
  const instanceToken = String(formData.get("instance_token") || "").trim();
  const padrao = formData.get("padrao") === "on";
  const filaId = String(formData.get("fila_id") || "") || null;
  const usuarioId = String(formData.get("usuario_id") || "") || null;

  if (!nome || !instanceToken) {
    redirect("/canais?erro=campos_obrigatorios");
  }

  const sb = createServiceClient();
  let servidor: { id: string; baseUrl: string; adminToken: string };
  try {
    servidor = await getServidorAtivo();
  } catch (e) {
    redirect(`/canais?erro=sem_servidor&msg=${encodeURIComponent(e instanceof Error ? e.message : String(e))}`);
  }

  // Pega status atual da instância no servidor.
  let instanceId = "";
  let conectado = false;
  let numeroConectado: string | null = null;
  let nomePerfil: string | null = null;
  let fotoPerfil: string | null = null;
  try {
    const r = await instanceGetStatus({ baseUrl: servidor.baseUrl, token: instanceToken });
    instanceId = r.instance?.id || "";
    conectado = !!r.status?.connected;
    numeroConectado = r.status?.jid?.user || null;
    nomePerfil = r.instance?.profileName || null;
    fotoPerfil = r.instance?.profilePicUrl || null;
    if (!instanceId) throw new Error("Servidor não reconheceu o token (id ausente).");
  } catch (e) {
    redirect(`/canais?erro=token_invalido&msg=${encodeURIComponent(e instanceof Error ? e.message : String(e))}`);
  }

  // Verifica se já não foi importado.
  const { data: existente } = await sb
    .from("canais")
    .select("id")
    .eq("agencia_id", ctx.agenciaId)
    .eq("instance_id", instanceId)
    .maybeSingle();
  if (existente) {
    redirect(`/canais?erro=ja_importado&msg=${encodeURIComponent(`Instância ${instanceId} já está no sistema.`)}`);
  }

  if (padrao) {
    await sb.from("canais").update({ padrao: false }).eq("agencia_id", ctx.agenciaId).eq("padrao", true);
  }

  const tokenCripto = bufferToBytea(encryptToken(instanceToken));

  const { data: novo, error } = await sb
    .from("canais")
    .insert({
      agencia_id: ctx.agenciaId,
      servidor_id: servidor.id,
      nome,
      tipo: "uazapi",
      status: conectado ? "connected" : "pending_qr",
      instance_id: instanceId,
      instance_token_encrypted: tokenCripto,
      numero_conectado: numeroConectado,
      nome_perfil: nomePerfil,
      foto_perfil_url: fotoPerfil,
      padrao,
      fila_id: filaId,
      usuario_id: usuarioId,
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
    console.error("[canais] importar setWebhook falhou:", e);
  }

  await audit({
    agenciaId: ctx.agenciaId,
    usuarioId: ctx.userId,
    acao: "create",
    entidade: "canal",
    entidadeId: novo.id,
    payload: { acao: "import", instanceId, conectado, numeroConectado },
  });

  revalidatePath("/canais");
  redirect(`/canais?ok=importado&id=${novo.id}`);
}

/**
 * Lista instâncias do servidor UAZAPI ativo — pra UI mostrar opções pra importar.
 * Retorna apenas instâncias que ainda NÃO estão no banco do tenant.
 */
export async function listarInstanciasDisponiveis(): Promise<Array<{ id: string; name: string; status: string; profileName: string | null; numberConectado: string | null }>> {
  const ctx = await requireAdmin();
  const sb = createServiceClient();
  let servidor: { id: string; baseUrl: string; adminToken: string };
  try {
    servidor = await getServidorAtivo();
  } catch {
    return [];
  }
  try {
    const todas = await adminListInstances({ baseUrl: servidor.baseUrl, adminToken: servidor.adminToken });
    const { data: jaImportadas } = await sb
      .from("canais")
      .select("instance_id")
      .eq("agencia_id", ctx.agenciaId);
    const jaSet = new Set((jaImportadas || []).map((c) => c.instance_id));
    return todas
      .filter((i) => !jaSet.has(i.id))
      .map((i) => ({
        id: i.id,
        name: i.name || i.id,
        status: i.status || "unknown",
        profileName: i.profileName || null,
        numberConectado: i.jid?.user || null,
      }));
  } catch (e) {
    console.error("[canais] listarInstancias:", e);
    return [];
  }
}

// =========================================
// Versões JSON (sem redirect) — fluxo em balão no client
// =========================================

export async function criarCanalJson(input: {
  nome: string;
  padrao?: boolean;
  filaId?: string | null;
  usuarioId?: string | null;
  mensagemDespedida?: string | null;
}): Promise<{ ok: true; canalId: string } | { ok: false; msg: string }> {
  const ctx = await requireAdmin();
  const nome = input.nome.trim();
  if (!nome) return { ok: false, msg: "Nome obrigatório." };

  const sb = createServiceClient();
  let servidor: { id: string; baseUrl: string; adminToken: string };
  try {
    servidor = await getServidorAtivo();
  } catch (e) {
    return { ok: false, msg: e instanceof Error ? e.message : String(e) };
  }

  let instanceId: string;
  let instanceToken: string;
  try {
    const { instance, token } = await adminCreateInstance(
      { baseUrl: servidor.baseUrl, adminToken: servidor.adminToken },
      { name: nome },
    );
    instanceId = instance.id;
    instanceToken = token || "";
    if (!instanceId || !instanceToken) throw new Error("UAZAPI não retornou id/token da instância.");
  } catch (e) {
    return { ok: false, msg: e instanceof Error ? e.message : String(e) };
  }

  if (input.padrao) {
    await sb.from("canais").update({ padrao: false }).eq("agencia_id", ctx.agenciaId).eq("padrao", true);
  }

  const { data: novo, error } = await sb
    .from("canais")
    .insert({
      agencia_id: ctx.agenciaId,
      servidor_id: servidor.id,
      nome,
      tipo: "uazapi",
      status: "pending_qr",
      instance_id: instanceId,
      instance_token_encrypted: bufferToBytea(encryptToken(instanceToken)),
      padrao: !!input.padrao,
      fila_id: input.filaId || null,
      usuario_id: input.usuarioId || null,
      mensagem_despedida: input.mensagemDespedida || null,
    })
    .select("id, webhook_secret")
    .single();
  if (error) return { ok: false, msg: error.message };

  try {
    await instanceSetWebhook(
      { baseUrl: servidor.baseUrl, token: instanceToken },
      webhookUrl(novo.webhook_secret),
      ["messages", "messages_update", "connection"],
    );
  } catch (e) {
    console.error("[canais] setWebhook falhou:", e);
  }

  await audit({ agenciaId: ctx.agenciaId, usuarioId: ctx.userId, acao: "create", entidade: "canal", entidadeId: novo.id, payload: { nome, instanceId } });
  revalidatePath("/canais");
  return { ok: true, canalId: novo.id };
}

/** Gera (ou renova) o QR Code do canal. Retorna QR base64 ou connected=true. */
export async function gerarQrCanal(canalId: string): Promise<{ ok: true; qr: string | null; connected: boolean } | { ok: false; msg: string }> {
  const ctx = await requireAdmin();
  const sb = createServiceClient();
  const { data: canal } = await sb
    .from("canais")
    .select("id, instance_token_encrypted, servidor:super_admin_servidores(base_url)")
    .eq("id", canalId)
    .eq("agencia_id", ctx.agenciaId)
    .single();
  if (!canal) return { ok: false, msg: "Canal não encontrado." };

  const baseUrl = (canal as unknown as { servidor: { base_url: string } }).servidor.base_url;
  const token = decryptToken(byteaToBuffer(canal.instance_token_encrypted));

  try {
    const r = await instanceConnect({ baseUrl, token });
    const connected = !!r.connected;
    const qr = r.instance?.qrcode || r.instance?.paircode || null;
    await sb
      .from("canais")
      .update({
        qr_code_atual: connected ? null : qr,
        qr_atualizado_em: new Date().toISOString(),
        status: connected ? "connected" : "pending_qr",
      })
      .eq("id", canalId);
    return { ok: true, qr, connected };
  } catch (e) {
    return { ok: false, msg: e instanceof Error ? e.message : String(e) };
  }
}

/** Consulta status do canal no UAZAPI e sincroniza o banco. */
export async function statusCanalJson(canalId: string): Promise<{ ok: true; connected: boolean; numero: string | null } | { ok: false; msg: string }> {
  const ctx = await requireAdmin();
  const sb = createServiceClient();
  const { data: canal } = await sb
    .from("canais")
    .select("id, instance_token_encrypted, servidor:super_admin_servidores(base_url)")
    .eq("id", canalId)
    .eq("agencia_id", ctx.agenciaId)
    .single();
  if (!canal) return { ok: false, msg: "Canal não encontrado." };

  const baseUrl = (canal as unknown as { servidor: { base_url: string } }).servidor.base_url;
  const token = decryptToken(byteaToBuffer(canal.instance_token_encrypted));

  try {
    const r = await instanceGetStatus({ baseUrl, token });
    const connected = !!r?.status?.connected;
    const numero = r?.status?.jid?.user || null;
    await sb
      .from("canais")
      .update({
        status: connected ? "connected" : "pending_qr",
        numero_conectado: numero,
        nome_perfil: r?.instance?.profileName || null,
        foto_perfil_url: r?.instance?.profilePicUrl || null,
        qr_code_atual: connected ? null : undefined,
        updated_at: new Date().toISOString(),
      })
      .eq("id", canalId);
    if (connected) revalidatePath("/canais");
    return { ok: true, connected, numero };
  } catch (e) {
    return { ok: false, msg: e instanceof Error ? e.message : String(e) };
  }
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
    const qr = r.instance?.qrcode || r.instance?.paircode || null;
    await sb
      .from("canais")
      .update({
        qr_code_atual: qr,
        qr_atualizado_em: new Date().toISOString(),
        status: r.connected ? "connected" : "pending_qr",
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
    const r = await instanceGetStatus({ baseUrl, token }).catch(() => null);
    const conectado = !!r?.status?.connected;
    const numero = r?.status?.jid?.user || null;
    const instStatus = (r?.instance?.status || "").toLowerCase();
    await sb
      .from("canais")
      .update({
        status: conectado ? "connected" : instStatus === "disconnected" ? "disconnected" : "pending_qr",
        numero_conectado: numero,
        nome_perfil: r?.instance?.profileName || null,
        foto_perfil_url: r?.instance?.profilePicUrl || null,
        qr_code_atual: conectado ? null : (r?.instance?.qrcode || null),
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
    .select("id, instance_id, instance_token_encrypted, servidor:super_admin_servidores(base_url)")
    .eq("id", id)
    .eq("agencia_id", ctx.agenciaId)
    .single();
  if (!canal) redirect("/canais?erro=nao_encontrado");

  const s = (canal as unknown as { servidor: { base_url: string } }).servidor;
  try {
    if (canal.instance_token_encrypted) {
      const token = decryptToken(byteaToBuffer(canal.instance_token_encrypted));
      await instanceDelete({ baseUrl: s.base_url, token });
    }
  } catch (e) {
    console.error("[canais] instanceDelete:", e);
  }

  await sb.from("canais").delete().eq("id", id).eq("agencia_id", ctx.agenciaId);
  await audit({ agenciaId: ctx.agenciaId, usuarioId: ctx.userId, acao: "delete", entidade: "canal", entidadeId: id });
  revalidatePath("/canais");
  redirect("/canais?ok=deletado");
}
