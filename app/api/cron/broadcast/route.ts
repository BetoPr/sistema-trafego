/**
 * Cron worker: processa fila de broadcasts agendados.
 *
 * - Pega broadcasts em status=agendado|processando
 * - Respeita janela horária (timezone Brasil)
 * - Envia 1 item por vez com delay configurado
 * - Atualiza contadores + status final
 */

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { decryptToken, byteaToBuffer } from "@/lib/crypto/tokens";
import { getProvider } from "@/lib/whatsapp";
import type { ProviderTipo } from "@/lib/whatsapp/provider";

export const runtime = "nodejs";
export const maxDuration = 60;

function autorizado(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization") || "";
  return auth === `Bearer ${secret}`;
}

function dentroJanela(inicio: string, fim: string): boolean {
  const agora = new Date();
  const minsAgora = agora.getHours() * 60 + agora.getMinutes();
  const [hi, mi] = inicio.split(":").map((n) => parseInt(n, 10));
  const [hf, mf] = fim.split(":").map((n) => parseInt(n, 10));
  const minsIni = hi * 60 + mi;
  const minsFim = hf * 60 + mf;
  return minsAgora >= minsIni && minsAgora <= minsFim;
}

async function processar() {
  const sb = createServiceClient();

  // Canal sistema
  const { data: cfg } = await sb
    .from("super_admin_onda_zero_config")
    .select("canal_sistema_id")
    .eq("id", 1)
    .maybeSingle();
  if (!cfg?.canal_sistema_id) return { processados: 0, motivo: "sem_canal_sistema" };

  const { data: canal } = await sb
    .from("canais")
    .select("id, provider, instance_token_encrypted, status, servidor:super_admin_servidores(base_url)")
    .eq("id", cfg.canal_sistema_id as string)
    .maybeSingle();
  if (!canal || canal.status !== "connected") return { processados: 0, motivo: "canal_desconectado" };

  const baseUrl = (canal as unknown as { servidor: { base_url: string } }).servidor.base_url;
  const token = decryptToken(byteaToBuffer(canal.instance_token_encrypted));
  const providerTipo = ((canal as { provider?: string }).provider || "uazapi") as ProviderTipo;
  const provider = getProvider(providerTipo);

  // Pega broadcasts ativos
  const { data: ativos } = await sb
    .from("super_admin_broadcasts")
    .select("id, delay_ms, janela_inicio, janela_fim, status")
    .in("status", ["agendado", "processando"])
    .order("criado_em", { ascending: true })
    .limit(5);

  if (!ativos || ativos.length === 0) return { processados: 0, motivo: "sem_broadcasts_ativos" };

  let totalProcessados = 0;

  for (const bc of ativos) {
    const janelaIni = (bc.janela_inicio as string) || "08:00";
    const janelaFim = (bc.janela_fim as string) || "20:00";
    if (!dentroJanela(janelaIni, janelaFim)) continue;

    const delayMs = (bc.delay_ms as number) || 1500;

    // Marca como processando
    if (bc.status !== "processando") {
      await sb.from("super_admin_broadcasts").update({ status: "processando" }).eq("id", bc.id);
    }

    // Pega ate 30 itens pendentes desse broadcast
    const { data: itens } = await sb
      .from("super_admin_broadcast_itens")
      .select("id, destinatario_whatsapp, mensagem_renderizada, tentativas")
      .eq("broadcast_id", bc.id)
      .eq("status", "pendente")
      .lt("tentativas", 2)
      .limit(30);

    if (!itens || itens.length === 0) {
      // Conta restante pra decidir se conclui
      const { count: pendentes } = await sb
        .from("super_admin_broadcast_itens")
        .select("id", { count: "exact", head: true })
        .eq("broadcast_id", bc.id)
        .eq("status", "pendente");
      if ((pendentes || 0) === 0) {
        const { count: enviados } = await sb.from("super_admin_broadcast_itens").select("id", { count: "exact", head: true }).eq("broadcast_id", bc.id).eq("status", "enviado");
        const { count: erros } = await sb.from("super_admin_broadcast_itens").select("id", { count: "exact", head: true }).eq("broadcast_id", bc.id).eq("status", "erro");
        await sb.from("super_admin_broadcasts").update({
          status: "concluido",
          total_enviados: enviados || 0,
          total_erros: erros || 0,
          concluido_em: new Date().toISOString(),
        }).eq("id", bc.id);
      }
      continue;
    }

    for (const item of itens) {
      const it = item as { id: string; destinatario_whatsapp: string; mensagem_renderizada: string; tentativas: number };
      try {
        await provider.sendText({ tipo: providerTipo, baseUrl, token }, { numero: it.destinatario_whatsapp, texto: it.mensagem_renderizada });
        await sb.from("super_admin_broadcast_itens").update({
          status: "enviado",
          enviado_em: new Date().toISOString(),
          tentativas: it.tentativas + 1,
        }).eq("id", it.id);
        totalProcessados++;
        await new Promise((res) => setTimeout(res, delayMs));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const nova = it.tentativas + 1;
        await sb.from("super_admin_broadcast_itens").update({
          status: nova >= 2 ? "erro" : "pendente",
          erro: msg.slice(0, 500),
          tentativas: nova,
        }).eq("id", it.id);
      }
    }

    // Atualiza contadores
    const { count: enviados } = await sb.from("super_admin_broadcast_itens").select("id", { count: "exact", head: true }).eq("broadcast_id", bc.id).eq("status", "enviado");
    const { count: erros } = await sb.from("super_admin_broadcast_itens").select("id", { count: "exact", head: true }).eq("broadcast_id", bc.id).eq("status", "erro");
    await sb.from("super_admin_broadcasts").update({
      total_enviados: enviados || 0,
      total_erros: erros || 0,
    }).eq("id", bc.id);
  }

  return { processados: totalProcessados };
}

export async function POST(req: Request) {
  if (!autorizado(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const r = await processar();
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    return NextResponse.json({ error: "worker_falhou", msg: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function GET(req: Request) {
  return POST(req);
}
