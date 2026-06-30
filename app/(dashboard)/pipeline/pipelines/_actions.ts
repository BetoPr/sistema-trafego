"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/crm/permissions";
import { createServiceClient } from "@/lib/supabase/service";

export interface EtapaInput {
  id?: string | null;
  nome: string;
  cor: string;
  notificar_fila_id: string | null;
  notificar_atendente_id: string | null;
}

function revalidar() {
  revalidatePath("/pipeline/pipelines");
  revalidatePath("/pipeline/kanban");
}

export async function criarPipeline(nome: string, etapas: EtapaInput[]): Promise<{ ok: boolean; id?: string; msg?: string }> {
  const ctx = await requireAuth();
  if (!nome.trim()) return { ok: false, msg: "Nome obrigatório" };
  const sb = createServiceClient();
  const { data: quadro, error: e1 } = await sb
    .from("kanban_quadros")
    .insert({ agencia_id: ctx.agenciaId, nome: nome.trim(), cor: "#00E19A" })
    .select("id")
    .single();
  if (e1 || !quadro) return { ok: false, msg: e1?.message || "Erro criando pipeline" };

  if (etapas.length > 0) {
    const rows = etapas.map((e, idx) => ({
      quadro_id: quadro.id,
      agencia_id: ctx.agenciaId,
      nome: e.nome.trim() || `Etapa ${idx + 1}`,
      cor: e.cor || "#5cd0ff",
      ordem: idx,
      notificar_fila_id: e.notificar_fila_id,
      notificar_atendente_id: e.notificar_atendente_id,
    }));
    const { error: e2 } = await sb.from("kanban_colunas").insert(rows);
    if (e2) return { ok: false, msg: e2.message };
  }

  revalidar();
  return { ok: true, id: quadro.id as string };
}

export async function atualizarPipeline(id: string, nome: string, etapas: EtapaInput[]): Promise<{ ok: boolean; msg?: string }> {
  const ctx = await requireAuth();
  if (!nome.trim()) return { ok: false, msg: "Nome obrigatório" };
  const sb = createServiceClient();

  const { error: eN } = await sb
    .from("kanban_quadros")
    .update({ nome: nome.trim() })
    .eq("id", id)
    .eq("agencia_id", ctx.agenciaId);
  if (eN) return { ok: false, msg: eN.message };

  // Etapas: comparar com existentes e diff
  const { data: existentes } = await sb
    .from("kanban_colunas")
    .select("id")
    .eq("quadro_id", id)
    .eq("agencia_id", ctx.agenciaId);
  const idsExistentes = new Set((existentes || []).map((r) => r.id as string));
  const idsNovos = new Set(etapas.filter((e) => e.id).map((e) => e.id as string));
  const removidos = Array.from(idsExistentes).filter((eid) => !idsNovos.has(eid));

  if (removidos.length > 0) {
    await sb.from("kanban_colunas").delete().in("id", removidos).eq("agencia_id", ctx.agenciaId);
  }

  for (let i = 0; i < etapas.length; i++) {
    const e = etapas[i];
    const payload = {
      nome: e.nome.trim() || `Etapa ${i + 1}`,
      cor: e.cor || "#5cd0ff",
      ordem: i,
      notificar_fila_id: e.notificar_fila_id,
      notificar_atendente_id: e.notificar_atendente_id,
    };
    if (e.id) {
      await sb.from("kanban_colunas").update(payload).eq("id", e.id).eq("agencia_id", ctx.agenciaId);
    } else {
      await sb.from("kanban_colunas").insert({
        ...payload,
        quadro_id: id,
        agencia_id: ctx.agenciaId,
      });
    }
  }

  revalidar();
  return { ok: true };
}

export async function deletarPipeline(id: string): Promise<{ ok: boolean; msg?: string }> {
  const ctx = await requireAuth();
  const sb = createServiceClient();
  const { error } = await sb
    .from("kanban_quadros")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("agencia_id", ctx.agenciaId);
  if (error) return { ok: false, msg: error.message };
  revalidar();
  return { ok: true };
}
