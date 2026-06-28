"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/crm/permissions";
import { createServiceClient } from "@/lib/supabase/service";

export async function salvarOndaZeroConfig(
  canalSistemaId: string | null,
  whatsappGrupoLink: string,
  mensagemConvite: string,
): Promise<{ ok: boolean; msg?: string }> {
  await requireSuperAdmin();
  const sb = createServiceClient();
  const { error } = await sb
    .from("super_admin_onda_zero_config")
    .update({
      canal_sistema_id: canalSistemaId,
      whatsapp_grupo_link: whatsappGrupoLink || null,
      mensagem_convite: mensagemConvite || null,
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", 1);
  if (error) return { ok: false, msg: error.message };
  revalidatePath("/super-admin/comunicacao");
  return { ok: true };
}

interface CriarBroadcastInput {
  titulo: string;
  mensagem: string;
  audiencia: string;
  delayMs: number;
  janelaInicio: string;
  janelaFim: string;
}

/**
 * Cria broadcast em rascunho + computa total_alvos.
 * NAO dispara — usuario decide quando agendar.
 */
export async function criarBroadcastRascunho(input: CriarBroadcastInput): Promise<{ ok: boolean; id?: string; total?: number; msg?: string }> {
  const ctx = await requireSuperAdmin();
  if (!input.titulo.trim() || !input.mensagem.trim()) return { ok: false, msg: "Título e mensagem obrigatórios" };
  const sb = createServiceClient();

  const total = await contarAlvos(input.audiencia);

  const { data, error } = await sb
    .from("super_admin_broadcasts")
    .insert({
      titulo: input.titulo.trim(),
      mensagem: input.mensagem.trim(),
      audiencia: input.audiencia,
      delay_ms: input.delayMs,
      janela_inicio: input.janelaInicio,
      janela_fim: input.janelaFim,
      status: "rascunho",
      total_alvos: total,
      criado_por: ctx.userId,
    })
    .select("id")
    .single();
  if (error) return { ok: false, msg: error.message };

  revalidatePath("/super-admin/comunicacao");
  return { ok: true, id: data.id as string, total };
}

async function contarAlvos(audiencia: string): Promise<number> {
  const sb = createServiceClient();
  switch (audiencia) {
    case "todos_usuarios": {
      const { count } = await sb.from("usuarios").select("id", { count: "exact", head: true }).is("deleted_at", null);
      return count || 0;
    }
    case "todos_agencias_donos": {
      const { count } = await sb.from("usuarios").select("id", { count: "exact", head: true }).eq("role", "admin").is("deleted_at", null);
      return count || 0;
    }
    case "onda_zero": {
      const { count } = await sb.from("agencias").select("id", { count: "exact", head: true }).eq("onda_zero_membro", true);
      return count || 0;
    }
    case "em_trial": {
      const { count } = await sb.from("agencias").select("id", { count: "exact", head: true }).gt("trial_acaba_em", new Date().toISOString());
      return count || 0;
    }
    case "plano_solo":
    case "plano_time":
    case "plano_agencia":
    case "plano_studio": {
      const plano = audiencia.replace("plano_", "");
      const { count } = await sb.from("agencias").select("id", { count: "exact", head: true }).eq("tipo_plano", plano);
      return count || 0;
    }
    case "todos_contatos": {
      const { count } = await sb.from("contatos").select("id", { count: "exact", head: true });
      return count || 0;
    }
    default:
      return 0;
  }
}

/**
 * Materializa destinatarios + agenda broadcast.
 * Cria 1 linha em super_admin_broadcast_itens por destinatario com mensagem renderizada.
 */
export async function agendarBroadcast(broadcastId: string): Promise<{ ok: boolean; total?: number; msg?: string }> {
  await requireSuperAdmin();
  const sb = createServiceClient();

  const { data: bc } = await sb
    .from("super_admin_broadcasts")
    .select("id, mensagem, audiencia, status")
    .eq("id", broadcastId)
    .maybeSingle();
  if (!bc) return { ok: false, msg: "Broadcast não encontrado" };
  if (bc.status !== "rascunho") return { ok: false, msg: "Broadcast já foi processado" };

  const destinos = await listarDestinos(bc.audiencia as string);
  if (destinos.length === 0) return { ok: false, msg: "Nenhum destinatário encontrado" };

  const linhas = destinos.map((d) => ({
    broadcast_id: broadcastId,
    destinatario_whatsapp: d.whatsapp.replace(/\D/g, ""),
    destinatario_nome: d.nome,
    agencia_id: d.agenciaId,
    mensagem_renderizada: renderTemplate(bc.mensagem as string, d),
    status: "pendente",
  })).filter((l) => l.destinatario_whatsapp.length >= 10);

  // Insere em chunks pra não estourar o payload
  const CHUNK = 200;
  for (let i = 0; i < linhas.length; i += CHUNK) {
    await sb.from("super_admin_broadcast_itens").insert(linhas.slice(i, i + CHUNK));
  }

  await sb
    .from("super_admin_broadcasts")
    .update({ status: "agendado", total_alvos: linhas.length, iniciado_em: new Date().toISOString() })
    .eq("id", broadcastId);

  revalidatePath("/super-admin/comunicacao");
  return { ok: true, total: linhas.length };
}

interface Destino {
  nome: string;
  whatsapp: string;
  agenciaId: string | null;
  plano: string | null;
}

async function listarDestinos(audiencia: string): Promise<Destino[]> {
  const sb = createServiceClient();
  switch (audiencia) {
    case "todos_usuarios":
    case "todos_agencias_donos": {
      let q = sb.from("usuarios").select("nome, whatsapp, agencia_id").is("deleted_at", null).not("whatsapp", "is", null);
      if (audiencia === "todos_agencias_donos") q = q.eq("role", "admin");
      const { data } = await q;
      return (data || []).map((u) => ({ nome: u.nome as string, whatsapp: u.whatsapp as string, agenciaId: u.agencia_id as string, plano: null }));
    }
    case "onda_zero": {
      const { data: ags } = await sb.from("agencias").select("id, tipo_plano").eq("onda_zero_membro", true);
      const ids = (ags || []).map((a) => a.id as string);
      if (ids.length === 0) return [];
      const planoMap = new Map(((ags || []) as Array<{ id: string; tipo_plano: string | null }>).map((a) => [a.id, a.tipo_plano]));
      const { data: us } = await sb.from("usuarios").select("nome, whatsapp, agencia_id").eq("role", "admin").is("deleted_at", null).in("agencia_id", ids).not("whatsapp", "is", null);
      return (us || []).map((u) => ({ nome: u.nome as string, whatsapp: u.whatsapp as string, agenciaId: u.agencia_id as string, plano: planoMap.get(u.agencia_id as string) ?? null }));
    }
    case "em_trial": {
      const { data: ags } = await sb.from("agencias").select("id, tipo_plano").gt("trial_acaba_em", new Date().toISOString());
      const ids = (ags || []).map((a) => a.id as string);
      if (ids.length === 0) return [];
      const planoMap = new Map(((ags || []) as Array<{ id: string; tipo_plano: string | null }>).map((a) => [a.id, a.tipo_plano]));
      const { data: us } = await sb.from("usuarios").select("nome, whatsapp, agencia_id").eq("role", "admin").is("deleted_at", null).in("agencia_id", ids).not("whatsapp", "is", null);
      return (us || []).map((u) => ({ nome: u.nome as string, whatsapp: u.whatsapp as string, agenciaId: u.agencia_id as string, plano: planoMap.get(u.agencia_id as string) ?? null }));
    }
    case "plano_solo":
    case "plano_time":
    case "plano_agencia":
    case "plano_studio": {
      const plano = audiencia.replace("plano_", "");
      const { data: ags } = await sb.from("agencias").select("id, tipo_plano").eq("tipo_plano", plano);
      const ids = (ags || []).map((a) => a.id as string);
      if (ids.length === 0) return [];
      const { data: us } = await sb.from("usuarios").select("nome, whatsapp, agencia_id").eq("role", "admin").is("deleted_at", null).in("agencia_id", ids).not("whatsapp", "is", null);
      return (us || []).map((u) => ({ nome: u.nome as string, whatsapp: u.whatsapp as string, agenciaId: u.agencia_id as string, plano }));
    }
    case "todos_contatos": {
      const { data } = await sb.from("contatos").select("nome, whatsapp, agencia_id").not("whatsapp", "is", null);
      return (data || []).map((c) => ({ nome: (c.nome as string) || "amigo(a)", whatsapp: c.whatsapp as string, agenciaId: c.agencia_id as string, plano: null }));
    }
    default:
      return [];
  }
}

function renderTemplate(template: string, d: Destino): string {
  return template
    .replace(/\{nome\}/gi, d.nome.split(" ")[0] || "amigo(a)")
    .replace(/\{plano\}/gi, d.plano || "");
}

export async function cancelarBroadcast(broadcastId: string): Promise<{ ok: boolean; msg?: string }> {
  await requireSuperAdmin();
  const sb = createServiceClient();
  const { data: bc } = await sb.from("super_admin_broadcasts").select("status").eq("id", broadcastId).maybeSingle();
  if (!bc) return { ok: false, msg: "Não encontrado" };
  if (bc.status === "concluido") return { ok: false, msg: "Já concluído" };
  await sb.from("super_admin_broadcasts").update({ status: "cancelado" }).eq("id", broadcastId);
  await sb.from("super_admin_broadcast_itens").update({ status: "descartado" }).eq("broadcast_id", broadcastId).eq("status", "pendente");
  revalidatePath("/super-admin/comunicacao");
  return { ok: true };
}
