/**
 * Webhook receiver UAZAPI.
 *
 * URL: /api/webhooks/uazapi/{secret}
 * - secret é único por canal (column canais.webhook_secret)
 * - identifica canal+agência sem precisar de auth header
 *
 * Body: ver lib/uazapi/webhook-parser.ts
 *
 * Pipeline:
 *  1. Valida secret → resolve canal
 *  2. Parser detecta tipo de evento
 *  3. Se messages: ingestMensagem (cria contato/ticket/msg)
 *  4. Se áudio: dispara transcrição em background
 *  5. Se connection: atualiza status do canal
 */
import { NextResponse, after } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  detectEventType,
  parseMessage,
  parseConnection,
  type UazapiWebhookPayload,
} from "@/lib/uazapi/webhook-parser";
import { ingestMensagem } from "@/lib/crm/ingest";
import { audit, getIp } from "@/lib/crm/audit";
import { instanceGetNameAndImage } from "@/lib/uazapi/client";
import { decryptToken, byteaToBuffer } from "@/lib/crypto/tokens";
import { baixarEUploadMidia } from "@/lib/crm/midia-download";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ secret: string }> },
) {
  const { secret } = await params;
  const sb = createServiceClient();

  const { data: canal } = await sb
    .from("canais")
    .select("id, agencia_id, fila_id, usuario_id, instance_id, instance_token_encrypted, servidor:super_admin_servidores(base_url)")
    .eq("webhook_secret", secret)
    .maybeSingle();

  if (!canal) {
    return NextResponse.json({ error: "secret_invalido" }, { status: 404 });
  }

  let payload: UazapiWebhookPayload;
  try {
    payload = (await req.json()) as UazapiWebhookPayload;
  } catch {
    return NextResponse.json({ error: "json_invalido" }, { status: 400 });
  }

  const evento = detectEventType(payload);

  // Audit log básico (não bloqueia)
  void audit({
    agenciaId: canal.agencia_id,
    acao: "uazapi_webhook",
    entidade: "uazapi-webhook",
    entidadeId: canal.instance_id || canal.id,
    metodo: "POST",
    caminho: `/api/webhooks/uazapi/${secret.slice(0, 8)}…`,
    status: 200,
    ip: getIp(req.headers) || undefined,
    userAgent: req.headers.get("user-agent") || undefined,
    payload: { evento },
  });

  try {
    if (evento === "messages") {
      const parsed = parseMessage(payload);
      if (!parsed) return NextResponse.json({ ok: true, skipped: "sem_mensagem" });
      if (parsed.isGroup) return NextResponse.json({ ok: true, skipped: "grupo" });

      // Reaction: NÃO cria nova mensagem — atualiza metadata.reacoes da mensagem alvo
      if (parsed.reaction) {
        const { data: alvo } = await sb
          .from("mensagens")
          .select("id, metadata")
          .eq("agencia_id", canal.agencia_id)
          .eq("wa_message_id", parsed.reaction.targetWaMessageId)
          .maybeSingle();
        if (alvo) {
          const meta = ((alvo.metadata as Record<string, unknown> | null) || {}) as Record<string, unknown>;
          const reacoes = (meta.reacoes as Record<string, string> | undefined) || {};
          const chave = parsed.pushName || "Cliente";
          const emoji = parsed.reaction.emoji;
          if (emoji) reacoes[chave] = emoji;
          else delete reacoes[chave];
          meta.reacoes = reacoes;
          await sb.from("mensagens").update({ metadata: meta }).eq("id", alvo.id);
        }
        return NextResponse.json({ ok: true, reaction: true, targetEncontrado: !!alvo });
      }

      // Cliente apagou ou editou uma mensagem — atualiza alvo, não cria nova
      if (parsed.protocol) {
        const { data: alvo } = await sb
          .from("mensagens")
          .select("id, conteudo")
          .eq("agencia_id", canal.agencia_id)
          .eq("wa_message_id", parsed.protocol.targetWaMessageId)
          .maybeSingle();
        if (alvo) {
          if (parsed.protocol.kind === "delete") {
            await sb.from("mensagens").update({
              deleted_em: new Date().toISOString(),
              deleted_pra_todos: true,
            }).eq("id", alvo.id);
          } else {
            // edit: guarda conteúdo anterior + atualiza pro novo
            await sb.from("mensagens").update({
              edited_em: new Date().toISOString(),
              edited_de_conteudo: alvo.conteudo,
              conteudo: parsed.protocol.novoConteudo ?? alvo.conteudo,
            }).eq("id", alvo.id);
          }
        }
        return NextResponse.json({ ok: true, protocol: parsed.protocol.kind, targetEncontrado: !!alvo });
      }

      const ingest = await ingestMensagem(
        {
          agenciaId: canal.agencia_id,
          canalId: canal.id,
          canalFilaPadrao: canal.fila_id,
          canalUsuarioPadrao: canal.usuario_id,
        },
        parsed,
      );

      // Foto de perfil do contato: busca na 1ª mensagem (URL pps temporária do WhatsApp).
      // Também roda pra contato existente sem foto_url (backfill incremental).
      {
        let precisaBuscarFoto = ingest.novoContato;
        if (!precisaBuscarFoto) {
          const { data: c } = await sb.from("contatos").select("foto_url").eq("id", ingest.contatoId).maybeSingle();
          if (!c?.foto_url) precisaBuscarFoto = true;
        }
        if (precisaBuscarFoto) {
          void (async () => {
            try {
              const baseUrl = (canal as unknown as { servidor: { base_url: string } }).servidor.base_url;
              const token = decryptToken(byteaToBuffer(canal.instance_token_encrypted));
              const numero = parsed.waChatId.replace(/@.+$/, "");
              const ni = await instanceGetNameAndImage({ baseUrl, token }, numero);
              if (ni.image) {
                await sb.from("contatos").update({ foto_url: ni.image }).eq("id", ingest.contatoId);
              }
            } catch (e) {
              console.error("[webhook uazapi] foto contato falhou:", e);
            }
          })();
        }
      }

      // Mídia: 1ª tentativa de download em background. Falhas ficam pra
      // /api/cron/midia-retry tentar de novo (5min, 30min) e/ou retry manual no chat.
      const ehMidia = ["audio", "imagem", "video", "documento", "sticker"].includes(parsed.tipo);
      if (ehMidia) {
        void (async () => {
          try {
            const baseUrl = (canal as unknown as { servidor: { base_url: string } }).servidor.base_url;
            const token = decryptToken(byteaToBuffer(canal.instance_token_encrypted));
            await baixarEUploadMidia(
              {
                sb,
                mensagemId: ingest.mensagemId,
                agenciaId: canal.agencia_id,
                ticketId: ingest.ticketId,
                tipo: parsed.tipo,
                waMessageId: parsed.waMessageId,
                canalId: canal.id,
                transcreverSeCliente: !parsed.fromMe,
              },
              { baseUrl, token },
            );
          } catch (e) {
            console.error("[webhook uazapi] baixar mídia:", e);
          }
        })();
      }

      // Hook IA Atendimento: msg do cliente vai pro buffer + processa inline via after()
      // (zero cold-start adicional, sem chamar outro endpoint)
      if (!parsed.fromMe && !parsed.isGroup) {
        after(async () => {
          try {
            const { adicionarAoBuffer, processarTicket } = await import("@/lib/ia-atendimento/executor");
            const r = await adicionarAoBuffer({
              ticketId: ingest.ticketId,
              agenciaId: canal.agencia_id,
              canalId: canal.id,
              contatoId: ingest.contatoId,
              conteudo: parsed.conteudo || parsed.midia?.caption || `[${parsed.tipo}]`,
              tipo: parsed.tipo,
            });
            if (r.ok && r.debounceMs !== undefined) {
              await processarTicket(ingest.ticketId, r.debounceMs);
            }
          } catch (e) {
            console.error("[webhook uazapi] IA after() falhou:", e);
          }
        });
      }

      return NextResponse.json({
        ok: true,
        ticket: ingest.ticketNumero,
        novoTicket: ingest.novoTicket,
        novoContato: ingest.novoContato,
      });
    }

    if (evento === "messages_update") {
      // Update de status (enviada → entregue → lida) ou edição.
      // UAZAPI envia { message: { id, ack?, status? } }
      // ack: 0 pendente, 1 enviada, 2 entregue, 3 lida, 4 falha
      const msg = payload.message as Record<string, unknown> | undefined;
      const waId = msg?.id || msg?.messageid || msg?.key_id;
      if (!waId) return NextResponse.json({ ok: true, skipped: "sem_id" });

      const ack = Number(msg?.ack ?? msg?.status ?? -1);
      let novoStatus: string | null = null;
      if (ack === 0) novoStatus = "pendente";
      else if (ack === 1) novoStatus = "enviada";
      else if (ack === 2) novoStatus = "entregue";
      else if (ack === 3) novoStatus = "lida";
      else if (ack === 4) novoStatus = "falha";
      else {
        const s = String(msg?.status || "").toLowerCase();
        if (s.includes("read")) novoStatus = "lida";
        else if (s.includes("deliver")) novoStatus = "entregue";
        else if (s.includes("sent")) novoStatus = "enviada";
        else if (s.includes("fail") || s.includes("error")) novoStatus = "falha";
      }

      if (novoStatus) {
        await sb
          .from("mensagens")
          .update({ status: novoStatus })
          .eq("agencia_id", canal.agencia_id)
          .eq("wa_message_id", String(waId));
      }
      return NextResponse.json({ ok: true, status: novoStatus });
    }

    if (evento === "connection") {
      const conn = parseConnection(payload);
      const update: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (conn.status === "connected") {
        update.status = "connected";
        update.qr_code_atual = null;
        // Só grava se vierem preenchidos — logo após parear a API ainda manda
        // vazio e apagava nome/foto já salvos
        if (conn.number) update.numero_conectado = conn.number;
        if (conn.profileName) update.nome_perfil = conn.profileName;
        if (conn.profilePicUrl) update.foto_perfil_url = conn.profilePicUrl;
      } else if (conn.status === "disconnected") {
        update.status = "disconnected";
      } else if (conn.status === "qr") {
        update.status = "pending_qr";
        if (conn.qrcode) update.qr_code_atual = conn.qrcode;
        update.qr_atualizado_em = new Date().toISOString();
      }
      await sb.from("canais").update(update).eq("id", canal.id);
      return NextResponse.json({ ok: true, status: conn.status });
    }

    // Outros eventos: log silencioso.
    return NextResponse.json({ ok: true, skipped: evento });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[webhook uazapi] erro:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, hint: "POST only" });
}
