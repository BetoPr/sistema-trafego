/**
 * Gera resumo curto da conversa do ticket via Groq.
 * Usado apos transferir_para_humano: roda em background, envia resumo
 * pra grupo ou privado configurado.
 */
import { createServiceClient } from "@/lib/supabase/service";
import { decryptToken, byteaToBuffer } from "@/lib/crypto/tokens";
import { instanceSendText } from "@/lib/uazapi/client";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

export interface ConfigResumo {
  perfil_id: string;
  agencia_id: string;
  ativo: boolean;
  modelo_groq: string;
  groq_api_key_encrypted: unknown;
  destino_tipo: "grupo" | "privado";
  canal_id: string | null;
  grupo_jid: string | null;
  telefone: string | null;
  prompt_resumo: string;
}

const HISTORICO_FAKE = [
  "Cliente: Oi, vi o anuncio de fotografia",
  "IA: Oi! Tudo bem? Sou a Ana, assistente do estudio. Posso te ajudar! Voce quer um ensaio ou restauracao de foto?",
  "Cliente: Quero saber sobre restauracao mesmo, tenho uma foto antiga do meu avo",
  "IA: Que legal! Restauramos fotos antigas com IA, fica linda. Voce poderia me enviar a foto pra darmos uma olhada?",
  "Cliente: claro, vou mandar agora",
  "IA: Otimo! Enquanto isso, posso te conectar com nosso responsavel para passar valores e prazos, tudo bem?",
  "Cliente: pode sim",
].join("\n");

/**
 * Executa geracao + envio de resumo com config explicita.
 * Usado tanto pelo trigger automatico quanto pelo botao de teste.
 *
 * - groqKey: chave em texto plano (ja decriptada pelo caller)
 * - canalToken: token UAZAPI em texto plano
 * - historico: texto formatado da conversa
 * - prefixo: cabecalho da msg (ex: "Resumo IA" ou "Resumo IA (TESTE)")
 */
