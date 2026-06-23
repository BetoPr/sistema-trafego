"use server";

import { revalidatePath } from "next/cache";
import { requireUserWithAgencia } from "@/lib/auth";

type Tipo = "gasto_dia" | "gasto_mes";

interface Payload {
  nome: string;
  integracao_id: string;
  cliente_id: string | null;
  tipo: Tipo;
  limite_valor: number;
  destino_numero: string;
  canal_id: string | null;
  mensagem_template: string;
}

function parsePayload(formData: FormData): Payload | { erro: string } {
  const nome = String(formData.get("nome") || "").trim();
  if (!nome) return { erro: "Nome obrigatório" };

  const integracao_id = String(formData.get("integracao_id") || "").trim();
  if (!integracao_id) return { erro: "Conta Meta obrigatória" };

  const tipo = String(formData.get("tipo") || "") as Tipo;
  if (!["gasto_dia", "gasto_mes"].includes(tipo)) return { erro: "Tipo inválido" };

  const limiteRaw = String(formData.get("limite_valor") || "").trim().replace(/\./g, "").replace(",", ".");
  const limite_valor = Number(limiteRaw);
  if (!Number.isFinite(limite_valor) || limite_valor <= 0) return { erro: "Limite inválido" };

  const destino_numero = String(formData.get("destino_numero") || "").trim().replace(/\D/g, "");
  if (destino_numero.length < 10) return { erro: "Telefone inválido (use DDI+DDD+número)" };

  const canal_id = String(formData.get("canal_id") || "").trim() || null;
  const cliente_id = String(formData.get("cliente_id") || "").trim() || null;

  const mensagem_template =
    String(formData.get("mensagem_template") || "").trim() ||
    "Olá! O gasto da conta {{conta}} bateu R$ {{gasto}} (limite R$ {{limite}}). Considere ajustar o orçamento.";

  return { nome, integracao_id, cliente_id, tipo, limite_valor, destino_numero, canal_id, mensagem_template };
}

export async function criarAlertaMeta(formData: FormData) {
  const { supabase, usuario } = await requireUserWithAgencia();
  if (!usuario.agencia_id) return { erro: "Sem agência" };

  const payload = parsePayload(formData);
  if ("erro" in payload) return payload;

  const { error } = await supabase.from("alertas_meta").insert({
    agencia_id: usuario.agencia_id,
    integracao_id: payload.integracao_id,
    cliente_id: payload.cliente_id,
    nome: payload.nome,
    tipo: payload.tipo,
    limite_valor: payload.limite_valor,
    destino_numero: payload.destino_numero,
    canal_id: payload.canal_id,
    mensagem_template: payload.mensagem_template,
  });

  if (error) return { erro: error.message };
  revalidatePath("/alertas");
  return { ok: true };
}

export async function atualizarAlertaMeta(id: string, formData: FormData) {
  const { supabase, usuario } = await requireUserWithAgencia();
  if (!usuario.agencia_id) return { erro: "Sem agência" };

  const payload = parsePayload(formData);
  if ("erro" in payload) return payload;

  const { error } = await supabase
    .from("alertas_meta")
    .update({
      integracao_id: payload.integracao_id,
      cliente_id: payload.cliente_id,
      nome: payload.nome,
      tipo: payload.tipo,
      limite_valor: payload.limite_valor,
      destino_numero: payload.destino_numero,
      canal_id: payload.canal_id,
      mensagem_template: payload.mensagem_template,
    })
    .eq("id", id)
    .eq("agencia_id", usuario.agencia_id);

  if (error) return { erro: error.message };
  revalidatePath("/alertas");
  return { ok: true };
}

export async function toggleAlertaMeta(id: string, ativo: boolean) {
  const { supabase, usuario } = await requireUserWithAgencia();
  if (!usuario.agencia_id) return { erro: "Sem agência" };

  const { error } = await supabase
    .from("alertas_meta")
    .update({ ativo })
    .eq("id", id)
    .eq("agencia_id", usuario.agencia_id);

  if (error) return { erro: error.message };
  revalidatePath("/alertas");
  return { ok: true };
}

export async function deletarAlertaMeta(id: string) {
  const { supabase, usuario } = await requireUserWithAgencia();
  if (!usuario.agencia_id) return { erro: "Sem agência" };

  const { error } = await supabase.from("alertas_meta").delete().eq("id", id).eq("agencia_id", usuario.agencia_id);
  if (error) return { erro: error.message };
  revalidatePath("/alertas");
  return { ok: true };
}

export async function testarAlertaMeta(id: string) {
  // dispara worker apenas pra esse alerta (forçando reset do anti-spam)
  const { supabase, usuario } = await requireUserWithAgencia();
  if (!usuario.agencia_id) return { erro: "Sem agência" };

  // limpa último disparo pra forçar reprocesso
  await supabase
    .from("alertas_meta")
    .update({ ultimo_disparo_em: null })
    .eq("id", id)
    .eq("agencia_id", usuario.agencia_id);

  // chama worker via fetch local (endpoint cron) — bearer interno
  const secret = process.env.CRON_SECRET;
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  if (!secret) return { erro: "CRON_SECRET ausente" };

  const res = await fetch(`${base.replace(/\/$/, "")}/api/cron/alertas-meta`, {
    headers: { authorization: `Bearer ${secret}` },
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  revalidatePath("/alertas");
  return { ok: res.ok, detalhe: json };
}
