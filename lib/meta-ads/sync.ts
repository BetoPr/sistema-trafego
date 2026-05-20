/**
 * Sync orchestration Meta Ads → DB.
 * Pure function, scheduler-agnostic. Chamada por server action ou /api/cron.
 * Usa service_role client (cross-tenant). Cliente passa integracao_id; sync
 * decripta token e busca dados Meta Marketing API.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { decryptToken } from "@/lib/crypto/tokens";
import {
  listCampaigns,
  listAdSets,
  listAds,
  listDailyInsights,
  type MetaInsightRow,
} from "./api";

export interface SyncResult {
  ok: boolean;
  integracao_id: string;
  campanhas: number;
  conjuntos: number;
  anuncios: number;
  metricas: number;
  erro?: string;
}

function actionsToMap(actions?: Array<{ action_type: string; value: string }>): Map<string, number> {
  const m = new Map<string, number>();
  if (!actions) return m;
  for (const a of actions) {
    m.set(a.action_type, Number(a.value) || 0);
  }
  return m;
}

function sumConversions(map: Map<string, number>): number {
  // Convenção: tudo que termina em _purchase, lead, complete_registration, add_to_cart, etc.
  const keys = ["purchase", "offsite_conversion.fb_pixel_purchase", "onsite_conversion.purchase"];
  let total = 0;
  for (const k of keys) total += map.get(k) || 0;
  return total;
}

function sumLeads(map: Map<string, number>): number {
  const keys = ["lead", "leadgen.other", "onsite_conversion.lead_grouped"];
  let total = 0;
  for (const k of keys) total += map.get(k) || 0;
  return total;
}

function sumEngajamento(map: Map<string, number>): number {
  const keys = ["post_engagement", "page_engagement", "post_reaction", "comment", "post"];
  let total = 0;
  for (const k of keys) total += map.get(k) || 0;
  return total;
}

function sumVideoViews(map: Map<string, number>): number {
  return map.get("video_view") || 0;
}

function reaisFromCents(s?: string): number | null {
  if (!s) return null;
  const n = Number(s);
  if (Number.isNaN(n)) return null;
  return Math.round(n) / 100;
}

export async function syncMetaIntegracao(integracaoId: string): Promise<SyncResult> {
  const svc = createServiceClient();

  // 1. Lê integração + valida
  const { data: integ, error: errInteg } = await svc
    .from("integracoes")
    .select(
      "id, cliente_id, agencia_id, account_id, access_token_encrypted, status",
    )
    .eq("id", integracaoId)
    .eq("plataforma", "meta_ads")
    .single();

  if (errInteg || !integ) {
    return {
      ok: false,
      integracao_id: integracaoId,
      campanhas: 0,
      conjuntos: 0,
      anuncios: 0,
      metricas: 0,
      erro: `Integração não encontrada: ${errInteg?.message || "—"}`,
    };
  }

  const adAccountId = integ.account_id.startsWith("act_") ? integ.account_id : `act_${integ.account_id}`;
  let accessToken: string;
  try {
    accessToken = decryptToken(Buffer.from(integ.access_token_encrypted));
  } catch (e) {
    await svc
      .from("integracoes")
      .update({ status: "erro", erro_ultima_sync: `decrypt: ${(e as Error).message}` })
      .eq("id", integracaoId);
    return {
      ok: false,
      integracao_id: integracaoId,
      campanhas: 0,
      conjuntos: 0,
      anuncios: 0,
      metricas: 0,
      erro: `Token corrompido: ${(e as Error).message}`,
    };
  }

  try {
    // 2. Fetch campanhas
    const campaigns = await listCampaigns(accessToken, adAccountId);
    if (campaigns.length === 0) {
      await svc
        .from("integracoes")
        .update({ ultima_sync: new Date().toISOString(), erro_ultima_sync: null })
        .eq("id", integracaoId);
      return {
        ok: true,
        integracao_id: integracaoId,
        campanhas: 0,
        conjuntos: 0,
        anuncios: 0,
        metricas: 0,
      };
    }

    // Upsert campanhas
    const campaignRows = campaigns.map((c) => ({
      cliente_id: integ.cliente_id,
      agencia_id: integ.agencia_id,
      integracao_id: integ.id,
      plataforma: "meta_ads",
      external_id: c.id,
      nome: c.name,
      objetivo: c.objective ?? null,
      status: c.status ?? null,
      orcamento_diario: reaisFromCents(c.daily_budget),
      orcamento_total: reaisFromCents(c.lifetime_budget),
      data_inicio: c.start_time ? c.start_time.slice(0, 10) : null,
      data_fim: c.stop_time ? c.stop_time.slice(0, 10) : null,
    }));
    const { error: errCamp } = await svc
      .from("campanhas")
      .upsert(campaignRows, { onConflict: "integracao_id,external_id" });
    if (errCamp) throw new Error(`upsert campanhas: ${errCamp.message}`);

    // Mapa external → DB id
    const { data: campDb } = await svc
      .from("campanhas")
      .select("id, external_id")
      .eq("integracao_id", integ.id);
    const campMap = new Map<string, string>();
    for (const c of campDb || []) campMap.set(c.external_id, c.id);

    // 3. Fetch adsets
    const adsets = await listAdSets(accessToken, adAccountId);
    const adsetRows = adsets
      .filter((s) => campMap.has(s.campaign_id))
      .map((s) => ({
        campanha_id: campMap.get(s.campaign_id)!,
        cliente_id: integ.cliente_id,
        agencia_id: integ.agencia_id,
        external_id: s.id,
        nome: s.name,
        status: s.status ?? null,
        orcamento: reaisFromCents(s.daily_budget),
        segmentacao: s.targeting || null,
      }));
    if (adsetRows.length > 0) {
      const { error: errSet } = await svc
        .from("conjuntos")
        .upsert(adsetRows, { onConflict: "campanha_id,external_id" });
      if (errSet) throw new Error(`upsert conjuntos: ${errSet.message}`);
    }

    const { data: setDb } = await svc
      .from("conjuntos")
      .select("id, external_id, campanha_id")
      .in("campanha_id", Array.from(campMap.values()));
    const setMap = new Map<string, string>();
    for (const s of setDb || []) setMap.set(s.external_id, s.id);

    // 4. Fetch ads
    const ads = await listAds(accessToken, adAccountId);
    const adRows = ads
      .filter((a) => setMap.has(a.adset_id))
      .map((a) => ({
        conjunto_id: setMap.get(a.adset_id)!,
        cliente_id: integ.cliente_id,
        agencia_id: integ.agencia_id,
        external_id: a.id,
        nome: a.name,
        status: a.status ?? null,
        criativo: a.creative || null,
      }));
    if (adRows.length > 0) {
      const { error: errAd } = await svc
        .from("anuncios")
        .upsert(adRows, { onConflict: "conjunto_id,external_id" });
      if (errAd) throw new Error(`upsert anuncios: ${errAd.message}`);
    }

    const { data: adDb } = await svc
      .from("anuncios")
      .select("id, external_id, conjunto_id")
      .in("conjunto_id", Array.from(setMap.values()));
    const adMap = new Map<string, { id: string; conjunto_id: string }>();
    for (const a of adDb || []) adMap.set(a.external_id, { id: a.id, conjunto_id: a.conjunto_id });

    // 5. Fetch daily insights (últimos 7 dias)
    let insights: MetaInsightRow[] = [];
    try {
      insights = await listDailyInsights(accessToken, adAccountId, "last_7d");
    } catch (e) {
      // Insights pode falhar se conta nunca rodou; não bloqueia sync das estruturas
      console.warn(`Meta insights falhou: ${(e as Error).message}`);
    }

    const conjuntoToCampanha = new Map<string, string>();
    for (const s of setDb || []) conjuntoToCampanha.set(s.id, s.campanha_id);

    const metricRows = insights
      .filter((row) => adMap.has(row.ad_id))
      .map((row) => {
        const adRef = adMap.get(row.ad_id)!;
        const actionsMap = actionsToMap(row.actions);
        return {
          anuncio_id: adRef.id,
          conjunto_id: adRef.conjunto_id,
          campanha_id: conjuntoToCampanha.get(adRef.conjunto_id)!,
          cliente_id: integ.cliente_id,
          agencia_id: integ.agencia_id,
          data: row.date_start,
          impressoes: Number(row.impressions) || 0,
          alcance: Number(row.reach) || 0,
          cliques: Number(row.inline_link_clicks ?? row.clicks) || 0,
          gasto: Number(row.spend) || 0,
          conversoes: sumConversions(actionsMap),
          receita: 0, // Meta não retorna receita direto; precisa de eventos custom
          frequencia: Number(row.frequency) || 0,
          visualizacoes_video: sumVideoViews(actionsMap),
          engajamento: sumEngajamento(actionsMap),
          leads: sumLeads(actionsMap),
        };
      });

    if (metricRows.length > 0) {
      // Upsert em batches (Postgres limita ~65k params)
      const batchSize = 200;
      for (let i = 0; i < metricRows.length; i += batchSize) {
        const batch = metricRows.slice(i, i + batchSize);
        const { error: errMet } = await svc
          .from("metricas_diarias")
          .upsert(batch, { onConflict: "anuncio_id,data" });
        if (errMet) throw new Error(`upsert metricas batch ${i}: ${errMet.message}`);
      }
    }

    // 6. Marca sync OK
    await svc
      .from("integracoes")
      .update({
        ultima_sync: new Date().toISOString(),
        erro_ultima_sync: null,
        status: "ativa",
      })
      .eq("id", integracaoId);

    return {
      ok: true,
      integracao_id: integracaoId,
      campanhas: campaigns.length,
      conjuntos: adsets.length,
      anuncios: ads.length,
      metricas: metricRows.length,
    };
  } catch (e) {
    const msg = (e as Error).message;
    await svc
      .from("integracoes")
      .update({ status: "erro", erro_ultima_sync: msg })
      .eq("id", integracaoId);
    return {
      ok: false,
      integracao_id: integracaoId,
      campanhas: 0,
      conjuntos: 0,
      anuncios: 0,
      metricas: 0,
      erro: msg,
    };
  }
}

export async function syncTodasMeta(): Promise<SyncResult[]> {
  const svc = createServiceClient();
  const { data: integs } = await svc
    .from("integracoes")
    .select("id")
    .eq("plataforma", "meta_ads")
    .eq("status", "ativa");

  const results: SyncResult[] = [];
  for (const i of integs || []) {
    results.push(await syncMetaIntegracao(i.id));
  }
  return results;
}
