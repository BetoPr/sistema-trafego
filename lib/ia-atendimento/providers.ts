/**
 * Wrapper unificado pra Anthropic / OpenAI / Groq.
 * Recebe mensagens + tools (formato comum) → devolve resposta texto e tool calls solicitadas.
 */
import type { ToolDef } from "./tools-runner";

export interface MsgIA {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ToolCallSolicitada {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface RespostaIA {
  texto: string;
  toolCalls: ToolCallSolicitada[];
  tokensIn: number;
  tokensOut: number;
  modelo: string;
}

export async function chamarIA(params: {
  provider: "anthropic" | "openai" | "groq";
  modelo: string;
  apiKey: string;
  mensagens: MsgIA[];
  tools: ToolDef[];
  maxTokens: number;
  temperatura: number;
}): Promise<RespostaIA> {
  if (params.provider === "anthropic") return chamarAnthropic(params);
  if (params.provider === "openai") return chamarOpenAI(params);
  if (params.provider === "groq") return chamarGroq(params);
  throw new Error(`provider desconhecido: ${params.provider}`);
}

// ============ Anthropic ============
async function chamarAnthropic(p: { modelo: string; apiKey: string; mensagens: MsgIA[]; tools: ToolDef[]; maxTokens: number; temperatura: number }): Promise<RespostaIA> {
  const systemMsg = p.mensagens.find((m) => m.role === "system");
  const userMsgs = p.mensagens.filter((m) => m.role !== "system");

  const body = {
    model: p.modelo,
    max_tokens: p.maxTokens,
    temperature: p.temperatura,
    system: systemMsg?.content,
    messages: userMsgs.map((m) => ({ role: m.role, content: m.content })),
    ...(p.tools.length
      ? {
          tools: p.tools.map((t) => ({
            name: t.name,
            description: t.description,
            input_schema: t.input_schema,
          })),
        }
      : {}),
  };

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": p.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });
  const j = await res.json() as {
    content?: Array<{ type: string; text?: string; name?: string; input?: Record<string, unknown>; id?: string }>;
    usage?: { input_tokens?: number; output_tokens?: number };
    error?: { message?: string };
  };
  if (!res.ok) throw new Error(`Anthropic: ${j.error?.message || res.statusText}`);

  let texto = "";
  const toolCalls: ToolCallSolicitada[] = [];
  for (const c of j.content || []) {
    if (c.type === "text" && c.text) texto += c.text;
    if (c.type === "tool_use" && c.name) {
      toolCalls.push({ id: c.id || "tc", name: c.name, arguments: c.input || {} });
    }
  }
  return {
    texto: texto.trim(),
    toolCalls,
    tokensIn: j.usage?.input_tokens || 0,
    tokensOut: j.usage?.output_tokens || 0,
    modelo: p.modelo,
  };
}

// ============ OpenAI ============
async function chamarOpenAI(p: { modelo: string; apiKey: string; mensagens: MsgIA[]; tools: ToolDef[]; maxTokens: number; temperatura: number }): Promise<RespostaIA> {
  const body = {
    model: p.modelo,
    max_completion_tokens: p.maxTokens,
    temperature: p.temperatura,
    messages: p.mensagens.map((m) => ({ role: m.role, content: m.content })),
    ...(p.tools.length
      ? {
          tools: p.tools.map((t) => ({
            type: "function" as const,
            function: { name: t.name, description: t.description, parameters: t.input_schema },
          })),
        }
      : {}),
  };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${p.apiKey}`,
    },
    body: JSON.stringify(body),
  });
  const j = await res.json() as {
    choices?: Array<{ message?: { content?: string | null; tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }> } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
    error?: { message?: string };
  };
  if (!res.ok) throw new Error(`OpenAI: ${j.error?.message || res.statusText}`);

  const msg = j.choices?.[0]?.message;
  const toolCalls: ToolCallSolicitada[] = (msg?.tool_calls || []).map((tc) => ({
    id: tc.id,
    name: tc.function.name,
    arguments: safeJson(tc.function.arguments),
  }));
  return {
    texto: (msg?.content || "").trim(),
    toolCalls,
    tokensIn: j.usage?.prompt_tokens || 0,
    tokensOut: j.usage?.completion_tokens || 0,
    modelo: p.modelo,
  };
}

// ============ Groq (compat OpenAI) ============
async function chamarGroq(p: { modelo: string; apiKey: string; mensagens: MsgIA[]; tools: ToolDef[]; maxTokens: number; temperatura: number }): Promise<RespostaIA> {
  const body = {
    model: p.modelo,
    max_tokens: p.maxTokens,
    temperature: p.temperatura,
    messages: p.mensagens.map((m) => ({ role: m.role, content: m.content })),
    ...(p.tools.length
      ? {
          tools: p.tools.map((t) => ({
            type: "function" as const,
            function: { name: t.name, description: t.description, parameters: t.input_schema },
          })),
        }
      : {}),
  };

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${p.apiKey}`,
    },
    body: JSON.stringify(body),
  });
  const j = await res.json() as {
    choices?: Array<{ message?: { content?: string | null; tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }> } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
    error?: { message?: string };
  };
  if (!res.ok) throw new Error(`Groq: ${j.error?.message || res.statusText}`);

  const msg = j.choices?.[0]?.message;
  const toolCalls: ToolCallSolicitada[] = (msg?.tool_calls || []).map((tc) => ({
    id: tc.id,
    name: tc.function.name,
    arguments: safeJson(tc.function.arguments),
  }));
  return {
    texto: (msg?.content || "").trim(),
    toolCalls,
    tokensIn: j.usage?.prompt_tokens || 0,
    tokensOut: j.usage?.completion_tokens || 0,
    modelo: p.modelo,
  };
}

function safeJson(s: string): Record<string, unknown> {
  try { return JSON.parse(s); } catch { return {}; }
}
