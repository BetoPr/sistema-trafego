"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import { requireRole } from "@/lib/crm/permissions";
import { audit } from "@/lib/crm/audit";
import { encryptToken, bufferToBytea } from "@/lib/crypto/tokens";

const ROUTE = "/ia-atendimento";

function parseFormatoResposta(formData: FormData) {
  return {
    bullets: formData.get("bullets") === "on",
    separador_blocos: String(formData.get("separador_blocos") || "\n\n"),
    max_msgs: Math.max(1, Math.min(5, parseInt(String(formData.get("max_msgs") || "3"), 10))),
    regras_split: [
      { chars_max: 80, n_msgs: 1 },
      { chars_max: 200, n_msgs: 2 },
      { chars_max: 500, n_msgs: 3 },
    ],
  };
}

export async function criarPerfilIA(formData: FormData) {
  const ctx = await requireRole("admin", "super_admin");
  const sb = createServiceClient();
  const nome = String(formData.get("nome") || "").trim();
  if (!nome) redirect(`${ROUTE}?erro=nome`);

  // Aplicar template? Carrega prompt/modelo do template
  const templateId = String(formData.get("template_id") || "").trim();
  let templatePrompt = "";
  let templateModelo = "";
  let templateProvider = "";
  if (templateId) {
    const { data: tpl } = await sb
      .from("ia_atendimento_perfis")
      .select("prompt_sistema, modelo, provider, delay_debounce_seg, delay_min_resposta_seg, delay_max_resposta_seg")
      .eq("id", templateId)
      .eq("eh_template", true)
      .maybeSingle();
    if (tpl) {
      templatePrompt = tpl.prompt_sistema || "";
      templateModelo = tpl.modelo || "";
      templateProvider = tpl.provider || "";
    }
  }

  const apiKey = String(formData.get("api_key") || "").trim();
  const provider = String(formData.get("provider") || templateProvider || "anthropic");
  const modelo = String(formData.get("modelo") || templateModelo || "claude-haiku-4-5-20251001");

  const promptFinal = (String(formData.get("prompt_sistema") || "").trim()) || templatePrompt;
  const whitelistRaw = String(formData.get("whatsapp_teste_lista") || "");
  const whitelist = whitelistRaw.split(/[\n,;]/).map((s) => s.trim()).filter(Boolean);

  const timezone = String(formData.get("timezone") || "America/Sao_Paulo");
  const patch: Record<string, unknown> = {
    agencia_id: ctx.agenciaId,
    nome,
    descricao: String(formData.get("descricao") || "").trim() || null,
    provider,
    modelo,
    prompt_sistema: promptFinal,
    timezone,
    whatsapp_teste_lista: whitelist,
    delay_debounce_seg: Math.max(0, Math.min(600, parseInt(String(formData.get("delay_debounce_seg") || "20"), 10))),
    delay_min_resposta_seg: Math.max(0, parseInt(String(formData.get("delay_min_resposta_seg") || "3"), 10)),
    delay_max_resposta_seg: Math.max(0, parseInt(String(formData.get("delay_max_resposta_seg") || "8"), 10)),
    max_tokens_por_resposta: Math.max(50, Math.min(4000, parseInt(String(formData.get("max_tokens_por_resposta") || "800"), 10))),
    temperatura: Math.max(0, Math.min(2, parseFloat(String(formData.get("temperatura") || "0.7")))),
    pausa_se_humano_responder: formData.get("pausa_se_humano_responder") === "on",
    ativo: formData.get("ativo") === "on",
    formato_resposta: parseFormatoResposta(formData),
    criado_por: ctx.userId,
  };
  if (apiKey) {
    patch.api_key_encrypted = bufferToBytea(encryptToken(apiKey));
  }

  const { data, error } = await sb.from("ia_atendimento_perfis").insert(patch).select("id").single();
  if (error) redirect(`${ROUTE}?erro=db&msg=${encodeURIComponent(error.message)}`);

  await audit({ agenciaId: ctx.agenciaId, usuarioId: ctx.userId, acao: "create", entidade: "ia_atendimento_perfil", entidadeId: data.id, payload: { nome, provider, modelo } });
  revalidatePath(ROUTE);
  redirect(`${ROUTE}?editar=${data.id}&ok=criado`);
}

