"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/crm/permissions";
import { createServiceClient } from "@/lib/supabase/service";
import { encryptToken, bufferToBytea } from "@/lib/crypto/tokens";
import { audit } from "@/lib/crm/audit";

const MODELO_FIXO = "whisper-large-v3";

/**
 * Salva config de transcrição em configuracoes_agencia.ia.transcricao (jsonb).
 * Só a transcrição respeita o toggle `ativa` — resumo/sentimento seguem usando o Groq.
 */
export async function salvarTranscricao(cfg: { ativa: boolean; idioma: string }) {
  const ctx = await requireAdmin();
  const sb = createServiceClient();

  const { data: ex } = await sb
    .from("configuracoes_agencia")
    .select("id, ia")
    .eq("agencia_id", ctx.agenciaId)
    .maybeSingle();

  const iaAtual = (ex?.ia as Record<string, unknown> | null) ?? {};
  const novaIa = {
    ...iaAtual,
    transcricao: { ativa: !!cfg.ativa, idioma: cfg.idioma || "pt", modelo: MODELO_FIXO },
  };

  if (ex) {
    await sb.from("configuracoes_agencia").update({ ia: novaIa, updated_at: new Date().toISOString() }).eq("id", ex.id);
  } else {
    await sb.from("configuracoes_agencia").insert({ agencia_id: ctx.agenciaId, ia: novaIa });
  }

  void audit({ agenciaId: ctx.agenciaId, usuarioId: ctx.userId, acao: "config_change", entidade: "groqcloud_transcricao", payload: { ativa: cfg.ativa, idioma: cfg.idioma } });
  revalidatePath("/configuracoes/groqcloud");
  return { ok: true };
}

/** Salva (criptografada) a chave Groq usada pela transcrição (mesma chave do resumo/sentimento). */
export async function salvarGroqKey(chave: string) {
  const ctx = await requireAdmin();
  const v = (chave || "").trim();
  if (!v) return { ok: false, erro: "vazio" };

  const sb = createServiceClient();
  const { data: ex } = await sb
    .from("configuracoes_agencia")
    .select("id")
    .eq("agencia_id", ctx.agenciaId)
    .maybeSingle();

  const patch = { groq_key_encrypted: bufferToBytea(encryptToken(v)), updated_at: new Date().toISOString() };
  if (ex) await sb.from("configuracoes_agencia").update(patch).eq("id", ex.id);
  else await sb.from("configuracoes_agencia").insert({ agencia_id: ctx.agenciaId, ...patch });

  void audit({ agenciaId: ctx.agenciaId, usuarioId: ctx.userId, acao: "config_change", entidade: "groq_key", payload: { via: "groqcloud" } });
  revalidatePath("/configuracoes/groqcloud");
  return { ok: true };
}
