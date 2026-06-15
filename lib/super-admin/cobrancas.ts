/**
 * Cobrança de assinaturas — modelo manual com automação parcial.
 *
 * Regras:
 *  - Roberto (super_admin) cobra via WhatsApp por número próprio (config singleton).
 *  - Cobrança automática 1 dia antes do `vencimento_em`.
 *  - Se passou de `vencimento_em` sem pagamento → `acesso_bloqueado = true` (login dos admins/atendentes da agência é negado; webhook UAZAPI continua processando leads).
 *  - Marcar pago manualmente → ultimo_pagamento_em = now, vencimento_em += N meses, acesso_bloqueado = false.
 *  - Estender vencimento → vencimento_em += N meses (sem pagamento; pra adiantar pagamentos).
 *  - Idempotência: 1 cobrança automática por (agencia, mes_referencia) via UNIQUE.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/service";
import { decryptToken, byteaToBuffer } from "@/lib/crypto/tokens";
import { instanceSendText } from "@/lib/uazapi/client";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

interface ConfigSingleton {
  canal_id: string | null;
  horario: string;
  template_texto: string;
  ativo: boolean;
}

export interface CobrancaConfig extends ConfigSingleton {
  agencia_envio_id: string | null;
}

/** Carrega config singleton. Cria se faltar. */
export async function getCobrancaConfig(sb: SupabaseClient): Promise<CobrancaConfig> {
  const { data } = await sb
    .from("super_admin_cobranca_config")
    .select("canal_id, agencia_envio_id, horario, template_texto, ativo")
    .eq("id", 1)
    .maybeSingle();
  if (!data) {
    await sb.from("super_admin_cobranca_config").insert({ id: 1 });
    return { canal_id: null, agencia_envio_id: null, horario: "09:00:00", template_texto: "", ativo: true };
  }
  return data as CobrancaConfig;
}

/** Render template com variáveis. */
export function renderTemplate(tpl: string, vars: { nome: string; valor: number; dia: number; mes: number; ano: number; dias_para_vencer: number; dia_vencimento: string }) {
  return tpl
    .replaceAll("{nome}", vars.nome)
    .replaceAll("{valor}", BRL.format(vars.valor))
    .replaceAll("{dia}", String(vars.dia).padStart(2, "0"))
    .replaceAll("{mes}", String(vars.mes).padStart(2, "0"))
    .replaceAll("{ano}", String(vars.ano))
    .replaceAll("{dias_para_vencer}", vars.dias_para_vencer === 0 ? "hoje" : vars.dias_para_vencer === 1 ? "1 dia" : `${vars.dias_para_vencer} dias`)
    .replaceAll("{dia_vencimento}", vars.dia_vencimento);
}

interface DispatchInput {
  sb?: SupabaseClient;
  agenciaId: string;
  motivo?: string; // 'manual' | 'auto_1d_antes' etc
}

/**
 * Dispara cobrança manual ou automática para uma agência.
 * Idempotente via log UNIQUE(agencia, mes_referencia).
 */
export async function dispararCobranca(input: DispatchInput): Promise<{
  ok: boolean;
  status: "enviada" | "falha" | "pulada";
  motivo?: string;
  erro?: string;
  wa_message_id?: string;
}> {
  const sb = input.sb || createServiceClient();
  const cfg = await getCobrancaConfig(sb);
  if (!cfg.canal_id) return { ok: false, status: "falha", motivo: "canal de envio não configurado em super_admin_cobranca_config" };

  // Pega canal + servidor
  const { data: canal } = await sb
    .from("canais")
    .select("id, status, instance_token_encrypted, servidor:super_admin_servidores(base_url)")
    .eq("id", cfg.canal_id)
    .maybeSingle();
  if (!canal) return { ok: false, status: "falha", motivo: "canal não encontrado" };
  if (canal.status !== "connected") return { ok: false, status: "falha", motivo: "canal desconectado" };

  const baseUrl = (canal as unknown as { servidor: { base_url: string } | { base_url: string }[] }).servidor;
  const url = (Array.isArray(baseUrl) ? baseUrl[0] : baseUrl).base_url;
  const token = decryptToken(byteaToBuffer(canal.instance_token_encrypted as Parameters<typeof byteaToBuffer>[0]));

  // Pega agência
  const { data: agencia } = await sb
    .from("agencias")
    .select("id, nome, valor_mensal, vencimento_em, whatsapp_cobranca, cobranca_ativa")
    .eq("id", input.agenciaId)
    .maybeSingle();
  if (!agencia) return { ok: false, status: "falha", motivo: "agência não encontrada" };
  if (!agencia.cobranca_ativa) return { ok: false, status: "pulada", motivo: "cobrança desativada na agência" };
  if (!agencia.whatsapp_cobranca) return { ok: false, status: "falha", motivo: "whatsapp_cobranca não preenchido na agência" };

  // Idempotência por mês de referência (1º dia do mês corrente)
  const hoje = new Date();
  const mesRef = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10);

  if (input.motivo !== "manual") {
    const { data: jaEnviado } = await sb
      .from("super_admin_cobrancas_log")
      .select("id")
      .eq("agencia_id", input.agenciaId)
      .eq("mes_referencia", mesRef)
      .eq("status", "enviada")
      .maybeSingle();
    if (jaEnviado) return { ok: false, status: "pulada", motivo: "já cobrada esse mês" };
  }

  // Render template
  const venc = agencia.vencimento_em ? new Date(agencia.vencimento_em + "T00:00:00") : null;
  const valor = Number(agencia.valor_mensal || 29);
  const dia = venc?.getDate() || hoje.getDate();
  const mes = (venc?.getMonth() || hoje.getMonth()) + 1;
  const ano = venc?.getFullYear() || hoje.getFullYear();
  const dias = venc ? Math.max(0, Math.ceil((venc.getTime() - hoje.getTime()) / 86_400_000)) : 0;
  const diaVencFmt = venc ? venc.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo" }) : "—";

  const texto = renderTemplate(cfg.template_texto, {
    nome: agencia.nome,
    valor,
    dia, mes, ano,
    dias_para_vencer: dias,
    dia_vencimento: diaVencFmt,
  });

  // Envia
  try {
    const r = await instanceSendText({ baseUrl: url, token }, { number: agencia.whatsapp_cobranca, text: texto });
    await sb.from("super_admin_cobrancas_log").insert({
      agencia_id: input.agenciaId,
      valor,
      mes_referencia: mesRef,
      canal_id: cfg.canal_id,
      status: "enviada",
      wa_message_id: r.id || null,
      whatsapp_destino: agencia.whatsapp_cobranca,
      texto_enviado: texto,
      motivo: input.motivo || "manual",
    });
    return { ok: true, status: "enviada", wa_message_id: r.id };
  } catch (e) {
    const erro = e instanceof Error ? e.message : String(e);
    await sb.from("super_admin_cobrancas_log").insert({
      agencia_id: input.agenciaId,
      valor,
      mes_referencia: mesRef,
      canal_id: cfg.canal_id,
      status: "falha",
      whatsapp_destino: agencia.whatsapp_cobranca,
      texto_enviado: texto,
      erro,
      motivo: input.motivo || "manual",
    });
    return { ok: false, status: "falha", erro };
  }
}

