/**
 * Import do histórico RECENTE de conversas do WhatsApp → CRM (migração).
 *
 * Pega os chats mais recentes (não-grupo) e puxa as últimas N mensagens de cada,
 * gravando direto em `mensagens` (NÃO passa pelo webhook → NÃO aciona a IA).
 *
 * - Idempotente: dedup por wa_message_id (re-rodar não duplica).
 * - Bounded: limita nº de chats e mensagens por chat pra não explodir.
 * - 1 ticket por contato pra guardar o histórico. Conversa recente com cliente
 *   esperando vira "pendente"; o resto vira "fechado" (arquivo). Mensagens novas
 *   reaproveitam o ticket aberto/pendente (continuidade).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { instanceFindChats, instanceFindMessages, type UazapiMensagem } from "@/lib/uazapi/client";

export interface ImportMsgResumo {
  chats_processados: number;
  mensagens_novas: number;
  mensagens_existentes: number;
  tickets_criados: number;
  duracao_ms: number;
  erros: string[];
}

function tipoDeMensagem(m: UazapiMensagem): "texto" | "imagem" | "audio" | "video" | "documento" {
  const t = (m.messageType || "").toLowerCase();
  if (t.includes("image")) return "imagem";
  if (t.includes("audio") || t.includes("ptt")) return "audio";
  if (t.includes("video")) return "video";
  if (t.includes("document")) return "documento";
  return "texto";
}

export async function importarMensagensUazapi(params: {
  sb: SupabaseClient;
  agenciaId: string;
  canalId: string;
  canalFilaPadrao?: string | null;
  baseUrl: string;
  token: string;
  maxChats?: number;     // default 150
  porChat?: number;      // default 20
}): Promise<ImportMsgResumo> {
  const inicio = Date.now();
  const sb = params.sb;
  const maxChats = params.maxChats ?? 150;
  const porChat = params.porChat ?? 20;
  const resumo: ImportMsgResumo = {
    chats_processados: 0, mensagens_novas: 0, mensagens_existentes: 0,
    tickets_criados: 0, duracao_ms: 0, erros: [],
  };

  // 1. Chats recentes não-grupo (1 página) ordenados por última msg
  let chats;
  try {
    const r = await instanceFindChats({ baseUrl: params.baseUrl, token: params.token }, { limit: 1000 });
    chats = r.chats
      // Individuais: @s.whatsapp.net (telefone) E @lid (novo id do WhatsApp).
      // Antes só pegava @s.whatsapp.net → descartava ~90% dos chats (que hoje
      // vêm como @lid), por isso o histórico não importava. Grupos saem por wa_isGroup.
      .filter((c) => !c.wa_isGroup && /@(s\.whatsapp\.net|lid)$/.test(c.wa_chatid))
      .sort((a, b) => (b.wa_lastMsgTimestamp || 0) - (a.wa_lastMsgTimestamp || 0))
      .slice(0, maxChats);
  } catch (e) {
    resumo.erros.push(`chats: ${e instanceof Error ? e.message : String(e)}`);
    resumo.duracao_ms = Date.now() - inicio;
    return resumo;
  }

  const seteDiasMs = 7 * 24 * 60 * 60 * 1000;
  const agora = Date.now();

  for (const chat of chats) {
    resumo.chats_processados++;
    const waId = chat.wa_chatid;
    // @lid não expõe telefone real (privacidade) → null (não número falso, não "").
    const whatsapp = waId.endsWith("@lid") ? null : waId.replace(/@.+$/, "");

    // contato (reusa por wa_id, senão cria)
    let contatoId: string;
    const { data: existente } = await sb.from("contatos").select("id").eq("agencia_id", params.agenciaId).eq("wa_id", waId).is("deleted_at", null).maybeSingle();
    if (existente) contatoId = existente.id;
    else {
      const fallbackNome = whatsapp || waId.replace(/@.+$/, "");
      const nome = (chat.lead_fullName || chat.lead_name || chat.wa_contactName || chat.name || fallbackNome).trim() || fallbackNome;
      const { data: novo, error } = await sb.from("contatos").insert({ agencia_id: params.agenciaId, wa_id: waId, whatsapp, nome, primeiro_nome: nome.split(" ")[0] || null, foto_url: chat.image || null }).select("id").single();
      if (error || !novo) { resumo.erros.push(`contato ${waId}: ${error?.message}`); continue; }
      contatoId = novo.id;
    }

    // mensagens do chat (newest-first) → ordena ASC pra inserir cronológico
    let msgs: UazapiMensagem[];
    try {
      const r = await instanceFindMessages({ baseUrl: params.baseUrl, token: params.token }, { chatid: waId, limit: porChat });
      msgs = r.messages.slice().sort((a, b) => (a.messageTimestamp || 0) - (b.messageTimestamp || 0));
    } catch (e) {
      resumo.erros.push(`msgs ${whatsapp}: ${e instanceof Error ? e.message : String(e)}`);
      continue;
    }
    if (!msgs.length) continue;

    // ticket: reusa o mais recente do contato; senão cria
    let ticketId: string;
    const { data: tk } = await sb.from("tickets").select("id, canal_id").eq("agencia_id", params.agenciaId).eq("contato_id", contatoId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (tk) {
      ticketId = tk.id;
      if (tk.canal_id !== params.canalId) await sb.from("tickets").update({ canal_id: params.canalId }).eq("id", ticketId);
    } else {
      const ultima = msgs[msgs.length - 1];
      const clienteEsperando = !ultima.fromMe && (agora - (ultima.messageTimestamp || 0)) < seteDiasMs;
      const { data: novoTk, error } = await sb.from("tickets").insert({
        agencia_id: params.agenciaId, contato_id: contatoId, canal_id: params.canalId,
        fila_id: params.canalFilaPadrao ?? null,
        status: clienteEsperando ? "pendente" : "fechado",
      }).select("id").single();
      if (error || !novoTk) { resumo.erros.push(`ticket ${whatsapp}: ${error?.message}`); continue; }
      ticketId = novoTk.id;
      resumo.tickets_criados++;
    }

    // dedup por wa_message_id
    const ids = msgs.map((m) => m.messageid).filter(Boolean);
    const jaExiste = new Set<string>();
    if (ids.length) {
      const { data: existentes } = await sb.from("mensagens").select("wa_message_id").eq("agencia_id", params.agenciaId).in("wa_message_id", ids);
      for (const e of (existentes || []) as Array<{ wa_message_id: string }>) jaExiste.add(e.wa_message_id);
    }

    const novas = msgs
      .filter((m) => m.messageid && !jaExiste.has(m.messageid))
      .map((m) => {
        const tipo = tipoDeMensagem(m);
        const texto = m.text || m.content?.text || (tipo !== "texto" ? `[${tipo}]` : "");
        return {
          ticket_id: ticketId,
          agencia_id: params.agenciaId,
          autor: m.fromMe ? "atendente" : "cliente",
          tipo,
          conteudo: texto,
          wa_message_id: m.messageid,
          status: "entregue",
          created_at: new Date(m.messageTimestamp || agora).toISOString(),
          midia_url: m.fileURL || null,
          metadata: { source: "import_uazapi" },
        };
      });

    resumo.mensagens_existentes += msgs.length - novas.length;
    for (let i = 0; i < novas.length; i += 100) {
      const slice = novas.slice(i, i + 100);
      const { error } = await sb.from("mensagens").insert(slice);
      if (error) { resumo.erros.push(`insert msgs ${whatsapp}: ${error.message}`); continue; }
      resumo.mensagens_novas += slice.length;
    }

    // atualiza preview/última msg do ticket
    const ult = msgs[msgs.length - 1];
    await sb.from("tickets").update({
      ultima_mensagem_em: new Date(ult.messageTimestamp || agora).toISOString(),
      ultima_mensagem_preview: (ult.text || ult.content?.text || `[${tipoDeMensagem(ult)}]`).slice(0, 120),
    }).eq("id", ticketId);
  }

  resumo.duracao_ms = Date.now() - inicio;
  return resumo;
}
