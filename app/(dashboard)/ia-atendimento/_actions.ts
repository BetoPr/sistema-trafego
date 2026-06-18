"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import { requireRole } from "@/lib/crm/permissions";
import { audit } from "@/lib/crm/audit";
import { encryptToken, bufferToBytea, decryptToken, byteaToBuffer } from "@/lib/crypto/tokens";
import { executarResumoComConfig, buscarHistoricoSample } from "@/lib/ia-atendimento/resumo-groq";

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

  // Valida prefixo da chave bate com provider escolhido
  if (apiKey) {
    const p = apiKey.toLowerCase();
    if (p.startsWith("gsk_") && provider !== "groq") {
      redirect(`${ROUTE}?erro=chave_mismatch&msg=${encodeURIComponent(`Esta chave eh do Groq (prefixo gsk_). Troque o provider para Groq.`)}`);
    }
    if (p.startsWith("sk-ant") && provider !== "anthropic") {
      redirect(`${ROUTE}?erro=chave_mismatch&msg=${encodeURIComponent(`Esta chave eh da Anthropic (prefixo sk-ant). Troque o provider para Anthropic.`)}`);
    }
    if (p.startsWith("sk-") && !p.startsWith("sk-ant") && provider !== "openai") {
      redirect(`${ROUTE}?erro=chave_mismatch&msg=${encodeURIComponent(`Esta chave eh da OpenAI (prefixo sk-). Troque o provider para OpenAI.`)}`);
    }
  }

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
  const providerNovo = String(formData.get("provider") || "anthropic");

  // Valida prefixo da chave bate com provider escolhido
  if (apiKey) {
    const p = apiKey.toLowerCase();
    if (p.startsWith("gsk_") && providerNovo !== "groq") {
      redirect(`${ROUTE}?editar=${id}&erro=chave_mismatch&msg=${encodeURIComponent(`Esta chave eh do Groq (prefixo gsk_). Troque o provider para Groq.`)}`);
    }
    if (p.startsWith("sk-ant") && providerNovo !== "anthropic") {
      redirect(`${ROUTE}?editar=${id}&erro=chave_mismatch&msg=${encodeURIComponent(`Esta chave eh da Anthropic (prefixo sk-ant). Troque o provider para Anthropic.`)}`);
    }
    if (p.startsWith("sk-") && !p.startsWith("sk-ant") && providerNovo !== "openai") {
      redirect(`${ROUTE}?editar=${id}&erro=chave_mismatch&msg=${encodeURIComponent(`Esta chave eh da OpenAI (prefixo sk-). Troque o provider para OpenAI.`)}`);
    }
  }

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

  // Restringe edicao ao dono. Super_admin pode editar qualquer perfil.
  let q = sb.from("ia_atendimento_perfis").update(patch).eq("id", id).eq("agencia_id", ctx.agenciaId);
  if (ctx.role !== "super_admin") q = q.eq("criado_por", ctx.userId);
  const { error } = await q;
  if (error) redirect(`${ROUTE}?erro=db&msg=${encodeURIComponent(error.message)}`);

  await audit({ agenciaId: ctx.agenciaId, usuarioId: ctx.userId, acao: "update", entidade: "ia_atendimento_perfil", entidadeId: id });
  revalidatePath(ROUTE);
  redirect(`${ROUTE}?editar=${id}&ok=atualizado`);
}

export async function duplicarPerfilIA(formData: FormData) {
  const ctx = await requireRole("admin", "super_admin");
  const id = String(formData.get("id") || "");
  if (!id) redirect(`${ROUTE}?erro=id`);
  const sb = createServiceClient();
  const { data: orig } = await sb
    .from("ia_atendimento_perfis")
    .select("*")
    .eq("id", id)
    .eq("agencia_id", ctx.agenciaId)
    .maybeSingle();
  if (!orig) redirect(`${ROUTE}?erro=nao_encontrado`);
  const copy = { ...(orig as Record<string, unknown>) };
  delete copy.id;
  delete copy.created_at;
  delete copy.updated_at;
  copy.nome = `${(orig as { nome: string }).nome} (copia)`;
  copy.ativo = false;
  copy.criado_por = ctx.userId;
  // Limpa chave — usuario precisa colar dele
  copy.api_key_encrypted = null;
  const { data: nova, error } = await sb.from("ia_atendimento_perfis").insert(copy).select("id").single();
  if (error) redirect(`${ROUTE}?erro=db&msg=${encodeURIComponent(error.message)}`);
  await audit({ agenciaId: ctx.agenciaId, usuarioId: ctx.userId, acao: "create", entidade: "ia_atendimento_perfil", entidadeId: nova.id, payload: { copiado_de: id } });
  revalidatePath(ROUTE);
  redirect(`${ROUTE}?editar=${nova.id}&ok=duplicado`);
}

