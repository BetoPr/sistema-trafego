/**
 * POST /api/contatos/[id]/follow-up-avulso
 * Body: { agendaEm: ISO, mensagens: [{texto}], intervalosSeg: number[], canalId?: string }
 *
 * Resolve ticket+canal: usa último ticket aberto do contato (mais recente). Se body.canalId
 * vier, usa esse (sobrepõe). Bloqueia se nenhum ticket existir e canalId não vier.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { audit } from "@/lib/crm/audit";

export const runtime = "nodejs";

interface Body {
  agendaEm?: string;
  mensagens?: Array<{ texto: string }>;
  intervalosSeg?: number[];
  canalId?: string;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: contatoId } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "auth" }, { status: 401 });

  const sb = createServiceClient();
  const { data: u } = await sb.from("usuarios").select("agencia_id").eq("id", auth.user.id).single();
  if (!u) return NextResponse.json({ error: "no_user" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body?.agendaEm || !Array.isArray(body.mensagens) || body.mensagens.length < 1 || body.mensagens.length > 3) {
    return NextResponse.json({ error: "body_invalido" }, { status: 400 });
  }
  const mensagens = body.mensagens.filter((m) => (m?.texto || "").trim()).map((m) => ({ texto: m.texto.trim() }));
  if (mensagens.length < 1) return NextResponse.json({ error: "mensagem_vazia" }, { status: 400 });

  const intervalos = (body.intervalosSeg || []).slice(0, mensagens.length - 1).map((n) => Math.max(2, Math.floor(Number(n) || 2)));
  while (intervalos.length < mensagens.length - 1) intervalos.push(2);

  // Não permite agendar pro passado (cliente pode estar em fuso diferente — tolerância 1 min)
  const agendaDate = new Date(body.agendaEm);
  if (isNaN(agendaDate.getTime())) return NextResponse.json({ error: "agenda_invalida" }, { status: 400 });
  if (agendaDate.getTime() < Date.now() - 60_000) return NextResponse.json({ error: "agenda_no_passado" }, { status: 400 });

  // Resolve ticket+canal
  const { data: contato } = await sb
    .from("contatos")
    .select("id, agencia_id")
    .eq("id", contatoId)
    .maybeSingle();
  if (!contato || contato.agencia_id !== u.agencia_id) {
    return NextResponse.json({ error: "contato_nao_encontrado" }, { status: 404 });
  }

  const { data: ticket } = await sb
    .from("tickets")
    .select("id, canal_id, status")
    .eq("agencia_id", u.agencia_id)
    .eq("contato_id", contatoId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let canalId = body.canalId || (ticket?.canal_id as string | null) || null;
  if (!canalId) {
    return NextResponse.json({ error: "sem_canal", motivo: "Contato sem conversa aberta. Abra um atendimento primeiro ou informe o canal." }, { status: 400 });
  }

  // Confirma canal pertence à agência + conectado
  const { data: canal } = await sb.from("canais").select("id, agencia_id, status").eq("id", canalId).maybeSingle();
  if (!canal || canal.agencia_id !== u.agencia_id) return NextResponse.json({ error: "canal_invalido" }, { status: 400 });
  if (canal.status !== "connected") return NextResponse.json({ error: "canal_desconectado" }, { status: 400 });

  const { data: inserido, error } = await sb
    .from("follow_up_avulsos")
    .insert({
      agencia_id: u.agencia_id,
      contato_id: contatoId,
      ticket_id: ticket?.id || null,
      canal_id: canalId,
      agenda_em: agendaDate.toISOString(),
      mensagens,
      intervalos_seg: intervalos,
      criado_por: auth.user.id,
    })
    .select("id, agenda_em, status")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  void audit({
    agenciaId: u.agencia_id,
    usuarioId: auth.user.id,
    acao: "create",
    entidade: "follow_up_avulso",
    entidadeId: inserido.id,
    payload: { contatoId, agenda_em: inserido.agenda_em, n_mensagens: mensagens.length },
  });

  return NextResponse.json({ ok: true, id: inserido.id });
}
