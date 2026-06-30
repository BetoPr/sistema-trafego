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
  revalidatePath("/pipeline/kanban");
  return { ok: true, id: data.id as string };
}

export async function deletarQuadro(id: string): Promise<{ ok: boolean; msg?: string }> {
  const ctx = await requireAuth();
  const sb = createServiceClient();
  const { error } = await sb.from("kanban_quadros").update({ deleted_at: new Date().toISOString() }).eq("id", id).eq("agencia_id", ctx.agenciaId);
  if (error) return { ok: false, msg: error.message };
  revalidatePath("/pipeline/kanban");
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
  revalidatePath("/pipeline/kanban");
  return { ok: true, id: data.id as string };
}

export async function deletarColuna(id: string): Promise<{ ok: boolean; msg?: string }> {
  const ctx = await requireAuth();
  const sb = createServiceClient();
  const { error } = await sb.from("kanban_colunas").delete().eq("id", id).eq("agencia_id", ctx.agenciaId);
  if (error) return { ok: false, msg: error.message };
  revalidatePath("/pipeline/kanban");
  return { ok: true };
}

export async function salvarNotaColuna(id: string, nota: string): Promise<{ ok: boolean; msg?: string }> {
  const ctx = await requireAuth();
  const sb = createServiceClient();
  const { error } = await sb
    .from("kanban_colunas")
    .update({ nota: nota.trim() || null })
    .eq("id", id)
    .eq("agencia_id", ctx.agenciaId);
  if (error) return { ok: false, msg: error.message };
  revalidatePath("/pipeline/kanban");
  return { ok: true };
}

export async function editarColuna(id: string, nome: string, cor: string): Promise<{ ok: boolean; msg?: string }> {
  const ctx = await requireAuth();
  if (!nome.trim()) return { ok: false, msg: "Nome obrigatório" };
  const sb = createServiceClient();
  const { error } = await sb
    .from("kanban_colunas")
    .update({ nome: nome.trim(), cor: cor || "#5cd0ff" })
    .eq("id", id)
    .eq("agencia_id", ctx.agenciaId);
  if (error) return { ok: false, msg: error.message };
  revalidatePath("/pipeline/kanban");
  return { ok: true };
}

export async function salvarOrdemColunas(ids: string[]): Promise<{ ok: boolean; msg?: string }> {
  const ctx = await requireAuth();
  if (!ids.length) return { ok: false, msg: "Lista vazia" };
  const sb = createServiceClient();
  const N = ids.length;
  for (let i = 0; i < N; i++) {
    await sb.from("kanban_colunas").update({ ordem: -1000 - i }).eq("id", ids[i]).eq("agencia_id", ctx.agenciaId);
  }
  for (let i = 0; i < N; i++) {
    const { error } = await sb.from("kanban_colunas").update({ ordem: i }).eq("id", ids[i]).eq("agencia_id", ctx.agenciaId);
    if (error) return { ok: false, msg: error.message };
  }
  revalidatePath("/pipeline/kanban");
  return { ok: true };
}

export async function moverColuna(id: string, direcao: "esq" | "dir"): Promise<{ ok: boolean; msg?: string }> {
  const ctx = await requireAuth();
  const sb = createServiceClient();
  const { data: alvo, error: e1 } = await sb
    .from("kanban_colunas")
    .select("id, quadro_id, ordem")
    .eq("id", id)
    .eq("agencia_id", ctx.agenciaId)
    .maybeSingle();
  if (e1 || !alvo) return { ok: false, msg: "Coluna não encontrada" };
  const { data: irmas, error: e2 } = await sb
    .from("kanban_colunas")
    .select("id, ordem")
    .eq("quadro_id", alvo.quadro_id)
    .eq("agencia_id", ctx.agenciaId)
    .order("ordem", { ascending: true });
  if (e2 || !irmas) return { ok: false, msg: "Erro listando colunas" };
  const idx = irmas.findIndex((c) => c.id === id);
  const trocaIdx = direcao === "esq" ? idx - 1 : idx + 1;
  if (trocaIdx < 0 || trocaIdx >= irmas.length) return { ok: true };
  const troca = irmas[trocaIdx];
  const ordemAlvo = alvo.ordem;
  const ordemTroca = troca.ordem as number;
  await sb.from("kanban_colunas").update({ ordem: -1 - (alvo.ordem as number) }).eq("id", id).eq("agencia_id", ctx.agenciaId);
  await sb.from("kanban_colunas").update({ ordem: ordemAlvo }).eq("id", troca.id).eq("agencia_id", ctx.agenciaId);
  await sb.from("kanban_colunas").update({ ordem: ordemTroca }).eq("id", id).eq("agencia_id", ctx.agenciaId);
  revalidatePath("/pipeline/kanban");
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
  revalidatePath("/pipeline/kanban");
  return { ok: true, id: data.id as string };
}

export async function deletarCard(id: string): Promise<{ ok: boolean; msg?: string }> {
  const ctx = await requireAuth();
  const sb = createServiceClient();
  const { error } = await sb.from("kanban_cards").delete().eq("id", id).eq("agencia_id", ctx.agenciaId);
  if (error) return { ok: false, msg: error.message };
  revalidatePath("/pipeline/kanban");
  return { ok: true };
}

