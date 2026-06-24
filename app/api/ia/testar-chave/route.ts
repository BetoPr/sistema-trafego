import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { decryptToken, byteaToBuffer } from "@/lib/crypto/tokens";

export const runtime = "nodejs";

/**
 * POST /api/ia/testar-chave { id }
 * Testa UMA chave de ia_chaves (por id), pra saber qual está com problema sem
 * precisar testar uma por uma manualmente. Valida via GET /models do provider
 * (não gasta token). Retorna { ok, msg }.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ ok: false, msg: "Não autenticado" }, { status: 401 });

  const sb = createServiceClient();
  const { data: u } = await sb.from("usuarios").select("agencia_id, role").eq("id", auth.user.id).single();
  if (!u || !["admin", "super_admin"].includes(u.role as string)) {
    return NextResponse.json({ ok: false, msg: "Sem permissão" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { id?: string };
  if (!body.id) return NextResponse.json({ ok: false, msg: "id obrigatório" }, { status: 400 });

  const { data: row } = await sb
    .from("ia_chaves")
    .select("provider, key_encrypted")
    .eq("id", body.id)
    .eq("agencia_id", u.agencia_id)
    .maybeSingle();
  if (!row) return NextResponse.json({ ok: false, msg: "Chave não encontrada" }, { status: 404 });

  let apiKey: string;
  try {
    apiKey = decryptToken(byteaToBuffer((row as { key_encrypted: unknown }).key_encrypted));
  } catch {
    return NextResponse.json({ ok: false, msg: "Falha ao decriptar a chave (ENCRYPTION_KEY trocada?)" });
  }

  const provider = (row as { provider: string }).provider;
  const cfg: Record<string, { url: string; headers: Record<string, string>; body: unknown }> = {
    groq: {
      url: "https://api.groq.com/openai/v1/chat/completions",
      headers: { "content-type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: { model: "llama-3.1-8b-instant", messages: [{ role: "user", content: "Responda apenas: OK" }], max_tokens: 5 },
    },
    openai: {
      url: "https://api.openai.com/v1/chat/completions",
      headers: { "content-type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: { model: "gpt-4o-mini", messages: [{ role: "user", content: "Responda apenas: OK" }], max_tokens: 5 },
    },
    anthropic: {
      url: "https://api.anthropic.com/v1/messages",
      headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: { model: "claude-haiku-4-5-20251001", max_tokens: 5, messages: [{ role: "user", content: "Responda apenas: OK" }] },
    },
  };
  const c = cfg[provider];
  if (!c) return NextResponse.json({ ok: false, msg: `Provider desconhecido: ${provider}` });

  try {
    const r = await fetch(c.url, { method: "POST", headers: c.headers, body: JSON.stringify(c.body) });
    const j = (await r.json().catch(() => ({}))) as { choices?: Array<{ message?: { content?: string } }>; content?: Array<{ text?: string }>; usage?: { total_tokens?: number; input_tokens?: number; output_tokens?: number }; error?: { message?: string } };
    if (!r.ok) {
      return NextResponse.json({ ok: false, msg: j.error?.message || `${r.status} ${r.statusText}` });
    }
    const reply = j.choices?.[0]?.message?.content || j.content?.[0]?.text || "(vazio)";
    const tok = j.usage?.total_tokens ?? ((j.usage?.input_tokens ?? 0) + (j.usage?.output_tokens ?? 0));
    return NextResponse.json({ ok: true, msg: `OK — "${reply}" (${tok} tokens)` });
  } catch (e) {
    return NextResponse.json({ ok: false, msg: e instanceof Error ? e.message : "Falha de rede" });
  }
}
