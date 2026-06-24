/**
 * Orquestrador IA — alto nível, lê prompts + key da agência.
 */
import { createServiceClient } from "@/lib/supabase/service";
import { audit } from "@/lib/crm/audit";
import { decryptToken, byteaToBuffer } from "@/lib/crypto/tokens";
import { formatConversaParaIA } from "@/lib/groq/llm";
import { analisarSentimentoGW, gerarResumoGW, chatGateway, transcreverGW } from "@/lib/ai/gateway";

/**
 * Carrega 1a chave Groq valida usando resolverChaves (ia_chaves -> legado -> env).
 * tentaDecrypt pula chaves com ENCRYPTION_KEY antiga; gateway de rotacao garante
 * que /api/ia/reescrever e resumo-stream pulem chaves quebradas automatico.
 */
export async function getGroqKey(agenciaId: string): Promise<string | null> {
  const { resolverChaves } = await import("@/lib/ai/keys");
  const chaves = await resolverChaves(agenciaId);
  return chaves.groq[0]?.key ?? null;
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
    const result = await analisarSentimentoGW({ agenciaId: params.agenciaId, prompt, conversa, modelGroq: modelo || undefined, uso: { agenciaId: params.agenciaId, ticketId: params.ticketId, tarefa: "sentimento" } });

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
    const result = await gerarResumoGW({ agenciaId: params.agenciaId, prompt, conversa, modelGroq: modelo || undefined, uso: { agenciaId: params.agenciaId, ticketId: params.ticketId, tarefa: "resumo" } });

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

/** Estilos de escrita do follow-up (escolhidos no dropdown de Regenerar). */
const TONS_FOLLOWUP: Record<string, string> = {
  direto: "Tom DIRETO e objetivo, sem rodeios — vá direto ao ponto.",
  emocional: "Tom EMOCIONAL, que cria conexão e empatia com o cliente.",
  na_dor: "Foque na DOR/necessidade do cliente e em como você resolve isso pra ele.",
  contextualizado: "Use detalhes ESPECÍFICOS do histórico (algo que o cliente disse) pra mostrar que você lembra dele.",
  simpatico: "Tom SIMPÁTICO, leve e acolhedor.",
};

/**
 * 3C — Follow-up com IA: resume a conversa parada e decide se vale reengajar,
 * sugerindo uma mensagem pronta. Retorna o rascunho pra revisão humana.
 * - `tom`: estilo de escrita (ver TONS_FOLLOWUP). Opcional.
 * - `followups_enviados`: quantos follow-ups da IA já saíram nesta conversa
 *   (a IA é avisada pra não repetir e o card mostra o contador).
 */
export async function sugerirFollowUpTicket(params: {
  agenciaId: string;
  ticketId: string;
  tom?: string;
  usuarioId?: string | null;
}): Promise<{ enviar: boolean; motivo: string; resumo: string; mensagem: string; followups_enviados: number }> {
  const sb = createServiceClient();
  // Só as últimas mensagens — limita os tokens por chamada (evita estourar o TPM do Groq).
  const msgs = (await fetchMensagens(params.ticketId, params.agenciaId)).slice(-25);
  const { data: ticket } = await sb.from("tickets").select("contato:contatos(nome)").eq("id", params.ticketId).eq("agencia_id", params.agenciaId).single();
  const contatoNome = (ticket as { contato?: { nome?: string } } | null)?.contato?.nome;
  const conversa = formatConversaParaIA(msgs, contatoNome).slice(-4000);

  // Quantos follow-ups da IA já foram enviados nesta conversa (metadata.follow_up_ia=true).
  const { count: jaEnviadosCount } = await sb
    .from("mensagens")
    .select("id", { count: "exact", head: true })
    .eq("ticket_id", params.ticketId)
    .eq("agencia_id", params.agenciaId)
    .filter("metadata->>follow_up_ia", "eq", "true");
  const jaEnviados = jaEnviadosCount || 0;

  const tomInstr = params.tom && TONS_FOLLOWUP[params.tom] ? `\nESTILO desejado: ${TONS_FOLLOWUP[params.tom]}` : "";
  const histInstr = jaEnviados > 0
    ? `\nIMPORTANTE: já foram enviados ${jaEnviados} follow-up(s) antes nesta conversa. NÃO repita as mesmas frases — varie a abordagem e seja mais leve/breve a cada tentativa.`
    : "";

  const system = `Você é um especialista em vendas e atendimento por WhatsApp. Recebe uma conversa que está PARADA e decide se vale enviar um follow-up para reengajar o cliente.

Responda APENAS um JSON válido:
{"resumo":"...","enviar":true,"motivo":"...","mensagem":"..."}

- resumo: 1-2 frases do contexto e do estágio da conversa.
- enviar: true se faz sentido um follow-up (cliente demonstrou interesse e sumiu, negociação aberta, dúvida/pagamento pendente); false se NÃO faz sentido (já comprou e foi atendido, recusou claramente, conversa irrelevante/spam, ou cliente pediu pra não receber mensagens).
- motivo: justificativa curta da decisão.
- mensagem: se enviar=true, o texto do follow-up PRONTO pra enviar — curto, cordial, em português do Brasil, tom de quem está retomando o papo, NUNCA robótico; use o nome do cliente se houver. SEMPRE termine com uma pergunta curta (padrão de follow-up, pra puxar resposta). Se enviar=false, retorne "".${tomInstr}${histInstr}`;

  const r = await chatGateway({
    agenciaId: params.agenciaId,
    uso: { agenciaId: params.agenciaId, ticketId: params.ticketId, tarefa: "followup", usuarioId: params.usuarioId ?? null },
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
    followups_enviados: jaEnviados,
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

  const t0 = Date.now();

  try {
    const r = await transcreverGW({
      agenciaId: params.agenciaId,
      uso: { agenciaId: params.agenciaId },
      audioUrl: params.audioUrl,
      language: tcfg.idioma || "pt",
      modelGroq: tcfg.modelo || "whisper-large-v3",
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
