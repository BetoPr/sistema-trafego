"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/crm/permissions";
import { createServiceClient } from "@/lib/supabase/service";
import { encryptToken, bufferToBytea } from "@/lib/crypto/tokens";
import { audit } from "@/lib/crm/audit";

const MASK = "•••GUARDADO•••";

export async function salvarChavesIA(formData: FormData) {
  const ctx = await requireAdmin();
  const groq = String(formData.get("groq_key") || "").trim();
  const openai = String(formData.get("openai_key") || "").trim();
  const anthropic = String(formData.get("anthropic_key") || "").trim();

  const sb = createServiceClient();

  // Upsert configuracoes_agencia (UNIQUE em agencia_id)
  const { data: existente } = await sb
    .from("configuracoes_agencia")
    .select("id")
    .eq("agencia_id", ctx.agenciaId)
    .maybeSingle();

  const patch: Record<string, unknown> = {
    agencia_id: ctx.agenciaId,
    updated_at: new Date().toISOString(),
  };
  if (groq && groq !== MASK) patch.groq_key_encrypted = bufferToBytea(encryptToken(groq));
  if (openai && openai !== MASK) patch.openai_key_encrypted = bufferToBytea(encryptToken(openai));
  if (anthropic && anthropic !== MASK) patch.anthropic_key_encrypted = bufferToBytea(encryptToken(anthropic));

  if (existente) {
    await sb.from("configuracoes_agencia").update(patch).eq("id", existente.id);
  } else {
    await sb.from("configuracoes_agencia").insert(patch);
  }

  await audit({
    agenciaId: ctx.agenciaId,
    usuarioId: ctx.userId,
    acao: "config_change",
    entidade: "chaves_ia",
    payload: {
      groq_alterada: !!(groq && groq !== MASK),
      openai_alterada: !!(openai && openai !== MASK),
      anthropic_alterada: !!(anthropic && anthropic !== MASK),
    },
  });

  revalidatePath("/configuracoes/ia");
  redirect("/configuracoes/ia?ok=salvo");
}

export async function testarGroq() {
  const ctx = await requireAdmin();

  const { resolverChaves } = await import("@/lib/ai/keys");
  const chaves = await resolverChaves(ctx.agenciaId);
  const apiKey = chaves.groq[0];

  if (!apiKey) {
    redirect("/configuracoes/ia?erro=sem_chave");
  }

  let resultado: { ok: true; reply: string } | { ok: false; msg: string };
  try {
    const r = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const j = (await r.json().catch(() => ({}))) as { data?: unknown[]; error?: { message?: string } };
    if (!r.ok) {
      resultado = { ok: false, msg: j.error?.message || `${r.status} ${r.statusText}` };
    } else {
      const n = Array.isArray(j.data) ? j.data.length : 0;
      resultado = { ok: true, reply: `${n} modelos disponíveis` };
    }
  } catch (e) {
    resultado = { ok: false, msg: e instanceof Error ? e.message : String(e) };
  }

  // redirect FORA do try/catch (NEXT_REDIRECT throw seria capturado)
  if (resultado.ok) {
    redirect(`/configuracoes/ia?ok=teste&msg=${encodeURIComponent(`Groq respondeu: "${resultado.reply}"`)}`);
  } else {
    redirect(`/configuracoes/ia?erro=teste_falhou&msg=${encodeURIComponent(resultado.msg)}`);
  }
}

// =========================================
// FASE 2 — Multi-chave (ia_chaves) + provider
// =========================================

const PROVIDERS_OK = ["groq", "openai", "anthropic"];

/** Adiciona uma chave de IA (rotação). ordem = última + 1. */
export async function adicionarChaveIA(formData: FormData) {
  const ctx = await requireAdmin();
  const provider = String(formData.get("provider") || "");
  const rotuloRaw = String(formData.get("rotulo") || "").trim();
  const key = String(formData.get("key") || "").trim();

  if (!PROVIDERS_OK.includes(provider) || !key) {
    redirect(`/configuracoes/ia?erro=${encodeURIComponent("Provider ou chave inválidos.")}`);
  }

  const sb = createServiceClient();
  const { data: ult } = await sb
    .from("ia_chaves")
    .select("ordem")
    .eq("agencia_id", ctx.agenciaId)
    .eq("provider", provider)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();
  const ordem = ((ult?.ordem as number | undefined) ?? -1) + 1;

  await sb.from("ia_chaves").insert({
    agencia_id: ctx.agenciaId,
    provider,
    rotulo: rotuloRaw || `Chave ${ordem + 1}`,
    key_encrypted: bufferToBytea(encryptToken(key)),
    ordem,
  });

  await audit({
    agenciaId: ctx.agenciaId,
    usuarioId: ctx.userId,
    acao: "config_change",
    entidade: "ia_chaves",
    payload: { acao: "adicionar", provider },
  });

  revalidatePath("/configuracoes/ia");
  redirect("/configuracoes/ia?ok=chave_add");
}

/** Fase 3 — atualiza o limite de follow-ups/dia de uma chave (0 = sem limite). */
export async function atualizarLimiteChaveIA(formData: FormData) {
  const ctx = await requireAdmin();
  const id = String(formData.get("id") || "");
  if (!id) redirect("/configuracoes/ia");
  const limite = Math.max(0, Math.min(100000, Math.round(Number(formData.get("limite_followup_dia")) || 0)));

  const sb = createServiceClient();
  await sb.from("ia_chaves").update({ limite_followup_dia: limite }).eq("id", id).eq("agencia_id", ctx.agenciaId);

  revalidatePath("/configuracoes/ia");
  redirect("/configuracoes/ia?ok=limite_set");
}

