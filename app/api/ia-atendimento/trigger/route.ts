/**
 * POST /api/ia-atendimento/trigger
 * Body: { ticketId: string }
 *
 * Aguarda até processar_apos do buffer (debounce) e dispara processamento.
 * Chamado em background pelo webhook UAZAPI logo após adicionarAoBuffer.
 * Reduz latência de até 60s (cron 1/min) pra ~debounce + 1s.
 *
 * Auth: secret bearer ou cookie de auth. Pra simplicidade, usa CRON_SECRET.
 */
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { processarBufferIA } from "@/lib/ia-atendimento/executor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as { ticketId?: string } | null;
  if (!body?.ticketId) return NextResponse.json({ error: "ticketId_obrigatorio" }, { status: 400 });

  const sb = createServiceClient();

  // Lê buffer pra calcular espera
  const { data: buf } = await sb
    .from("ia_atendimento_buffer")
    .select("processar_apos, trava_processando")
    .eq("ticket_id", body.ticketId)
    .maybeSingle();
  if (!buf) return NextResponse.json({ ok: true, motivo: "sem_buffer" });
  if (buf.trava_processando) return NextResponse.json({ ok: true, motivo: "ja_processando" });

  const agora = Date.now();
  const procEm = new Date(buf.processar_apos).getTime();
  const esperarMs = Math.max(0, Math.min(45_000, procEm - agora));
  if (esperarMs > 0) await sleep(esperarMs);

  // Processa (limite 1 — só esse ticket, mas processarBufferIA pega todos devidos)
  const r = await processarBufferIA(5);
  return NextResponse.json({ ok: true, esperou_ms: esperarMs, ...r });
}
