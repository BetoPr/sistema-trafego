/**
 * Registro de uso de IA (tokens) — base do hub "Análise de IAs".
 *
 * Tudo que chama IA (transcrição, resumo, sentimento, follow-up, atendimento)
 * registra aqui: quem disparou (usuario), contato, ticket, provider, modelo,
 * tokens e custo estimado. Fire-and-forget — NUNCA quebra o fluxo principal.
 *
 * Insert via service role (bypassa RLS). Leitura por agência (RLS na tabela).
 */
import { createServiceClient } from "@/lib/supabase/service";

export type TarefaIA = "transcricao" | "resumo" | "sentimento" | "followup" | "atendimento" | "outro";
export type ProviderIA = "groq" | "openai" | "anthropic";

/** Contexto que o chamador conhece (quem/onde). O lib de IA completa o resto. */
export interface UsoLog {
  agenciaId: string;
  usuarioId?: string | null;
  contatoId?: string | null;
  ticketId?: string | null;
  tarefa: TarefaIA;
}

export interface RegistroUso extends UsoLog {
  provider: ProviderIA;
  modelo: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  audioSeg?: number;
  status?: "ok" | "erro" | "rate_limit";
  erro?: string;
}

// Preço aproximado em USD por 1 milhão de tokens (input/output) + por segundo de áudio.
// Valores estimados só pra dar noção de gasto — não é cobrança.
const PRECO: Record<string, { in: number; out: number; audioSeg?: number }> = {
  "llama-3.3-70b-versatile": { in: 0.59, out: 0.79 },
  "llama-3.1-8b-instant": { in: 0.05, out: 0.08 },
  "deepseek-r1-distill-llama-70b": { in: 0.75, out: 0.99 },
  "gpt-4o-mini": { in: 0.15, out: 0.6 },
  "gpt-4o": { in: 2.5, out: 10 },
  "gpt-4.1": { in: 2, out: 8 },
  "gpt-4.1-mini": { in: 0.4, out: 1.6 },
  "gpt-4.1-nano": { in: 0.1, out: 0.4 },
  "whisper-large-v3": { in: 0, out: 0, audioSeg: 0.0000308 },      // ~$0.111/h
  "whisper-large-v3-turbo": { in: 0, out: 0, audioSeg: 0.0000111 }, // ~$0.04/h
  "gpt-4o-transcribe": { in: 0, out: 0, audioSeg: 0.0001 },         // ~$0.006/min
};

/** Custo estimado (USD) de uma chamada, a partir do modelo + tokens/áudio. */
export function custoUsd(modelo: string, p: { promptTokens?: number; completionTokens?: number; audioSeg?: number }): number {
  const pr = PRECO[modelo];
  if (!pr) return 0;
  const tok = ((p.promptTokens || 0) * pr.in + (p.completionTokens || 0) * pr.out) / 1_000_000;
  const aud = (p.audioSeg || 0) * (pr.audioSeg || 0);
  return Math.round((tok + aud) * 1_000_000) / 1_000_000;
}

/** Registra uma chamada de IA. Fire-and-forget — erros só vão pro console. */
export function registrarUsoIA(r: RegistroUso): void {
  void (async () => {
    try {
      const sb = createServiceClient();
      const total = r.totalTokens ?? ((r.promptTokens || 0) + (r.completionTokens || 0));
      await sb.from("ia_uso").insert({
        agencia_id: r.agenciaId,
        usuario_id: r.usuarioId ?? null,
        contato_id: r.contatoId ?? null,
        ticket_id: r.ticketId ?? null,
        tarefa: r.tarefa,
        provider: r.provider,
        modelo: r.modelo,
        prompt_tokens: r.promptTokens ?? 0,
        completion_tokens: r.completionTokens ?? 0,
        total_tokens: total,
        audio_seg: r.audioSeg ?? 0,
        custo_usd: custoUsd(r.modelo, { promptTokens: r.promptTokens, completionTokens: r.completionTokens, audioSeg: r.audioSeg }),
        status: r.status ?? "ok",
        erro: r.erro ?? null,
      });
    } catch (e) {
      console.error("[ia_uso] registrar falhou:", e);
    }
  })();
}
