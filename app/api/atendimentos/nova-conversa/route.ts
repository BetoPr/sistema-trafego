import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

function digits(s: string): string {
  return (s || "").replace(/\D/g, "");
}

/** Normaliza um número digitado pro formato canônico E.164 sem "+" (ex: 5511999999999). */
function canonicalBr(raw: string): string | null {
  let d = digits(raw).replace(/^0+/, "");
  if (!d) return null;
  // Sem código de país (DDD + número) → assume Brasil (55).
  if (d.length === 10 || d.length === 11) d = "55" + d;
  if (d.length < 12 || d.length > 15) return null;
  return d;
}

/** Variantes BR (com/sem o 9º dígito) pra casar com contato já existente. */
function variantesBr(n: string): string[] {
  const limpo = digits(n);
  if (!limpo) return [];
  const set = new Set<string>([limpo]);
  if (limpo.length === 13 && limpo.startsWith("55")) {
    const ddd = limpo.slice(2, 4);
    const resto = limpo.slice(4);
    if (resto.startsWith("9") && resto.length === 9) set.add(`55${ddd}${resto.slice(1)}`);
  } else if (limpo.length === 12 && limpo.startsWith("55")) {
    const ddd = limpo.slice(2, 4);
    const resto = limpo.slice(4);
    if (resto.length === 8 && /^[6-9]/.test(resto)) set.add(`55${ddd}9${resto}`);
  }
  return Array.from(set);
}

/**
 * POST /api/atendimentos/nova-conversa { numero, canalId, nome? }
 * Inicia uma conversa avulsa: localiza/cria o contato pelo número e abre
 * (ou reaproveita) um ticket no canal escolhido. Retorna { ticketId }.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "auth" }, { status: 401 });

  const sb = createServiceClient();
  const { data: u } = await sb.from("usuarios").select("id, agencia_id").eq("id", auth.user.id).single();
  if (!u) return NextResponse.json({ error: "no_user" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as { numero?: string; canalId?: string; nome?: string };
  const canon = canonicalBr(body.numero || "");
  if (!canon) return NextResponse.json({ error: "numero_invalido" }, { status: 400 });
  if (!body.canalId) return NextResponse.json({ error: "canal_obrigatorio" }, { status: 400 });

  // Canal precisa ser da agência e estar conectado.
  const { data: canal } = await sb
    .from("canais")
    .select("id, status, fila_id")
    .eq("id", body.canalId)
    .eq("agencia_id", u.agencia_id)
    .maybeSingle();
  if (!canal) return NextResponse.json({ error: "canal_nao_encontrado" }, { status: 404 });
  if (canal.status !== "connected") return NextResponse.json({ error: "canal_desconectado" }, { status: 409 });

  const variantes = variantesBr(canon);
  const jids = variantes.map((v) => `${v}@s.whatsapp.net`);

  // 1. Localiza contato por qualquer variante (whatsapp ou wa_id).
  let contatoId: string | null = null;
  const { data: achados } = await sb
    .from("contatos")
    .select("id, whatsapp, wa_id")
    .eq("agencia_id", u.agencia_id)
    .is("deleted_at", null)
    .or(`whatsapp.in.(${variantes.join(",")}),wa_id.in.(${jids.join(",")})`)
    .limit(1);
  if (achados && achados.length > 0) contatoId = achados[0].id;

  let novoContato = false;
  if (!contatoId) {
    novoContato = true;
    const nome = (body.nome || "").trim();
    const { data: novo, error } = await sb
      .from("contatos")
      .insert({
        agencia_id: u.agencia_id,
        wa_id: `${canon}@s.whatsapp.net`,
        whatsapp: canon,
        nome: nome || canon,
        primeiro_nome: nome ? nome.split(" ")[0] : null,
      })
      .select("id")
      .single();
    if (error) {
      // Race no unique (agencia_id, wa_id): refaz a busca.
      if (error.code === "23505") {
        const { data: ja } = await sb
          .from("contatos").select("id")
          .eq("agencia_id", u.agencia_id).eq("wa_id", `${canon}@s.whatsapp.net`).is("deleted_at", null).maybeSingle();
        if (!ja) return NextResponse.json({ error: "contato_falhou" }, { status: 500 });
        contatoId = ja.id;
        novoContato = false;
      } else {
        return NextResponse.json({ error: "contato_falhou", msg: error.message }, { status: 500 });
      }
    } else {
      contatoId = novo.id;
    }
  }

  // 2. Reaproveita ticket aberto/pendente OU cria novo (atribuído a quem iniciou).
  const { data: ticketExistente } = await sb
    .from("tickets")
    .select("id, numero, canal_id")
    .eq("agencia_id", u.agencia_id)
    .eq("contato_id", contatoId)
    .in("status", ["aberto", "pendente"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (ticketExistente) {
    // Garante que aponta pro canal escolhido e fica aberto pra quem iniciou.
    await sb
      .from("tickets")
      .update({ status: "aberto", usuario_id: u.id, canal_id: body.canalId })
      .eq("id", ticketExistente.id);
    return NextResponse.json({ ticketId: ticketExistente.id, ticketNumero: ticketExistente.numero, novoTicket: false, novoContato });
  }

  const { data: novoTicket, error: tErr } = await sb
    .from("tickets")
    .insert({
      agencia_id: u.agencia_id,
      contato_id: contatoId,
      canal_id: body.canalId,
      fila_id: canal.fila_id,
      usuario_id: u.id,
      status: "aberto",
    })
    .select("id, numero")
    .single();
  if (tErr) return NextResponse.json({ error: "ticket_falhou", msg: tErr.message }, { status: 500 });

  return NextResponse.json({ ticketId: novoTicket.id, ticketNumero: novoTicket.numero, novoTicket: true, novoContato });
}
