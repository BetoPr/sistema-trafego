/**
 * POST /api/canais/[id]/send
 * Body: { ticketId: string, text: string }
 * Envia mensagem via UAZAPI + persiste em mensagens.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { decryptToken, byteaToBuffer } from "@/lib/crypto/tokens";
import { instanceSendText } from "@/lib/uazapi/client";
import { audit, getIp } from "@/lib/crm/audit";
import { dispatchWebhook } from "@/lib/crm/webhook-dispatcher";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: canalId } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "auth" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { ticketId?: string; text?: string } | null;
  if (!body?.ticketId || !body.text) return NextResponse.json({ error: "body_invalido" }, { status: 400 });

  const sb = createServiceClient();
  const { data: u } = await sb.from("usuarios").select("agencia_id, nome").eq("id", auth.user.id).single();
  if (!u) return NextResponse.json({ error: "usuario_nao_encontrado" }, { status: 403 });

  const { data: canal } = await sb
    .from("canais")
    .select("id, agencia_id, instance_token_encrypted, status, servidor:super_admin_servidores(base_url)")
    .eq("id", canalId)
    .eq("agencia_id", u.agencia_id)
    .single();
  if (!canal) return NextResponse.json({ error: "canal_nao_encontrado" }, { status: 404 });
  if (canal.status !== "connected") return NextResponse.json({ error: "canal_desconectado" }, { status: 409 });

  const { data: ticket } = await sb
    .from("tickets")
    .select("id, agencia_id, contato:contatos(wa_id, whatsapp)")
    .eq("id", body.ticketId)
    .eq("agencia_id", u.agencia_id)
    .single();
  if (!ticket) return NextResponse.json({ error: "ticket_nao_encontrado" }, { status: 404 });

  const waId = (ticket.contato as unknown as { wa_id?: string; whatsapp?: string } | null)?.wa_id
    || (ticket.contato as unknown as { whatsapp?: string } | null)?.whatsapp;
  if (!waId) return NextResponse.json({ error: "contato_sem_whatsapp" }, { status: 400 });

  const baseUrl = (canal as unknown as { servidor: { base_url: string } }).servidor.base_url;
  const token = decryptToken(byteaToBuffer(canal.instance_token_encrypted));

  let wamid: string | undefined;
  try {
    const r = await instanceSendText({ baseUrl, token }, { number: waId, text: body.text });
    wamid = r.id;
  } catch (e) {
    return NextResponse.json({ error: "uazapi_send", msg: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }

  const { data: msgRow, error } = await sb
    .from("mensagens")
    .insert({
      ticket_id: ticket.id,
      agencia_id: u.agencia_id,
      autor: "atendente",
      usuario_id: auth.user.id,
      tipo: "texto",
      conteudo: body.text,
      wa_message_id: wamid || null,
      status: "enviada",
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: "db", msg: error.message }, { status: 500 });

  // Promove pendente → aberto na primeira resposta.
  await sb
    .from("tickets")
    .update({
      status: "aberto",
      usuario_id: auth.user.id,
      primeira_resposta_em: new Date().toISOString(),
    })
    .eq("id", ticket.id)
    .is("primeira_resposta_em", null);

  void audit({
    agenciaId: u.agencia_id,
    usuarioId: auth.user.id,
    acao: "send_message",
    entidade: "mensagem",
    entidadeId: msgRow.id,
    metodo: "POST",
    caminho: `/api/canais/${canalId}/send`,
    status: 200,
    ip: getIp(req.headers) || undefined,
  });

  void dispatchWebhook({
    agenciaId: u.agencia_id,
    evento: "mensagem.enviada",
    payload: { ticket_id: ticket.id, mensagem_id: msgRow.id, conteudo: body.text },
  });

  return NextResponse.json({ ok: true, mensagemId: msgRow.id });
}
