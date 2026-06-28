"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/crm/permissions";
import { createServiceClient } from "@/lib/supabase/service";
import { audit } from "@/lib/crm/audit";

/**
 * Cria etiqueta inline a partir da UI de Pixel & Campanhas.
 * Quando `etiquetaPaiId` informado → cria Variante (filha).
 * Sem pai → cria Linha (mãe). Valida hierarquia 2 níveis.
 */
export async function criarEtiquetaInline(
  nome: string,
  cor: string,
  etiquetaPaiId: string | null = null,
): Promise<{ ok: boolean; id?: string; msg?: string }> {
  const ctx = await requireAdmin();
  const n = nome.trim();
  if (!n) return { ok: false, msg: "Nome obrigatório" };
  const sb = createServiceClient();
  if (etiquetaPaiId) {
    const { data: pai } = await sb
      .from("etiquetas")
      .select("id, etiqueta_pai_id")
      .eq("id", etiquetaPaiId)
      .eq("agencia_id", ctx.agenciaId)
      .maybeSingle();
    if (!pai) return { ok: false, msg: "Linha-mãe inválida" };
    if (pai.etiqueta_pai_id) return { ok: false, msg: "Hierarquia só permite 2 níveis" };
  }
  const { data, error } = await sb
    .from("etiquetas")
    .insert({
      agencia_id: ctx.agenciaId,
      nome: n,
      cor: cor || "#00E19A",
      categoria: "etiqueta",
      etiqueta_pai_id: etiquetaPaiId,
    })
    .select("id")
    .single();
  if (error) return { ok: false, msg: error.message };
  void audit({
    agenciaId: ctx.agenciaId,
    usuarioId: ctx.userId,
    acao: "create",
    entidade: "etiqueta",
    entidadeId: data.id,
    payload: { nome: n, cor, etiqueta_pai_id: etiquetaPaiId, origem: "pixel-vendas" },
  });
  revalidatePath("/pixel-vendas");
  return { ok: true, id: data.id };
}

type Alvo = "campanha" | "conjunto" | "anuncio";

const MAPA_ALVO: Record<Alvo, { tabela: string; col: string; tabelaAlvo: string }> = {
  campanha: { tabela: "etiqueta_campanhas", col: "campanha_id", tabelaAlvo: "campanhas" },
  conjunto: { tabela: "etiqueta_conjuntos", col: "conjunto_id", tabelaAlvo: "conjuntos" },
  anuncio: { tabela: "etiqueta_anuncios", col: "anuncio_id", tabelaAlvo: "anuncios" },
};

/**
 * Substitui o conjunto de etiquetas vinculadas a uma campanha, conjunto OU anuncio Meta.
 * Idempotente: salva exatamente a lista fornecida.
 */
export async function salvarEtiquetasDoAlvo(
  alvo: Alvo,
  alvoId: string,
  etiquetaIds: string[],
): Promise<{ ok: boolean; msg?: string }> {
  const ctx = await requireAdmin();
  const sb = createServiceClient();
  const { tabela, col: colId, tabelaAlvo } = MAPA_ALVO[alvo];
  const { data: alvoRow } = await sb
    .from(tabelaAlvo)
    .select("id, agencia_id")
    .eq("id", alvoId)
    .eq("agencia_id", ctx.agenciaId)
    .maybeSingle();
  if (!alvoRow) return { ok: false, msg: `${alvo} não encontrado(a)` };

  // valida etiquetas
  const ids = etiquetaIds.filter(Boolean);
  if (ids.length > 0) {
    const { data: ets } = await sb
      .from("etiquetas")
      .select("id")
      .eq("agencia_id", ctx.agenciaId)
      .in("id", ids);
    const validos = new Set((ets || []).map((e) => e.id as string));
    for (const e of ids) {
      if (!validos.has(e)) return { ok: false, msg: `Etiqueta ${e} inválida` };
    }
  }

  // replace: deleta vínculos atuais + insere novos
  const { error: delErr } = await sb.from(tabela).delete().eq(colId, alvoId);
  if (delErr) return { ok: false, msg: delErr.message };

  if (ids.length > 0) {
    const rows = ids.map((eid) => ({
      [colId]: alvoId,
      etiqueta_id: eid,
      agencia_id: ctx.agenciaId,
    }));
    const { error: insErr } = await sb.from(tabela).insert(rows);
    if (insErr) return { ok: false, msg: insErr.message };
  }

  void audit({
    agenciaId: ctx.agenciaId,
    usuarioId: ctx.userId,
    acao: "update",
    entidade: tabela,
    entidadeId: alvoId,
    payload: { etiqueta_ids: ids },
  });
  revalidatePath("/pixel-vendas");
  return { ok: true };
}

