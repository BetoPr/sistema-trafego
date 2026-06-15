/**
 * GET /api/cron/midia-retry
 * Tentativas auto de baixar mídias que falharam no webhook.
 *
 * Disparado pelo pg_cron a cada minuto. Pega mensagens onde:
 *  - midia_url IS NULL
 *  - tipo IN (audio,imagem,video,documento,sticker)
 *  - metadata.midia_tentativas < 3
 *  - now() - created_at >= backoff[tentativas]
 *
 * Backoff (a partir do created_at, não do "última tentativa"):
 *  - tentativa 1: já foi feita no webhook (síncrono). Se falhou metadata.midia_tentativas=1
 *  - tentativa 2: created_at + 5min
 *  - tentativa 3: created_at + 30min
 *  - >=3: para. Marca midia_perdida=true. Retry manual ainda funciona.
 *
 * Protegido por CRON_SECRET (Authorization: Bearer <token>).
 */
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { baixarEUploadMidia, getCanalToken, marcarMidiaPerdida, LIMITE_AUTO_TENTATIVAS } from "@/lib/crm/midia-download";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Backoff em minutos. Index = tentativas já feitas (0 = nunca tentou).
const BACKOFF_MIN = [0, 5, 30];

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET não configurado" }, { status: 500 });
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const inicio = Date.now();
  const sb = createServiceClient();

  // Pega até 30 mensagens devidas. Sem cap por agência — cron global.
  const { data: msgs } = await sb
    .from("mensagens")
    .select("id, agencia_id, ticket_id, tipo, wa_message_id, created_at, metadata, ticket:tickets(canal_id)")
    .is("midia_url", null)
    .in("tipo", ["audio", "imagem", "video", "documento", "sticker"])
    .or("metadata->midia_perdida.is.null,metadata->>midia_perdida.eq.false")
    .order("created_at", { ascending: false })
    .limit(60);

  if (!msgs || msgs.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, sucesso: 0, falha: 0, perdidas: 0, duracao_ms: Date.now() - inicio });
  }

  const agora = Date.now();
  let processed = 0;
  let sucesso = 0;
  let falha = 0;
  let perdidas = 0;

  // Cache de token por canal
  const tokenCache = new Map<string, Awaited<ReturnType<typeof getCanalToken>>>();

  for (const m of msgs) {
    const meta = (m.metadata as Record<string, unknown> | null) || {};
    const tentativas = Number(meta.midia_tentativas) || 0;
    // Já marcada como perdida → pula
    if (meta.midia_perdida) continue;
    // Esgotou auto-tentativas
    if (tentativas >= LIMITE_AUTO_TENTATIVAS) {
      await marcarMidiaPerdida(sb, m.id);
      perdidas++;
      continue;
    }
    // Backoff: precisa ter passado X min desde o created_at
    const minDesde = (agora - new Date(m.created_at).getTime()) / 60000;
    const min = BACKOFF_MIN[tentativas] ?? 60;
    if (minDesde < min) continue;

    const ticket = Array.isArray(m.ticket) ? m.ticket[0] : m.ticket;
    const canalId = (ticket as { canal_id?: string })?.canal_id;
    if (!canalId) continue;

    if (!tokenCache.has(canalId)) {
      tokenCache.set(canalId, await getCanalToken(sb, canalId));
    }
    const ct = tokenCache.get(canalId) || null;

    processed++;
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
      ct,
    );
    if (r.ok) sucesso++; else falha++;

    // Se essa foi a última auto-tentativa e falhou → marca perdida
    if (!r.ok && (r.tentativas ?? tentativas + 1) >= LIMITE_AUTO_TENTATIVAS) {
      await marcarMidiaPerdida(sb, m.id);
      perdidas++;
    }
  }

  return NextResponse.json({
    ok: true,
    processed,
    sucesso,
    falha,
    perdidas,
    duracao_ms: Date.now() - inicio,
  });
}
