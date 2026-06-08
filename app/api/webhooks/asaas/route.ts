/**
 * Webhook receiver Asaas.
 *
 * Asaas v3 manda POST com header `asaas-access-token` (Auth Token configurado).
 * Identificamos a agência via externalReference da cobrança (tk:<ticket_id>).
 *
 * Eventos: PAYMENT_CREATED, PAYMENT_AWAITING_RISK_ANALYSIS, PAYMENT_APPROVED_BY_RISK_ANALYSIS,
 * PAYMENT_REPROVED_BY_RISK_ANALYSIS, PAYMENT_AUTHORIZED, PAYMENT_UPDATED, PAYMENT_CONFIRMED,
 * PAYMENT_RECEIVED, PAYMENT_DELETED, PAYMENT_RESTORED, PAYMENT_REFUNDED,
 * PAYMENT_REFUND_IN_PROGRESS, PAYMENT_RECEIVED_IN_CASH_UNDONE, PAYMENT_CHARGEBACK_REQUESTED,
 * PAYMENT_CHARGEBACK_DISPUTE, PAYMENT_AWAITING_CHARGEBACK_REVERSAL, PAYMENT_DUNNING_RECEIVED,
 * PAYMENT_DUNNING_REQUESTED, PAYMENT_BANK_SLIP_VIEWED, PAYMENT_CHECKOUT_VIEWED.
 */
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyAsaasWebhook } from "@/lib/asaas/api";
import { audit, getIp } from "@/lib/crm/audit";
import { dispatchWebhook } from "@/lib/crm/webhook-dispatcher";
import { decryptToken, byteaToBuffer } from "@/lib/crypto/tokens";
import { instanceSendText } from "@/lib/uazapi/client";

export const runtime = "nodejs";

interface AsaasEvent {
  event: string;
  payment?: {
    id: string;
    status: string;
    value: number;
    externalReference?: string;
    customer: string;
  };
}

export async function POST(req: Request) {
  const sb = createServiceClient();
  const body = (await req.json().catch(() => null)) as AsaasEvent | null;
  if (!body?.event || !body.payment) {
    return NextResponse.json({ error: "payload_invalido" }, { status: 400 });
  }

  // Identifica agência pela cobrança existente (asaas_id).
  const { data: cobranca } = await sb
    .from("asaas_cobrancas")
    .select("id, agencia_id, ticket_id, status, asaas_id")
    .eq("asaas_id", body.payment.id)
    .maybeSingle();

  if (!cobranca) {
    // Tenta fallback via externalReference.
    const ref = body.payment.externalReference || "";
    const m = ref.match(/^tk:([0-9a-f-]{36})$/i);
    if (!m) {
      return NextResponse.json({ error: "cobranca_nao_encontrada" }, { status: 404 });
    }
    // Sem cobrança registrada — só loga.
    return NextResponse.json({ ok: true, skipped: "sem_cobranca_local" });
  }

  // Verifica autenticidade contra webhook_secret da agência.
  const { data: cfg } = await sb
    .from("asaas_config")
    .select("webhook_secret, api_key_encrypted, mensagem_pagamento_auto")
    .eq("agencia_id", cobranca.agencia_id)
    .maybeSingle();
  if (!cfg) return NextResponse.json({ error: "asaas_config_ausente" }, { status: 400 });

  if (!verifyAsaasWebhook(req.headers, cfg.webhook_secret)) {
    return NextResponse.json({ error: "assinatura_invalida" }, { status: 401 });
  }

  // Mapeia status Asaas → status interno.
  const evento = body.event;
  let novoStatus: string | null = null;
  if (evento === "PAYMENT_CONFIRMED" || evento === "PAYMENT_RECEIVED") novoStatus = "recebida";
  else if (evento === "PAYMENT_OVERDUE") novoStatus = "vencida";
  else if (evento === "PAYMENT_DELETED" || evento === "PAYMENT_REFUNDED") novoStatus = "cancelada";
  else if (evento === "PAYMENT_REFUND_IN_PROGRESS") novoStatus = "estornada";

  await sb
    .from("asaas_cobrancas")
    .update({
      status: novoStatus || cobranca.status,
      pago_em: novoStatus === "recebida" ? new Date().toISOString() : null,
      raw: body as unknown as Record<string, unknown>,
      updated_at: new Date().toISOString(),
    })
    .eq("id", cobranca.id);

  void audit({
    agenciaId: cobranca.agencia_id,
    acao: "asaas_webhook",
    entidade: "asaas_cobranca",
    entidadeId: cobranca.asaas_id,
    metodo: "POST",
    caminho: "/api/webhooks/asaas",
    status: 200,
    ip: getIp(req.headers) || undefined,
    payload: { evento, novoStatus },
  });

  if (novoStatus === "recebida" && cobranca.ticket_id) {
    // Atualiza valor_fechado no ticket
    await sb
      .from("tickets")
      .update({ valor_fechado: body.payment.value, updated_at: new Date().toISOString() })
      .eq("id", cobranca.ticket_id);

    // Envia mensagem auto no chat
    if (cfg.mensagem_pagamento_auto) {
      const { data: t } = await sb
        .from("tickets")
        .select("id, contato:contatos(wa_id, whatsapp), canal:canais(id, instance_token_encrypted, status, servidor:super_admin_servidores(base_url))")
        .eq("id", cobranca.ticket_id)
        .single();
      if (t) {
        const contato = t.contato as unknown as { wa_id?: string; whatsapp?: string };
        const canal = t.canal as unknown as { id: string; instance_token_encrypted: unknown; status: string; servidor: { base_url: string } };
        if (canal?.status === "connected" && (contato.wa_id || contato.whatsapp)) {
          try {
            const token = decryptToken(byteaToBuffer(canal.instance_token_encrypted));
            await instanceSendText(
              { baseUrl: canal.servidor.base_url, token },
              { number: contato.wa_id || contato.whatsapp!, text: cfg.mensagem_pagamento_auto },
            );
            await sb.from("mensagens").insert({
              ticket_id: cobranca.ticket_id,
              agencia_id: cobranca.agencia_id,
              autor: "sistema",
              tipo: "texto",
              conteudo: cfg.mensagem_pagamento_auto,
              status: "enviada",
            });
          } catch (e) {
            console.error("[asaas-wh] mensagem auto falhou:", e);
          }
        }
      }
    }

    void dispatchWebhook({
      agenciaId: cobranca.agencia_id,
      evento: "pagamento.recebido",
      payload: { cobranca_id: cobranca.id, asaas_id: body.payment.id, ticket_id: cobranca.ticket_id, valor: body.payment.value },
    });
  }

  return NextResponse.json({ ok: true, novoStatus });
}

export async function GET() {
  return NextResponse.json({ ok: true, hint: "POST only" });
}