/**
 * Espelhamento Meta → Pasta/Etiqueta.
 * Cria 1 Pasta (etiqueta-mãe) por Campanha e 1 Etiqueta filha por Conjunto,
 * vinculando automaticamente. Idempotente: roda quantas vezes quiser.
 */

const PALETA_ESPELHO = ["#00E19A", "#5cd0ff", "#9B7DBF", "#FFB547", "#FF5C72", "#6B8E4E", "#C97064", "#3b82f6"];

function corPorIndice(i: number): string {
  return PALETA_ESPELHO[i % PALETA_ESPELHO.length];
}

interface PreviewEspelhamento {
  pastasNovas: number;
  etiquetasNovas: number;
  vinculosCampanha: number;
  vinculosConjunto: number;
  pastasExistentes: number;
  etiquetasExistentes: number;
}

async function carregarEstadoEspelhamento(agenciaId: string) {
  const sb = createServiceClient();
  const [{ data: camps }, { data: conjs }, { data: etqs }, { data: vincC }, { data: vincCj }] = await Promise.all([
    sb.from("campanhas").select("id, nome").eq("agencia_id", agenciaId),
    sb.from("conjuntos").select("id, nome, campanha_id").eq("agencia_id", agenciaId),
    sb.from("etiquetas").select("id, nome, etiqueta_pai_id, cor").eq("agencia_id", agenciaId).eq("categoria", "etiqueta"),
    sb.from("etiqueta_campanhas").select("etiqueta_id, campanha_id").eq("agencia_id", agenciaId),
    sb.from("etiqueta_conjuntos").select("etiqueta_id, conjunto_id").eq("agencia_id", agenciaId),
  ]);
  return {
    sb,
    campanhas: (camps || []) as Array<{ id: string; nome: string }>,
    conjuntos: (conjs || []) as Array<{ id: string; nome: string; campanha_id: string }>,
    etiquetas: (etqs || []) as Array<{ id: string; nome: string; etiqueta_pai_id: string | null; cor: string }>,
    vincCamp: (vincC || []) as Array<{ etiqueta_id: string; campanha_id: string }>,
    vincConj: (vincCj || []) as Array<{ etiqueta_id: string; conjunto_id: string }>,
  };
}

export async function previewEspelhamentoMeta(): Promise<{
  ok: boolean;
  msg?: string;
  preview?: PreviewEspelhamento;
}> {
  const ctx = await requireAdmin();
  const { campanhas, conjuntos, etiquetas, vincCamp, vincConj } = await carregarEstadoEspelhamento(ctx.agenciaId);

  // Pastas atuais (etiquetas sem pai) por nome
  const pastasPorNome = new Map<string, string>();
  for (const e of etiquetas) {
    if (!e.etiqueta_pai_id) pastasPorNome.set(e.nome.toLowerCase(), e.id);
  }
  // Etiquetas filhas por (pai, nome)
  const filhasPorChave = new Map<string, string>();
  for (const e of etiquetas) {
    if (e.etiqueta_pai_id) filhasPorChave.set(`${e.etiqueta_pai_id}::${e.nome.toLowerCase()}`, e.id);
  }
  // Vinculos existentes
  const vincCampSet = new Set(vincCamp.map((v) => `${v.etiqueta_id}::${v.campanha_id}`));
  const vincConjSet = new Set(vincConj.map((v) => `${v.etiqueta_id}::${v.conjunto_id}`));

  let pastasNovas = 0;
  let pastasExistentes = 0;
  let etiquetasNovas = 0;
  let etiquetasExistentes = 0;
  let vinculosCampanha = 0;
  let vinculosConjunto = 0;

  for (const c of campanhas) {
    const nome = c.nome.toLowerCase();
    const pastaId = pastasPorNome.get(nome);
    if (pastaId) {
      pastasExistentes++;
      if (!vincCampSet.has(`${pastaId}::${c.id}`)) vinculosCampanha++;
    } else {
      pastasNovas++;
      vinculosCampanha++;
    }
  }

  for (const cj of conjuntos) {
    const camp = campanhas.find((c) => c.id === cj.campanha_id);
    if (!camp) continue;
    const pastaId = pastasPorNome.get(camp.nome.toLowerCase());
    const chave = pastaId ? `${pastaId}::${cj.nome.toLowerCase()}` : `nova-pasta::${cj.nome.toLowerCase()}`;
    const filhaId = pastaId ? filhasPorChave.get(chave) : undefined;
    if (filhaId) {
      etiquetasExistentes++;
      if (!vincConjSet.has(`${filhaId}::${cj.id}`)) vinculosConjunto++;
    } else {
      etiquetasNovas++;
      vinculosConjunto++;
    }
  }

  return {
    ok: true,
    preview: { pastasNovas, etiquetasNovas, vinculosCampanha, vinculosConjunto, pastasExistentes, etiquetasExistentes },
  };
}

