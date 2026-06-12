"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/crm/permissions";
import { createServiceClient } from "@/lib/supabase/service";
import { audit } from "@/lib/crm/audit";

export interface MsgEtapaInput {
  tipo: "texto" | "imagem" | "documento" | "audio" | "video";
  conteudo?: string;
  midia_url?: string;
  midia_path?: string;
  midia_mime?: string;
  midia_filename?: string;
  variacoes?: string[];
}
export interface EtapaInput {
  apos_horas: number;
  mensagens: MsgEtapaInput[];
}
export interface SequenciaInput {
  id?: string;
  nome: string;
  descricao?: string;
  ativo: boolean;
  etiqueta_gatilho_id?: string | null;
  delay_min_seg: number;
  delay_max_seg: number;
  janela_inicio: string;
  janela_fim: string;
  teto_dia: number;
  etapas: EtapaInput[];
}

export async function salvarSequencia(data: SequenciaInput) {
  const ctx = await requireAdmin();
  const sb = createServiceClient();

  if (!data.nome?.trim()) return { ok: false, erro: "Nome obrigatório" };
  const etapas = (data.etapas || []).slice(0, 3);
  if (etapas.length === 0) return { ok: false, erro: "Adicione ao menos 1 etapa" };

  const base = {
    agencia_id: ctx.agenciaId,
    nome: data.nome.trim(),
    descricao: data.descricao?.trim() || null,
    ativo: !!data.ativo,
    etiqueta_gatilho_id: data.etiqueta_gatilho_id || null,
    delay_min_seg: Math.max(0, Math.round(data.delay_min_seg)),
    delay_max_seg: Math.max(0, Math.round(data.delay_max_seg)),
    janela_inicio: data.janela_inicio || "08:00",
    janela_fim: data.janela_fim || "20:00",
    teto_dia: Math.max(1, Math.round(data.teto_dia)),
    updated_at: new Date().toISOString(),
  };

  let seqId = data.id;
  if (seqId) {
    await sb.from("follow_up_sequencias").update(base).eq("id", seqId).eq("agencia_id", ctx.agenciaId);
    await sb.from("follow_up_etapas").delete().eq("sequencia_id", seqId).eq("agencia_id", ctx.agenciaId);
  } else {
    const { data: novo, error } = await sb.from("follow_up_sequencias").insert(base).select("id").single();
    if (error || !novo) return { ok: false, erro: error?.message || "Falha ao criar" };
    seqId = novo.id;
  }

  const linhas = etapas.map((e, i) => ({
    sequencia_id: seqId,
    agencia_id: ctx.agenciaId,
    ordem: i + 1,
    apos_horas: Number(e.apos_horas) || 1,
    mensagens: (e.mensagens || []).filter((m) => m.tipo === "texto" ? (m.conteudo || "").trim() : ((m.midia_url || "").trim() || (m.midia_path || "").trim())),
  }));
  if (linhas.length) await sb.from("follow_up_etapas").insert(linhas);

  void audit({ agenciaId: ctx.agenciaId, usuarioId: ctx.userId, acao: data.id ? "update" : "create", entidade: "follow_up_sequencia", entidadeId: seqId, payload: { nome: base.nome, etapas: linhas.length } });
  revalidatePath("/follow-up");
  return { ok: true, id: seqId };
}

export async function toggleSequencia(id: string, ativo: boolean) {
  const ctx = await requireAdmin();
  const sb = createServiceClient();
  await sb.from("follow_up_sequencias").update({ ativo, updated_at: new Date().toISOString() }).eq("id", id).eq("agencia_id", ctx.agenciaId);
  revalidatePath("/follow-up");
  return { ok: true };
}

export async function excluirSequencia(id: string) {
  const ctx = await requireAdmin();
  const sb = createServiceClient();
  await sb.from("follow_up_sequencias").delete().eq("id", id).eq("agencia_id", ctx.agenciaId);
  void audit({ agenciaId: ctx.agenciaId, usuarioId: ctx.userId, acao: "delete", entidade: "follow_up_sequencia", entidadeId: id });
  revalidatePath("/follow-up");
  return { ok: true };
}

/** Inscreve um TICKET numa sequência. Contato e canal saem do ticket. */
export async function inscreverTicket(ticketId: string, sequenciaId: string) {
  const ctx = await requireAdmin();
  const sb = createServiceClient();

  const { data: ticket } = await sb
    .from("tickets")
    .select("id, contato_id, canal_id")
    .eq("id", ticketId)
    .eq("agencia_id", ctx.agenciaId)
    .maybeSingle();
  if (!ticket) return { ok: false, erro: "Ticket não encontrado" };

  const { data: etapa1 } = await sb
    .from("follow_up_etapas")
    .select("apos_horas")
    .eq("sequencia_id", sequenciaId)
    .eq("ordem", 1)
    .maybeSingle();
  if (!etapa1) return { ok: false, erro: "Sequência sem etapas" };

  const proximo = new Date(Date.now() + Number(etapa1.apos_horas) * 3600000).toISOString();

  const { error } = await sb.from("follow_up_inscricoes").insert({
    agencia_id: ctx.agenciaId,
    sequencia_id: sequenciaId,
    contato_id: ticket.contato_id,
    ticket_id: ticket.id,
    canal_id: ticket.canal_id,
    status: "ativo",
    etapa_atual: 0,
    proximo_envio_em: proximo,
    criado_por: ctx.userId,
  });
  if (error) {
    if (error.code === "23505") return { ok: false, erro: "Contato já está nesta sequência" };
    return { ok: false, erro: error.message };
  }

  void audit({ agenciaId: ctx.agenciaId, usuarioId: ctx.userId, acao: "create", entidade: "follow_up_inscricao", entidadeId: ticket.id, payload: { ticket_id: ticket.id, sequencia_id: sequenciaId } });
  revalidatePath("/follow-up");
  return { ok: true };
}

export async function cancelarInscricao(id: string) {
  const ctx = await requireAdmin();
  const sb = createServiceClient();
  await sb.from("follow_up_inscricoes").update({ status: "cancelado", motivo_fim: "cancelado manualmente", atualizado_em: new Date().toISOString() }).eq("id", id).eq("agencia_id", ctx.agenciaId);
  revalidatePath("/follow-up");
  return { ok: true };
}
