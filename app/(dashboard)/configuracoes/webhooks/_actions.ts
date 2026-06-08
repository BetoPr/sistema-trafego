"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/crm/permissions";
import { createServiceClient } from "@/lib/supabase/service";
import { audit } from "@/lib/crm/audit";

const EVENTOS_VALIDOS = [
  "mensagem.recebida",
  "mensagem.enviada",
  "ticket.criado",
  "ticket.fechado",
  "pagamento.recebido",
  "contato.criado",
  "etiqueta.adicionada",
] as const;

export async function criarWebhook(formData: FormData) {
  const ctx = await requireAdmin();
  const nome = String(formData.get("nome") || "").trim();
  const url = String(formData.get("url") || "").trim();
  const eventos = EVENTOS_VALIDOS.filter((e) => formData.get(`ev_${e}`) === "on");

  if (!nome || !url || eventos.length === 0) redirect("/configuracoes/webhooks?erro=campos");
  if (!url.startsWith("http")) redirect("/configuracoes/webhooks?erro=url");

  const sb = createServiceClient();
  const { data: novo, error } = await sb.from("webhooks_out").insert({ agencia_id: ctx.agenciaId, nome, url, eventos }).select("id").single();
  if (error) redirect(`/configuracoes/webhooks?erro=db&msg=${encodeURIComponent(error.message)}`);
  await audit({ agenciaId: ctx.agenciaId, usuarioId: ctx.userId, acao: "create", entidade: "webhook_out", entidadeId: novo.id });
  revalidatePath("/configuracoes/webhooks");
  redirect("/configuracoes/webhooks?ok=criado");
}

export async function alternarAtivo(formData: FormData) {
  const ctx = await requireAdmin();
  const id = String(formData.get("id") || "");
  const ativo = formData.get("ativo") === "true";
  const sb = createServiceClient();
  await sb.from("webhooks_out").update({ ativo: !ativo }).eq("id", id).eq("agencia_id", ctx.agenciaId);
  revalidatePath("/configuracoes/webhooks");
  redirect("/configuracoes/webhooks?ok=alterado");
}

export async function deletarWebhook(formData: FormData) {
  const ctx = await requireAdmin();
  const id = String(formData.get("id") || "");
  const sb = createServiceClient();
  await sb.from("webhooks_out").delete().eq("id", id).eq("agencia_id", ctx.agenciaId);
  await audit({ agenciaId: ctx.agenciaId, usuarioId: ctx.userId, acao: "delete", entidade: "webhook_out", entidadeId: id });
  revalidatePath("/configuracoes/webhooks");
  redirect("/configuracoes/webhooks?ok=deletado");
}

export async function testarWebhook(formData: FormData) {
  const ctx = await requireAdmin();
  const id = String(formData.get("id") || "");
  const sb = createServiceClient();
  const { data: w } = await sb.from("webhooks_out").select("url, secret").eq("id", id).eq("agencia_id", ctx.agenciaId).single();
  if (!w) redirect("/configuracoes/webhooks?erro=nao_encontrado");

  const body = JSON.stringify({ evento: "teste", ts: new Date().toISOString(), data: { ping: true } });
  let status = 0;
  let erro: string | null = null;
  try {
    const r = await fetch(w.url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-sistema-trafego-event": "teste" },
      body,
    });
    status = r.status;
  } catch (e) {
    erro = e instanceof Error ? e.message : String(e);
  }
  await sb.from("webhooks_out_logs").insert({
    webhook_id: id,
    agencia_id: ctx.agenciaId,
    evento: "teste",
    payload: { ping: true },
    status_code: status || null,
    erro,
    tentativa: 1,
  });
  redirect(`/configuracoes/webhooks?ok=teste&msg=${encodeURIComponent(`Status ${status}${erro ? ` — ${erro}` : ""}`)}`);
}
