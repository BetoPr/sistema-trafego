/**
 * Resolver de chaves de IA (Fase 2 + 3) — multi-chave + preferência + limites.
 *
 * Fonte da verdade: tabela `ia_chaves` (várias chaves por provider, ordenadas
 * por `ordem`, só `ativa`, com limites por chave). Fallback legado: colunas
 * single em `configuracoes_agencia` (groq/openai/anthropic_key_encrypted) e, por
 * último, env GROQ_API_KEY/OPENAI_API_KEY. Tudo decriptado aqui (AES-256-GCM).
 *
 * Lê `configuracoes_agencia` UMA vez (chaves legadas + prefs do jsonb `ia`),
 * pra o gateway não precisar de outro round-trip.
 */
import { createServiceClient } from "@/lib/supabase/service";
import { decryptToken, byteaToBuffer } from "@/lib/crypto/tokens";
import type { ProviderIA } from "@/lib/ai/uso";

export type ProviderChat = "groq" | "openai";

/** Uma chave decriptada + seus limites (Fase 3). id=null → chave legada/env. */
export interface ChaveResolvida {
  id: string | null;
  key: string;
  limiteTpd: number;
  limiteTpm: number;
  /** Máximo de análises de follow-up/dia por esta chave. 0 = sem limite. */
  limiteFollowupDia: number;
}

export interface ChavesResolvidas {
  groq: ChaveResolvida[];
  openai: ChaveResolvida[];
  anthropic: ChaveResolvida[];
  /** Provider preferido pra chat (resumo/sentimento/follow-up). */
  providerChat: ProviderChat;
  /** Provider preferido pra transcrição de áudio. */
  providerTranscricao: ProviderChat;
}

// Limites default das chaves legadas/env (1 chave só, sem cap de follow-up —
// não temos como rastrear uso por chave sem id, então o gateway não as limita).
const LIMITE_LEGADO = { limiteTpd: 100000, limiteTpm: 12000, limiteFollowupDia: 0 };

function tentaDecrypt(raw: unknown): string | null {
  if (!raw) return null;
  try {
    return decryptToken(byteaToBuffer(raw));
  } catch {
    return null;
  }
}

interface ChaveRow {
  id: string;
  provider: ProviderIA;
  key_encrypted: unknown;
  limite_tpd: number | null;
  limite_tpm: number | null;
  limite_followup_dia: number | null;
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
      .select("id, provider, key_encrypted, ordem, limite_tpd, limite_tpm, limite_followup_dia")
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

  const groq: ChaveResolvida[] = [];
  const openai: ChaveResolvida[] = [];
  const anthropic: ChaveResolvida[] = [];

  for (const r of (chaves || []) as ChaveRow[]) {
    const k = tentaDecrypt(r.key_encrypted);
    if (!k) continue;
    const ch: ChaveResolvida = {
      id: r.id,
      key: k,
      limiteTpd: r.limite_tpd ?? 100000,
      limiteTpm: r.limite_tpm ?? 12000,
      limiteFollowupDia: r.limite_followup_dia ?? 0,
    };
    if (r.provider === "groq") groq.push(ch);
    else if (r.provider === "openai") openai.push(ch);
    else if (r.provider === "anthropic") anthropic.push(ch);
  }

  // Fallback legado (só se não houver chave da nova tabela pro provider).
  if (groq.length === 0) {
    const legado = tentaDecrypt(cfg?.groq_key_encrypted);
    if (legado) groq.push({ id: null, key: legado, ...LIMITE_LEGADO });
    else if (process.env.GROQ_API_KEY) groq.push({ id: null, key: process.env.GROQ_API_KEY, ...LIMITE_LEGADO });
  }
  if (openai.length === 0) {
    const legado = tentaDecrypt(cfg?.openai_key_encrypted);
    if (legado) openai.push({ id: null, key: legado, ...LIMITE_LEGADO });
    else if (process.env.OPENAI_API_KEY) openai.push({ id: null, key: process.env.OPENAI_API_KEY, ...LIMITE_LEGADO });
  }
  if (anthropic.length === 0) {
    const legado = tentaDecrypt(cfg?.anthropic_key_encrypted);
    if (legado) anthropic.push({ id: null, key: legado, ...LIMITE_LEGADO });
  }

  const ia = (cfg?.ia as Record<string, unknown> | null) ?? {};
  const providerChat: ProviderChat = ia.provider_chat === "openai" ? "openai" : "groq";
  const providerTranscricao: ProviderChat = ia.provider_transcricao === "openai" ? "openai" : "groq";

  return { groq, openai, anthropic, providerChat, providerTranscricao };
}