export async function executarResumoComConfig(args: {
  modeloGroq: string;
  groqKey: string;
  promptResumo: string;
  historico: string;
  destinoTipo: "grupo" | "privado";
  grupoJid: string | null;
  telefone: string | null;
  canalBaseUrl: string;
  canalToken: string;
  prefixo?: string;
}): Promise<{ ok: boolean; motivo?: string; resumo?: string }> {
  if (!args.historico.trim()) return { ok: false, motivo: "sem historico" };

  let resumoTexto: string;
  try {
    const r = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${args.groqKey}`,
      },
      body: JSON.stringify({
        model: args.modeloGroq,
        messages: [
          { role: "system", content: args.promptResumo },
          { role: "user", content: `Conversa do ticket:\n\n${args.historico}\n\nGere o resumo.` },
        ],
        max_tokens: 600,
        temperature: 0.3,
      }),
    });
    const j = (await r.json()) as { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } };
    if (j.error) return { ok: false, motivo: `groq: ${j.error.message}` };
    resumoTexto = j.choices?.[0]?.message?.content?.trim() || "";
    if (!resumoTexto) return { ok: false, motivo: "resumo vazio" };
  } catch (e) {
    return { ok: false, motivo: `groq erro: ${e instanceof Error ? e.message : String(e)}` };
  }

  const numberOrJid = args.destinoTipo === "grupo"
    ? (args.grupoJid!.endsWith("@g.us") ? args.grupoJid! : `${args.grupoJid}@g.us`)
    : args.telefone!.replace(/\D/g, "");

  const prefixo = args.prefixo || "📋 *Resumo IA (pré-qualificação)*";
  try {
    await instanceSendText(
      { baseUrl: args.canalBaseUrl, token: args.canalToken },
      { number: numberOrJid, text: `${prefixo}\n\n${resumoTexto}` },
    );
    return { ok: true, resumo: resumoTexto };
  } catch (e) {
    return { ok: false, motivo: `envio uazapi: ${e instanceof Error ? e.message : String(e)}`, resumo: resumoTexto };
  }
}

export async function gerarEEnviarResumo(args: {
  ticketId: string;
  perfilId: string;
  agenciaId: string;
}): Promise<{ ok: boolean; motivo?: string }> {
  const sb = createServiceClient();

  const { data: cfg } = await sb
    .from("ia_atendimento_resumo_config")
    .select("perfil_id, agencia_id, ativo, modelo_groq, groq_api_key_encrypted, destino_tipo, canal_id, grupo_jid, telefone, prompt_resumo")
    .eq("perfil_id", args.perfilId)
    .maybeSingle<ConfigResumo>();

  if (!cfg || !cfg.ativo) return { ok: false, motivo: "config inativa" };
  if (!cfg.groq_api_key_encrypted) return { ok: false, motivo: "sem groq api key" };
  if (!cfg.canal_id) return { ok: false, motivo: "sem canal" };
  if (cfg.destino_tipo === "grupo" && !cfg.grupo_jid) return { ok: false, motivo: "sem grupo_jid" };
  if (cfg.destino_tipo === "privado" && !cfg.telefone) return { ok: false, motivo: "sem telefone" };

  const { data: msgs } = await sb
    .from("mensagens")
    .select("autor, conteudo, transcricao, created_at")
    .eq("ticket_id", args.ticketId)
    .is("deleted_em", null)
    .order("created_at", { ascending: true })
    .limit(50);

  const historico = (msgs || []).map((m) => {
    const tag = m.autor === "cliente" ? "Cliente" : m.autor === "atendente" ? "Atendente" : "IA";
    return `${tag}: ${(m.conteudo || m.transcricao || "").slice(0, 500)}`;
  }).join("\n");

  if (!historico.trim()) return { ok: false, motivo: "sem historico" };

  let groqKey: string;
  try {
    groqKey = decryptToken(byteaToBuffer(cfg.groq_api_key_encrypted as Parameters<typeof byteaToBuffer>[0]));
  } catch {
    return { ok: false, motivo: "chave groq corrompida" };
  }

  const { data: canal } = await sb
    .from("canais")
    .select("instance_token_encrypted, servidor:super_admin_servidores(base_url)")
    .eq("id", cfg.canal_id)
    .maybeSingle();
  if (!canal) return { ok: false, motivo: "canal nao encontrado" };

  const servidorRaw = (canal as unknown as { servidor: unknown }).servidor;
  const servidor = Array.isArray(servidorRaw)
    ? (servidorRaw[0] as { base_url: string } | undefined)
    : (servidorRaw as { base_url: string } | undefined);
  if (!servidor?.base_url) return { ok: false, motivo: "sem base_url" };

  const canalToken = decryptToken(byteaToBuffer(canal.instance_token_encrypted as Parameters<typeof byteaToBuffer>[0]));

  const r = await executarResumoComConfig({
    modeloGroq: cfg.modelo_groq,
    groqKey,
    promptResumo: cfg.prompt_resumo,
    historico,
    destinoTipo: cfg.destino_tipo,
    grupoJid: cfg.grupo_jid,
    telefone: cfg.telefone,
    canalBaseUrl: servidor.base_url,
    canalToken,
  });

  return { ok: r.ok, motivo: r.motivo };
}

/** Busca historico do ticket mais recente da agencia (com >=3 msgs). Fallback: fake. */
export async function buscarHistoricoSample(agenciaId: string, perfilId: string): Promise<{ historico: string; origem: "ticket_real" | "fake"; ticketId?: string }> {
  const sb = createServiceClient();

  const { data: tickets } = await sb
    .from("tickets")
    .select("id")
    .eq("agencia_id", agenciaId)
    .order("updated_at", { ascending: false })
    .limit(20);

  let ticketId: string | undefined;
  for (const t of tickets || []) {
    const { count } = await sb
      .from("mensagens")
      .select("id", { count: "exact", head: true })
      .eq("ticket_id", t.id);
    if ((count || 0) >= 3) {
      ticketId = t.id as string;
      break;
    }
  }

  if (ticketId) {
    const { data: msgs } = await sb
      .from("mensagens")
      .select("autor, conteudo, transcricao")
      .eq("ticket_id", ticketId)
      .is("deleted_em", null)
      .order("created_at", { ascending: true })
      .limit(50);
    const historico = (msgs || []).map((m) => {
      const tag = m.autor === "cliente" ? "Cliente" : m.autor === "atendente" ? "Atendente" : "IA";
      return `${tag}: ${(m.conteudo || m.transcricao || "").slice(0, 500)}`;
    }).join("\n");
    if (historico.trim()) return { historico, origem: "ticket_real", ticketId };
  }

  void perfilId;
  return { historico: HISTORICO_FAKE, origem: "fake" };
}
