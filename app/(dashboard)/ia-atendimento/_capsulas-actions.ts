"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { requireRole } from "@/lib/crm/permissions";
import { audit } from "@/lib/crm/audit";
import { CAPSULA_TEMPLATES } from "@/lib/ia-atendimento/capsulas";

const ROUTE = "/ia-atendimento";

function templateBySlug(slug: string) {
  return CAPSULA_TEMPLATES.find((t) => t.slug === slug);
}

export async function adicionarCapsula(formData: FormData) {
  const ctx = await requireRole("admin", "super_admin");
  const perfilId = String(formData.get("perfil_id") || "");
  const slugRaw = String(formData.get("slug") || "").trim();
  const nomeCustom = String(formData.get("nome") || "").trim();
  if (!perfilId) redirect(`${ROUTE}`);

  const sb = createServiceClient();
  // Confirma perfil pertence à agência
  const { data: perfil } = await sb
    .from("ia_atendimento_perfis")
    .select("id, agencia_id")
    .eq("id", perfilId)
    .single();
  if (!perfil || perfil.agencia_id !== ctx.agenciaId) {
    redirect(`${ROUTE}?erro=permissao`);
  }

  const tpl = templateBySlug(slugRaw);
  // Slug único: se já existe alguma com esse slug, sufixar
  let slug = tpl?.slug || `custom_${Date.now()}`;
  if (slugRaw === "custom") slug = `custom_${Date.now()}`;

  const nome = tpl?.nome || nomeCustom || "Cápsula custom";
  const icone = tpl?.icone || "ti-package";
  const cor = tpl?.cor || "#00E19A";
  const keywords = tpl?.keywords || [];

  // Ordem = max + 1
  const { data: maxRow } = await sb
    .from("ia_atendimento_capsulas")
    .select("ordem")
    .eq("perfil_id", perfilId)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();
  const ordem = (maxRow?.ordem ?? -1) + 1;

  await sb.from("ia_atendimento_capsulas").insert({
    perfil_id: perfilId,
    agencia_id: ctx.agenciaId,
    slug,
    nome,
    icone,
    cor,
    conteudo: "",
    keywords,
    ordem,
    ativa: true,
  });

  void audit({
    agenciaId: ctx.agenciaId,
    usuarioId: ctx.userId,
    acao: "create",
    entidade: "ia_capsula",
    payload: { perfilId, slug, nome },
  });

  revalidatePath(ROUTE);
  redirect(`${ROUTE}?editar=${perfilId}&ok=capsula_add`);
}

export async function salvarCapsula(formData: FormData) {
  const ctx = await requireRole("admin", "super_admin");
  const id = String(formData.get("id") || "");
  const perfilId = String(formData.get("perfil_id") || "");
  if (!id || !perfilId) redirect(ROUTE);

  const sb = createServiceClient();
  const { data: cap } = await sb
    .from("ia_atendimento_capsulas")
    .select("id, agencia_id")
    .eq("id", id)
    .single();
  if (!cap || cap.agencia_id !== ctx.agenciaId) redirect(`${ROUTE}?erro=permissao`);

  const nome = String(formData.get("nome") || "").trim() || "Cápsula";
  const conteudo = String(formData.get("conteudo") || "");
  const keywordsRaw = String(formData.get("keywords") || "").trim();
  const keywords = keywordsRaw
    ? keywordsRaw
        .split(/[,\n]/)
        .map((k) => k.trim())
        .filter((k) => k.length > 0)
        .slice(0, 30)
    : [];
  const ativa = formData.get("ativa") === "on";

  await sb
    .from("ia_atendimento_capsulas")
    .update({ nome, conteudo, keywords, ativa, updated_at: new Date().toISOString() })
    .eq("id", id);

  void audit({
    agenciaId: ctx.agenciaId,
    usuarioId: ctx.userId,
    acao: "update",
    entidade: "ia_capsula",
    entidadeId: id,
    payload: { nome, ativa, keywords: keywords.length },
  });

  revalidatePath(ROUTE);
  redirect(`${ROUTE}?editar=${perfilId}&ok=capsula_salva`);
}

export async function alternarAtivaCapsula(formData: FormData) {
  const ctx = await requireRole("admin", "super_admin");
  const id = String(formData.get("id") || "");
  const perfilId = String(formData.get("perfil_id") || "");
  if (!id || !perfilId) redirect(ROUTE);

  const sb = createServiceClient();
  const { data: cap } = await sb
    .from("ia_atendimento_capsulas")
    .select("id, agencia_id, ativa")
    .eq("id", id)
    .single();
  if (!cap || cap.agencia_id !== ctx.agenciaId) redirect(`${ROUTE}?erro=permissao`);

  await sb
    .from("ia_atendimento_capsulas")
    .update({ ativa: !cap.ativa, updated_at: new Date().toISOString() })
    .eq("id", id);

  revalidatePath(ROUTE);
  redirect(`${ROUTE}?editar=${perfilId}`);
}

export async function deletarCapsula(formData: FormData) {
  const ctx = await requireRole("admin", "super_admin");
  const id = String(formData.get("id") || "");
  const perfilId = String(formData.get("perfil_id") || "");
  if (!id || !perfilId) redirect(ROUTE);

  const sb = createServiceClient();
  const { data: cap } = await sb
    .from("ia_atendimento_capsulas")
    .select("id, agencia_id, nome")
    .eq("id", id)
    .single();
  if (!cap || cap.agencia_id !== ctx.agenciaId) redirect(`${ROUTE}?erro=permissao`);

  await sb.from("ia_atendimento_capsulas").delete().eq("id", id);

  void audit({
    agenciaId: ctx.agenciaId,
    usuarioId: ctx.userId,
    acao: "delete",
    entidade: "ia_capsula",
    entidadeId: id,
    payload: { nome: cap.nome },
  });

  revalidatePath(ROUTE);
  redirect(`${ROUTE}?editar=${perfilId}&ok=capsula_del`);
}
