"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/crm/permissions";
import { createServiceClient } from "@/lib/supabase/service";

export async function criarQuadro(nome: string, descricao: string, cor: string): Promise<{ ok: boolean; id?: string; msg?: string }> {
  const ctx = await requireAuth();
  if (!nome.trim()) return { ok: false, msg: "Nome obrigatório" };
  const sb = createServiceClient();
  const { data, error } = await sb.from("kanban_quadros").insert({
    agencia_id: ctx.agenciaId,
    nome: nome.trim(),
    descricao: descricao.trim() || null,
    cor: cor || "#00E19A",
  }).select("id").single();
  if (error) return { ok: false, msg: error.message };
  // Cria 3 colunas default: "A fazer", "Em andamento", "Concluído"
  const colunasDefault = [
    { nome: "A fazer", cor: "#FFB547", ordem: 0 },
    { nome: "Em andamento", cor: "#5cd0ff", ordem: 1 },
    { nome: "Concluído", cor: "#00E19A", ordem: 2 },
  ];
  await sb.from("kanban_colunas").insert(colunasDefault.map((c) => ({
    quadro_id: data.id,
    agencia_id: ctx.agenciaId,
    nome: c.nome,
    cor: c.cor,
    ordem: c.ordem,
  })));
  revalidatePath("/kanban");
  return { ok: true, id: data.id as string };
}

export async function deletarQuadro(id: string): Promise<{ ok: boolean; msg?: string }> {
  const ctx = await requireAuth();
  const sb = createServiceClient();
  const { error } = await sb.from("kanban_quadros").update({ deleted_at: new Date().toISOString() }).eq("id", id).eq("agencia_id", ctx.agenciaId);
  if (error) return { ok: false, msg: error.message };
  revalidatePath("/kanban");
  return { ok: true };
}

export async function criarColuna(quadroId: string, nome: string, cor: string): Promise<{ ok: boolean; id?: string; msg?: string }> {
  const ctx = await requireAuth();
  if (!nome.trim()) return { ok: false, msg: "Nome obrigatório" };
  const sb = createServiceClient();
  const { data: maxRow } = await sb.from("kanban_colunas").select("ordem").eq("quadro_id", quadroId).order("ordem", { ascending: false }).limit(1).maybeSingle();
  const ordem = (maxRow?.ordem as number ?? -1) + 1;
  const { data, error } = await sb.from("kanban_colunas").insert({
    quadro_id: quadroId,
    agencia_id: ctx.agenciaId,
    nome: nome.trim(),
    cor: cor || "#5cd0ff",
    ordem,
  }).select("id").single();
  if (error) return { ok: false, msg: error.message };
  revalidatePath("/kanban");
  return { ok: true, id: data.id as string };
}

export async function deletarColuna(id: string): Promise<{ ok: boolean; msg?: string }> {
  const ctx = await requireAuth();
  const sb = createServiceClient();
  const { error } = await sb.from("kanban_colunas").delete().eq("id", id).eq("agencia_id", ctx.agenciaId);
  if (error) return { ok: false, msg: error.message };
  revalidatePath("/kanban");
  return { ok: true };
}

export async function criarCard(colunaId: string, titulo: string, descricao: string): Promise<{ ok: boolean; id?: string; msg?: string }> {
  const ctx = await requireAuth();
  if (!titulo.trim()) return { ok: false, msg: "Título obrigatório" };
  const sb = createServiceClient();
  const { data: maxRow } = await sb.from("kanban_cards").select("ordem").eq("coluna_id", colunaId).order("ordem", { ascending: false }).limit(1).maybeSingle();
  const ordem = (maxRow?.ordem as number ?? -1) + 1;
  const { data, error } = await sb.from("kanban_cards").insert({
    coluna_id: colunaId,
    agencia_id: ctx.agenciaId,
    titulo: titulo.trim(),
    descricao: descricao.trim() || null,
    ordem,
  }).select("id").single();
  if (error) return { ok: false, msg: error.message };
  revalidatePath("/kanban");
  return { ok: true, id: data.id as string };
}

export async function deletarCard(id: string): Promise<{ ok: boolean; msg?: string }> {
  const ctx = await requireAuth();
  const sb = createServiceClient();
  const { error } = await sb.from("kanban_cards").delete().eq("id", id).eq("agencia_id", ctx.agenciaId);
  if (error) return { ok: false, msg: error.message };
  revalidatePath("/kanban");
  return { ok: true };
}

/** Move card pra outra coluna + atualiza ordem. */
export async function moverCard(cardId: string, novaColunaId: string, novaOrdem: number): Promise<{ ok: boolean; msg?: string }> {
  const ctx = await requireAuth();
  const sb = createServiceClient();
  const { error } = await sb.from("kanban_cards").update({
    coluna_id: novaColunaId,
    ordem: novaOrdem,
    atualizado_em: new Date().toISOString(),
  }).eq("id", cardId).eq("agencia_id", ctx.agenciaId);
  if (error) return { ok: false, msg: error.message };
  revalidatePath("/kanban");
  return { ok: true };
}
