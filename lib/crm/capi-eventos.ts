import { createServiceClient } from "@/lib/supabase/service";
import { byteaToBuffer, decryptToken } from "@/lib/crypto/tokens";
import { enviarPurchase } from "@/lib/meta-ads/capi";

type Sb = ReturnType<typeof createServiceClient>;

interface Atribuicao {
  ctwaClid: string | null;
  sourceId: string | null;
}
interface AnuncioResolvido {
  anuncioId: string;
  conjuntoId: string;
  campanhaId: string;
  integracaoId: string;
  clienteId: string;
}

/** Acha o ctwa_clid + sourceId (ad id) da 1a mensagem do contato vinda de anúncio. */
async function acharAtribuicao(sb: Sb, agenciaId: string, contatoId: string): Promise<Atribuicao | null> {
  const { data: tks } = await sb.from("tickets").select("id").eq("agencia_id", agenciaId).eq("contato_id", contatoId);
  const ids = (tks || []).map((t) => t.id as string);
  if (!ids.length) return null;
  const { data: msg } = await sb
    .from("mensagens")
    .select("metadata")
    .eq("agencia_id", agenciaId)
    .in("ticket_id", ids)
    .not("metadata->ad_referral->>ctwaClid", "is", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<{ metadata: { ad_referral?: { ctwaClid?: string; sourceId?: string } } }>();
  if (!msg?.metadata?.ad_referral) return null;
  const ref = msg.metadata.ad_referral;
  return { ctwaClid: ref.ctwaClid ?? null, sourceId: ref.sourceId ?? null };
}

/** Resolve sourceId (ad external id) → anuncio/conjunto/campanha/integração/cliente. */
async function resolverAnuncio(sb: Sb, agenciaId: string, sourceId: string): Promise<AnuncioResolvido | null> {
  const { data: an } = await sb
    .from("anuncios")
    .select("id, conjunto_id, conjuntos!inner(id, campanha_id, campanhas!inner(id, integracao_id, cliente_id))")
    .eq("agencia_id", agenciaId)
    .eq("external_id", sourceId)
    .limit(1)
    .maybeSingle<{
      id: string;
      conjunto_id: string;
      conjuntos: { campanha_id: string; campanhas: { id: string; integracao_id: string; cliente_id: string } };
    }>();
  if (!an) return null;
  const camp = an.conjuntos?.campanhas;
  if (!camp) return null;
  return {
    anuncioId: an.id,
    conjuntoId: an.conjunto_id,
    campanhaId: camp.id,
    integracaoId: camp.integracao_id,
    clienteId: camp.cliente_id,
  };
}

/**
 * Enfileira o Purchase de um Fechamento (idempotente por event_id).
 * Chamado via after() na rota de fechamento. Nunca lança.
 */
export async function enfileirarPurchase(ticketId: string): Promise<void> {
  const sb = createServiceClient();
  const { data: tk } = await sb
    .from("tickets")
    .select("id, agencia_id, contato_id, valor_fechado, metadata, fechado_em")
    .eq("id", ticketId)
    .maybeSingle<{
      agencia_id: string;
      contato_id: string;
      valor_fechado: number | null;
      metadata: { servico?: string; quantidade?: number } | null;
      fechado_em: string | null;
    }>();
  if (!tk || tk.valor_fechado == null) return;

  const eventId = `fechamento:${ticketId}`;
  const { data: existe } = await sb
    .from("capi_eventos")
    .select("id")
    .eq("agencia_id", tk.agencia_id)
    .eq("event_id", eventId)
    .maybeSingle();
  if (existe) return;

  const atrib = await acharAtribuicao(sb, tk.agencia_id, tk.contato_id);
  const anr = atrib?.sourceId ? await resolverAnuncio(sb, tk.agencia_id, atrib.sourceId) : null;
  const semAtribuicao = !anr;

  await sb.from("capi_eventos").insert({
    agencia_id: tk.agencia_id,
    cliente_id: anr?.clienteId ?? null,
    integracao_id: anr?.integracaoId ?? null,
    pixel_id: null,
    ticket_id: ticketId,
    contato_id: tk.contato_id,
    event_id: eventId,
    event_name: "Purchase",
    valor: tk.valor_fechado,
    moeda: "BRL",
    servico: tk.metadata?.servico ?? null,
    quantidade: tk.metadata?.quantidade ?? null,
    fechado_em: tk.fechado_em,
    ctwa_clid: atrib?.ctwaClid ?? null,
    source_id: atrib?.sourceId ?? null,
    anuncio_id: anr?.anuncioId ?? null,
    conjunto_id: anr?.conjuntoId ?? null,
    campanha_id: anr?.campanhaId ?? null,
    status: semAtribuicao ? "sem_atribuicao" : "pendente",
    tentativas: 0,
  });
}

export interface ProcessamentoResult {
  processados: number;
  enviados: number;
  erros: number;
  pulados: number;
  sem_pixel: number;
}

/** Processa eventos pendentes com claim atômico. Chamado pelo cron. */
export async function processarCapiEventosPendentes(): Promise<ProcessamentoResult> {
  const sb = createServiceClient();
  const res: ProcessamentoResult = { processados: 0, enviados: 0, erros: 0, pulados: 0, sem_pixel: 0 };

  // Reaper: devolve pra 'pendente' eventos presos em 'enviando' há >10min
  // (timeout serverless no envio anterior). Dedup por event_id torna o reenvio seguro.
  const presoAntes = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  await sb
    .from("capi_eventos")
    .update({ status: "pendente", atualizado_em: new Date().toISOString() })
    .eq("status", "enviando")
    .lt("atualizado_em", presoAntes);

  const { data: pendentes } = await sb
    .from("capi_eventos")
    .select("id, agencia_id, integracao_id, ticket_id, contato_id, event_id, valor, moeda, servico, quantidade, fechado_em, ctwa_clid, created_at, tentativas")
    .eq("status", "pendente")
    .lt("tentativas", 5)
    .limit(50);

  for (const ev of pendentes || []) {
    res.processados++;

    const marcar = async (status: string, patch: Record<string, unknown> = {}) => {
      try {
        await sb.from("capi_eventos").update({ status, atualizado_em: new Date().toISOString(), ...patch }).eq("id", ev.id);
      } catch (e) {
        console.error(`[capi] marcar '${status}' falhou (${ev.id}):`, e instanceof Error ? e.message : String(e));
      }
    };

    // A partir da 5ª tentativa, marca terminal 'erro' (some de 'pendente' e fica reenviável na UI).
    const proxStatus = ((ev.tentativas as number) + 1) >= 5 ? "erro" : "pendente";

    const { data: claim, error: claimErr } = await sb
      .from("capi_eventos")
      .update({ status: "enviando", atualizado_em: new Date().toISOString() })
      .eq("id", ev.id)
      .eq("status", "pendente")
      .select("id");
    if (claimErr) { console.error(`[capi] claim falhou (${ev.id}):`, claimErr.message); res.erros++; continue; }
    if (!claim || claim.length === 0) { res.pulados++; continue; }

    if (!ev.integracao_id) { await marcar("sem_atribuicao"); res.sem_pixel++; continue; }

    const { data: integ } = await sb
      .from("integracoes")
      .select("access_token_encrypted, pixel_id")
      .eq("id", ev.integracao_id)
      .maybeSingle<{ access_token_encrypted: unknown; pixel_id: string | null }>();
    if (!integ?.pixel_id || !integ.access_token_encrypted) {
      await marcar(proxStatus, { erro: "pixel ou token ausente na integração (reconectar/escolher pixel)", tentativas: (ev.tentativas as number) + 1 });
      res.erros++;
      continue;
    }

    let token: string;
    try {
      token = decryptToken(byteaToBuffer(integ.access_token_encrypted));
    } catch (e) {
      await marcar(proxStatus, { erro: `decrypt token: ${e instanceof Error ? e.message : String(e)}`, tentativas: (ev.tentativas as number) + 1 });
      res.erros++;
      continue;
    }

    const { data: ct } = await sb
      .from("contatos")
      .select("telefone, whatsapp, wa_id")
      .eq("id", ev.contato_id)
      .maybeSingle<{ telefone: string | null; whatsapp: string | null; wa_id: string | null }>();
    const telefone = ct?.whatsapp || ct?.telefone || ct?.wa_id || null;

    const r = await enviarPurchase({
      pixelId: integ.pixel_id,
      accessToken: token,
      eventId: ev.event_id as string,
      eventTimeMs: Date.parse((ev.fechado_em as string) || (ev.created_at as string)),
      value: ev.valor as number,
      currency: (ev.moeda as string) || "BRL",
      ctwaClid: (ev.ctwa_clid as string) || null,
      telefone,
      contentName: (ev.servico as string) || null,
      numItems: (ev.quantidade as number) || null,
    });

    if (r.ok) {
      await marcar("enviado", { enviado_em: new Date().toISOString(), pixel_id: integ.pixel_id, resposta: r.raw as object, erro: null });
      res.enviados++;
    } else {
      await marcar(proxStatus, { erro: r.error || "erro CAPI", resposta: r.raw as object, tentativas: (ev.tentativas as number) + 1 });
      res.erros++;
    }
  }

  return res;
}
