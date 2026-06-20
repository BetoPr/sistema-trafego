/**
 * Gateway de IA (Fase 2) — rotação de chaves + fallback de provider.
 *
 * Resolve as chaves da agência (lib/ai/keys), monta uma cadeia de tentativas
 * conforme a preferência (ia.provider_chat / provider_transcricao) e tenta cada
 * uma em ordem: no 429/erro de uma chave Groq, pula pra próxima Groq; esgotadas,
 * cai pra OpenAI (ou vice-versa, se a preferência for OpenAI). Cada tentativa
 * registra o uso (lib/ai/uso) com o provider certo.
 *
 * Modelos OpenAI travados: chat = gpt-4o-mini, transcrição = gpt-4o-transcribe.
 * O modelo Groq vem do chamador (prompt) — default llama-3.3-70b-versatile /
 * whisper-large-v3-turbo.
 */
import { resolverChaves, type ProviderChat } from "@/lib/ai/keys";
import { chat, type ChatMessage, type ChatResult, type SentimentoResult } from "@/lib/groq/llm";
import { transcribeAudio, type TranscribeResult } from "@/lib/groq/transcribe";
import type { UsoLog } from "@/lib/ai/uso";

const GROQ_BASE = "https://api.groq.com/openai/v1";
const OPENAI_BASE = "https://api.openai.com/v1";
const GROQ_CHAT_DEFAULT = "llama-3.3-70b-versatile";
const GROQ_TRANSCRIBE_DEFAULT = "whisper-large-v3-turbo";
const OPENAI_CHAT_MODEL = "gpt-4o-mini";
const OPENAI_TRANSCRIBE_MODEL = "gpt-4o-transcribe";

interface Tentativa {
  provider: ProviderChat;
  apiKey: string;
  baseUrl: string;
  model: string;
}

function chainChat(
  chaves: { groq: string[]; openai: string[] },
  pref: ProviderChat,
  modelGroq?: string,
): Tentativa[] {
  const groq = chaves.groq.map((k) => ({ provider: "groq" as const, apiKey: k, baseUrl: GROQ_BASE, model: modelGroq || GROQ_CHAT_DEFAULT }));
  const openai = chaves.openai.map((k) => ({ provider: "openai" as const, apiKey: k, baseUrl: OPENAI_BASE, model: OPENAI_CHAT_MODEL }));
  return pref === "openai" ? [...openai, ...groq] : [...groq, ...openai];
}

function chainTranscricao(
  chaves: { groq: string[]; openai: string[] },
  pref: ProviderChat,
  modelGroq?: string,
): Tentativa[] {
  const groq = chaves.groq.map((k) => ({ provider: "groq" as const, apiKey: k, baseUrl: GROQ_BASE, model: modelGroq || GROQ_TRANSCRIBE_DEFAULT }));
  const openai = chaves.openai.map((k) => ({ provider: "openai" as const, apiKey: k, baseUrl: OPENAI_BASE, model: OPENAI_TRANSCRIBE_MODEL }));
  return pref === "openai" ? [...openai, ...groq] : [...groq, ...openai];
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
 * Chat com rotação de chaves + fallback de provider. Cada tentativa loga o uso.
 * Lança só se TODAS as tentativas falharem (mantém a msg do último erro, então o
 * detector de limite diário na UI continua funcionando).
 */
export async function chatGateway(p: ChatGatewayParams): Promise<ChatResult> {
  const chaves = await resolverChaves(p.agenciaId);
  const chain = chainChat(chaves, chaves.providerChat, p.modelGroq);
  if (chain.length === 0) throw new Error("Nenhuma chave de IA configurada (Groq ou OpenAI).");

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
        uso: p.uso,
      });
    } catch (e) {
      ultimoErro = e;
      if (i === chain.length - 1) throw e; // esgotou tudo — relança
      // senão: tenta a próxima chave/provider
    }
  }
  throw ultimoErro; // inalcançável
}

/** Análise de sentimento via gateway (rotação + fallback). */
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

/** Resumo de conversa via gateway (rotação + fallback). */
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

/** Transcrição com rotação de chaves + fallback de provider. */
export async function transcreverGW(p: TranscreverGatewayParams): Promise<TranscribeResult> {
  const chaves = await resolverChaves(p.agenciaId);
  const chain = chainTranscricao(chaves, chaves.providerTranscricao, p.modelGroq);
  if (chain.length === 0) throw new Error("Nenhuma chave de IA configurada (Groq ou OpenAI).");

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
        uso: p.uso,
      });
    } catch (e) {
      ultimoErro = e;
      if (i === chain.length - 1) throw e;
    }
  }
  throw ultimoErro; // inalcançável
}