/**
 * Job diário: cobra 1 dia antes do vencimento + bloqueia acessos vencidos.
 */
export interface CobrancaJobResultado {
  cobranças_disparadas: number;
  cobranças_puladas: number;
  cobranças_falhas: number;
  acessos_bloqueados: number;
  acessos_desbloqueados: number;
  processadas: number;
}

export async function processarCobrancasDiarias(): Promise<CobrancaJobResultado> {
  const sb = createServiceClient();
  const res: CobrancaJobResultado = {
    cobranças_disparadas: 0,
    cobranças_puladas: 0,
    cobranças_falhas: 0,
    acessos_bloqueados: 0,
    acessos_desbloqueados: 0,
    processadas: 0,
  };

  const hoje = new Date();
  const hojeISO = hoje.toISOString().slice(0, 10);
  const amanha = new Date(hoje.getTime() + 86_400_000).toISOString().slice(0, 10);

  // Bloqueia acessos vencidos não pagos
  const { data: vencidas } = await sb
    .from("agencias")
    .select("id, acesso_bloqueado")
    .lt("vencimento_em", hojeISO)
    .eq("cobranca_ativa", true)
    .eq("acesso_bloqueado", false);
  for (const a of vencidas || []) {
    await sb.from("agencias").update({ acesso_bloqueado: true }).eq("id", a.id);
    res.acessos_bloqueados++;
  }

  // Cobranças 1 dia antes
  const { data: vencemAmanha } = await sb
    .from("agencias")
    .select("id")
    .eq("vencimento_em", amanha)
    .eq("cobranca_ativa", true);
  for (const a of vencemAmanha || []) {
    res.processadas++;
    const r = await dispararCobranca({ sb, agenciaId: a.id, motivo: "auto_1d_antes" });
    if (r.status === "enviada") res.cobranças_disparadas++;
    else if (r.status === "pulada") res.cobranças_puladas++;
    else res.cobranças_falhas++;
  }

  return res;
}

/** Roberto marca pagamento manualmente. Vencimento avança N meses. */
export async function marcarPago(agenciaId: string, mesesAvancar = 1): Promise<{ vencimento_em: string }> {
  const sb = createServiceClient();
  const { data: ag } = await sb.from("agencias").select("vencimento_em").eq("id", agenciaId).single();
  const base = ag?.vencimento_em ? new Date(ag.vencimento_em + "T00:00:00") : new Date();
  // Avança N meses
  const nova = new Date(base.getFullYear(), base.getMonth() + mesesAvancar, base.getDate());
  const novaISO = nova.toISOString().slice(0, 10);
  await sb.from("agencias").update({
    ultimo_pagamento_em: new Date().toISOString(),
    vencimento_em: novaISO,
    acesso_bloqueado: false,
  }).eq("id", agenciaId);
  return { vencimento_em: novaISO };
}

/** Estende vencimento sem registrar pagamento (pra cliente que paga adiantado mas você ainda quer registrar como X meses). */
export async function estenderVencimento(agenciaId: string, mesesAvancar: number): Promise<{ vencimento_em: string }> {
  return marcarPago(agenciaId, mesesAvancar);
}