export async function atualizarPerfilIA(formData: FormData) {
  const ctx = await requireRole("admin", "super_admin");
  const id = String(formData.get("id") || "");
  if (!id) redirect(`${ROUTE}?erro=id`);

  const sb = createServiceClient();
  const apiKey = String(formData.get("api_key") || "").trim();
  const whitelistRaw = String(formData.get("whatsapp_teste_lista") || "");
  const whitelist = whitelistRaw
    .split(/[\n,;]/)
    .map((s) => s.trim())
    .filter(Boolean);

  const timezone = String(formData.get("timezone") || "America/Sao_Paulo");
  const patch: Record<string, unknown> = {
    nome: String(formData.get("nome") || "").trim(),
    descricao: String(formData.get("descricao") || "").trim() || null,
    provider: String(formData.get("provider") || "anthropic"),
    modelo: String(formData.get("modelo") || "claude-haiku-4-5-20251001"),
    prompt_sistema: String(formData.get("prompt_sistema") || "").trim(),
    timezone,
    delay_debounce_seg: Math.max(0, Math.min(600, parseInt(String(formData.get("delay_debounce_seg") || "20"), 10))),
    delay_min_resposta_seg: Math.max(0, parseInt(String(formData.get("delay_min_resposta_seg") || "3"), 10)),
    delay_max_resposta_seg: Math.max(0, parseInt(String(formData.get("delay_max_resposta_seg") || "8"), 10)),
    max_tokens_por_resposta: Math.max(50, Math.min(4000, parseInt(String(formData.get("max_tokens_por_resposta") || "800"), 10))),
    temperatura: Math.max(0, Math.min(2, parseFloat(String(formData.get("temperatura") || "0.7")))),
    pausa_se_humano_responder: formData.get("pausa_se_humano_responder") === "on",
    ativo: formData.get("ativo") === "on",
    formato_resposta: parseFormatoResposta(formData),
    whatsapp_teste_lista: whitelist,
  };
  // Canais ativos: multiple inputs name="canal_id"
  const canais = formData.getAll("canal_id").map((v) => String(v)).filter(Boolean);
  patch.canais_ativos = canais;
  const filas = formData.getAll("fila_id").map((v) => String(v)).filter(Boolean);
  patch.filas_ativas = filas;

  if (apiKey) patch.api_key_encrypted = bufferToBytea(encryptToken(apiKey));

  const { error } = await sb.from("ia_atendimento_perfis").update(patch).eq("id", id).eq("agencia_id", ctx.agenciaId);
  if (error) redirect(`${ROUTE}?erro=db&msg=${encodeURIComponent(error.message)}`);

  await audit({ agenciaId: ctx.agenciaId, usuarioId: ctx.userId, acao: "update", entidade: "ia_atendimento_perfil", entidadeId: id });
  revalidatePath(ROUTE);
  redirect(`${ROUTE}?editar=${id}&ok=atualizado`);
}

export async function deletarPerfilIA(formData: FormData) {
  const ctx = await requireRole("admin", "super_admin");
  const id = String(formData.get("id") || "");
  if (!id) redirect(`${ROUTE}?erro=id`);
  const sb = createServiceClient();
  await sb.from("ia_atendimento_perfis").delete().eq("id", id).eq("agencia_id", ctx.agenciaId);
  await audit({ agenciaId: ctx.agenciaId, usuarioId: ctx.userId, acao: "delete", entidade: "ia_atendimento_perfil", entidadeId: id });
  revalidatePath(ROUTE);
  redirect(`${ROUTE}?ok=deletado`);
}

export async function alternarAtivoPerfilIA(formData: FormData) {
  const ctx = await requireRole("admin", "super_admin");
  const id = String(formData.get("id") || "");
  const ativoAtual = formData.get("ativo") === "true";
  const sb = createServiceClient();
  await sb.from("ia_atendimento_perfis").update({ ativo: !ativoAtual }).eq("id", id).eq("agencia_id", ctx.agenciaId);
  revalidatePath(ROUTE);
  redirect(`${ROUTE}?ok=alterado`);
}

