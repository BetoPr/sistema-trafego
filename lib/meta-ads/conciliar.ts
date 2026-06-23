/**
 * Conciliacao de leads Meta com contatos/tickets do CRM.
 *
 * Estrategia:
 * 1. Busca contato por telefone_norm (com variantes BR de mobile com/sem 9)
 *    ou ctwa_clid (se vier do CTWA — click to WhatsApp).
 * 2. Se achou contato, busca ticket aberto associado (status=aberto/pendente).
 * 3. Marca meta_leads.contato_id + ticket_id + status=conciliado.
 * 4. Se nao achou (lead chegou antes da msg WA), marca orfao + agenda
 *    proxima tentativa em 30min. Cron re-tenta ate 5 vezes.
 *
 * Tambem ha `conciliarOrfaosPorTicket(ticketId)` chamado quando ticket novo
 * eh criado — re-checa leads orfaos que tenham mesmo telefone.
 */
import { createServiceClient } from "@/lib/supabase/service";
import { normalizarTelefoneBR } from "./leadgen";

type SbClient = ReturnType<typeof createServiceClient>;

interface MetaLeadRow {
  id: string;
  agencia_id: string;
  telefone: string | null;
  telefone_norm: string | null;
  ctwa_clid: string | null;
  status: string;
  tentativas_conciliacao: number;
}

interface MatchContato {
  id: string;
  whatsapp: string | null;
  wa_id: string | null;
}

export interface ConciliarResult {
  ok: boolean;
  status: "conciliado" | "orfao" | "erro";
  motivo?: string;
  contato_id?: string;
  ticket_id?: string;
}

async function buscarContatoPorTelefoneOuCtwa(
  sb: SbClient,
  agenciaId: string,
  telefoneNorm: string | null,
  ctwaClid: string | null,
): Promise<MatchContato | null> {
  // Match por ctwa_clid via mensagens.metadata.ad_referral.ctwaClid
  // (o parser grava a chave em camelCase — ver webhook-parser.ts).
  if (ctwaClid) {
    const { data: msg } = await sb
      .from("mensagens")
      .select("ticket_id, tickets!inner(contato_id, agencia_id)")
      .eq("agencia_id", agenciaId)
      .filter("metadata->ad_referral->>ctwaClid", "eq", ctwaClid)
      .limit(1)
      .maybeSingle<{ tickets: { contato_id: string; agencia_id: string } }>();
    if (msg?.tickets?.contato_id) {
      const { data: c } = await sb
        .from("contatos")
        .select("id, whatsapp, wa_id")
        .eq("id", msg.tickets.contato_id)
        .is("deleted_at", null)
        .maybeSingle<MatchContato>();
      if (c) return c;
    }
  }

  if (!telefoneNorm) return null;

  const { variants } = normalizarTelefoneBR(telefoneNorm);
  const padrao = variants.map((v) => `%${v}%`);

  // Match por whatsapp ou wa_id contendo variantes
  for (const p of padrao) {
    const { data: c1 } = await sb
      .from("contatos")
      .select("id, whatsapp, wa_id")
      .eq("agencia_id", agenciaId)
      .is("deleted_at", null)
      .or(`whatsapp.ilike.${p},wa_id.ilike.${p}`)
      .limit(1)
      .maybeSingle<MatchContato>();
    if (c1) return c1;
  }
  return null;
}

