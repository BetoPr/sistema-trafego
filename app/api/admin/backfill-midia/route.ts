/**
 * POST /api/admin/backfill-midia
 * Re-baixa mídia de mensagens com midia_url=null em lote (botão "N mídias pendentes · re-baixar").
 *
 * Usa a mesma lib que o webhook e o cron (lib/crm/midia-download.ts).
 *
 * Query: ?limit=30  (default 30, max 100)
 * Body opcional: { ticketId }
 * Auth: super_admin OU admin da agência
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { baixarEUploadMidia, getCanalToken } from "@/lib/crm/midia-download";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "auth" }, { status: 401 });

  const sb = createServiceClient();
  const { data: u } = await sb.from("usuarios").select("agencia_id, role").eq("id", auth.user.id).single();
  if (!u) return NextResponse.json({ error: "no_user" }, { status: 403 });
  if (!["super_admin", "admin"].includes(u.role)) {
    return NextResponse.json({ error: "sem_permissao" }, { status: 403 });
  }

  const url = new URL(req.url);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 30));
  const body = (await req.json().catch(() => null)) as { ticketId?: string } | null;

  let q = sb
    .from("mensagens")
    .select("id, agencia_id, ticket_id, tipo, wa_message_id, ticket:tickets(canal_id)")
    .eq("agencia_id", u.agencia_id)
    .is("midia_url", null)
    .in("tipo", ["audio", "imagem", "video", "documento", "sticker"])
    .or("metadata->midia_perdida.is.null,metadata->>midia_perdida.eq.false")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (body?.ticketId) q = q.eq("ticket_id", body.ticketId);
  const { data: msgs } = await q;

  if (!msgs || msgs.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, sucesso: 0, falha: 0, restantes: 0 });
  }

  const { count: restantes } = await sb
    .from("mensagens")
    .select("id", { count: "exact", head: true })
    .eq("agencia_id", u.agencia_id)
    .is("midia_url", null)
    .in("tipo", ["audio", "imagem", "video", "documento", "sticker"]);

  const tokenCache = new Map<string, Awaited<ReturnType<typeof getCanalToken>>>();
  let sucesso = 0;
  let falha = 0;
  const erros: Array<{ id: string; motivo: string }> = [];

  for (const m of msgs) {
    const ticket = Array.isArray(m.ticket) ? m.ticket[0] : m.ticket;
    const canalId = (ticket as { canal_id?: string })?.canal_id;
    if (!canalId) {
      falha++;
      erros.push({ id: m.id, motivo: "sem_canal" });
      continue;
    }
    if (!tokenCache.has(canalId)) {
      tokenCache.set(canalId, await getCanalToken(sb, canalId));
    }
    const r = await baixarEUploadMidia(
      {
        sb,
        mensagemId: m.id,
        agenciaId: m.agencia_id,
        ticketId: m.ticket_id,
        tipo: m.tipo,
        waMessageId: m.wa_message_id,
        canalId,
        transcreverSeCliente: true,
      },
      tokenCache.get(canalId) || null,
    );
    if (r.ok) sucesso++; else { falha++; erros.push({ id: m.id, motivo: r.error || "erro" }); }
  }

  return NextResponse.json({
    ok: true,
    processed: msgs.length,
    sucesso,
    falha,
    restantes: Math.max(0, (restantes || 0) - sucesso),
    erros: erros.slice(0, 5),
  });
}

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "auth" }, { status: 401 });

  const sb = createServiceClient();
  const { data: u } = await sb.from("usuarios").select("agencia_id, role").eq("id", auth.user.id).single();
  if (!u || !["super_admin", "admin"].includes(u.role)) {
    return NextResponse.json({ error: "sem_permissao" }, { status: 403 });
  }
  const { count } = await sb
    .from("mensagens")
    .select("id", { count: "exact", head: true })
    .eq("agencia_id", u.agencia_id)
    .is("midia_url", null)
    .in("tipo", ["audio", "imagem", "video", "documento", "sticker"])
    .or("metadata->midia_perdida.is.null,metadata->>midia_perdida.eq.false");
  return NextResponse.json({ pendentes: count || 0 });
}