export async function criarFerramentaIA(formData: FormData) {
  const ctx = await requireRole("admin", "super_admin");
  const sb = createServiceClient();
  const perfilId = String(formData.get("perfil_id") || "");
  const nome = String(formData.get("nome") || "").trim();
  const descricao = String(formData.get("descricao") || "").trim();
  const acao = String(formData.get("acao") || "");
  if (!perfilId || !nome || !descricao || !acao) {
    redirect(`${ROUTE}?editar=${perfilId}&erro=campos`);
  }
  const parametrosRaw = String(formData.get("parametros") || "{}");
  let parametros: Record<string, unknown> = {};
  try { parametros = JSON.parse(parametrosRaw); } catch { parametros = {}; }

  await sb.from("ia_atendimento_ferramentas").insert({
    perfil_id: perfilId,
    agencia_id: ctx.agenciaId,
    nome,
    descricao,
    acao,
    parametros,
    ativo: true,
  });
  revalidatePath(ROUTE);
  redirect(`${ROUTE}?editar=${perfilId}&ok=ferramenta_criada`);
}

export async function deletarFerramentaIA(formData: FormData) {
  const ctx = await requireRole("admin", "super_admin");
  const id = String(formData.get("id") || "");
  const perfilId = String(formData.get("perfil_id") || "");
  const sb = createServiceClient();
  await sb.from("ia_atendimento_ferramentas").delete().eq("id", id).eq("agencia_id", ctx.agenciaId);
  revalidatePath(ROUTE);
  redirect(`${ROUTE}?editar=${perfilId}&ok=ferramenta_deletada`);
}

// L2: Etiquetas configuraveis por perfil

export async function salvarEtiquetaPerfil(formData: FormData) {
  const ctx = await requireRole("admin", "super_admin");
  const sb = createServiceClient();
  const perfilId = String(formData.get("perfil_id") || "");
  const etiquetaId = String(formData.get("etiqueta_id") || "");
  const descricaoUso = String(formData.get("descricao_uso") || "");
  const ordem = Number(formData.get("ordem") || 0);
  if (!perfilId || !etiquetaId) return;

  const { data: etq } = await sb
    .from("etiquetas")
    .select("id")
    .eq("id", etiquetaId)
    .eq("agencia_id", ctx.agenciaId)
    .maybeSingle();
  if (!etq) return;

  await sb.from("ia_atendimento_perfil_etiquetas").upsert(
    {
      perfil_id: perfilId,
      etiqueta_id: etiquetaId,
      agencia_id: ctx.agenciaId,
      descricao_uso: descricaoUso,
      ordem,
    },
    { onConflict: "perfil_id,etiqueta_id" },
  );

  revalidatePath(ROUTE);
}

export async function deletarEtiquetaPerfil(formData: FormData) {
  const ctx = await requireRole("admin", "super_admin");
  const sb = createServiceClient();
  const perfilId = String(formData.get("perfil_id") || "");
  const etiquetaId = String(formData.get("etiqueta_id") || "");
  if (!perfilId || !etiquetaId) return;

  await sb.from("ia_atendimento_perfil_etiquetas")
    .delete()
    .eq("perfil_id", perfilId)
    .eq("etiqueta_id", etiquetaId)
    .eq("agencia_id", ctx.agenciaId);

  revalidatePath(ROUTE);
}

export async function salvarFollowUpIA(formData: FormData) {
  const ctx = await requireRole("admin", "super_admin");
  const sb = createServiceClient();
  const perfilId = String(formData.get("perfil_id") || "");
  const ordem = Math.max(1, Math.min(10, parseInt(String(formData.get("ordem") || "1"), 10)));
  const apos = Math.max(1, parseInt(String(formData.get("apos_minutos") || "30"), 10));
  const mensagensRaw = String(formData.get("mensagens_json") || "[]");
  let mensagens: unknown[] = [];
  try { mensagens = JSON.parse(mensagensRaw); } catch { mensagens = []; }

  await sb.from("ia_atendimento_followups").upsert(
    {
      perfil_id: perfilId,
      agencia_id: ctx.agenciaId,
      ordem,
      apos_minutos: apos,
      mensagens,
    },
    { onConflict: "perfil_id,ordem" },
  );
  revalidatePath(ROUTE);
  redirect(`${ROUTE}?editar=${perfilId}&ok=followup_salvo`);
}

