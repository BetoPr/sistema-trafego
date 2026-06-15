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

  const apiKey = String(formData.get("api_key") || "").trim();
  const provider = String(formData.get("provider") || "anthropic");
  const modelo = String(formData.get("modelo") || "claude-haiku-4-5-20251001");

  const patch: Record<string, unknown> = {
    agencia_id: ctx.agenciaId,
    nome,
    descricao: String(formData.get("descricao") || "").trim() || null,
    provider,
    modelo,
    prompt_sistema: String(formData.get("prompt_sistema") || "").trim(),
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

  const patch: Record<string, unknown> = {
    nome: String(formData.get("nome") || "").trim(),
    descricao: String(formData.get("descricao") || "").trim() || null,
    provider: String(formData.get("provider") || "anthropic"),
    modelo: String(formData.get("modelo") || "claude-haiku-4-5-20251001"),
    prompt_sistema: String(formData.get("prompt_sistema") || "").trim(),
    delay_debounce_seg: Math.max(0, Math.min(600, parseInt(String(formData.get("delay_debounce_seg") || "20"), 10))),
    delay_min_resposta_seg: Math.max(0, parseInt(String(formData.get("delay_min_resposta_seg") || "3"), 10)),
    delay_max_resposta_seg: Math.max(0, parseInt(String(formData.get("delay_max_resposta_seg") || "8"), 10)),
    max_tokens_por_resposta: Math.max(50, Math.min(4000, parseInt(String(formData.get("max_tokens_por_resposta") || "800"), 10))),
    temperatura: Math.max(0, Math.min(2, parseFloat(String(formData.get("temperatura") || "0.7")))),
    pausa_se_humano_responder: formData.get("pausa_se_humano_responder") === "on",
    ativo: formData.get("ativo") === "on",
    formato_resposta: parseFormatoResposta(formData),
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
