/**
 * POST /api/atendimentos/[id]/cobranca
 * Body:
 *  - { tipo: "pix", valor, descricao }
 *    → PIX estático sem CPF (usa /pix/qrCodes/static + chave PIX da agência)
 *  - { tipo: "pix_nominal", valor, descricao, cpfCnpj, nome }
 *    → PIX vinculado a customer (entra no extrato Asaas com nome do cliente)
 *  - { tipo: "cartao", valor, descricao, parcelas }
 *    → Link de pagamento cartão (sem CPF obrigatório)
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { decryptToken, byteaToBuffer } from "@/lib/crypto/tokens";
import {
  findOrCreateCustomer,
  createPixPayment,
  getPixQrCode,
  createPaymentLink,
  createPixStaticQrCode,
} from "@/lib/asaas/api";
import { audit } from "@/lib/crm/audit";

export const runtime = "nodejs";

type AsaasPixKeyType = "EVP" | "CPF" | "CNPJ" | "EMAIL" | "PHONE";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: ticketId } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "auth" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    tipo?: "pix" | "cartao";
    valor?: number;
    descricao?: string;
    parcelas?: number;
  } | null;
  if (!body?.tipo || !body.valor) return NextResponse.json({ error: "body_invalido" }, { status: 400 });

  const sb = createServiceClient();
  const { data: u } = await sb.from("usuarios").select("agencia_id").eq("id", auth.user.id).single();
  if (!u) return NextResponse.json({ error: "no_user" }, { status: 403 });

  const { data: cfg } = await sb
    .from("asaas_config")
    .select("api_key_encrypted, ambiente, ativo, pix_tipo_chave, pix_chave, pix_nome_recebedor, pix_mensagem_padrao, cpf_cnpj_padrao, nome_padrao")
    .eq("agencia_id", u.agencia_id)
    .maybeSingle();
  if (!cfg?.ativo || !cfg.api_key_encrypted) {
    return NextResponse.json({ error: "asaas_nao_configurado" }, { status: 400 });
  }
  const apiKey = decryptToken(byteaToBuffer(cfg.api_key_encrypted));
  const client = { apiKey, ambiente: cfg.ambiente as "producao" | "sandbox" };

  const { data: ticket } = await sb
    .from("tickets")
    .select("id, contato:contatos(id, nome, email, cpf, telefone, whatsapp)")
    .eq("id", ticketId)
    .eq("agencia_id", u.agencia_id)
    .single();
  if (!ticket) return NextResponse.json({ error: "ticket_nao_encontrado" }, { status: 404 });
  const contato = (ticket.contato as unknown as { id: string; nome: string; email?: string; cpf?: string; telefone?: string; whatsapp?: string }) || null;
  if (!contato) return NextResponse.json({ error: "sem_contato" }, { status: 400 });

  try {
    // =========================
    // PIX — usa CPF/CNPJ padrão da agência (rastreável no painel Asaas)
    // Se não tiver CPF padrão nem do contato, cai pro PIX estático sem customer
    // =========================
    if (body.tipo === "pix") {
      const cpfCnpjFinal = (contato.cpf || cfg.cpf_cnpj_padrao || "").replace(/\D/g, "") || undefined;
      const nomeFinal = contato.nome || cfg.nome_padrao || "Cliente";

      if (cpfCnpjFinal) {
        // Cobrança nominal com customer → aparece no painel Asaas com nome
        const customer = await findOrCreateCustomer(client, {
          name: nomeFinal,
          cpfCnpj: cpfCnpjFinal,
          email: contato.email || undefined,
          phone: contato.telefone || contato.whatsapp || undefined,
        });
        const payment = await createPixPayment(client, {
          customer: customer.id,
          value: body.valor,
          description: body.descricao || "Cobrança",
          externalReference: `tk:${ticketId}`,
        });
        const qr = await getPixQrCode(client, payment.id);
        await sb.from("asaas_cobrancas").insert({
          agencia_id: u.agencia_id,
          ticket_id: ticketId,
          contato_id: contato.id,
          asaas_id: payment.id,
          tipo: "pix",
          valor: body.valor,
          descricao: body.descricao,
          status: "pendente",
          qr_code: qr.encodedImage,
          copia_cola: qr.payload,
          raw: payment as unknown as Record<string, unknown>,
        });
        await audit({ agenciaId: u.agencia_id, usuarioId: auth.user.id, acao: "create", entidade: "asaas_cobranca", entidadeId: payment.id, payload: { tipo: "pix_nominal", valor: body.valor } });
        return NextResponse.json({ ok: true, asaasId: payment.id, qrEncoded: qr.encodedImage, copiaCola: qr.payload });
      }

      // Fallback: PIX estático (sem customer) — requer chave PIX configurada
      if (!cfg.pix_chave || !cfg.pix_tipo_chave) {
        return NextResponse.json({
          error: "Configure CPF/CNPJ padrão OU chave PIX em /configuracoes/asaas.",
        }, { status: 400 });
      }
      const qr = await createPixStaticQrCode(client, {
        addressKey: cfg.pix_chave,
        addressKeyType: cfg.pix_tipo_chave as AsaasPixKeyType,
        value: body.valor,
        description: body.descricao || cfg.pix_mensagem_padrao || `Cobrança ticket #${ticketId.slice(0, 8)}`,
        allowsMultiplePayments: false,
      });
      await sb.from("asaas_cobrancas").insert({
        agencia_id: u.agencia_id,
        ticket_id: ticketId,
        contato_id: contato.id,
        asaas_id: qr.id,
        tipo: "pix",
        valor: body.valor,
        descricao: body.descricao,
        status: "pendente",
        qr_code: qr.encodedImage,
        copia_cola: qr.payload,
        raw: qr as unknown as Record<string, unknown>,
      });
      await audit({ agenciaId: u.agencia_id, usuarioId: auth.user.id, acao: "create", entidade: "asaas_cobranca", entidadeId: qr.id, payload: { tipo: "pix_estatico", valor: body.valor } });
      return NextResponse.json({ ok: true, asaasId: qr.id, qrEncoded: qr.encodedImage, copiaCola: qr.payload });
    }

    // =========================
    // CARTÃO (paymentLinks, sem CPF obrigatório)
    // =========================
    if (body.tipo === "cartao") {
      const link = await createPaymentLink(client, {
        name: body.descricao || "Cobrança",
        value: body.valor,
        billingType: "CREDIT_CARD",
        maxInstallmentCount: body.parcelas || 1,
        chargeType: "DETACHED",
        externalReference: `tk:${ticketId}`,
      });
      await sb.from("asaas_cobrancas").insert({
        agencia_id: u.agencia_id,
        ticket_id: ticketId,
        contato_id: contato.id,
        asaas_id: link.id,
        tipo: "cartao",
        valor: body.valor,
        parcelas: body.parcelas || 1,
        descricao: body.descricao,
        status: "pendente",
        link_pagamento: link.url,
        raw: link as unknown as Record<string, unknown>,
      });
      await audit({ agenciaId: u.agencia_id, usuarioId: auth.user.id, acao: "create", entidade: "asaas_cobranca", entidadeId: link.id, payload: { tipo: "cartao", valor: body.valor, parcelas: body.parcelas } });
      return NextResponse.json({ ok: true, asaasId: link.id, link: link.url });
    }

    return NextResponse.json({ error: "tipo_invalido" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