// ============================================================
// LOTE 3 — CRUD ferramentas + galeria
// ============================================================

export async function atualizarFerramentaIA(formData: FormData) {
  const ctx = await requireRole("admin", "super_admin");
  const sb = createServiceClient();
  const id = String(formData.get("id") || "");
  const perfilId = String(formData.get("perfil_id") || "");
  const descricao = String(formData.get("descricao") || "").trim();
  const acao = String(formData.get("acao") || "");
  if (!id || !perfilId || !descricao || !acao) {
    redirect(`${ROUTE}?editar=${perfilId}&erro=campos`);
  }
  const parametrosRaw = String(formData.get("parametros") || "{}");
  let parametros: Record<string, unknown> = {};
  try { parametros = JSON.parse(parametrosRaw); } catch { parametros = {}; }

  const patch: Record<string, unknown> = { descricao, acao, parametros };
  // nome só atualiza se vier (nao readonly)
  const novoNome = String(formData.get("nome") || "").trim();
  if (novoNome) patch.nome = novoNome;
  if (formData.has("ativo")) patch.ativo = formData.get("ativo") === "on";

  const { error } = await sb
    .from("ia_atendimento_ferramentas")
    .update(patch)
    .eq("id", id)
    .eq("agencia_id", ctx.agenciaId);
  if (error) redirect(`${ROUTE}?editar=${perfilId}&erro=db&msg=${encodeURIComponent(error.message)}`);

  void audit({
    agenciaId: ctx.agenciaId,
    usuarioId: ctx.userId,
    acao: "update",
    entidade: "ia_atendimento_ferramentas",
    entidadeId: id,
    payload: { acao },
  });

  revalidatePath(ROUTE);
  redirect(`${ROUTE}?editar=${perfilId}&ok=ferramenta_atualizada`);
}

export async function alternarAtivoFerramentaIA(formData: FormData) {
  const ctx = await requireRole("admin", "super_admin");
  const id = String(formData.get("id") || "");
  const perfilId = String(formData.get("perfil_id") || "");
  const ativoAtual = formData.get("ativo") === "true";
  const sb = createServiceClient();
  await sb.from("ia_atendimento_ferramentas")
    .update({ ativo: !ativoAtual })
    .eq("id", id)
    .eq("agencia_id", ctx.agenciaId);
  revalidatePath(ROUTE);
  redirect(`${ROUTE}?editar=${perfilId}&ok=ferramenta_alterada`);
}

// ---------- Galeria de imagens ----------

interface UploadResult {
  ok: boolean;
  error?: string;
  imagem?: {
    id: string;
    nome: string;
    descricao: string;
    tags: string[];
    url_storage: string;
    mime: string;
    ordem: number;
    signed_url: string | null;
  };
}

