/**
 * Orquestrador IA — alto nível, lê prompts + key da agência.
 */
import { createServiceClient } from "@/lib/supabase/service";
import { decryptToken } from "@/lib/crypto/tokens";
import { transcribeAudio } from "@/lib/groq/transcribe";
import {
  analisarSentimento as _analisar,
  gerarResumo as _resumo,
  formatConversaParaIA,
} from "@/lib/groq/llm";

/**
 * Carrega API key Groq da agência (preferida) ou cai pro env.
 */
export async function getGroqKey(agenciaId: string): Promise<string | null> {
  const sb = createServiceClient();
  const { data } = await sb
    .from("configuracoes_agencia")
    .select("groq_key_encrypted")
    .eq("agencia_id", agenciaId)
    .maybeSingle();

  if (data?.groq_key_encrypted) {
    try {
      return decryptToken(Buffer.from(data.groq_key_encrypted as unknown as string, "base64"));
    } catch {
      // continua
    }
  }
  return process.env.GROQ_API_KEY || null;
}

async function getPrompt(agenciaId: string, chave: "sentimento" | "resumo"): Promise<{ conteudo: string; modelo: string | null }> {
  const sb = createServiceClient();
  // Tenta prompt da agência primeiro.
  const { data: own } = await sb
    .from("ia_prompts")
    .select("conteudo, modelo_default, ativo")
    .eq("agencia_id", agenciaId)
    .eq("chave", chave)
    .eq("ativo", true)
    .maybeSingle();
  if (own) return { conteudo: own.conteudo, modelo: own.modelo_default };

  // Cai pro default global.
  const { data: global } = await sb
    .from("ia_prompts")
    .select("conteudo, modelo_default")
    .is("agencia_id", null)
    .eq("chave", chave)
    .eq("ativo", true)
    .single();

  return { conteudo: global?.conteudo || "", modelo: global?.modelo_default || null };
}

interface MensagemRow {
  autor: "cliente" | "atendente" | "sistema" | "bot";
  conteudo: string | null;
  transcricao: string | null;
  tipo: string;
  created_at: string;
}

async function fetchMensagens(ticketId: string): Promise<MensagemRow[]> {
  const sb = createServiceClient();
  const { data } = await sb
    .from("mensagens")
    .select("autor, conteudo, transcricao, tipo, created_at")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });
  return (data || []) as MensagemRow[];
}

export async function analisarSentimentoTicket(params: {
  agenciaId: string;
  ticketId: string;
}): Promise<{ sentimento: "ruim" | "bom" | "muito_bom"; confianca: number; motivo: string }> {
  const apiKey = await getGroqKey(params.agenciaId);
  if (!apiKey) throw new Error("Groq API key não configurada");

  const sb = createServiceClient();
  const t0 = Date.now();

  try {
    const [{ conteudo: prompt, modelo }, msgs] = await Promise.all([
      getPrompt(params.agenciaId, "sentimento"),
      fetchMensagens(params.ticketId),
    ]);

    // Pega nome do contato.
    const { data: ticket } = await sb
      .from("tickets")
      .select("contato:contatos(nome)")
      .eq("id", params.ticketId)
      .single();
    const contatoNome = (ticket as { contato?: { nome?: string } } | null)?.contato?.nome;

    const conversa = formatConversaParaIA(msgs, contatoNome);
    const result = await _analisar({ apiKey, prompt, conversa, model: modelo || undefined });

    await sb
      .from("tickets")
      .update({
        sentimento: result.sentimento,
        sentimento_confianca: result.confianca,
        sentimento_motivo: result.motivo,
        sentimento_atualizado_em: new Date().toISOString(),
      })
      .eq("id", params.ticketId);

    await sb.from("ia_execucoes").insert({
      agencia_id: params.agenciaId,
      ticket_id: params.ticketId,
      tipo: "sentimento",
      modelo: modelo || "llama-3.3-70b-versatile",
      prompt_usado: prompt,
      entrada_chars: conversa.length,
      resultado: result as unknown as Record<string, unknown>,
      duracao_ms: Date.now() - t0,
    });

    return result;
  } catch (e) {
    await sb.from("ia_execucoes").insert({
      agencia_id: params.agenciaId,
      ticket_id: params.ticketId,
      tipo: "sentimento",
      erro: e instanceof Error ? e.message : String(e),
      duracao_ms: Date.now() - t0,
    });
    throw e;
  }
}

export async function gerarResumoTicket(params: {
  agenciaId: string;
  ticketId: string;
}): Promise<{ resumo: string; modelo: string }> {
  const apiKey = await getGroqKey(params.agenciaId);
  if (!apiKey) throw new Error("Groq API key não configurada");

  const sb = createServiceClient();
  const t0 = Date.now();

  try {
    const [{ conteudo: prompt, modelo }, msgs] = await Promise.all([
      getPrompt(params.agenciaId, "resumo"),
      fetchMensagens(params.ticketId),
    ]);
    const { data: ticket } = await sb
      .from("tickets")
      .select("contato:contatos(nome)")
      .eq("id", params.ticketId)
      .single();
    const contatoNome = (ticket as { contato?: { nome?: string } } | null)?.contato?.nome;

    const conversa = formatConversaParaIA(msgs, contatoNome);
    const result = await _resumo({ apiKey, prompt, conversa, model: modelo || undefined });

    await sb
      .from("tickets")
      .update({
        resumo: result.resumo,
        resumo_atualizado_em: new Date().toISOString(),
      })
      .eq("id", params.ticketId);

    await sb.from("ia_execucoes").insert({
      agencia_id: params.agenciaId,
      ticket_id: params.ticketId,
      tipo: "resumo",
      modelo: result.modelo,
      prompt_usado: prompt,
      entrada_chars: conversa.length,
      resultado: { resumo: result.resumo },
      duracao_ms: Date.now() - t0,
    });

    return result;
  } catch (e) {
    await sb.from("ia_execucoes").insert({
      agencia_id: params.agenciaId,
      ticket_id: params.ticketId,
      tipo: "resumo",
      erro: e instanceof Error ? e.message : String(e),
      duracao_ms: Date.now() - t0,
    });
    throw e;
  }
}

export async function transcreverMensagemAudio(params: {
  agenciaId: string;
  mensagemId: string;
  audioUrl: string;
}): Promise<{ texto: string; modelo: string }> {
  const apiKey = await getGroqKey(params.agenciaId);
  if (!apiKey) throw new Error("Groq API key não configurada");

  const sb = createServiceClient();
  const t0 = Date.now();

  try {
    const r = await transcribeAudio({ apiKey, audioUrl: params.audioUrl, language: "pt" });
    await sb
      .from("mensagens")
      .update({ transcricao: r.text, transcricao_modelo: r.modelo })
      .eq("id", params.mensagemId);

    await sb.from("ia_execucoes").insert({
      agencia_id: params.agenciaId,
      tipo: "transcricao",
      modelo: r.modelo,
      entrada_chars: r.text.length,
      resultado: { texto: r.text, duration: r.duration },
      duracao_ms: Date.now() - t0,
    });

    return { texto: r.text, modelo: r.modelo };
  } catch (e) {
    await sb.from("ia_execucoes").insert({
      agencia_id: params.agenciaId,
      tipo: "transcricao",
      erro: e instanceof Error ? e.message : String(e),
      duracao_ms: Date.now() - t0,
    });
    throw e;
  }
}
