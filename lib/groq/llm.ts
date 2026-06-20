/**
 * LLM chat via Groq (OpenAI-compatible).
 *
 * Modelos default usados:
 *  - sentimento + resumo: llama-3.3-70b-versatile (free + rápido)
 *
 * Endpoint: POST https://api.groq.com/openai/v1/chat/completions
 */
import { registrarUsoIA, type UsoLog, type ProviderIA } from "@/lib/ai/uso";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatParams {
  apiKey: string;
  model?: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  responseFormat?: "text" | "json_object";
  /** Contexto pra registrar o uso de tokens (quem/onde/qual tarefa). */
  uso?: UsoLog;
  /** Base URL OpenAI-compatible. Default Groq. OpenAI = https://api.openai.com/v1 */
  baseUrl?: string;
  /** Provider, só pra logar o uso certo. Default "groq". */
  provider?: ProviderIA;
}

export interface ChatResult {
  content: string;
  modelo: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  raw: unknown;
}

export async function chat(p: ChatParams): Promise<ChatResult> {
  const model = p.model ?? "llama-3.3-70b-versatile";
  const baseUrl = p.baseUrl ?? "https://api.groq.com/openai/v1";
  const provider = p.provider ?? "groq";

  const body: Record<string, unknown> = {
    model,
    messages: p.messages,
    temperature: p.temperature ?? 0.2,
    max_tokens: p.maxTokens ?? 1024,
  };
  if (p.responseFormat === "json_object") {
    body.response_format = { type: "json_object" };
  }

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${p.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const json = (await res.json().catch(() => ({}))) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    error?: { message?: string };
  };

  if (!res.ok) {
    const msg = json.error?.message || res.statusText;
    if (p.uso) registrarUsoIA({ ...p.uso, provider, modelo: model, status: /\b429\b|rate limit|tokens per day|TPD|quota|too many|insufficient_quota/i.test(msg) ? "rate_limit" : "erro", erro: `${res.status}: ${msg}` });
    throw new Error(`${provider} chat ${res.status}: ${msg}`);
  }

  if (p.uso) {
    registrarUsoIA({
      ...p.uso, provider, modelo: model,
      promptTokens: json.usage?.prompt_tokens,
      completionTokens: json.usage?.completion_tokens,
      totalTokens: json.usage?.total_tokens,
    });
  }

  return {
    content: json.choices?.[0]?.message?.content ?? "",
    modelo: model,
    promptTokens: json.usage?.prompt_tokens,
    completionTokens: json.usage?.completion_tokens,
    totalTokens: json.usage?.total_tokens,
    raw: json,
  };
}

// =========================================
// HIGH-LEVEL: sentimento + resumo
// =========================================

export interface SentimentoResult {
  sentimento: "ruim" | "bom" | "muito_bom";
  confianca: number;
  motivo: string;
}

export async function analisarSentimento(params: {
  apiKey: string;
  prompt: string; // do ia_prompts.conteudo
  conversa: string; // texto da conversa formatado
  model?: string;
  uso?: UsoLog;
}): Promise<SentimentoResult> {
  const r = await chat({
    apiKey: params.apiKey,
    model: params.model,
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
    // Fallback: extrai por regex
    const m = r.content.match(/"sentimento"\s*:\s*"([^"]+)"/);
    if (m) parsed.sentimento = m[1];
  }

  const s = (parsed.sentimento || "bom").toLowerCase();
  const norm: SentimentoResult["sentimento"] =
    s.includes("muito") ? "muito_bom" : s.includes("ruim") ? "ruim" : "bom";

  return {
    sentimento: norm,
    confianca: Math.max(0, Math.min(100, Number(parsed.confianca) || 50)),
    motivo: parsed.motivo || "—",
  };
}

export async function gerarResumo(params: {
  apiKey: string;
  prompt: string;
  conversa: string;
  model?: string;
  uso?: UsoLog;
}): Promise<{ resumo: string; modelo: string }> {
  const r = await chat({
    apiKey: params.apiKey,
    model: params.model,
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
// HELPER: formatar conversa pra IA
// =========================================

export function formatConversaParaIA(
  mensagens: Array<{
    autor: "cliente" | "atendente" | "sistema" | "bot";
    conteudo: string | null;
    transcricao?: string | null;
    tipo?: string;
    created_at?: string;
  }>,
  contatoNome?: string,
): string {
  const lines: string[] = [];
  for (const m of mensagens) {
    const who =
      m.autor === "cliente"
        ? contatoNome || "Cliente"
        : m.autor === "atendente"
          ? "Atendente"
          : m.autor === "bot"
            ? "Bot"
            : "Sistema";
    const txt = m.conteudo || m.transcricao || `[${m.tipo || "mídia"}]`;
    lines.push(`${who}: ${txt}`);
  }
  return lines.join("\n");
}