export async function uploadImagemGaleria(formData: FormData): Promise<UploadResult> {
  const ctx = await requireRole("admin", "super_admin");
  const sb = createServiceClient();

  const file = formData.get("file") as File | null;
  const ferramentaId = String(formData.get("ferramenta_id") || "");
  const nome = String(formData.get("nome") || file?.name || "imagem").slice(0, 80);
  const descricao = String(formData.get("descricao") || "");

  if (!file || !ferramentaId) return { ok: false, error: "arquivo ou ferramenta_id ausente" };
  if (file.size > 10 * 1024 * 1024) return { ok: false, error: "imagem maior que 10MB" };
  if (!file.type.startsWith("image/")) return { ok: false, error: "tipo não suportado (só imagens)" };

  const { data: ferr } = await sb
    .from("ia_atendimento_ferramentas")
    .select("id, perfil_id, agencia_id, acao")
    .eq("id", ferramentaId)
    .eq("agencia_id", ctx.agenciaId)
    .maybeSingle();
  if (!ferr) return { ok: false, error: "ferramenta não encontrada" };
  if (ferr.acao !== "enviar_imagem_galeria") return { ok: false, error: "ferramenta não é do tipo galeria" };

  const { count } = await sb
    .from("ia_atendimento_galeria")
    .select("id", { count: "exact", head: true })
    .eq("ferramenta_id", ferramentaId);
  const ordem = count ?? 0;

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().slice(0, 5);
  const path = `${ferr.agencia_id}/${ferr.perfil_id}/${ferramentaId}/${crypto.randomUUID()}.${ext}`;

  const buf = Buffer.from(await file.arrayBuffer());
  const { error: upErr } = await sb.storage.from("ia-galeria").upload(path, buf, { contentType: file.type, upsert: false });
  if (upErr) return { ok: false, error: upErr.message };

  const { data: row, error: insErr } = await sb
    .from("ia_atendimento_galeria")
    .insert({
      perfil_id: ferr.perfil_id,
      agencia_id: ferr.agencia_id,
      ferramenta_id: ferramentaId,
      nome,
      descricao,
      tags: [],
      url_storage: path,
      mime: file.type,
      tamanho_bytes: file.size,
      ordem,
    })
    .select("id, nome, descricao, tags, url_storage, mime, ordem")
    .single();

  if (insErr || !row) {
    await sb.storage.from("ia-galeria").remove([path]);
    return { ok: false, error: insErr?.message || "insert falhou" };
  }

  const { data: signed } = await sb.storage.from("ia-galeria").createSignedUrl(path, 3600);

  revalidatePath(ROUTE);
  return {
    ok: true,
    imagem: {
      id: row.id,
      nome: row.nome,
      descricao: row.descricao,
      tags: row.tags || [],
      url_storage: row.url_storage,
      mime: row.mime,
      ordem: row.ordem,
      signed_url: signed?.signedUrl || null,
    },
  };
}

export async function atualizarImagemGaleria(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const ctx = await requireRole("admin", "super_admin");
  const sb = createServiceClient();
  const id = String(formData.get("id") || "");
  const nome = String(formData.get("nome") || "").slice(0, 80);
  const descricao = String(formData.get("descricao") || "");
  const tagsStr = String(formData.get("tags") || "");
  const tags = tagsStr.split(",").map((t) => t.trim()).filter(Boolean);
  if (!id) return { ok: false, error: "id ausente" };

  const { error } = await sb
    .from("ia_atendimento_galeria")
    .update({ nome, descricao, tags })
    .eq("id", id)
    .eq("agencia_id", ctx.agenciaId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(ROUTE);
  return { ok: true };
}

export async function deletarImagemGaleria(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const ctx = await requireRole("admin", "super_admin");
  const sb = createServiceClient();
  const id = String(formData.get("id") || "");
  if (!id) return { ok: false, error: "id ausente" };

  const { data: row } = await sb
    .from("ia_atendimento_galeria")
    .select("url_storage")
    .eq("id", id)
    .eq("agencia_id", ctx.agenciaId)
    .maybeSingle();
  if (!row) return { ok: false, error: "nao encontrada" };

  await sb.storage.from("ia-galeria").remove([row.url_storage]);
  const { error } = await sb
    .from("ia_atendimento_galeria")
    .delete()
    .eq("id", id)
    .eq("agencia_id", ctx.agenciaId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(ROUTE);
  return { ok: true };
}

export async function reordenarImagemGaleria(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const ctx = await requireRole("admin", "super_admin");
  const sb = createServiceClient();
  const ferramentaId = String(formData.get("ferramenta_id") || "");
  const ordemJson = String(formData.get("ordem_json") || "[]");
  let lista: Array<{ id: string; ordem: number }> = [];
  try { lista = JSON.parse(ordemJson); } catch { lista = []; }
  if (!ferramentaId || !lista.length) return { ok: false, error: "input inválido" };

  for (const it of lista) {
    await sb.from("ia_atendimento_galeria")
      .update({ ordem: it.ordem })
      .eq("id", it.id)
      .eq("ferramenta_id", ferramentaId)
      .eq("agencia_id", ctx.agenciaId);
  }
  revalidatePath(ROUTE);
  return { ok: true };
}
