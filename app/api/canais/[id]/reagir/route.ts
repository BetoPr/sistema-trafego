/**
 * POST /api/canais/[id]/reagir
 * Body: { mensagemId, emoji } — emoji "" remove a reação
 * Reage com emoji numa mensagem via UAZAPI /message/react e salva
 * em mensagens.metadata.reacoes (key = nome do atendente, value = emoji).
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { decryptToken, byteaToBuffer } from "@/lib/crypto/tokens";
import { instanceReactMessage } from "@/lib/uazapi/client";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: canalId } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "auth" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { mensagemId?: string; emoji?: string } | null;
  if (!body?.mensagemId) return NextResponse.json({ error: "mensagemId_obrigatorio" }, { status: 400 });

  const sb = createServiceClient();
  const { data: u } = await sb.from("usuarios").select("agencia_id, nome").eq("id", auth.user.id).single();
  if (!u) return NextResponse.json({ error: "no_user" }, { status: 403 });

  // Pega mensagem + ticket + contato (whatsapp) + canal info numa query só
  const { data: msg } = await sb
    .from("mensagens")
    .select("id, wa_message_id, metadata, ticket:tickets(canal_id, contato:contatos(whatsapp))")
    .eq("id", body.mensagemId)
    .eq("agencia_id", u.agencia_id)
    .maybeSingle();
  if (!msg || !msg.wa_message_id) return NextResponse.json({ error: "mensagem_nao_encontrada" }, { status: 404 });

  const ticket = Array.isArray(msg.ticket) ? msg.ticket[0] : msg.ticket;
  if ((ticket as { canal_id?: string })?.canal_id !== canalId) {
    return NextResponse.json({ error: "canal_nao_bate" }, { status: 400 });
  }
  const contato = (ticket as { contato?: { whatsapp?: string } | { whatsapp?: string }[] })?.contato;
  const contatoObj = Array.isArray(contato) ? contato[0] : contato;
  const numero = contatoObj?.whatsapp;
  if (!numero) return NextResponse.json({ error: "sem_numero" }, { status: 400 });

  const { data: canal } = await sb
    .from("canais")
    .select("instance_token_encrypted, servidor:super_admin_servidores(base_url)")
    .eq("id", canalId)
    .eq("agencia_id", u.agencia_id)
    .maybeSingle();
  if (!canal?.instance_token_encrypted) return NextResponse.json({ error: "canal_invalido" }, { status: 404 });

  const baseUrl = (canal as unknown as { servidor: { base_url: string } }).servidor?.base_url;
  if (!baseUrl) return NextResponse.json({ error: "servidor_sem_url" }, { status: 500 });

  let token: string;
  try {
    token = decryptToken(byteaToBuffer(canal.instance_token_encrypted));
  } catch {
    return NextResponse.json({ error: "token_corrompido" }, { status: 500 });
  }

  const emoji = String(body.emoji || "");
  try {
    await instanceReactMessage({ baseUrl, token }, { number: numero, id: msg.wa_message_id, text: emoji });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "uazapi_falhou" }, { status: 500 });
  }

  // Salva no metadata: { reacoes: { [nome_atendente]: emoji } }
  const meta = ((msg.metadata as Record<string, unknown> | null) || {}) as Record<string, unknown>;
  const reacoes = (meta.reacoes as Record<string, string> | undefined) || {};
  const chave = u.nome || "atendente";
  if (emoji) reacoes[chave] = emoji;
  else delete reacoes[chave];
  meta.reacoes = reacoes;
  await sb.from("mensagens").update({ metadata: meta }).eq("id", msg.id);

  return NextResponse.json({ ok: true });
}
