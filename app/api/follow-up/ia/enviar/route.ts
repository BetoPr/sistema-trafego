import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { decryptToken, byteaToBuffer } from "@/lib/crypto/tokens";
import { instanceSendText } from "@/lib/uazapi/client";
import { audit } from "@/lib/crm/audit";
import { clienteFoiOUltimoAResponder } from "@/lib/crm/anti-flood";

export const runtime = "nodejs";

/** POST /api/follow-up/ia/enviar { ticketId, mensagem } → envia o follow-up aprovado. */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "auth" }, { status: 401 });

  const sb = createServiceClient();
  const { data: u } = await sb.from("usuarios").select("agencia_id").eq("id", auth.user.id).single();
  if (!u) return NextResponse.json({ error: "no_user" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as { ticketId?: string; mensagem?: string; dividir?: boolean };
  const texto = (body.mensagem || "").trim();
  if (!body.ticketId || !texto) return NextResponse.json({ error: "body_invalido" }, { status: 400 });

  const { data: ticket } = await sb
    .from("tickets")
    .select("id, agencia_id, contato:contatos(wa_id, whatsapp), canal:canais(id, status, instance_token_encrypted, servidor:super_admin_servidores(base_url))")
    .eq("id", body.ticketId)
    .eq("agencia_id", u.agencia_id)
    .single();
  if (!ticket) return NextResponse.json({ error: "ticket_nao_encontrado" }, { status: 404 });

  // Regra: não faz follow-up pra quem já interagiu (última msg do ticket é do cliente).
  if (await clienteFoiOUltimoAResponder(sb, ticket.id)) {
    return NextResponse.json({ error: "cliente_ja_interagiu", msg: "Cliente já respondeu — follow-up não enviado." }, { status: 409 });
  }

  const contato = (Array.isArray(ticket.contato) ? ticket.contato[0] : ticket.contato) as { wa_id?: string; whatsapp?: string } | null;
  const canal = (Array.isArray(ticket.canal) ? ticket.canal[0] : ticket.canal) as { id: string; status: string; instance_token_encrypted: unknown; servidor: { base_url: string } | { base_url: string }[] } | null;
  if (!canal) return NextResponse.json({ error: "canal_nao_encontrado" }, { status: 404 });
  if (canal.status !== "connected") return NextResponse.json({ error: "canal_desconectado" }, { status: 409 });

  const waId = contato?.wa_id || contato?.whatsapp;
  if (!waId) return NextResponse.json({ error: "contato_sem_whatsapp" }, { status: 400 });

  const servidor = Array.isArray(canal.servidor) ? canal.servidor[0] : canal.servidor;
  const baseUrl = servidor.base_url;
  const token = decryptToken(byteaToBuffer(canal.instance_token_encrypted as Parameters<typeof byteaToBuffer>[0]));

  // "Dividir em 2": quebra o texto em 2 partes e manda como 2 mensagens (mais humano).
  const partes = body.dividir ? dividirEm2(texto) : [texto];
  let msgRow: { id?: string } | null = null;
  for (let i = 0; i < partes.length; i++) {
    let wamid: string | undefined;
    try {
      const r = await instanceSendText({ baseUrl, token }, { number: waId, text: partes[i] });
      wamid = r.id;
    } catch (e) {
      if (i === 0) return NextResponse.json({ error: "uazapi_send", msg: e instanceof Error ? e.message : String(e) }, { status: 502 });
      break; // 1ª já saiu — não falha o request por causa da 2ª
    }
    const { data: row } = await sb
      .from("mensagens")
      .insert({
        ticket_id: ticket.id,
        agencia_id: u.agencia_id,
        autor: "atendente",
        usuario_id: auth.user.id,
        tipo: "texto",
        conteudo: partes[i],
        wa_message_id: wamid || null,
        status: "enviada",
        // Só a 1ª parte conta como follow-up (dividir-em-2 = 1 follow-up lógico, não 2).
        metadata: i === 0 ? { follow_up_ia: true } : { follow_up_ia_continuacao: true },
      })
      .select("id")
      .single();
    if (i === 0) msgRow = row;
    if (i < partes.length - 1) await new Promise((r) => setTimeout(r, 2500));
  }

  await sb
    .from("tickets")
    .update({ status: "aberto", usuario_id: auth.user.id, primeira_resposta_em: new Date().toISOString() })
    .eq("id", ticket.id)
    .is("primeira_resposta_em", null);

  void audit({ agenciaId: u.agencia_id, usuarioId: auth.user.id, acao: "send_message", entidade: "mensagem", entidadeId: msgRow?.id, payload: { ticket_id: ticket.id, follow_up_ia: true } });

  return NextResponse.json({ ok: true, mensagemId: msgRow?.id });
}

/** Quebra um texto em 2 mensagens, preferindo limite de frase perto do meio. */
function dividirEm2(t: string): string[] {
  const s = t.trim();
  if (s.length < 40) return [s];
  const frases = s.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (frases.length >= 2) {
    const meio = Math.ceil(frases.length / 2);
    const a = frases.slice(0, meio).join(" ").trim();
    const b = frases.slice(meio).join(" ").trim();
    if (a && b) return [a, b];
  }
  const mid = Math.floor(s.length / 2);
  const sp = s.lastIndexOf(" ", mid);
  const cut = sp > 20 ? sp : mid;
  const a = s.slice(0, cut).trim(), b = s.slice(cut).trim();
  return b ? [a, b] : [a];
}
