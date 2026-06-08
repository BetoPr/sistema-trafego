"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/crm/permissions";
import { createServiceClient } from "@/lib/supabase/service";
import { audit } from "@/lib/crm/audit";

type Chave = "sentimento" | "resumo" | "sugestao_resposta";

export async function salvarPrompt(formData: FormData) {
  const ctx = await requireAdmin();
  const chave = String(formData.get("chave") || "") as Chave;
  const conteudo = String(formData.get("conteudo") || "").trim();
  const modelo = String(formData.get("modelo") || "").trim() || null;
  const escopo = String(formData.get("escopo") || "agencia"); // 'agencia' ou 'global'

  if (!["sentimento", "resumo", "sugestao_resposta"].includes(chave)) {
    redirect("/configuracoes/ia-prompts?erro=chave_invalida");
  }
  if (!conteudo) {
    redirect("/configuracoes/ia-prompts?erro=conteudo_vazio");
  }

  const targetAgencia = escopo === "global" ? null : ctx.agenciaId;
  if (escopo === "global" && ctx.role !== "super_admin") {
    redirect("/configuracoes/ia-prompts?erro=permissao_negada");
  }

  const sb = createServiceClient();
  const nome =
    chave === "sentimento"
      ? "Análise de sentimento"
      : chave === "resumo"
        ? "Resumo da conversa"
        : "Sugestão de resposta";

  // Upsert manual (não posso usar UPSERT com agencia_id NULL diretamente).
  const filtro = sb.from("ia_prompts").select("id").eq("chave", chave);
  const { data: existente } =
    targetAgencia === null
      ? await filtro.is("agencia_id", null).maybeSingle()
      : await filtro.eq("agencia_id", targetAgencia).maybeSingle();

  if (existente) {
    const { error } = await sb
      .from("ia_prompts")
      .update({
        conteudo,
        modelo_default: modelo,
        nome,
        ativo: true,
        atualizado_por: ctx.userId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existente.id);
    if (error) redirect(`/configuracoes/ia-prompts?erro=db_error&msg=${encodeURIComponent(error.message)}`);
  } else {
    const { error } = await sb.from("ia_prompts").insert({
      agencia_id: targetAgencia,
      chave,
      nome,
      conteudo,
      modelo_default: modelo,
      ativo: true,
      atualizado_por: ctx.userId,
    });
    if (error) redirect(`/configuracoes/ia-prompts?erro=db_error&msg=${encodeURIComponent(error.message)}`);
  }

  await audit({
    agenciaId: ctx.agenciaId,
    usuarioId: ctx.userId,
    acao: "config_change",
    entidade: "ia_prompt",
    entidadeId: chave,
    payload: { escopo, chave, modelo },
  });

  revalidatePath("/configuracoes/ia-prompts");
  redirect(`/configuracoes/ia-prompts?ok=salvo&chave=${chave}`);
}

export async function resetarParaDefault(formData: FormData) {
  const ctx = await requireAdmin();
  const chave = String(formData.get("chave") || "") as Chave;

  const sb = createServiceClient();
  // Deleta override da agência → cai pro global automaticamente.
  await sb.from("ia_prompts").delete().eq("agencia_id", ctx.agenciaId).eq("chave", chave);

  await audit({
    agenciaId: ctx.agenciaId,
    usuarioId: ctx.userId,
    acao: "config_change",
    entidade: "ia_prompt",
    entidadeId: chave,
    payload: { acao: "reset_default" },
  });
  revalidatePath("/configuracoes/ia-prompts");
  redirect(`/configuracoes/ia-prompts?ok=reset&chave=${chave}`);
}
