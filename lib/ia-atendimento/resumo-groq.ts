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

  // Carrega historico do ticket
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

  // Decripta chave Groq
  let groqKey: string;
  try {
    groqKey = decryptToken(byteaToBuffer(cfg.groq_api_key_encrypted as Parameters<typeof byteaToBuffer>[0]));
  } catch {
    return { ok: false, motivo: "chave groq corrompida" };
  }

  // Chama Groq
  let resumoTexto: string;
  try {
    const r = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: cfg.modelo_groq,
        messages: [
          { role: "system", content: cfg.prompt_resumo },
          { role: "user", content: `Conversa do ticket:\n\n${historico}\n\nGere o resumo.` },
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

  // Pega canal pra mandar
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

  const token = decryptToken(byteaToBuffer(canal.instance_token_encrypted as Parameters<typeof byteaToBuffer>[0]));

  // Destino
  const numberOrJid = cfg.destino_tipo === "grupo"
    ? (cfg.grupo_jid!.endsWith("@g.us") ? cfg.grupo_jid! : `${cfg.grupo_jid}@g.us`)
    : cfg.telefone!.replace(/\D/g, "");

  try {
    await instanceSendText(
      { baseUrl: servidor.base_url, token },
      { number: numberOrJid, text: `📋 *Resumo IA (pré-qualificação)*\n\n${resumoTexto}` },
    );
    return { ok: true };
  } catch (e) {
    return { ok: false, motivo: `envio uazapi: ${e instanceof Error ? e.message : String(e)}` };
  }
}
