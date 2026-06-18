/**
 * Orquestrador IA — alto nível, lê prompts + key da agência.
 */
import { createServiceClient } from "@/lib/supabase/service";
import { audit } from "@/lib/crm/audit";
import { decryptToken, byteaToBuffer } from "@/lib/crypto/tokens";
import { transcribeAudio, type WhisperModel } from "@/lib/groq/transcribe";
import {
  analisarSentimento as _analisar,
  gerarResumo as _resumo,
  formatConversaParaIA,
  chat,
} from "@/lib/groq/llm";

/**
 * Carrega API key Groq da agência (preferida) ou cai pro env.
 */
/** chat() com retry no rate limit (429) do Groq, respeitando o "try again in Xms/Xs". */
async function chatComRetry(p: Parameters<typeof chat>[0], tentativas = 4): Promise<Awaited<ReturnType<typeof chat>>> {
  for (let i = 0; ; i++) {
    try {
      return await chat(p);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (i >= tentativas - 1 || !/429|rate.?limit/i.test(msg)) throw e;
      const m = msg.match(/try again in ([\d.]+)\s*(ms|s)\b/i);
      let wait = 2500;
      if (m) wait = m[2].toLowerCase() === "s" ? parseFloat(m[1]) * 1000 : parseFloat(m[1]);
      await new Promise((res) => setTimeout(res, Math.min(12000, Math.max(600, wait + 400))));
    }
  }
}

export async function getGroqKey(agenciaId: string): Promise<string | null> {
  const sb = createServiceClient();
  const { data } = await sb
    .from("configuracoes_agencia")
    .select("groq_key_encrypted")
    .eq("agencia_id", agenciaId)
    .maybeSingle();

  if (data?.groq_key_encrypted) {
    try {
      return decryptToken(byteaToBuffer(data.groq_key_encrypted));
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

async function fetchMensagens(ticketId: string, agenciaId: string): Promise<MensagemRow[]> {
  const sb = createServiceClient();
  const { data } = await sb
    .from("mensagens")
    .select("autor, conteudo, transcricao, tipo, created_at")
    .eq("ticket_id", ticketId)
    .eq("agencia_id", agenciaId)
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
      fetchMensagens(params.ticketId, params.agenciaId),
    ]);

    // Pega nome do contato.
    const { data: ticket } = await sb
      .from("tickets")
      .select("contato:contatos(nome)")
      .eq("id", params.ticketId)
      .eq("agencia_id", params.agenciaId)
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
      .eq("id", params.ticketId)
      .eq("agencia_id", params.agenciaId);

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
      fetchMensagens(params.ticketId, params.agenciaId),
    ]);
    const { data: ticket } = await sb
      .from("tickets")
      .select("contato:contatos(nome)")
      .eq("id", params.ticketId)
      .eq("agencia_id", params.agenciaId)
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

    void audit({ agenciaId: params.agenciaId, acao: "resumo", entidade: "ticket", entidadeId: params.ticketId, payload: { ticket_id: params.ticketId, automatico: true } });

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

/**
 * 3C — Follow-up com IA: resume a conversa parada e decide se vale reengajar,
 * sugerindo uma mensagem pronta. Retorna o rascunho pra revisão humana.
 */
export async function sugerirFollowUpTicket(params: {
  agenciaId: string;
  ticketId: string;
}): Promise<{ enviar: boolean; motivo: string; resumo: string; mensagem: string }> {
  const apiKey = await getGroqKey(params.agenciaId);
  if (!apiKey) throw new Error("Groq API key não configurada");

  const sb = createServiceClient();
  // Só as últimas mensagens — limita os tokens por chamada (evita estourar o TPM do Groq).
  const msgs = (await fetchMensagens(params.ticketId, params.agenciaId)).slice(-25);
  const { data: ticket } = await sb.from("tickets").select("contato:contatos(nome)").eq("id", params.ticketId).eq("agencia_id", params.agenciaId).single();
  const contatoNome = (ticket as { contato?: { nome?: string } } | null)?.contato?.nome;
  const conversa = formatConversaParaIA(msgs, contatoNome).slice(-4000);

  const system = `Você é um especialista em vendas e atendimento por WhatsApp. Recebe uma conversa que está PARADA e decide se vale enviar um follow-up para reengajar o cliente.

Responda APENAS um JSON válido:
{"resumo":"...","enviar":true,"motivo":"...","mensagem":"..."}

- resumo: 1-2 frases do contexto e do estágio da conversa.
- enviar: true se faz sentido um follow-up (cliente demonstrou interesse e sumiu, negociação aberta, dúvida/pagamento pendente); false se NÃO faz sentido (já comprou e foi atendido, recusou claramente, conversa irrelevante/spam, ou cliente pediu pra não receber mensagens).
- motivo: justificativa curta da decisão.
- mensagem: se enviar=true, o texto do follow-up PRONTO pra enviar — curto, cordial, em português do Brasil, tom de quem está retomando o papo, NUNCA robótico; use o nome do cliente se houver. Se enviar=false, retorne "".`;

  const r = await chatComRetry({
    apiKey,
    responseFormat: "json_object",
    temperature: 0.5,
    maxTokens: 400,
    messages: [
      { role: "system", content: system },
      { role: "user", content: conversa || "(sem mensagens registradas)" },
    ],
  });

  let p: { enviar?: boolean; motivo?: string; resumo?: string; mensagem?: string } = {};
  try { p = JSON.parse(r.content); } catch {}
  return {
    enviar: !!p.enviar,
    motivo: String(p.motivo || ""),
    resumo: String(p.resumo || ""),
    mensagem: String(p.mensagem || ""),
  };
}

export async function transcreverMensagemAudio(params: {
  agenciaId: string;
  mensagemId: string;
  audioUrl: string;
}): Promise<{ texto: string; modelo: string }> {
  const sb = createServiceClient();

  // Config de transcrição (ia.transcricao no jsonb). Desligado = pula (não gasta token).
  // Só a transcrição respeita esse toggle — resumo/sentimento continuam usando o Groq.
  const { data: cfgRow } = await sb
    .from("configuracoes_agencia")
    .select("ia")
    .eq("agencia_id", params.agenciaId)
    .maybeSingle();
  const tcfg = ((cfgRow?.ia as Record<string, unknown> | null)?.transcricao ?? {}) as { ativa?: boolean; idioma?: string; modelo?: string };
  if (tcfg.ativa === false) {
    return { texto: "", modelo: "desativado" };
  }

  const apiKey = await getGroqKey(params.agenciaId);
  if (!apiKey) throw new Error("Groq API key não configurada");

  const t0 = Date.now();

  try {
    const r = await transcribeAudio({
      apiKey,
      audioUrl: params.audioUrl,
      language: tcfg.idioma || "pt",
      model: (tcfg.modelo as WhisperModel) || "whisper-large-v3",
    });
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
