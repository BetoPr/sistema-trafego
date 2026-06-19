"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/crm/permissions";
import { createServiceClient } from "@/lib/supabase/service";
import { audit } from "@/lib/crm/audit";

function digits(s: string): string {
  return s.replace(/\D/g, "");
}

export async function criarContato(formData: FormData) {
  const ctx = await requireAuth();
  const nome = String(formData.get("nome") || "").trim();
  const whatsapp = digits(String(formData.get("whatsapp") || ""));
  const email = String(formData.get("email") || "").trim() || null;
  const empresa = String(formData.get("empresa") || "").trim() || null;
  const cidade = String(formData.get("cidade") || "").trim() || null;

  if (!nome) redirect("/contatos?erro=nome_vazio");

  const sb = createServiceClient();
  const waId = whatsapp ? `${whatsapp}@s.whatsapp.net` : null;
  const { data, error } = await sb
    .from("contatos")
    .insert({
      agencia_id: ctx.agenciaId,
      nome,
      primeiro_nome: nome.split(" ")[0],
      whatsapp: whatsapp || null,
      wa_id: waId,
      email,
      empresa,
      cidade,
    })
    .select("id")
    .single();
  if (error) redirect(`/contatos?erro=db&msg=${encodeURIComponent(error.message)}`);

  await audit({ agenciaId: ctx.agenciaId, usuarioId: ctx.userId, acao: "create", entidade: "contato", entidadeId: data.id });

  // Fechamento opcional "por fora": cria ticket sintético já fechado com a venda
  const fechValorRaw = String(formData.get("fech_valor") || "").trim();
  if (fechValorRaw) {
    const valor = Number(fechValorRaw.replace(",", "."));
    if (Number.isFinite(valor) && valor > 0) {
      const servico = String(formData.get("fech_servico") || "").trim() || null;
      const qtdRaw = String(formData.get("fech_qtd") || "").trim();
      const quantidade = qtdRaw ? Number(qtdRaw) : 1;
      const meta: Record<string, unknown> = { origem: "manual_contato" };
      if (servico) meta.servico = servico;
      if (Number.isFinite(quantidade)) meta.quantidade = quantidade;

      const { data: tk, error: tkErr } = await sb
        .from("tickets")
        .insert({
          agencia_id: ctx.agenciaId,
          contato_id: data.id,
          status: "fechado",
          valor_fechado: valor,
          metadata: meta,
          fechado_em: new Date().toISOString(),
          fechado_por: ctx.userId,
          ultima_mensagem_preview: "[fechamento manual]",
        })
        .select("id")
        .single();
      if (tkErr) {
        console.error("[criarContato] ticket fechamento manual:", tkErr.message);
      } else {
        await audit({ agenciaId: ctx.agenciaId, usuarioId: ctx.userId, acao: "create", entidade: "ticket_fechamento", entidadeId: tk.id, payload: { valor, servico, quantidade, origem: "manual_contato" } });
      }
    }
  }

  revalidatePath("/contatos");
  redirect("/contatos?ok=criado");
}

export async function atualizarContato(formData: FormData) {
  const ctx = await requireAuth();
  const id = String(formData.get("id") || "");
  const nome = String(formData.get("nome") || "").trim();
  const whatsapp = digits(String(formData.get("whatsapp") || ""));

  const patch: Record<string, unknown> = {
    nome,
    primeiro_nome: nome.split(" ")[0],
    whatsapp: whatsapp || null,
    wa_id: whatsapp ? `${whatsapp}@s.whatsapp.net` : null,
    updated_at: new Date().toISOString(),
  };
  // Email/empresa/cidade saíram do form de edição — só atualiza se o campo
  // vier no form (preserva valores existentes de outras fontes).
  if (formData.has("email")) patch.email = String(formData.get("email") || "").trim() || null;
  if (formData.has("empresa")) patch.empresa = String(formData.get("empresa") || "").trim() || null;
  if (formData.has("cidade")) patch.cidade = String(formData.get("cidade") || "").trim() || null;

  const sb = createServiceClient();
  const { error } = await sb
    .from("contatos")
    .update(patch)
    .eq("id", id)
    .eq("agencia_id", ctx.agenciaId);
  if (error) redirect(`/contatos?erro=db&msg=${encodeURIComponent(error.message)}`);

  // Sincroniza etiquetas: form manda etiqueta_id[] = marcadas.
  // Atual = no banco. Diff: remove desmarcadas, insere novas.
  // Se o form NÃO tiver nenhum campo etiqueta_id, ainda assim queremos
  // reconhecer "todas desmarcadas". Detectamos pela presença do form
  // de edição via hidden marker.
  const formEtiquetas = formData.getAll("etiqueta_id").map(String).filter(Boolean);
  // Pega etiquetas atuais
  const { data: atual } = await sb
    .from("contato_etiquetas")
    .select("etiqueta_id")
    .eq("contato_id", id);
  const setAtual = new Set((atual || []).map((r) => r.etiqueta_id as string));
  const setNova = new Set(formEtiquetas);

  const adicionar = [...setNova].filter((eid) => !setAtual.has(eid));
  const remover = [...setAtual].filter((eid) => !setNova.has(eid));

  if (adicionar.length > 0) {
    await sb.from("contato_etiquetas").insert(adicionar.map((eid) => ({ contato_id: id, etiqueta_id: eid })));
  }
  if (remover.length > 0) {
    await sb.from("contato_etiquetas").delete().eq("contato_id", id).in("etiqueta_id", remover);
  }

  await audit({ agenciaId: ctx.agenciaId, usuarioId: ctx.userId, acao: "update", entidade: "contato", entidadeId: id, payload: { etiquetas_adicionadas: adicionar.length, etiquetas_removidas: remover.length } });
  revalidatePath("/contatos");
  redirect("/contatos?ok=atualizado");
}

/**
 * Edição rápida via balão (sem navegar pra /contatos). Só campos editáveis:
 * nome + whatsapp (display). NÃO toca em wa_id — preserva o vínculo do chat
 * importado (@lid). Retorna JSON (sem redirect) pra UI fechar o balão.
 */
export async function salvarContatoBasico(input: { id: string; nome: string; whatsapp: string }): Promise<{ ok: boolean; erro?: string }> {
  const ctx = await requireAuth();
  const nome = (input.nome || "").trim();
  if (!nome) return { ok: false, erro: "Nome obrigatório." };
  const whatsapp = digits(input.whatsapp || "");

  const sb = createServiceClient();
  const { error } = await sb
    .from("contatos")
    .update({
      nome,
      primeiro_nome: nome.split(" ")[0],
      whatsapp: whatsapp || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .eq("agencia_id", ctx.agenciaId);
  if (error) return { ok: false, erro: error.message };

  await audit({ agenciaId: ctx.agenciaId, usuarioId: ctx.userId, acao: "update", entidade: "contato", entidadeId: input.id, payload: { via: "balao" } });
  revalidatePath("/contatos");
  revalidatePath("/atendimentos");
  return { ok: true };
}

export async function deletarContato(formData: FormData) {
  const ctx = await requireAuth();
  const id = String(formData.get("id") || "");
  const sb = createServiceClient();
  await sb
    .from("contatos")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("agencia_id", ctx.agenciaId);
  await audit({ agenciaId: ctx.agenciaId, usuarioId: ctx.userId, acao: "delete", entidade: "contato", entidadeId: id });
  revalidatePath("/contatos");
  redirect("/contatos?ok=deletado");
}
