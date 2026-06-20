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
  const cfg: Record<string, { url: string; headers: Record<string, string> }> = {
    groq: { url: "https://api.groq.com/openai/v1/models", headers: { Authorization: `Bearer ${apiKey}` } },
    openai: { url: "https://api.openai.com/v1/models", headers: { Authorization: `Bearer ${apiKey}` } },
    anthropic: { url: "https://api.anthropic.com/v1/models", headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01" } },
  };
  const c = cfg[provider];
  if (!c) return NextResponse.json({ ok: false, msg: `Provider desconhecido: ${provider}` });

  try {
    const r = await fetch(c.url, { headers: c.headers });
    const j = (await r.json().catch(() => ({}))) as { data?: unknown[]; error?: { message?: string } };
    if (!r.ok) {
      const m = j.error?.message || `${r.status} ${r.statusText}`;
      return NextResponse.json({ ok: false, msg: m });
    }
    const n = Array.isArray(j.data) ? j.data.length : 0;
    return NextResponse.json({ ok: true, msg: n ? `OK — ${n} modelos disponíveis` : "OK — chave válida" });
  } catch (e) {
    return NextResponse.json({ ok: false, msg: e instanceof Error ? e.message : "Falha de rede" });
  }
}
