/**
 * Lead Ads (leadgen) helpers.
 *
 * - `fetchLeadDetails`: busca dados do lead via Graph API com page access token
 * - `parseLeadgenChange`: extrai campos do payload do webhook
 * - `normalizarTelefoneBR`: normaliza pra match com contatos.whatsapp/wa_id
 */
import { createServiceClient } from "@/lib/supabase/service";
import { decryptToken, byteaToBuffer } from "@/lib/crypto/tokens";

const GRAPH_BASE = "https://graph.facebook.com";

function apiVersion(): string {
  return process.env.META_API_VERSION || "v21.0";
}

export interface LeadField {
  name: string;
  values: string[];
}

export interface LeadDetail {
  id: string;
  created_time: string;
  ad_id?: string;
  ad_name?: string;
  adset_id?: string;
  adset_name?: string;
  campaign_id?: string;
  campaign_name?: string;
  form_id?: string;
  field_data: LeadField[];
}

/**
 * Busca dados completos do lead via Graph API.
 * Usa page access token (cada Page tem o seu — armazenado em integracoes.metadata.pages).
 */
export async function fetchLeadDetails(leadId: string, pageAccessToken: string): Promise<LeadDetail> {
  const url = new URL(`${GRAPH_BASE}/${apiVersion()}/${leadId}`);
  url.searchParams.set(
    "fields",
    "id,created_time,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,form_id,field_data",
  );
  url.searchParams.set("access_token", pageAccessToken);
  const res = await fetch(url.toString(), { cache: "no-store" });
  const j = await res.json();
  if (!res.ok || j.error) throw new Error(`Meta lead fetch: ${j.error?.message || res.statusText}`);
  return j as LeadDetail;
}

/**
 * Webhook payload do leadgen: para cada entry.changes[].value
 * vem { leadgen_id, page_id, form_id, adgroup_id, created_time, ad_id }
 */
export interface LeadgenChange {
  leadgen_id: string;
  page_id?: string;
  form_id?: string;
  ad_id?: string;
  adgroup_id?: string;
  created_time?: number;
}

export interface LeadgenWebhookPayload {
  object?: string;
  entry?: Array<{
    id?: string;
    time?: number;
    changes?: Array<{
      field?: string;
      value?: LeadgenChange;
    }>;
  }>;
}

export function extrairLeadgenChanges(payload: LeadgenWebhookPayload): LeadgenChange[] {
  const out: LeadgenChange[] = [];
  for (const e of payload.entry || []) {
    for (const c of e.changes || []) {
      if (c.field === "leadgen" && c.value?.leadgen_id) out.push(c.value);
    }
  }
  return out;
}

/**
 * Extrai email, telefone, nome dos field_data + outros campos extras.
 */
export function parseFieldData(detail: LeadDetail): {
  email: string | null;
  telefone: string | null;
  nome: string | null;
  idade: number | null;
  extras: Record<string, string>;
} {
  let email: string | null = null;
  let telefone: string | null = null;
  let nome: string | null = null;
  let idade: number | null = null;
  const extras: Record<string, string> = {};

  for (const f of detail.field_data || []) {
    const k = (f.name || "").toLowerCase();
    const v = (f.values?.[0] || "").trim();
    if (!v) continue;
    if (!email && (k === "email" || k.includes("e-mail") || k.includes("e_mail"))) {
      email = v;
    } else if (!telefone && (k === "phone_number" || k.includes("telefone") || k.includes("phone") || k.includes("celular") || k.includes("whatsapp"))) {
      telefone = v;
    } else if (!nome && (k === "full_name" || k === "nome" || k.includes("name") || k.includes("nome"))) {
      nome = v;
    } else if (idade == null && (k === "age" || k.includes("idade") || k.includes("age "))) {
      const n = parseInt(v.replace(/\D/g, ""), 10);
      if (Number.isFinite(n) && n >= 0 && n <= 130) idade = n;
      else extras[f.name] = v;
    } else {
      extras[f.name] = v;
    }
  }

  return { email, telefone, nome, idade, extras };
}

/**
 * Normaliza telefone BR pra match com contatos.whatsapp/wa_id.
 * - Remove tudo que nao for digito
 * - Garante DDI 55 no comeco
 * - Em mobile BR (DDD + 9XXXXXXXX = 11 digitos), gera variant com e sem o "9"
 */
export function normalizarTelefoneBR(raw: string | null | undefined): { primary: string | null; variants: string[] } {
  if (!raw) return { primary: null, variants: [] };
  let d = raw.replace(/\D/g, "");
  if (!d) return { primary: null, variants: [] };
  if (d.length === 10 || d.length === 11) d = `55${d}`;
  if (d.length < 12 || d.length > 14) return { primary: d, variants: [d] };

  const variants = new Set<string>();
  variants.add(d);

  if (d.startsWith("55") && d.length === 13) {
    const ddd = d.slice(2, 4);
    const resto = d.slice(4);
    if (resto.length === 9 && resto[0] === "9") {
      variants.add(`55${ddd}${resto.slice(1)}`);
    }
  } else if (d.startsWith("55") && d.length === 12) {
    const ddd = d.slice(2, 4);
    const resto = d.slice(4);
    if (resto.length === 8) {
      variants.add(`55${ddd}9${resto}`);
    }
  }

  return { primary: d, variants: Array.from(variants) };
}

/**
 * Resolve qual integracao Meta da agencia tem a page que originou o lead.
 * Retorna page access token decriptado pra fazer chamadas Graph com permissao da Page.
 *
 * Espera-se que `integracoes.metadata.pages` seja `[{ id, name, access_token_encrypted }]`.
 * Fallback: usa access_token_encrypted da integracao raiz (user token).
 */
export async function resolverPageAccessToken(agenciaId: string, pageId: string | undefined): Promise<{ token: string; integracaoId: string } | null> {
  const sb = createServiceClient();
  const { data: integ } = await sb
    .from("integracoes")
    .select("id, access_token_encrypted, metadata")
    .eq("agencia_id", agenciaId)
    .eq("plataforma", "meta_ads")
    .eq("status", "ativa")
    .limit(1)
    .maybeSingle<{ id: string; access_token_encrypted: unknown; metadata: { pages?: Array<{ id: string; access_token_encrypted?: unknown }> } | null }>();

  if (!integ) return null;

  const pages = integ.metadata?.pages || [];
  if (pageId) {
    const p = pages.find((x) => x.id === pageId);
    if (p?.access_token_encrypted) {
      try {
        const token = decryptToken(byteaToBuffer(p.access_token_encrypted as Parameters<typeof byteaToBuffer>[0]));
        return { token, integracaoId: integ.id };
      } catch {
        // cai pro fallback abaixo
      }
    }
  }

  if (integ.access_token_encrypted) {
    try {
      const token = decryptToken(byteaToBuffer(integ.access_token_encrypted as Parameters<typeof byteaToBuffer>[0]));
      return { token, integracaoId: integ.id };
    } catch {
      return null;
    }
  }
  return null;
}
