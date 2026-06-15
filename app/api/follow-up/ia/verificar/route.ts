import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

/**
 * POST /api/follow-up/ia/verificar  { horas?: number }
 * Devolve só a LISTA de conversas paradas (não fechadas, última mensagem entre
 * `horas` e 30 dias atrás). A análise da IA roda depois, 1 por vez, no cliente
 * (chama /regenerar por ticket) — evita estourar o timeout serverless e o TPM
 * do Groq, e o tempo total escala com a quantidade de contatos.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "auth" }, { status: 401 });

  const sb = createServiceClient();
  const { data: u } = await sb.from("usuarios").select("agencia_id").eq("id", auth.user.id).single();
  if (!u) return NextResponse.json({ error: "no_user" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as { horas?: number; limite?: number };
  const horas = Math.max(1, Math.min(720, Number(body.horas) || 12));
  const limite = Math.max(1, Math.min(200, Number(body.limite) || 40));

  const agora = Date.now();
  const ate = new Date(agora - horas * 3600000).toISOString();
  const desde = new Date(agora - 30 * 24 * 3600000).toISOString();

  const { data: tickets } = await sb
    .from("tickets")
    .select("id, numero, ultima_mensagem_em, contato:contatos(nome, whatsapp)")
    .eq("agencia_id", u.agencia_id)
    .neq("status", "fechado")
    .not("ultima_mensagem_em", "is", null)
    .lte("ultima_mensagem_em", ate)
    .gte("ultima_mensagem_em", desde)
    .order("ultima_mensagem_em", { ascending: false })
    .limit(limite);

  const candidatos = (tickets || []).map((t) => {
    const c = Array.isArray(t.contato) ? t.contato[0] : t.contato;
    return { ticketId: t.id, numero: t.numero, nome: c?.nome || "Contato", whatsapp: c?.whatsapp || null, ultima_mensagem_em: t.ultima_mensagem_em };
  });

  return NextResponse.json({ ok: true, candidatos });
}
