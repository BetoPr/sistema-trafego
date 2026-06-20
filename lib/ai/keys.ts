/**
 * Resolver de chaves de IA (Fase 2) — multi-chave + preferência de provider.
 *
 * Fonte da verdade: tabela `ia_chaves` (várias chaves por provider, ordenadas
 * por `ordem`, só `ativa`). Fallback legado: colunas single em
 * `configuracoes_agencia` (groq/openai/anthropic_key_encrypted) e, por último,
 * env GROQ_API_KEY/OPENAI_API_KEY. Tudo decriptado aqui (AES-256-GCM).
 *
 * Lê `configuracoes_agencia` UMA vez (chaves legadas + prefs do jsonb `ia`),
 * pra o gateway não precisar de outro round-trip.
 */
import { createServiceClient } from "@/lib/supabase/service";
import { decryptToken, byteaToBuffer } from "@/lib/crypto/tokens";
import type { ProviderIA } from "@/lib/ai/uso";

export type ProviderChat = "groq" | "openai";

export interface ChavesResolvidas {
  groq: string[];
  openai: string[];
  anthropic: string[];
  /** Provider preferido pra chat (resumo/sentimento/follow-up). */
  providerChat: ProviderChat;
  /** Provider preferido pra transcrição de áudio. */
  providerTranscricao: ProviderChat;
}

function tentaDecrypt(raw: unknown): string | null {
  if (!raw) return null;
  try {
    return decryptToken(byteaToBuffer(raw));
  } catch {
    return null;
  }
}

/**
 * Resolve as chaves de uma agência (decriptadas, ordenadas, só ativas) + prefs.
 * Nunca lança — provider sem chave volta array vazio.
 */
export async function resolverChaves(agenciaId: string): Promise<ChavesResolvidas> {
  const sb = createServiceClient();

  const [{ data: chaves }, { data: cfg }] = await Promise.all([
    sb
      .from("ia_chaves")
      .select("provider, key_encrypted, ordem")
      .eq("agencia_id", agenciaId)
      .eq("ativa", true)
      .order("provider", { ascending: true })
      .order("ordem", { ascending: true }),
    sb
      .from("configuracoes_agencia")
      .select("groq_key_encrypted, openai_key_encrypted, anthropic_key_encrypted, ia")
      .eq("agencia_id", agenciaId)
      .maybeSingle(),
  ]);

  const groq: string[] = [];
  const openai: string[] = [];
  const anthropic: string[] = [];

  for (const row of chaves || []) {
    const k = tentaDecrypt((row as { key_encrypted: unknown }).key_encrypted);
    if (!k) continue;
    const prov = (row as { provider: ProviderIA }).provider;
    if (prov === "groq") groq.push(k);
    else if (prov === "openai") openai.push(k);
    else if (prov === "anthropic") anthropic.push(k);
  }

  // Fallback legado (só se não houver chave da nova tabela pro provider).
  if (groq.length === 0) {
    const legado = tentaDecrypt(cfg?.groq_key_encrypted);
    if (legado) groq.push(legado);
    else if (process.env.GROQ_API_KEY) groq.push(process.env.GROQ_API_KEY);
  }
  if (openai.length === 0) {
    const legado = tentaDecrypt(cfg?.openai_key_encrypted);
    if (legado) openai.push(legado);
    else if (process.env.OPENAI_API_KEY) openai.push(process.env.OPENAI_API_KEY);
  }
  if (anthropic.length === 0) {
    const legado = tentaDecrypt(cfg?.anthropic_key_encrypted);
    if (legado) anthropic.push(legado);
  }

  const ia = (cfg?.ia as Record<string, unknown> | null) ?? {};
  const providerChat: ProviderChat = ia.provider_chat === "openai" ? "openai" : "groq";
  const providerTranscricao: ProviderChat = ia.provider_transcricao === "openai" ? "openai" : "groq";

  return { groq, openai, anthropic, providerChat, providerTranscricao };
}