async function ticketAbertoDoContato(sb: SbClient, agenciaId: string, contatoId: string): Promise<string | null> {
  const { data: t } = await sb
    .from("tickets")
    .select("id")
    .eq("agencia_id", agenciaId)
    .eq("contato_id", contatoId)
    .in("status", ["aberto", "pendente"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string }>();
  return t?.id || null;
}

/**
 * Concilia um lead especifico. Idempotente.
 */
export async function conciliarLead(metaLeadId: string): Promise<ConciliarResult> {
  const sb = createServiceClient();

  const { data: lead } = await sb
    .from("meta_leads")
    .select("id, agencia_id, telefone, telefone_norm, ctwa_clid, status, tentativas_conciliacao, campos_jsonb")
    .eq("id", metaLeadId)
    .maybeSingle<MetaLeadRow & { campos_jsonb: Record<string, unknown> | null }>();

  if (!lead) return { ok: false, status: "erro", motivo: "lead nao encontrado" };
  if (lead.status === "conciliado") return { ok: true, status: "conciliado" };

  const contato = await buscarContatoPorTelefoneOuCtwa(sb, lead.agencia_id, lead.telefone_norm, lead.ctwa_clid);

  if (!contato) {
    const proxima = new Date(Date.now() + 30 * 60_000).toISOString();
    await sb.from("meta_leads").update({
      status: "orfao",
      motivo_orfao: "sem contato match (telefone/ctwa)",
      tentativas_conciliacao: lead.tentativas_conciliacao + 1,
      proxima_tentativa_em: proxima,
    }).eq("id", lead.id);
    return { ok: false, status: "orfao", motivo: "sem contato match" };
  }

  const ticketId = await ticketAbertoDoContato(sb, lead.agencia_id, contato.id);

  await sb.from("meta_leads").update({
    status: "conciliado",
    contato_id: contato.id,
    ticket_id: ticketId,
    conciliado_em: new Date().toISOString(),
    motivo_orfao: null,
  }).eq("id", lead.id);

  // Persiste idade do form (campos_jsonb._idade) no contato — só se ainda não tiver.
  const idadeBruta = lead.campos_jsonb?.["_idade"];
  const idade =
    typeof idadeBruta === "number"
      ? idadeBruta
      : typeof idadeBruta === "string" && /^\d+$/.test(idadeBruta)
        ? Number(idadeBruta)
        : null;
  if (idade != null && idade >= 0 && idade <= 130) {
    await sb
      .from("contatos")
      .update({ idade })
      .eq("id", contato.id)
      .is("idade", null);
  }

  return { ok: true, status: "conciliado", contato_id: contato.id, ticket_id: ticketId || undefined };
}

/**
 * Quando um ticket novo eh criado, re-checa leads orfaos da agencia com
 * mesmo telefone do contato. Util pra ligar lead chegado ANTES da msg WA.
 */
export async function conciliarOrfaosPorContato(contatoId: string): Promise<{ conciliados: number }> {
  const sb = createServiceClient();

  const { data: contato } = await sb
    .from("contatos")
    .select("id, agencia_id, whatsapp, wa_id")
    .eq("id", contatoId)
    .maybeSingle<{ id: string; agencia_id: string; whatsapp: string | null; wa_id: string | null }>();
  if (!contato) return { conciliados: 0 };

  const tel = (contato.wa_id || contato.whatsapp || "").replace(/\D/g, "");
  if (!tel) return { conciliados: 0 };

  const { variants } = normalizarTelefoneBR(tel);
  if (!variants.length) return { conciliados: 0 };

  const { data: orfaos } = await sb
    .from("meta_leads")
    .select("id")
    .eq("agencia_id", contato.agencia_id)
    .in("status", ["orfao", "novo"])
    .in("telefone_norm", variants);

  let count = 0;
  for (const o of orfaos || []) {
    const r = await conciliarLead(o.id as string);
    if (r.ok && r.status === "conciliado") count++;
  }
  return { conciliados: count };
}

/**
 * Re-tenta leads orfaos com proxima_tentativa_em <= now() e
 * tentativas_conciliacao < 5. Chamado pelo cron.
 */
export async function reconciliarOrfaos(limite = 50): Promise<{ tentados: number; conciliados: number; abandonados: number }> {
  const sb = createServiceClient();
  const { data: leads } = await sb
    .from("meta_leads")
    .select("id, tentativas_conciliacao")
    .in("status", ["orfao", "novo"])
    .lte("proxima_tentativa_em", new Date().toISOString())
    .lt("tentativas_conciliacao", 5)
    .order("proxima_tentativa_em", { ascending: true })
    .limit(limite);

  let conciliados = 0;
  let abandonados = 0;
  for (const l of leads || []) {
    const r = await conciliarLead(l.id as string);
    if (r.ok && r.status === "conciliado") conciliados++;
    else if ((l.tentativas_conciliacao || 0) + 1 >= 5) abandonados++;
  }
  return { tentados: leads?.length || 0, conciliados, abandonados };
}
