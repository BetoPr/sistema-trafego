/**
 * Ingest de mensagens do UAZAPI → Sistema.
 *
 * Fluxo:
 *  1. Webhook UAZAPI cai em /api/webhooks/uazapi/[secret]
 *  2. Identifica canal pelo secret
 *  3. Parser extrai evento
 *  4. Esta função: localiza/cria contato → localiza/cria ticket → insere mensagem
 *  5. Se áudio: dispara transcrição em background
 *  6. Dispara webhook OUT mensagem.recebida
 *
 * Service role apenas. RLS bypassed.
 */
import { createServiceClient } from "@/lib/supabase/service";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ParsedMessage } from "@/lib/uazapi/webhook-parser";
import { dispatchWebhook } from "./webhook-dispatcher";
import { inscreverPorEtiqueta } from "./follow-up";
import { instanceSendText } from "@/lib/uazapi/client";
import { decryptToken, byteaToBuffer } from "@/lib/crypto/tokens";

async function enviarRespostaEtiqueta(params: { sb: SupabaseClient; canalId: string; ticketId: string; agenciaId: string; texto: string }): Promise<void> {
  const { sb, canalId, ticketId, agenciaId, texto } = params;
  const { data: canal } = await sb
    .from("canais")
    .select("instance_token_encrypted, servidor:super_admin_servidores(base_url)")
    .eq("id", canalId)
    .maybeSingle();
  if (!canal?.instance_token_encrypted) return;
  const baseUrl = (canal as unknown as { servidor: { base_url: string } }).servidor?.base_url;
  if (!baseUrl) return;
  const token = decryptToken(byteaToBuffer(canal.instance_token_encrypted));

  const { data: ticket } = await sb.from("tickets").select("contato:contatos(whatsapp)").eq("id", ticketId).maybeSingle();
  const contato = (ticket?.contato as { whatsapp?: string } | { whatsapp?: string }[] | null);
  const contatoObj = Array.isArray(contato) ? contato[0] : contato;
  const numero = contatoObj?.whatsapp;
  if (!numero) return;

  const r = await instanceSendText({ baseUrl, token }, { number: numero, text: texto });
  // Insere mensagem no histórico (como sistema/automação)
  await sb.from("mensagens").insert({
    ticket_id: ticketId,
    agencia_id: agenciaId,
    autor: "bot",
    tipo: "texto",
    conteudo: texto,
    wa_message_id: (r as { id?: string })?.id || null,
    status: "enviada",
    metadata: { source: "etiqueta_resposta_auto" },
  });
}

export interface IngestContext {
  agenciaId: string;
  canalId: string;
  canalFilaPadrao: string | null;
  canalUsuarioPadrao: string | null;
}

export interface IngestResult {
  ticketId: string;
  ticketNumero: number;
  mensagemId: string;
  contatoId: string;
  novoContato: boolean;
  novoTicket: boolean;
}

function normalizeWaToWhatsapp(waChatId: string): string {
  // "5511999999999@s.whatsapp.net" → "5511999999999"
  return waChatId.replace(/@.+$/, "");
}

