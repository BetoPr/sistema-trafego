/**
 * Import de contatos + etiquetas do WhatsApp Business via UAZAPI.
 *
 * Fluxo:
 *   1. GET /labels (UAZAPI) — descobre etiquetas configuradas na conta
 *   2. Upsert etiquetas na agência (cria as que ainda não existem)
 *   3. POST /chat/find paginado — puxa todos os chats não-grupo
 *   4. Upsert contato por wa_id; aplica etiquetas via contato_etiquetas
 *   5. Retorna resumo do que aconteceu
 *
 * Idempotente: re-rodar não duplica nada.
 * Pula etiquetas nativas (Não lidas, Grupos, Favoritos) por default.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { instanceListLabels, instanceFindChats, instanceListContacts, type UazapiLabel, type UazapiChat } from "@/lib/uazapi/client";

const LABELS_NATIVAS = new Set(["Não lidas", "Grupos", "Favoritos", "Não lidos"]);

export interface ImportResumo {
  contatos_totais: number;
  contatos_novos: number;
  contatos_existentes: number;
  contatos_reais_totais: number;
  contatos_reais_novos: number;
  etiquetas_criadas: number;
  etiquetas_existentes: number;
  etiquetas_aplicadas: number;
  etiquetas_puladas: number;
  etiquetas_duplicadas_mescladas: number;
  pulados_grupos: number;
  duracao_ms: number;
  etiquetas_criadas_nomes: string[];
  erros: string[];
}

export async function importarContatosUazapi(params: {
  sb: SupabaseClient;
  agenciaId: string;
  baseUrl: string;
  token: string;
  pularLabelsNativas?: boolean;
}): Promise<ImportResumo> {
  const inicio = Date.now();
  const resumo: ImportResumo = {
    contatos_totais: 0,
    contatos_novos: 0,
    contatos_existentes: 0,
    contatos_reais_totais: 0,
    contatos_reais_novos: 0,
    etiquetas_criadas: 0,
    etiquetas_existentes: 0,
    etiquetas_aplicadas: 0,
    etiquetas_puladas: 0,
    etiquetas_duplicadas_mescladas: 0,
    pulados_grupos: 0,
    duracao_ms: 0,
    etiquetas_criadas_nomes: [],
    erros: [],
  };

  const pularNativas = params.pularLabelsNativas !== false;

  // 0. Dedup etiquetas existentes na agência (mesmo nome case-insensitive)
  // Mantém a mais antiga, migra links de contato_etiquetas, apaga duplicadas.
  try {
    const { data: todas } = await params.sb
      .from("etiquetas")
      .select("id, nome, created_at")
      .eq("agencia_id", params.agenciaId)
      .order("created_at", { ascending: true });
    const porChave = new Map<string, { canonId: string; dups: string[] }>();
    for (const e of (todas || []) as Array<{ id: string; nome: string; created_at: string }>) {
      const k = e.nome.trim().toLowerCase();
      const cur = porChave.get(k);
      if (!cur) porChave.set(k, { canonId: e.id, dups: [] });
      else cur.dups.push(e.id);
    }
    for (const { canonId, dups } of porChave.values()) {
      if (!dups.length) continue;
      // Migra contato_etiquetas dos dups → canon (ignora duplicate via onConflict)
      const { data: links } = await params.sb
        .from("contato_etiquetas")
        .select("contato_id")
        .in("etiqueta_id", dups);
      const novosLinks = (links || []).map((l) => ({ contato_id: (l as { contato_id: string }).contato_id, etiqueta_id: canonId }));
      if (novosLinks.length) {
        await params.sb
          .from("contato_etiquetas")
          .upsert(novosLinks, { onConflict: "contato_id,etiqueta_id", ignoreDuplicates: true });
      }
      // Remove links das duplicadas + apaga as duplicadas
      await params.sb.from("contato_etiquetas").delete().in("etiqueta_id", dups);
      await params.sb.from("etiquetas").delete().in("id", dups);
      resumo.etiquetas_duplicadas_mescladas += dups.length;
    }
  } catch (e) {
    resumo.erros.push(`dedup: ${e instanceof Error ? e.message : String(e)}`);
  }

  // 1. Labels da UAZAPI
  let labelsUazapi: UazapiLabel[] = [];
  try {
    labelsUazapi = await instanceListLabels({ baseUrl: params.baseUrl, token: params.token });
  } catch (e) {
    resumo.erros.push(`labels: ${e instanceof Error ? e.message : String(e)}`);
    resumo.duracao_ms = Date.now() - inicio;
    return resumo;
  }

  // 2. Mapeia UAZAPI label_id → etiqueta_id (Supabase). Cria as que faltam.
  const labelMap = new Map<string, string>(); // uazapi label id → supabase etiqueta_id
  const { data: etiquetasAtuais } = await params.sb
    .from("etiquetas")
    .select("id, nome, cor")
    .eq("agencia_id", params.agenciaId);
  const porNome = new Map<string, { id: string; cor: string }>();
  for (const e of (etiquetasAtuais || []) as Array<{ id: string; nome: string; cor: string }>) {
    porNome.set(e.nome.toLowerCase(), e);
  }

  for (const lbl of labelsUazapi) {
    if (pularNativas && LABELS_NATIVAS.has(lbl.name)) continue;
    const existente = porNome.get(lbl.name.toLowerCase());
    if (existente) {
      labelMap.set(lbl.id, existente.id);
      resumo.etiquetas_existentes++;
      continue;
    }
    // Cria nova etiqueta com cor do WhatsApp
    const { data: nova, error } = await params.sb
      .from("etiquetas")
      .insert({
        agencia_id: params.agenciaId,
        nome: lbl.name,
        cor: lbl.colorHex || "#9B7DBF",
        ativo: true,
        categoria: "etiqueta",
      })
      .select("id")
      .single();
    if (error || !nova) {
      resumo.erros.push(`etiqueta "${lbl.name}": ${error?.message || "insert"}`);
      continue;
    }
    labelMap.set(lbl.id, nova.id);
    porNome.set(lbl.name.toLowerCase(), { id: nova.id, cor: lbl.colorHex });
    resumo.etiquetas_criadas++;
    resumo.etiquetas_criadas_nomes.push(lbl.name);
  }

  // 2.5 Contatos com NÚMERO REAL via /contacts.
  // /chat/find devolve @lid (privacidade, sem telefone); /contacts devolve o jid
  // real (@s.whatsapp.net). Importa esses primeiro pra lista de contatos sair certa.
  try {
    const contatosApi = await instanceListContacts({ baseUrl: params.baseUrl, token: params.token }, "all");
    const reais = contatosApi.filter((c) => /@s\.whatsapp\.net$/.test(c.jid || ""));
    resumo.contatos_reais_totais = reais.length;
    const jidsReais = reais.map((c) => c.jid);
    const jaTemReal = new Set<string>();
    for (let i = 0; i < jidsReais.length; i += 200) {
      const { data } = await params.sb
        .from("contatos").select("wa_id").eq("agencia_id", params.agenciaId).in("wa_id", jidsReais.slice(i, i + 200));
      for (const r of (data || []) as Array<{ wa_id: string }>) jaTemReal.add(r.wa_id);
    }
    const novosReais = reais
      .filter((c) => !jaTemReal.has(c.jid))
      .map((c) => {
        const num = c.jid.replace(/@.+$/, "");
        const nome = (c.contact_name || c.contact_FirstName || num).trim() || num;
        return { agencia_id: params.agenciaId, wa_id: c.jid, whatsapp: num, nome, primeiro_nome: (c.contact_FirstName || nome.split(" ")[0]) || null, foto_url: null };
      });
    for (let i = 0; i < novosReais.length; i += 100) {
      const { error } = await params.sb.from("contatos").insert(novosReais.slice(i, i + 100));
      if (error) { resumo.erros.push(`contatos-reais batch ${i}: ${error.message}`); continue; }
      resumo.contatos_reais_novos += Math.min(100, novosReais.length - i);
    }
  } catch (e) {
    resumo.erros.push(`contatos-reais: ${e instanceof Error ? e.message : String(e)}`);
  }

  // 3. Itera chats em páginas (limit 500 por chamada)
  const PAGE = 500;
  let offset = 0;
  let totalRecords = Infinity;
  const todosChats: UazapiChat[] = [];

  while (offset < totalRecords && offset < 50_000) {
    let pageResp;
    try {
      pageResp = await instanceFindChats({ baseUrl: params.baseUrl, token: params.token }, { limit: PAGE, offset });
    } catch (e) {
      resumo.erros.push(`chats offset=${offset}: ${e instanceof Error ? e.message : String(e)}`);
      break;
    }
    if (!pageResp.chats.length) break;
    todosChats.push(...pageResp.chats);
    totalRecords = pageResp.totalRecords;
    offset += pageResp.chats.length;
    if (pageResp.chats.length < PAGE) break;
  }

  // 4. Upsert contatos + aplica etiquetas
  // Existentes
  const waIds = todosChats.filter((c) => !c.wa_isGroup).map((c) => c.wa_chatid);
  resumo.pulados_grupos = todosChats.length - waIds.length;
  resumo.contatos_totais = waIds.length;

  const existentesPorWaId = new Map<string, string>(); // wa_id → contato_id
  if (waIds.length > 0) {
    // Em lotes de 200 pra não estourar o IN
    for (let i = 0; i < waIds.length; i += 200) {
      const slice = waIds.slice(i, i + 200);
      const { data } = await params.sb
        .from("contatos")
        .select("id, wa_id")
        .eq("agencia_id", params.agenciaId)
        .in("wa_id", slice);
      for (const row of (data || []) as Array<{ id: string; wa_id: string }>) {
        existentesPorWaId.set(row.wa_id, row.id);
      }
    }
  }

  // Cria novos contatos em lote
  const novos: Array<{ agencia_id: string; wa_id: string; whatsapp: string; nome: string; primeiro_nome: string | null; foto_url: string | null }> = [];
  const chatPorWaId = new Map<string, UazapiChat>();
  for (const c of todosChats) {
    if (c.wa_isGroup) continue;
    chatPorWaId.set(c.wa_chatid, c);
    if (existentesPorWaId.has(c.wa_chatid)) continue;
    const nome =
      (c.lead_fullName || c.lead_name || c.wa_contactName || c.name || c.wa_name || c.wa_chatid.replace(/@.+$/, "")).trim() ||
      c.wa_chatid.replace(/@.+$/, "");
    novos.push({
      agencia_id: params.agenciaId,
      wa_id: c.wa_chatid,
      // @lid não tem telefone real (privacidade) → não grava número falso.
      whatsapp: c.wa_chatid.endsWith("@lid") ? "" : c.wa_chatid.replace(/@.+$/, ""),
      nome,
      primeiro_nome: nome.split(" ")[0] || null,
      foto_url: c.image || c.imagePreview || null,
    });
  }

  for (let i = 0; i < novos.length; i += 100) {
    const slice = novos.slice(i, i + 100);
    const { data, error } = await params.sb
      .from("contatos")
      .insert(slice)
      .select("id, wa_id");
    if (error) {
      resumo.erros.push(`insert contatos batch ${i}: ${error.message}`);
      continue;
    }
    for (const row of (data || []) as Array<{ id: string; wa_id: string }>) {
      existentesPorWaId.set(row.wa_id, row.id);
      resumo.contatos_novos++;
    }
  }
  resumo.contatos_existentes = resumo.contatos_totais - resumo.contatos_novos;

  // 5. Aplica etiquetas em batch
  const linksEtiqueta: Array<{ contato_id: string; etiqueta_id: string }> = [];
  for (const [waId, chat] of chatPorWaId.entries()) {
    const contatoId = existentesPorWaId.get(waId);
    if (!contatoId) continue;
    for (const lblUazapiId of chat.wa_label || []) {
      const etiquetaId = labelMap.get(lblUazapiId);
      if (!etiquetaId) {
        resumo.etiquetas_puladas++;
        continue;
      }
      linksEtiqueta.push({ contato_id: contatoId, etiqueta_id: etiquetaId });
    }
  }

  // Insere com ON CONFLICT DO NOTHING (unique constraint contato_id+etiqueta_id)
  for (let i = 0; i < linksEtiqueta.length; i += 200) {
    const slice = linksEtiqueta.slice(i, i + 200);
    const { data, error } = await params.sb
      .from("contato_etiquetas")
      .upsert(slice, { onConflict: "contato_id,etiqueta_id", ignoreDuplicates: true })
      .select("contato_id");
    if (error) {
      resumo.erros.push(`contato_etiquetas batch ${i}: ${error.message}`);
      continue;
    }
    resumo.etiquetas_aplicadas += data?.length || 0;
  }

  resumo.duracao_ms = Date.now() - inicio;
  return resumo;
}
