/**
 * Gateway de IA (Fase 2 + 3) — rotação de chaves + fallback + limites por chave.
 *
 * Resolve as chaves da agência (lib/ai/keys), olha o uso de hoje por chave
 * (lib/ai/limites) e monta uma cadeia de tentativas conforme a preferência
 * (ia.provider_chat / provider_transcricao):
 *  - Fase 2: no 429/erro de uma chave Groq, pula pra próxima; esgotadas, cai pra
 *    OpenAI (ou vice-versa, se a preferência for OpenAI).
 *  - Fase 3: ANTES de tentar, pula proativamente as chaves Groq que já bateram o
 *    teto diário de tokens (TPD) ou o limite de follow-ups/dia. O 429 segue como
 *    rede de segurança. Cada tentativa loga o uso com a chave (chave_id) usada.
 *
 * Modelos OpenAI travados: chat = gpt-4o-mini, transcrição = gpt-4o-transcribe.
 * O modelo Groq vem do chamador (prompt) — default llama-3.3-70b-versatile /
 * whisper-large-v3-turbo.
 */
import { resolverChaves, type ProviderChat, type ChaveResolvida, type ChavesResolvidas } from "@/lib/ai/keys";
import { usoHojePorChave, type UsoChave } from "@/lib/ai/limites";
import { chat, type ChatMessage, type ChatResult, type SentimentoResult } from "@/lib/groq/llm";
import { transcribeAudio, type TranscribeResult } from "@/lib/groq/transcribe";
import type { UsoLog, TarefaIA } from "@/lib/ai/uso";

const GROQ_BASE = "https://api.groq.com/openai/v1";
const OPENAI_BASE = "https://api.openai.com/v1";
const GROQ_CHAT_DEFAULT = "llama-3.3-70b-versatile";
const GROQ_TRANSCRIBE_DEFAULT = "whisper-large-v3-turbo";
const OPENAI_CHAT_MODEL = "gpt-4o-mini";
const OPENAI_TRANSCRIBE_MODEL = "gpt-4o-transcribe";

interface Tentativa {
  provider: ProviderChat;
  chaveId: string | null;
  apiKey: string;
  baseUrl: string;
  model: string;
}

/** Uma chave Groq está disponível se ainda não bateu o teto diário (e o de follow-up). */
function groqDisponivel(c: ChaveResolvida, usoHoje: Map<string, UsoChave>, tarefa: TarefaIA): boolean {
  if (c.id === null) return true; // legado/env — sem rastreio por chave, sem limite proativo
  const u = usoHoje.get(c.id);
  if (!u) return true;
  if (c.limiteTpd > 0 && u.tokens >= c.limiteTpd) return false;
  if (tarefa === "followup" && c.limiteFollowupDia > 0 && u.followups >= c.limiteFollowupDia) return false;
  return true;
}

function montaChain(
  chaves: ChavesResolvidas,
  pref: ProviderChat,
  usoHoje: Map<string, UsoChave>,
  tarefa: TarefaIA,
  groqModel: string,
  openaiModel: string,
): Tentativa[] {
  const groq: Tentativa[] = chaves.groq
    .filter((c) => groqDisponivel(c, usoHoje, tarefa))
    .map((c) => ({ provider: "groq" as const, chaveId: c.id, apiKey: c.key, baseUrl: GROQ_BASE, model: groqModel }));
  const openai: Tentativa[] = chaves.openai
    .map((c) => ({ provider: "openai" as const, chaveId: c.id, apiKey: c.key, baseUrl: OPENAI_BASE, model: openaiModel }));
  return pref === "openai" ? [...openai, ...groq] : [...groq, ...openai];
}

/** Erro amigável quando a cadeia ficou vazia. Inclui "(TPD)" pra UI detectar limite diário. */
function erroCadeiaVazia(chaves: ChavesResolvidas): Error {
  return new Error(
    chaves.groq.length > 0
      ? "Todas as chaves Groq bateram o teto diário (TPD) ou o limite de follow-ups de hoje. Adicione mais chaves Groq ou ative o OpenAI em Configurações de API (IA)."
      : "Nenhuma chave de IA configurada (Groq ou OpenAI).",
  );
}

// =========================================
// CHAT (resumo / sentimento / follow-up)
// =========================================

export interface ChatGatewayParams {
  agenciaId: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  responseFormat?: "text" | "json_object";
  /** Contexto de uso (tarefa obrigatória). */
  uso: UsoLog;
  /** Modelo Groq (geralmente do prompt). OpenAI usa sempre gpt-4o-mini. */
  modelGroq?: string;
}

/**
 * Chat com rotação de chaves + fallback de provider + skip de chave estourada.
 * Lança só se TODAS as tentativas falharem (mantém a msg do último erro, então o
 * detector de limite diário na UI continua funcionando).
 */