export async function espelharDoMeta(): Promise<{
  ok: boolean;
  msg?: string;
  resumo?: PreviewEspelhamento;
}> {
  const ctx = await requireAdmin();
  const { sb, campanhas, conjuntos, etiquetas, vincCamp, vincConj } = await carregarEstadoEspelhamento(ctx.agenciaId);

  const pastasPorNome = new Map<string, { id: string; cor: string }>();
  for (const e of etiquetas) {
    if (!e.etiqueta_pai_id) pastasPorNome.set(e.nome.toLowerCase(), { id: e.id, cor: e.cor });
  }
  const filhasPorChave = new Map<string, string>();
  for (const e of etiquetas) {
    if (e.etiqueta_pai_id) filhasPorChave.set(`${e.etiqueta_pai_id}::${e.nome.toLowerCase()}`, e.id);
  }
  const vincCampSet = new Set(vincCamp.map((v) => `${v.etiqueta_id}::${v.campanha_id}`));
  const vincConjSet = new Set(vincConj.map((v) => `${v.etiqueta_id}::${v.conjunto_id}`));

  let pastasNovas = 0, etiquetasNovas = 0, vinculosCampanha = 0, vinculosConjunto = 0;
  let pastasExistentes = 0, etiquetasExistentes = 0;

  // 1) Pastas — uma por Campanha (sem duplicar)
  for (let i = 0; i < campanhas.length; i++) {
    const c = campanhas[i];
    const chave = c.nome.toLowerCase();
    let pasta = pastasPorNome.get(chave);
    if (!pasta) {
      const cor = corPorIndice(i);
      const { data, error } = await sb
        .from("etiquetas")
        .insert({ agencia_id: ctx.agenciaId, nome: c.nome, cor, categoria: "etiqueta", etiqueta_pai_id: null })
        .select("id, cor")
        .single();
      if (error || !data) continue;
      pasta = { id: data.id as string, cor: (data.cor as string) || cor };
      pastasPorNome.set(chave, pasta);
      pastasNovas++;
    } else {
      pastasExistentes++;
    }
    // Vinculo etiqueta_campanhas (pasta-mae ↔ campanha)
    if (!vincCampSet.has(`${pasta.id}::${c.id}`)) {
      const { error: vErr } = await sb
        .from("etiqueta_campanhas")
        .insert({ agencia_id: ctx.agenciaId, etiqueta_id: pasta.id, campanha_id: c.id });
      if (!vErr) {
        vinculosCampanha++;
        vincCampSet.add(`${pasta.id}::${c.id}`);
      }
    }
  }

  // 2) Etiquetas filhas — uma por Conjunto
  for (const cj of conjuntos) {
    const camp = campanhas.find((c) => c.id === cj.campanha_id);
    if (!camp) continue;
    const pasta = pastasPorNome.get(camp.nome.toLowerCase());
    if (!pasta) continue;
    const chaveFilha = `${pasta.id}::${cj.nome.toLowerCase()}`;
    let filhaId = filhasPorChave.get(chaveFilha);
    if (!filhaId) {
      const { data, error } = await sb
        .from("etiquetas")
        .insert({
          agencia_id: ctx.agenciaId,
          nome: cj.nome,
          cor: pasta.cor,
          categoria: "etiqueta",
          etiqueta_pai_id: pasta.id,
        })
        .select("id")
        .single();
      if (error || !data) continue;
      filhaId = data.id as string;
      filhasPorChave.set(chaveFilha, filhaId);
      etiquetasNovas++;
    } else {
      etiquetasExistentes++;
    }
    if (!vincConjSet.has(`${filhaId}::${cj.id}`)) {
      const { error: vErr } = await sb
        .from("etiqueta_conjuntos")
        .insert({ agencia_id: ctx.agenciaId, etiqueta_id: filhaId, conjunto_id: cj.id });
      if (!vErr) {
        vinculosConjunto++;
        vincConjSet.add(`${filhaId}::${cj.id}`);
      }
    }
  }

  void audit({
    agenciaId: ctx.agenciaId,
    usuarioId: ctx.userId,
    acao: "espelhar_meta",
    entidade: "pixel_vendas",
    payload: { pastasNovas, etiquetasNovas, vinculosCampanha, vinculosConjunto, pastasExistentes, etiquetasExistentes },
  });
  revalidatePath("/pixel-vendas");
  return {
    ok: true,
    resumo: { pastasNovas, etiquetasNovas, vinculosCampanha, vinculosConjunto, pastasExistentes, etiquetasExistentes },
  };
}