export async function ingestMensagem(
  ctx: IngestContext,
  m: ParsedMessage,
): Promise<IngestResult> {
  const sb = createServiceClient();
  const whatsapp = normalizeWaToWhatsapp(m.waChatId);

  // 1. Localiza ou cria contato.
  let novoContato = false;
  const { data: contatoExistente } = await sb
    .from("contatos")
    .select("id")
    .eq("agencia_id", ctx.agenciaId)
    .eq("wa_id", m.waChatId)
    .is("deleted_at", null)
    .maybeSingle();

  let contatoId: string;
  if (contatoExistente) {
    contatoId = contatoExistente.id;
  } else {
    novoContato = true;
    const { data: novo, error } = await sb
      .from("contatos")
      .insert({
        agencia_id: ctx.agenciaId,
        wa_id: m.waChatId,
        whatsapp,
        nome: m.pushName || whatsapp,
        primeiro_nome: m.pushName?.split(" ")[0] || null,
      })
      .select("id")
      .single();
    if (error) throw error;
    contatoId = novo.id;
  }

  // 2. Localiza ticket aberto/pendente OU cria novo.
  let novoTicket = false;
  const { data: ticketExistente } = await sb
    .from("tickets")
    .select("id, numero, status")
    .eq("agencia_id", ctx.agenciaId)
    .eq("contato_id", contatoId)
    .in("status", ["aberto", "pendente"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let ticketId: string;
  let ticketNumero: number;

  if (ticketExistente) {
    ticketId = ticketExistente.id;
    ticketNumero = ticketExistente.numero;
  } else {
    novoTicket = true;
    const status = m.fromMe ? "aberto" : "pendente";
    const { data: novo, error } = await sb
      .from("tickets")
      .insert({
        agencia_id: ctx.agenciaId,
        contato_id: contatoId,
        canal_id: ctx.canalId,
        fila_id: ctx.canalFilaPadrao,
        usuario_id: m.fromMe ? ctx.canalUsuarioPadrao : null,
        status,
      })
      .select("id, numero")
      .single();
    if (error) throw error;
    ticketId = novo.id;
    ticketNumero = novo.numero;
  }

  // 3. Insere mensagem.
  const autor = m.fromMe ? "atendente" : "cliente";
  const { data: msgRow, error: msgErr } = await sb
    .from("mensagens")
    .insert({
      ticket_id: ticketId,
      agencia_id: ctx.agenciaId,
      autor,
      tipo: m.tipo,
      conteudo: m.conteudo,
      midia_url: m.midia?.url ?? null,
      midia_mime: m.midia?.mimeType ?? null,
      midia_filename: m.midia?.filename ?? null,
      wa_message_id: m.waMessageId,
      status: "entregue",
      metadata: {
        source: "uazapi",
        raw_keys: Object.keys(m.raw),
        ...(m.adReferral ? { ad_referral: m.adReferral } : {}),
      },
    })
    .select("id")
    .single();
  if (msgErr) throw msgErr;

  // 3b. Etiquetas por palavra-chave gatilho — só em mensagem recebida do cliente.
  // Se a palavra configurada aparece no texto, aplica a etiqueta no contato.
  // Quando aplica pela 1ª vez E a etiqueta tem mensagem_resposta, dispara
  // a resposta automática via UAZAPI.
  if (autor === "cliente" && m.conteudo) {
    void (async () => {
      try {
        const texto = m.conteudo!.toLowerCase();
        const { data: gatilhos } = await sb
          .from("etiquetas")
          .select("id, palavra_gatilho, mensagem_resposta")
          .eq("agencia_id", ctx.agenciaId)
          .eq("ativo", true)
          .not("palavra_gatilho", "is", null);
        for (const g of gatilhos || []) {
          // palavra_gatilho pode ter várias palavras separadas por vírgula — qualquer uma dispara
          const palavras = ((g.palavra_gatilho as string | null) || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
          if (palavras.some((p) => texto.includes(p))) {
            // Unique (contato_id, etiqueta_id) faz o insert duplicado falhar em silêncio.
            const { error: insErr } = await sb.from("contato_etiquetas").insert({ contato_id: contatoId, etiqueta_id: g.id });
            // 3B — etiqueta-gatilho: só inscreve se a etiqueta é NOVA (sem erro de duplicado)
            if (!insErr) {
              try { await inscreverPorEtiqueta({ agenciaId: ctx.agenciaId, contatoId, etiquetaId: g.id, ticketId }); } catch {}

              // Resposta automática (se configurada) — só na 1ª aplicação
              const resp = (g.mensagem_resposta as string | null)?.trim();
              if (resp) {
                try { await enviarRespostaEtiqueta({ sb, canalId: ctx.canalId, ticketId, agenciaId: ctx.agenciaId, texto: resp }); } catch (e) { console.error("[ingest] resposta etiqueta falhou:", e); }
              }
            }
          }
        }
      } catch {}
    })();
  }

  // 4. Disparos pós (não bloqueia).
  if (autor === "cliente") {
    void dispatchWebhook({
      agenciaId: ctx.agenciaId,
      evento: "mensagem.recebida",
      payload: {
        ticket_id: ticketId,
        ticket_numero: ticketNumero,
        contato_id: contatoId,
        mensagem_id: msgRow.id,
        tipo: m.tipo,
        conteudo: m.conteudo,
        midia_url: m.midia?.url,
      },
    });
  }

  if (novoTicket) {
    void dispatchWebhook({
      agenciaId: ctx.agenciaId,
      evento: "ticket.criado",
      payload: {
        ticket_id: ticketId,
        ticket_numero: ticketNumero,
        contato_id: contatoId,
      },
    });
  }

  if (novoContato) {
    void dispatchWebhook({
      agenciaId: ctx.agenciaId,
      evento: "contato.criado",
      payload: { contato_id: contatoId, whatsapp, nome: m.pushName || whatsapp },
    });
  }

  return {
    ticketId,
    ticketNumero,
    mensagemId: msgRow.id,
    contatoId,
    novoContato,
    novoTicket,
  };
}