export async function chatGateway(p: ChatGatewayParams): Promise<ChatResult> {
  const [chaves, usoHoje] = await Promise.all([resolverChaves(p.agenciaId), usoHojePorChave(p.agenciaId)]);
  const chain = montaChain(chaves, chaves.providerChat, usoHoje, p.uso.tarefa, p.modelGroq || GROQ_CHAT_DEFAULT, OPENAI_CHAT_MODEL);
  if (chain.length === 0) throw erroCadeiaVazia(chaves);

  let ultimoErro: unknown;
  for (let i = 0; i < chain.length; i++) {
    const t = chain[i];
    try {
      return await chat({
        apiKey: t.apiKey,
        baseUrl: t.baseUrl,
        provider: t.provider,
        model: t.model,
        messages: p.messages,
        temperature: p.temperature,
        maxTokens: p.maxTokens,
        responseFormat: p.responseFormat,
        uso: { ...p.uso, chaveId: t.chaveId },
      });
    } catch (e) {
      ultimoErro = e;
      if (i === chain.length - 1) throw e; // esgotou tudo — relança
      // senão: tenta a próxima chave/provider
    }
  }
  throw ultimoErro; // inalcançável
}

/** Análise de sentimento via gateway (rotação + fallback + limites). */
export async function analisarSentimentoGW(params: {
  agenciaId: string;
  prompt: string;
  conversa: string;
  modelGroq?: string;
  uso: UsoLog;
}): Promise<SentimentoResult> {
  const r = await chatGateway({
    agenciaId: params.agenciaId,
    modelGroq: params.modelGroq,
    uso: params.uso,
    responseFormat: "json_object",
    temperature: 0.1,
    messages: [
      { role: "system", content: params.prompt },
      { role: "user", content: params.conversa },
    ],
  });

  let parsed: { sentimento?: string; confianca?: number; motivo?: string } = {};
  try {
    parsed = JSON.parse(r.content);
  } catch {
    const m = r.content.match(/"sentimento"\s*:\s*"([^"]+)"/);
    if (m) parsed.sentimento = m[1];
  }
  const s = (parsed.sentimento || "bom").toLowerCase();
  const norm: SentimentoResult["sentimento"] = s.includes("muito") ? "muito_bom" : s.includes("ruim") ? "ruim" : "bom";
  return {
    sentimento: norm,
    confianca: Math.max(0, Math.min(100, Number(parsed.confianca) || 50)),
    motivo: parsed.motivo || "—",
  };
}

/** Resumo de conversa via gateway (rotação + fallback + limites). */
export async function gerarResumoGW(params: {
  agenciaId: string;
  prompt: string;
  conversa: string;
  modelGroq?: string;
  uso: UsoLog;
}): Promise<{ resumo: string; modelo: string }> {
  const r = await chatGateway({
    agenciaId: params.agenciaId,
    modelGroq: params.modelGroq,
    uso: params.uso,
    temperature: 0.3,
    maxTokens: 800,
    messages: [
      { role: "system", content: params.prompt },
      { role: "user", content: params.conversa },
    ],
  });
  return { resumo: r.content.trim(), modelo: r.modelo };
}

// =========================================
// TRANSCRIÇÃO
// =========================================

export interface TranscreverGatewayParams {
  agenciaId: string;
  audioUrl?: string;
  audioBlob?: Blob;
  audioFilename?: string;
  language?: string;
  /** Modelo Groq (do config). OpenAI usa sempre gpt-4o-transcribe. */
  modelGroq?: string;
  uso: Omit<UsoLog, "tarefa">;
}

/** Transcrição com rotação de chaves + fallback de provider + skip de chave estourada. */
export async function transcreverGW(p: TranscreverGatewayParams): Promise<TranscribeResult> {
  const [chaves, usoHoje] = await Promise.all([resolverChaves(p.agenciaId), usoHojePorChave(p.agenciaId)]);
  const chain = montaChain(chaves, chaves.providerTranscricao, usoHoje, "transcricao", p.modelGroq || GROQ_TRANSCRIBE_DEFAULT, OPENAI_TRANSCRIBE_MODEL);
  if (chain.length === 0) throw erroCadeiaVazia(chaves);

  let ultimoErro: unknown;
  for (let i = 0; i < chain.length; i++) {
    const t = chain[i];
    try {
      return await transcribeAudio({
        apiKey: t.apiKey,
        baseUrl: t.baseUrl,
        provider: t.provider,
        model: t.model,
        audioUrl: p.audioUrl,
        audioBlob: p.audioBlob,
        audioFilename: p.audioFilename,
        language: p.language,
        uso: { ...p.uso, chaveId: t.chaveId },
      });
    } catch (e) {
      ultimoErro = e;
      if (i === chain.length - 1) throw e;
    }
  }
  throw ultimoErro; // inalcançável
}
