"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/crm/permissions";
import { createServiceClient } from "@/lib/supabase/service";
import { encryptToken } from "@/lib/crypto/tokens";
import { audit } from "@/lib/crm/audit";

export async function salvarConfigAsaas(formData: FormData) {
  const ctx = await requireAdmin();
  const apiKey = String(formData.get("api_key") || "").trim();
  const ambiente = String(formData.get("ambiente") || "producao");
  const pixTipo = String(formData.get("pix_tipo_chave") || "EVP");
  const pixChave = String(formData.get("pix_chave") || "").trim() || null;
  const pixNome = String(formData.get("pix_nome_recebedor") || "").trim() || null;
  const pixMsg = String(formData.get("pix_mensagem_padrao") || "").trim() || null;
  const msgPag = String(formData.get("mensagem_pagamento_auto") || "").trim() || "Recebi seu pagamento! 😊";
  const ativo = formData.get("ativo") === "on";

  const sb = createServiceClient();
  const patch: Record<string, unknown> = {
    agencia_id: ctx.agenciaId,
    ambiente,
    pix_tipo_chave: pixTipo,
    pix_chave: pixChave,
    pix_nome_recebedor: pixNome,
    pix_mensagem_padrao: pixMsg,
    mensagem_pagamento_auto: msgPag,
    ativo,
    updated_at: new Date().toISOString(),
  };
  if (apiKey && apiKey !== "•••GUARDADO•••") {
    patch.api_key_encrypted = encryptToken(apiKey);
  }

  // Upsert por agencia_id
  const { data: existente } = await sb.from("asaas_config").select("id").eq("agencia_id", ctx.agenciaId).maybeSingle();
  if (existente) {
    await sb.from("asaas_config").update(patch).eq("id", existente.id);
  } else {
    if (!apiKey) redirect("/configuracoes/asaas?erro=api_key_obrigatoria");
    await sb.from("asaas_config").insert(patch);
  }

  await audit({ agenciaId: ctx.agenciaId, usuarioId: ctx.userId, acao: "config_change", entidade: "asaas_config", payload: { ambiente, ativo } });
  revalidatePath("/configuracoes/asaas");
  redirect("/configuracoes/asaas?ok=salvo");
}
