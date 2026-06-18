import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

/**
 * POST /api/follow-up/ia/verificar
 * body: {
 *   janela?: "hoje" | "7d" | "15d" | "periodo",  // recorte de tempo (default 7d)
 *   de?, ate?: "YYYY-MM-DD",                       // usados quando janela="periodo"
 *   limite?: number,                               // 1..500 (default 60)
 *   status?: "aberto" | "pendente" | "ambos",      // default "ambos" (nunca fechado)
 *   etiquetaIds?: string[],                        // filtra contatos com QUALQUER dessas etiquetas
 *   canalIds?: string[],                           // filtra por conexão
 * }
 *
 * Devolve só a LISTA de conversas paradas (sem IA). A análise roda depois, 1 por vez,
 * no cliente (chama /regenerar por ticket) — não estoura o timeout serverless nem o TPM do Groq.
 * Exclui tickets em cooldown de descarte (follow_up_ia_snooze_ate > agora).
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "auth" }, { status: 401 });

  const sb = createServiceClient();
  const { data: u } = await sb.from("usuarios").select("agencia_id").eq("id", auth.user.id).single();
  if (!u) return NextResponse.json({ error: "no_user" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as {
    janela?: string; de?: string; ate?: string; limite?: number;
    status?: string; etiquetaIds?: string[]; canalIds?: string[];
  };

  const limite = Math.max(1, Math.min(500, Number(body.limite) || 60));
  const agoraIso = new Date().toISOString();

  // --- Janela de tempo (última mensagem entre `desde` e `ateLimite`) ---
  // Datas-limite explícitas no fuso de Brasília (-03:00) pra não escorregar de dia.
  const hojeSP = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }); // YYYY-MM-DD
  const diaMs = 24 * 3600000;
  let desde: string;
  let ateLimite: string = agoraIso;
  if (body.janela === "hoje") {
    desde = `${hojeSP}T00:00:00-03:00`;
  } else if (body.janela === "15d") {
    desde = new Date(Date.now() - 15 * diaMs).toISOString();
  } else if (body.janela === "periodo" && body.de) {
    desde = `${body.de}T00:00:00-03:00`;
    if (body.ate) ateLimite = `${body.ate}T23:59:59-03:00`;
  } else {
    // default e "7d"
    desde = new Date(Date.now() - 7 * diaMs).toISOString();
  }

  // --- Pré-filtro por etiqueta → conjunto de contato_ids ---
  let contatoIdsFiltro: string[] | null = null;
  if (Array.isArray(body.etiquetaIds) && body.etiquetaIds.length) {
    // etiquetaIds precisam ser da agência (evita vazar relação cross-tenant)
    const { data: etqs } = await sb.from("etiquetas").select("id").eq("agencia_id", u.agencia_id).in("id", body.etiquetaIds);
    const validas = (etqs || []).map((e) => e.id as string);
    if (!validas.length) return NextResponse.json({ ok: true, candidatos: [] });
    const { data: ce } = await sb.from("contato_etiquetas").select("contato_id").in("etiqueta_id", validas);
    contatoIdsFiltro = [...new Set((ce || []).map((r) => r.contato_id as string))];
    if (!contatoIdsFiltro.length) return NextResponse.json({ ok: true, candidatos: [] });
  }

  // --- Query principal ---
  let q = sb
    .from("tickets")
    .select("id, numero, ultima_mensagem_em, contato_id, contato:contatos(nome, whatsapp)")
    .eq("agencia_id", u.agencia_id)
    .not("ultima_mensagem_em", "is", null)
    .gte("ultima_mensagem_em", desde)
    .lte("ultima_mensagem_em", ateLimite)
    .or(`follow_up_ia_snooze_ate.is.null,follow_up_ia_snooze_ate.lte.${agoraIso}`)
    .order("ultima_mensagem_em", { ascending: false })
    .limit(limite);

  if (body.status === "aberto" || body.status === "pendente") q = q.eq("status", body.status);
  else q = q.in("status", ["aberto", "pendente"]); // "ambos" — nunca fechado
  if (contatoIdsFiltro) q = q.in("contato_id", contatoIdsFiltro);
  if (Array.isArray(body.canalIds) && body.canalIds.length) q = q.in("canal_id", body.canalIds);

  const { data: tickets } = await q;

  // --- Contador de follow-ups da IA já enviados por ticket ---
  const ids = (tickets || []).map((t) => t.id as string);
  const fuCount = new Map<string, number>();
  if (ids.length) {
    const { data: fus } = await sb
      .from("mensagens")
      .select("ticket_id")
      .eq("agencia_id", u.agencia_id)
      .in("ticket_id", ids)
      .filter("metadata->>follow_up_ia", "eq", "true");
    for (const m of (fus || []) as Array<{ ticket_id: string }>) fuCount.set(m.ticket_id, (fuCount.get(m.ticket_id) || 0) + 1);
  }

  const candidatos = (tickets || []).map((t) => {
    const c = Array.isArray(t.contato) ? t.contato[0] : t.contato;
    return {
      ticketId: t.id,
      contatoId: t.contato_id,
      numero: t.numero,
      nome: c?.nome || "Contato",
      whatsapp: c?.whatsapp || null,
      ultima_mensagem_em: t.ultima_mensagem_em,
      followups_enviados: fuCount.get(t.id as string) || 0,
    };
  });

  return NextResponse.json({ ok: true, candidatos });
}