export async function deletarPerfilIA(formData: FormData) {
  const ctx = await requireRole("admin", "super_admin");
  const id = String(formData.get("id") || "");
  if (!id) redirect(`${ROUTE}?erro=id`);
  const sb = createServiceClient();
  let dq = sb.from("ia_atendimento_perfis").delete().eq("id", id).eq("agencia_id", ctx.agenciaId);
  if (ctx.role !== "super_admin") dq = dq.eq("criado_por", ctx.userId);
  await dq;
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

/** Confirma que o perfil de IA é da agência (evita anexar config a perfil de outro tenant). */
async function perfilDaAgencia(sb: ReturnType<typeof createServiceClient>, perfilId: string, agenciaId: string): Promise<boolean> {
  if (!perfilId) return false;
  const { data } = await sb.from("ia_atendimento_perfis").select("id").eq("id", perfilId).eq("agencia_id", agenciaId).maybeSingle();
  return !!data;
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
  if (!(await perfilDaAgencia(sb, perfilId, ctx.agenciaId))) redirect(`${ROUTE}?erro=permissao_negada`);
  const parametrosRaw = String(formData.get("parametros") || "{}");
  let parametros: Record<string, unknown> = {};
  try { parametros = JSON.parse(parametrosRaw); } catch { parametros = {}; }

  const { error } = await sb.from("ia_atendimento_ferramentas").insert({
    perfil_id: perfilId,
    agencia_id: ctx.agenciaId,
    nome,
    descricao,
    acao,
    parametros,
    ativo: true,
  });
  // Não engole erro: antes, falha de constraint redirecionava como "criada" e a
  // ferramenta sumia (ex: ação fora do check). Agora mostra o erro real.
  if (error) redirect(`${ROUTE}?editar=${perfilId}&erro=db&msg=${encodeURIComponent(error.message)}`);
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
  if (!(await perfilDaAgencia(sb, perfilId, ctx.agenciaId))) return;

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
  if (!(await perfilDaAgencia(sb, perfilId, ctx.agenciaId))) redirect(`${ROUTE}?erro=permissao_negada`);

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

/** Variante sem redirect: toggle inline via fetch/useTransition. */
export async function toggleFerramentaIA(id: string, novoAtivo: boolean): Promise<{ ok: boolean; ativo?: boolean; error?: string }> {
  const ctx = await requireRole("admin", "super_admin");
  const sb = createServiceClient();
  const { error } = await sb.from("ia_atendimento_ferramentas")
    .update({ ativo: novoAtivo })
    .eq("id", id)
    .eq("agencia_id", ctx.agenciaId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(ROUTE);
  return { ok: true, ativo: novoAtivo };
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

// ============================================================
// LOTE 4 — Follow-up sequencial IA: actions
// ============================================================

interface EtapaSerializada {
  id: string;
  sequencia_id: string;
  ordem: number;
  delay_segundos_antes: number;
  midia_tipo: string;
  texto: string | null;
  midia_path: string | null;
  midia_url: string | null;
  midia_mime: string | null;
  midia_filename: string | null;
}

export async function criarSequenciaFollowUp(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const ctx = await requireRole("admin", "super_admin");
  const sb = createServiceClient();
  const perfilId = String(formData.get("perfil_id") || "");
  const nome = String(formData.get("nome") || "").trim();
  if (!perfilId || !nome) return { ok: false, error: "perfil_id e nome obrigatorios" };
  if (!(await perfilDaAgencia(sb, perfilId, ctx.agenciaId))) return { ok: false, error: "perfil_invalido" };

  const ordem = parseInt(String(formData.get("ordem_no_perfil") || "1"), 10);
  const { error } = await sb.from("ia_atendimento_followup_sequencias").insert({
    perfil_id: perfilId,
    agencia_id: ctx.agenciaId,
    nome,
    descricao: String(formData.get("descricao") || "") || null,
    ordem_no_perfil: Math.max(1, Math.min(5, ordem)),
    ativa: formData.get("ativa") === "1",
    finalizar_ticket_ao_fim: formData.get("finalizar_ticket_ao_fim") === "1",
    etiqueta_em_progresso_id: String(formData.get("etiqueta_em_progresso_id") || "") || null,
    etiqueta_encerrado_id: String(formData.get("etiqueta_encerrado_id") || "") || null,
    janela_inicio: String(formData.get("janela_inicio") || "08:00"),
    janela_fim: String(formData.get("janela_fim") || "20:00"),
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath(ROUTE);
  return { ok: true };
}

export async function atualizarSequenciaFollowUp(id: string, formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const ctx = await requireRole("admin", "super_admin");
  const sb = createServiceClient();
  const { error } = await sb
    .from("ia_atendimento_followup_sequencias")
    .update({
      nome: String(formData.get("nome") || "").trim(),
      ativa: formData.get("ativa") === "1",
      finalizar_ticket_ao_fim: formData.get("finalizar_ticket_ao_fim") === "1",
      etiqueta_em_progresso_id: String(formData.get("etiqueta_em_progresso_id") || "") || null,
      etiqueta_encerrado_id: String(formData.get("etiqueta_encerrado_id") || "") || null,
      janela_inicio: String(formData.get("janela_inicio") || "08:00"),
      janela_fim: String(formData.get("janela_fim") || "20:00"),
    })
    .eq("id", id)
    .eq("agencia_id", ctx.agenciaId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(ROUTE);
  return { ok: true };
}

export async function deletarSequenciaFollowUp(id: string): Promise<{ ok: boolean; error?: string }> {
  const ctx = await requireRole("admin", "super_admin");
  const sb = createServiceClient();
  await sb
    .from("ia_atendimento_followup_progresso")
    .update({ status: "cancelado", motivo_fim: "sequencia deletada", finalizado_em: new Date().toISOString() })
    .eq("sequencia_id", id)
    .eq("agencia_id", ctx.agenciaId)
    .in("status", ["agendado", "executando"]);
  const { error } = await sb.from("ia_atendimento_followup_sequencias")
    .delete()
    .eq("id", id)
    .eq("agencia_id", ctx.agenciaId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(ROUTE);
  return { ok: true };
}

export async function salvarEtapaFollowUp(formData: FormData): Promise<{ ok: boolean; error?: string; etapa?: EtapaSerializada }> {
  const ctx = await requireRole("admin", "super_admin");
  const sb = createServiceClient();
  const sequenciaId = String(formData.get("sequencia_id") || "");
  const id = String(formData.get("id") || "");

  const { data: seq } = await sb
    .from("ia_atendimento_followup_sequencias")
    .select("agencia_id")
    .eq("id", sequenciaId)
    .eq("agencia_id", ctx.agenciaId)
    .maybeSingle<{ agencia_id: string }>();
  if (!seq) return { ok: false, error: "sequencia invalida" };

  const payload = {
    sequencia_id: sequenciaId,
    agencia_id: seq.agencia_id,
    ordem: parseInt(String(formData.get("ordem") || "1"), 10),
    delay_segundos_antes: parseInt(String(formData.get("delay_segundos_antes") || "0"), 10),
    midia_tipo: String(formData.get("midia_tipo") || "texto"),
    texto: String(formData.get("texto") || "") || null,
    midia_path: String(formData.get("midia_path") || "") || null,
    midia_url: String(formData.get("midia_url") || "") || null,
    midia_mime: String(formData.get("midia_mime") || "") || null,
    midia_filename: String(formData.get("midia_filename") || "") || null,
  };

  if (id) {
    const { data, error } = await sb
      .from("ia_atendimento_followup_etapas")
      .update(payload)
      .eq("id", id)
      .eq("agencia_id", ctx.agenciaId)
      .select()
      .single();
    if (error) return { ok: false, error: error.message };
    revalidatePath(ROUTE);
    return { ok: true, etapa: data as EtapaSerializada };
  } else {
    const { data, error } = await sb.from("ia_atendimento_followup_etapas").insert(payload).select().single();
    if (error) return { ok: false, error: error.message };
    revalidatePath(ROUTE);
    return { ok: true, etapa: data as EtapaSerializada };
  }
}

export async function deletarEtapaFollowUp(id: string): Promise<{ ok: boolean; error?: string }> {
  const ctx = await requireRole("admin", "super_admin");
  const sb = createServiceClient();
  const { error } = await sb.from("ia_atendimento_followup_etapas")
    .delete()
    .eq("id", id)
    .eq("agencia_id", ctx.agenciaId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(ROUTE);
  return { ok: true };
}

export async function reordenarEtapasFollowUp(_sequenciaId: string, idsEmOrdem: string[]): Promise<{ ok: boolean; error?: string }> {
  const ctx = await requireRole("admin", "super_admin");
  const sb = createServiceClient();
  // Truque: subtrair temporariamente pra evitar conflito de UNIQUE(sequencia_id, ordem)
  for (let i = 0; i < idsEmOrdem.length; i++) {
    await sb.from("ia_atendimento_followup_etapas")
      .update({ ordem: -(i + 1) })
      .eq("id", idsEmOrdem[i])
      .eq("agencia_id", ctx.agenciaId);
  }
  for (let i = 0; i < idsEmOrdem.length; i++) {
    await sb.from("ia_atendimento_followup_etapas")
      .update({ ordem: i + 1 })
      .eq("id", idsEmOrdem[i])
      .eq("agencia_id", ctx.agenciaId);
  }
  revalidatePath(ROUTE);
  return { ok: true };
}

// ============================================================
// LOTE 5 — Envio de Resumo no grupo (config + actions)
// ============================================================

export async function salvarResumoConfig(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const ctx = await requireRole("admin", "super_admin");
  const sb = createServiceClient();
  const perfilId = String(formData.get("perfil_id") || "");
  if (!perfilId) return { ok: false, error: "perfil_id obrigatorio" };

  const ativo = formData.get("ativo") === "1";
  const modeloGroq = String(formData.get("modelo_groq") || "llama-3.3-70b-versatile");
  const destinoTipo = String(formData.get("destino_tipo") || "grupo");
  if (destinoTipo !== "grupo" && destinoTipo !== "privado") return { ok: false, error: "destino_tipo invalido" };
  const canalId = String(formData.get("canal_id") || "") || null;
  const grupoJid = String(formData.get("grupo_jid") || "") || null;
  const telefone = String(formData.get("telefone") || "").replace(/\D/g, "") || null;
  const promptResumo = String(formData.get("prompt_resumo") || "").trim() || "Resuma a conversa abaixo em 3-5 bullets curtos (cliente, interesse, gatilho de transferencia, observacoes). Seja direto.";
  const dispararEm = String(formData.get("disparar_em") || "transferir_humano");
  const groqApiKey = String(formData.get("groq_api_key") || "").trim();

  const patch: Record<string, unknown> = {
    perfil_id: perfilId,
    agencia_id: ctx.agenciaId,
    ativo,
    modelo_groq: modeloGroq,
    destino_tipo: destinoTipo,
    canal_id: canalId,
    grupo_jid: grupoJid,
    telefone,
    prompt_resumo: promptResumo,
    disparar_em: dispararEm,
  };
  if (groqApiKey) patch.groq_api_key_encrypted = bufferToBytea(encryptToken(groqApiKey));

  const { error } = await sb.from("ia_atendimento_resumo_config").upsert(patch, { onConflict: "perfil_id" });
  if (error) return { ok: false, error: error.message };
  revalidatePath(ROUTE);
  return { ok: true };
}

/**
 * Simula envio de resumo com a config do form atual (sem precisar salvar).
 * Gera resumo via Groq usando ultimo ticket da agencia (ou historico fake)
 * e envia pro destino configurado. Retorna o texto pro UI mostrar.
 */
export async function testarResumoConfig(formData: FormData): Promise<{ ok: boolean; error?: string; resumo?: string; origem?: string }> {
  const ctx = await requireRole("admin", "super_admin");
  const sb = createServiceClient();

  const perfilId = String(formData.get("perfil_id") || "");
  if (!perfilId) return { ok: false, error: "perfil_id obrigatorio" };

  const modeloGroq = String(formData.get("modelo_groq") || "llama-3.3-70b-versatile");
  const destinoTipo = String(formData.get("destino_tipo") || "grupo");
  if (destinoTipo !== "grupo" && destinoTipo !== "privado") return { ok: false, error: "destino_tipo invalido" };
  const canalId = String(formData.get("canal_id") || "");
  if (!canalId) return { ok: false, error: "selecione um canal" };
  const grupoJid = String(formData.get("grupo_jid") || "") || null;
  const telefone = String(formData.get("telefone") || "").replace(/\D/g, "") || null;
  if (destinoTipo === "grupo" && !grupoJid) return { ok: false, error: "selecione o grupo" };
  if (destinoTipo === "privado" && !telefone) return { ok: false, error: "informe o telefone" };
  const promptResumo = String(formData.get("prompt_resumo") || "").trim();
  if (!promptResumo) return { ok: false, error: "prompt vazio" };
  const groqApiKeyInput = String(formData.get("groq_api_key") || "").trim();

  // Resolve groqKey: usa input do form, ou decripta do DB
  let groqKey = groqApiKeyInput;
  if (!groqKey) {
    const { data: cfg } = await sb
      .from("ia_atendimento_resumo_config")
      .select("groq_api_key_encrypted")
      .eq("perfil_id", perfilId)
      .maybeSingle<{ groq_api_key_encrypted: unknown }>();
    if (!cfg?.groq_api_key_encrypted) return { ok: false, error: "cole a chave Groq ou salve antes" };
    try {
      groqKey = decryptToken(byteaToBuffer(cfg.groq_api_key_encrypted as Parameters<typeof byteaToBuffer>[0]));
    } catch {
      return { ok: false, error: "chave Groq corrompida no DB" };
    }
  }

  // Resolve canal
  const { data: canal } = await sb
    .from("canais")
    .select("id, agencia_id, status, instance_token_encrypted, servidor:super_admin_servidores(base_url)")
    .eq("id", canalId)
    .maybeSingle();
  if (!canal || canal.agencia_id !== ctx.agenciaId) return { ok: false, error: "canal invalido" };
  if (canal.status !== "connected") return { ok: false, error: "canal desconectado" };

  const servidorRaw = (canal as unknown as { servidor: unknown }).servidor;
  const servidor = Array.isArray(servidorRaw)
    ? (servidorRaw[0] as { base_url: string } | undefined)
    : (servidorRaw as { base_url: string } | undefined);
  if (!servidor?.base_url) return { ok: false, error: "servidor sem base_url" };

  let canalToken: string;
  try {
    canalToken = decryptToken(byteaToBuffer(canal.instance_token_encrypted as Parameters<typeof byteaToBuffer>[0]));
  } catch {
    return { ok: false, error: "token do canal corrompido" };
  }

  const sample = await buscarHistoricoSample(ctx.agenciaId, perfilId);

  const r = await executarResumoComConfig({
    modeloGroq,
    groqKey,
    promptResumo,
    historico: sample.historico,
    destinoTipo: destinoTipo as "grupo" | "privado",
    grupoJid,
    telefone,
    canalBaseUrl: servidor.base_url,
    canalToken,
    prefixo: "🧪 *Resumo IA (TESTE)*",
  });

  await audit({
    agenciaId: ctx.agenciaId,
    usuarioId: ctx.userId,
    acao: "ia_resumo_teste",
    entidade: "ia_atendimento_resumo_config",
    entidadeId: perfilId,
    payload: { ok: r.ok, motivo: r.motivo, origem: sample.origem },
  });

  if (!r.ok) return { ok: false, error: r.motivo || "falhou", resumo: r.resumo, origem: sample.origem };
  return { ok: true, resumo: r.resumo, origem: sample.origem };
}

export async function uploadMidiaFollowUp(formData: FormData): Promise<{ ok: boolean; error?: string; path?: string; mime?: string; filename?: string }> {
  const ctx = await requireRole("admin", "super_admin");
  const sb = createServiceClient();
  const file = formData.get("file") as File | null;
  if (!file) return { ok: false, error: "arquivo ausente" };
  if (file.size > 20 * 1024 * 1024) return { ok: false, error: "arquivo > 20 MB" };

  const ext = (file.name.split(".").pop() || "bin").toLowerCase().slice(0, 5);
  const path = `${ctx.agenciaId}/${crypto.randomUUID()}.${ext}`;

  const buf = Buffer.from(await file.arrayBuffer());
  const { error: upErr } = await sb.storage.from("ia-followup").upload(path, buf, {
    contentType: file.type,
    upsert: false,
  });
  if (upErr) return { ok: false, error: upErr.message };

  return { ok: true, path, mime: file.type, filename: file.name };
}