/** Edita rotulo e/ou valor da chave. Vazio em key = mantem atual. */
export async function editarChaveIA(formData: FormData) {
  const ctx = await requireAdmin();
  const id = String(formData.get("id") || "");
  const rotulo = String(formData.get("rotulo") || "").trim();
  const key = String(formData.get("key") || "").trim();
  if (!id) redirect("/configuracoes/ia");

  const sb = createServiceClient();
  const patch: Record<string, unknown> = {};
  if (rotulo) patch.rotulo = rotulo;
  if (key) patch.key_encrypted = bufferToBytea(encryptToken(key));
  if (Object.keys(patch).length === 0) {
    redirect("/configuracoes/ia?erro=" + encodeURIComponent("Nada pra atualizar"));
  }
  await sb.from("ia_chaves").update(patch).eq("id", id).eq("agencia_id", ctx.agenciaId);

  await audit({
    agenciaId: ctx.agenciaId,
    usuarioId: ctx.userId,
    acao: "config_change",
    entidade: "ia_chaves",
    payload: { acao: "editar", id, trocou_key: !!key, trocou_rotulo: !!rotulo },
  });

  revalidatePath("/configuracoes/ia");
  redirect("/configuracoes/ia?ok=chave_edit");
}

/** Revela chave em texto plano. Auditavel. */
export async function revelarChaveIA(id: string): Promise<{ ok: boolean; key?: string; msg?: string }> {
  const ctx = await requireAdmin();
  const sb = createServiceClient();
  const { data } = await sb
    .from("ia_chaves")
    .select("id, key_encrypted")
    .eq("id", id)
    .eq("agencia_id", ctx.agenciaId)
    .maybeSingle();
  if (!data) return { ok: false, msg: "Chave nao encontrada" };
  try {
    const { decryptToken, byteaToBuffer } = await import("@/lib/crypto/tokens");
    const key = decryptToken(byteaToBuffer(data.key_encrypted as unknown as { data: number[] } | Buffer));
    await audit({
      agenciaId: ctx.agenciaId,
      usuarioId: ctx.userId,
      acao: "config_change",
      entidade: "ia_chaves",
      payload: { acao: "revelar", id },
    });
    return { ok: true, key };
  } catch (e) {
    return { ok: false, msg: e instanceof Error ? e.message : "Falha decrypt" };
  }
}

/** Remove uma chave de IA (só da própria agência). */
export async function removerChaveIA(formData: FormData) {
  const ctx = await requireAdmin();
  const id = String(formData.get("id") || "");
  if (!id) redirect("/configuracoes/ia");

  const sb = createServiceClient();
  await sb.from("ia_chaves").delete().eq("id", id).eq("agencia_id", ctx.agenciaId);

  await audit({
    agenciaId: ctx.agenciaId,
    usuarioId: ctx.userId,
    acao: "config_change",
    entidade: "ia_chaves",
    payload: { acao: "remover", id },
  });

  revalidatePath("/configuracoes/ia");
  redirect("/configuracoes/ia?ok=chave_rm");
}

/** Merge no jsonb `ia` sem clobberar transcricao/outras chaves. */
async function patchIaConfig(agenciaId: string, patch: Record<string, unknown>) {
  const sb = createServiceClient();
  const { data } = await sb
    .from("configuracoes_agencia")
    .select("id, ia")
    .eq("agencia_id", agenciaId)
    .maybeSingle();
  const ia = { ...((data?.ia as Record<string, unknown> | null) ?? {}), ...patch };
  if (data?.id) {
    await sb.from("configuracoes_agencia").update({ ia, updated_at: new Date().toISOString() }).eq("id", data.id);
  } else {
    await sb.from("configuracoes_agencia").insert({ agencia_id: agenciaId, ia });
  }
}

/** Define provider preferido de chat e transcrição. */
export async function definirProviderIA(formData: FormData) {
  const ctx = await requireAdmin();
  const chat = String(formData.get("provider_chat") || "groq") === "openai" ? "openai" : "groq";
  const tr = String(formData.get("provider_transcricao") || "groq") === "openai" ? "openai" : "groq";
  await patchIaConfig(ctx.agenciaId, { provider_chat: chat, provider_transcricao: tr });
  revalidatePath("/configuracoes/ia");
  redirect("/configuracoes/ia?ok=provider");
}

/** Um botão: troca TUDO (chat + transcrição) pra OpenAI. */
export async function usarOpenaiEmTudo() {
  const ctx = await requireAdmin();
  await patchIaConfig(ctx.agenciaId, { provider_chat: "openai", provider_transcricao: "openai" });
  await audit({ agenciaId: ctx.agenciaId, usuarioId: ctx.userId, acao: "config_change", entidade: "ia_provider", payload: { provider: "openai", escopo: "tudo" } });
  revalidatePath("/configuracoes/ia");
  redirect("/configuracoes/ia?ok=openai_tudo");
}

/** Um botão: volta TUDO pro Groq. */
export async function voltarParaGroq() {
  const ctx = await requireAdmin();
  await patchIaConfig(ctx.agenciaId, { provider_chat: "groq", provider_transcricao: "groq" });
  await audit({ agenciaId: ctx.agenciaId, usuarioId: ctx.userId, acao: "config_change", entidade: "ia_provider", payload: { provider: "groq", escopo: "tudo" } });
  revalidatePath("/configuracoes/ia");
  redirect("/configuracoes/ia?ok=groq_tudo");
}
