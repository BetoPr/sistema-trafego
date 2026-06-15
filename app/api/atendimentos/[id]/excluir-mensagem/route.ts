/**
 * POST /api/atendimentos/[id]/excluir-mensagem
 * Body: { mensagemId: string, paraTodos: boolean }
 *
 * Marca mensagem como deletada no CRM. Se `paraTodos=true` E é mensagem do
 * atendente (saiu daqui) → chama UAZAPI /message/delete pra apagar do WhatsApp.
 * Pra mensagens do cliente, só permite paraTodos=false (não dá pra apagar
 * mensagem alheia no WhatsApp).
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { decryptToken, byteaToBuffer } from "@/lib/crypto/tokens";
import { instanceDeleteMessage } from "@/lib/uazapi/client";
import { audit } from "@/lib/crm/audit";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: ticketId } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "auth" }, { status: 401 });

  const sb = createServiceClient();
  const { data: u } = await sb.from("usuarios").select("agencia_id").eq("id", auth.user.id).single();
  if (!u) return NextResponse.json({ error: "no_user" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as { mensagemId?: string; paraTodos?: boolean } | null;
  if (!body?.mensagemId) return NextResponse.json({ error: "mensagemId_obrigatorio" }, { status: 400 });

  // Confere ticket + agência
  const { data: ticket } = await sb
    .from("tickets")
    .select("id, agencia_id, canal_id, contato:contatos(wa_id, whatsapp)")
    .eq("id", ticketId)
    .maybeSingle();
  if (!ticket || ticket.agencia_id !== u.agencia_id) {
    return NextResponse.json({ error: "ticket_invalido" }, { status: 404 });
  }

  // Confere mensagem
  const { data: msg } = await sb
    .from("mensagens")
    .select("id, ticket_id, autor, wa_message_id, deleted_em")
    .eq("id", body.mensagemId)
    .maybeSingle();
  if (!msg || msg.ticket_id !== ticketId) {
    return NextResponse.json({ error: "mensagem_nao_encontrada" }, { status: 404 });
  }
  if (msg.deleted_em) {
    return NextResponse.json({ error: "ja_excluida" }, { status: 400 });
  }

  const paraTodos = !!body.paraTodos;

  // Pra apagar pra todos, só funciona se é msg do atendente (a gente enviou)
  if (paraTodos && msg.autor === "cliente") {
    return NextResponse.json({ error: "nao_pode_apagar_msg_cliente_pra_todos" }, { status: 400 });
  }

  if (paraTodos && msg.wa_message_id) {
    // Tenta apagar via UAZAPI (regra do WhatsApp: ~15min após envio)
    const { data: canal } = await sb
      .from("canais")
      .select("status, instance_token_encrypted, servidor:super_admin_servidores(base_url)")
      .eq("id", ticket.canal_id)
      .maybeSingle();
    if (canal && canal.status === "connected" && canal.instance_token_encrypted) {
      try {
        const servidor = (canal as unknown as { servidor: { base_url: string } | { base_url: string }[] }).servidor;
        const baseUrl = (Array.isArray(servidor) ? servidor[0] : servidor).base_url;
        const token = decryptToken(byteaToBuffer(canal.instance_token_encrypted as Parameters<typeof byteaToBuffer>[0]));
        const contato = Array.isArray(ticket.contato) ? ticket.contato[0] : ticket.contato;
        const waId = (contato as { wa_id?: string; whatsapp?: string } | null)?.wa_id || (contato as { wa_id?: string; whatsapp?: string } | null)?.whatsapp;
        if (waId) {
          await instanceDeleteMessage({ baseUrl, token }, { number: waId, id: msg.wa_message_id, forEveryone: true });
        }
      } catch (e) {
        // Se falhar, ainda marca como excluída no CRM, mas registra erro
        await sb.from("mensagens").update({
          deleted_em: new Date().toISOString(),
          deleted_pra_todos: true,
        }).eq("id", body.mensagemId);
        return NextResponse.json({
          ok: true,
          warning: "Marcada como excluída no CRM, mas WhatsApp recusou (provável: mais de 15 min).",
          erro_uazapi: e instanceof Error ? e.message : String(e),
        });
      }
    }
  }

  await sb.from("mensagens").update({
    deleted_em: new Date().toISOString(),
    deleted_pra_todos: paraTodos,
  }).eq("id", body.mensagemId);

  void audit({
    agenciaId: u.agencia_id,
    usuarioId: auth.user.id,
    acao: "delete",
    entidade: "mensagem",
    entidadeId: body.mensagemId,
    payload: { paraTodos, autor: msg.autor },
  });

  return NextResponse.json({ ok: true });
}
