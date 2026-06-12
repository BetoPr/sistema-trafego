import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sugerirFollowUpTicket } from "@/lib/crm/ia";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/follow-up/ia/verificar  { horas?: number }
 * Acha conversas PARADAS (não fechadas, última mensagem entre `horas` e 30 dias
 * atrás) e pede pra IA decidir se vale follow-up + sugerir a mensagem.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "auth" }, { status: 401 });

  const sb = createServiceClient();
  const { data: u } = await sb.from("usuarios").select("agencia_id").eq("id", auth.user.id).single();
  if (!u) return NextResponse.json({ error: "no_user" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as { horas?: number };
  const horas = Math.max(1, Math.min(720, Number(body.horas) || 12));

  const agora = Date.now();
  const ate = new Date(agora - horas * 3600000).toISOString();
  const desde = new Date(agora - 30 * 24 * 3600000).toISOString();

  const { data: tickets } = await sb
    .from("tickets")
    .select("id, numero, ultima_mensagem_em, ultima_mensagem_preview, contato:contatos(nome, whatsapp)")
    .eq("agencia_id", u.agencia_id)
    .neq("status", "fechado")
    .not("ultima_mensagem_em", "is", null)
    .lte("ultima_mensagem_em", ate)
    .gte("ultima_mensagem_em", desde)
    .order("ultima_mensagem_em", { ascending: false })
    .limit(15);

  if (!tickets || tickets.length === 0) return NextResponse.json({ ok: true, candidatos: [] });

  const candidatos = await Promise.all(
    tickets.map(async (t) => {
      const c = Array.isArray(t.contato) ? t.contato[0] : t.contato;
      try {
        const s = await sugerirFollowUpTicket({ agenciaId: u.agencia_id, ticketId: t.id });
        return { ticketId: t.id, numero: t.numero, nome: c?.nome || "Contato", whatsapp: c?.whatsapp || null, ultima_mensagem_em: t.ultima_mensagem_em, ...s };
      } catch (e) {
        return { ticketId: t.id, numero: t.numero, nome: c?.nome || "Contato", whatsapp: c?.whatsapp || null, ultima_mensagem_em: t.ultima_mensagem_em, enviar: false, motivo: e instanceof Error ? e.message : "erro", resumo: "", mensagem: "" };
      }
    }),
  );

  return NextResponse.json({ ok: true, candidatos });
}
