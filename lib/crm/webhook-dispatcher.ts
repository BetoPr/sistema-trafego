/**
 * Dispatcher de webhooks OUT (sistema → URL externa).
 * Server-side. Usa service_role pra ler webhooks_out + escrever logs.
 *
 * Eventos suportados:
 *  - mensagem.recebida
 *  - mensagem.enviada
 *  - ticket.criado
 *  - ticket.fechado
 *  - pagamento.recebido
 *  - contato.criado
 *  - etiqueta.adicionada
 */
import { createHmac } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/service";

export type WebhookEvento =
  | "mensagem.recebida"
  | "mensagem.enviada"
  | "ticket.criado"
  | "ticket.fechado"
  | "pagamento.recebido"
  | "contato.criado"
  | "etiqueta.adicionada";

interface DispatchOpts {
  agenciaId: string;
  evento: WebhookEvento;
  payload: Record<string, unknown>;
}

function signPayload(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export async function dispatchWebhook(opts: DispatchOpts): Promise<void> {
  const sb = createServiceClient();
  const { data: webhooks } = await sb
    .from("webhooks_out")
    .select("id, url, eventos, secret, ativo")
    .eq("agencia_id", opts.agenciaId)
    .eq("ativo", true);

  if (!webhooks || webhooks.length === 0) return;

  await Promise.all(
    webhooks
      .filter((w) => (w.eventos as string[])?.includes(opts.evento))
      .map((w) => deliverOne(w, opts).catch((e) => console.error("[webhook] deliver error", e))),
  );
}

interface WebhookRow {
  id: string;
  url: string;
  eventos: string[];
  secret: string;
  ativo: boolean;
}

async function deliverOne(w: WebhookRow, opts: DispatchOpts, attempt = 1): Promise<void> {
  const sb = createServiceClient();
  const body = JSON.stringify({
    evento: opts.evento,
    ts: new Date().toISOString(),
    data: opts.payload,
  });
  const sig = signPayload(w.secret, body);

  const t0 = Date.now();
  let status = 0;
  let resposta = "";
  let erro: string | null = null;

  try {
    const ctrl = new AbortController();
    const tm = setTimeout(() => ctrl.abort(), 12_000);
    const res = await fetch(w.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-sistema-trafego-signature": sig,
        "x-sistema-trafego-event": opts.evento,
        "x-sistema-trafego-attempt": String(attempt),
      },
      body,
      signal: ctrl.signal,
    });
    clearTimeout(tm);
    status = res.status;
    resposta = await res.text().catch(() => "");
    resposta = resposta.slice(0, 2000);
  } catch (e) {
    erro = e instanceof Error ? e.message : String(e);
  }

  const durMs = Date.now() - t0;

  await sb.from("webhooks_out_logs").insert({
    webhook_id: w.id,
    agencia_id: opts.agenciaId,
    evento: opts.evento,
    payload: opts.payload,
    status_code: status || null,
    resposta: resposta || null,
    erro,
    tentativa: attempt,
    duracao_ms: durMs,
  });

  // Retry 1x em falha network ou 5xx
  if ((erro || (status >= 500 && status < 600)) && attempt < 2) {
    await new Promise((r) => setTimeout(r, 2_000));
    await deliverOne(w, opts, attempt + 1);
  }
}
