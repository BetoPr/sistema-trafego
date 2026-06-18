/**
 * Webhook leadgen Meta.
 *
 * GET  /api/webhooks/meta/leadgen?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...
 *      Meta chama uma vez ao adicionar webhook → ecoa challenge se token bate
 *
 * POST /api/webhooks/meta/leadgen
 *      Meta dispara a cada lead novo. Payload tem entry[].changes[].value.leadgen_id.
 *      Buscamos detalhes via Graph API, inserimos em meta_leads, disparamos
 *      conciliacao via after() (nao bloqueia resposta 200).
 *
 * Seguranca: GET valida META_WEBHOOK_VERIFY_TOKEN. POST nao valida assinatura
 * por padrao (Meta usa X-Hub-Signature-256 com app_secret) — pra produtivo,
 * comparar `crypto.timingSafeEqual` se META_APP_SECRET setado.
 */
import { NextResponse } from "next/server";
import { after } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/service";
import {
  extrairLeadgenChanges,
  fetchLeadDetails,
  parseFieldData,
  normalizarTelefoneBR,
  resolverPageAccessToken,
  type LeadgenWebhookPayload,
} from "@/lib/meta-ads/leadgen";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");
  const expected = process.env.META_WEBHOOK_VERIFY_TOKEN;

  if (mode === "subscribe" && expected && token === expected && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "verify_failed" }, { status: 403 });
}

export async function POST(req: Request) {
  const raw = await req.text();

  // Valida X-Hub-Signature-256 quando META_APP_SECRET está configurado
  // (impede forjar payload de lead). Sem o secret, mantém o comportamento atual.
  const appSecret = process.env.META_APP_SECRET;
  if (appSecret) {
    const sig = req.headers.get("x-hub-signature-256") || "";
    const esperado = "sha256=" + createHmac("sha256", appSecret).update(raw).digest("hex");
    const ok = sig.length === esperado.length && timingSafeEqual(Buffer.from(sig), Buffer.from(esperado));
    if (!ok) return NextResponse.json({ ok: false, error: "assinatura_invalida" }, { status: 403 });
  }

  let payload: LeadgenWebhookPayload;
  try {
    payload = JSON.parse(raw) as LeadgenWebhookPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  // Acks rapido 200 + processa em background via after()
  after(async () => {
    try {
      await processarLeadgenPayload(payload);
    } catch (e) {
      console.error("[webhook meta leadgen] processamento falhou", e);
    }
  });

  return NextResponse.json({ ok: true });
}

async function processarLeadgenPayload(payload: LeadgenWebhookPayload): Promise<void> {
  const sb = createServiceClient();
  const changes = extrairLeadgenChanges(payload);
  if (!changes.length) return;

  for (const ch of changes) {
    try {
      // Determina agencia pelo page_id: busca em integracoes.metadata.pages
      const { data: integs } = await sb
        .from("integracoes")
        .select("id, agencia_id, access_token_encrypted, metadata")
        .eq("plataforma", "meta_ads")
        .eq("status", "ativa");

      const match = (integs || []).find((i) => {
        const pages = (i.metadata as { pages?: Array<{ id: string }> } | null)?.pages || [];
        return pages.some((p) => p.id === ch.page_id);
      });

      if (!match) {
        console.warn("[leadgen] sem integracao pra page_id", ch.page_id);
        continue;
      }

      const agenciaId = match.agencia_id as string;
      const tokenInfo = await resolverPageAccessToken(agenciaId, ch.page_id);
      if (!tokenInfo) {
        await sb.from("meta_leads").upsert(
          {
            agencia_id: agenciaId,
            lead_id: ch.leadgen_id,
            form_id: ch.form_id || null,
            page_id: ch.page_id || null,
            ad_id: ch.ad_id || null,
            status: "erro",
            motivo_orfao: "sem page access token",
          },
          { onConflict: "lead_id,agencia_id", ignoreDuplicates: false },
        );
        continue;
      }

      let detail;
      try {
        detail = await fetchLeadDetails(ch.leadgen_id, tokenInfo.token);
      } catch (err) {
        await sb.from("meta_leads").upsert(
          {
            agencia_id: agenciaId,
            lead_id: ch.leadgen_id,
            form_id: ch.form_id || null,
            page_id: ch.page_id || null,
            ad_id: ch.ad_id || null,
            status: "erro",
            motivo_orfao: `graph: ${err instanceof Error ? err.message : String(err)}`,
          },
          { onConflict: "lead_id,agencia_id" },
        );
        continue;
      }

      const fields = parseFieldData(detail);
      const tel = normalizarTelefoneBR(fields.telefone);

      const camposExtras = fields.extras;
      const ctwa = (camposExtras["ctwa_clid"] || camposExtras["ctwa_clickid"] || null) as string | null;

      const { data: inserido } = await sb.from("meta_leads").upsert(
        {
          agencia_id: agenciaId,
          lead_id: ch.leadgen_id,
          form_id: detail.form_id || ch.form_id || null,
          page_id: ch.page_id || null,
          campaign_id: detail.campaign_id || null,
          adset_id: detail.adset_id || null,
          ad_id: detail.ad_id || ch.ad_id || null,
          ctwa_clid: ctwa,
          telefone: fields.telefone,
          telefone_norm: tel.primary,
          email: fields.email,
          nome: fields.nome,
          campos_jsonb: camposExtras,
          raw_jsonb: detail as unknown as Record<string, unknown>,
          status: "novo",
          tentativas_conciliacao: 0,
          proxima_tentativa_em: new Date().toISOString(),
        },
        { onConflict: "lead_id,agencia_id" },
      ).select("id").maybeSingle();

      if (inserido?.id) {
        // Tenta conciliar imediato
        const { conciliarLead } = await import("@/lib/meta-ads/conciliar");
        await conciliarLead(inserido.id);
      }
    } catch (e) {
      console.error("[leadgen] change failed", ch, e);
    }
  }
}
