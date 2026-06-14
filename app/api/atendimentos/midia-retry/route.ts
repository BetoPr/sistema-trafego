/**
 * POST /api/atendimentos/midia-retry
 * Body: { mensagemId }
 * Tenta re-baixar mídia de UMA mensagem (acionado pelo botão no chat).
 * Sem limite — incrementa contador, mas usuário pode forçar quantas vezes quiser.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { baixarEUploadMidia } from "@/lib/crm/midia-download";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "auth" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { mensagemId?: string; forcar?: boolean } | null;
  if (!body?.mensagemId) return NextResponse.json({ error: "body_invalido" }, { status: 400 });

  const sb = createServiceClient();
  const { data: u } = await sb.from("usuarios").select("agencia_id").eq("id", auth.user.id).single();
  if (!u) return NextResponse.json({ error: "no_user" }, { status: 403 });

  const { data: m } = await sb
    .from("mensagens")
    .select("id, agencia_id, ticket_id, tipo, wa_message_id, ticket:tickets(canal_id, agencia_id)")
    .eq("id", body.mensagemId)
    .maybeSingle();
  if (!m || m.agencia_id !== u.agencia_id) return NextResponse.json({ error: "nao_encontrado" }, { status: 404 });

  // forcar=true → zera a URL atual antes de re-baixar (usado quando imagem
  // tá corrompida no ImgBB e precisa puxar de novo da UAZAPI)
  if (body.forcar) {
    await sb.from("mensagens").update({ midia_url: null, midia_mime: null, midia_filename: null }).eq("id", m.id);
  }
  const ticket = Array.isArray(m.ticket) ? m.ticket[0] : m.ticket;
  const canalId = (ticket as { canal_id?: string })?.canal_id;
  if (!canalId) return NextResponse.json({ error: "ticket_sem_canal" }, { status: 400 });

  const r = await baixarEUploadMidia({
    sb,
    mensagemId: m.id,
    agenciaId: m.agencia_id,
    ticketId: m.ticket_id,
    tipo: m.tipo,
    waMessageId: m.wa_message_id,
    canalId,
    transcreverSeCliente: true,
  });
  return NextResponse.json(r);
}