/** Salva regras de etiqueta pra coluna: idempotente (replace all). */
export async function salvarRegrasEtiqueta(colunaId: string, etiquetaIds: string[]): Promise<{ ok: boolean; msg?: string; total?: number }> {
  const ctx = await requireAuth();
  const sb = createServiceClient();
  // valida ownership da coluna
  const { data: col } = await sb.from("kanban_colunas").select("id").eq("id", colunaId).eq("agencia_id", ctx.agenciaId).maybeSingle();
  if (!col) return { ok: false, msg: "Coluna não encontrada" };
  // delete + reinsert
  await sb.from("kanban_regras_entrada").delete().eq("coluna_id", colunaId);
  if (etiquetaIds.length === 0) {
    revalidatePath("/pipeline/kanban");
    return { ok: true, total: 0 };
  }
  const linhas = etiquetaIds.map((eid) => ({
    coluna_id: colunaId,
    agencia_id: ctx.agenciaId,
    etiqueta_id: eid,
    ativo: true,
  }));
  const { error } = await sb.from("kanban_regras_entrada").insert(linhas);
  if (error) return { ok: false, msg: error.message };
  revalidatePath("/pipeline/kanban");
  return { ok: true, total: etiquetaIds.length };
}

/** Adiciona 1 contato existente como card numa coluna. Nao duplica no quadro. */
export async function adicionarContatoNaColuna(colunaId: string, contatoId: string): Promise<{ ok: boolean; msg?: string; jaExistia?: boolean }> {
  const ctx = await requireAuth();
  const sb = createServiceClient();
  const { data: col } = await sb.from("kanban_colunas").select("id, quadro_id").eq("id", colunaId).eq("agencia_id", ctx.agenciaId).maybeSingle();
  if (!col) return { ok: false, msg: "Coluna não encontrada" };
  const { data: contato } = await sb.from("contatos").select("id, nome").eq("id", contatoId).eq("agencia_id", ctx.agenciaId).maybeSingle();
  if (!contato) return { ok: false, msg: "Contato não encontrado" };
  // Verifica se contato já tem card neste quadro
  const { data: existente } = await sb
    .from("kanban_cards")
    .select("id, kanban_colunas!inner(quadro_id)")
    .eq("contato_id", contatoId)
    .eq("kanban_colunas.quadro_id", col.quadro_id)
    .maybeSingle();
  if (existente) return { ok: true, jaExistia: true };
  const { data: maxRow } = await sb.from("kanban_cards").select("ordem").eq("coluna_id", colunaId).order("ordem", { ascending: false }).limit(1).maybeSingle();
  const ordem = (maxRow?.ordem as number ?? -1) + 1;
  const { error } = await sb.from("kanban_cards").insert({
    coluna_id: colunaId,
    agencia_id: ctx.agenciaId,
    titulo: (contato.nome as string) || "Contato sem nome",
    contato_id: contatoId,
    ordem,
  });
  if (error) return { ok: false, msg: error.message };
  revalidatePath("/pipeline/kanban");
  return { ok: true };
}

/** Importa todos os contatos que têm a etiqueta selecionada → cards na coluna alvo. */
export async function importarContatosPorEtiqueta(colunaId: string, etiquetaId: string): Promise<{ ok: boolean; criados: number; pulados: number; msg?: string }> {
  const ctx = await requireAuth();
  const sb = createServiceClient();
  const { data: col } = await sb.from("kanban_colunas").select("id, quadro_id").eq("id", colunaId).eq("agencia_id", ctx.agenciaId).maybeSingle();
  if (!col) return { ok: false, criados: 0, pulados: 0, msg: "Coluna não encontrada" };

  // Contatos da agencia com a etiqueta
  const { data: ce } = await sb
    .from("contato_etiquetas")
    .select("contato_id, contatos!inner(id, nome, agencia_id)")
    .eq("etiqueta_id", etiquetaId)
    .eq("contatos.agencia_id", ctx.agenciaId);
  const candidatos = ((ce || []) as Array<{ contato_id: string; contatos: { nome: string | null } | { nome: string | null }[] | null }>).map((r) => {
    const c = Array.isArray(r.contatos) ? r.contatos[0] : r.contatos;
    return { id: r.contato_id, nome: c?.nome || null };
  });
  if (candidatos.length === 0) return { ok: true, criados: 0, pulados: 0 };

  // Cards ja existentes nesse quadro pra esses contatos
  const { data: existentes } = await sb
    .from("kanban_cards")
    .select("contato_id, kanban_colunas!inner(quadro_id)")
    .in("contato_id", candidatos.map((c) => c.id))
    .eq("kanban_colunas.quadro_id", col.quadro_id);
  const jaTem = new Set(((existentes || []) as Array<{ contato_id: string }>).map((r) => r.contato_id));

  const novos = candidatos.filter((c) => !jaTem.has(c.id));
  if (novos.length === 0) return { ok: true, criados: 0, pulados: candidatos.length };

  // Ordem inicial
  const { data: maxRow } = await sb.from("kanban_cards").select("ordem").eq("coluna_id", colunaId).order("ordem", { ascending: false }).limit(1).maybeSingle();
  let ordem = (maxRow?.ordem as number ?? -1) + 1;
  const linhas = novos.map((c) => ({
    coluna_id: colunaId,
    agencia_id: ctx.agenciaId,
    titulo: c.nome || "Contato sem nome",
    contato_id: c.id,
    ordem: ordem++,
  }));
  // Insert em chunks pra nao estourar
  const CHUNK = 200;
  for (let i = 0; i < linhas.length; i += CHUNK) {
    await sb.from("kanban_cards").insert(linhas.slice(i, i + CHUNK));
  }
  revalidatePath("/pipeline/kanban");
  return { ok: true, criados: linhas.length, pulados: candidatos.length - linhas.length };
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
  revalidatePath("/pipeline/kanban");
  return { ok: true };
}
