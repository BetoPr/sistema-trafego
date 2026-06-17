/**
 * POST /api/ia-atendimento/testar-perfil
 * Body: { perfilId: string }
 *
 * Testa a chave API do perfil fazendo chamada simples ao provider.
 * Retorna {ok, resposta, modelo, tokens, latencia_ms, erro?}.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { decryptToken, byteaToBuffer } from "@/lib/crypto/tokens";
import { chamarIA } from "@/lib/ia-atendimento/providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "auth" }, { status: 401 });

  const sb = createServiceClient();
  const { data: u } = await sb.from("usuarios").select("agencia_id, role").eq("id", auth.user.id).single();
  if (!u) return NextResponse.json({ error: "no_user" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as { perfilId?: string; apiKeyOverride?: string } | null;
  if (!body?.perfilId) return NextResponse.json({ error: "perfilId_obrigatorio" }, { status: 400 });

  const { data: perfil } = await sb
    .from("ia_atendimento_perfis")
    .select("id, agencia_id, provider, modelo, api_key_encrypted, max_tokens_por_resposta, temperatura")
    .eq("id", body.perfilId)
    .maybeSingle();

  if (!perfil) return NextResponse.json({ error: "perfil_nao_encontrado" }, { status: 404 });
  if (perfil.agencia_id !== u.agencia_id) return NextResponse.json({ error: "perfil_fora_agencia" }, { status: 403 });

  // Override: usa chave do form (sem precisar salvar). Fallback pra do DB.
  let apiKey: string;
  const override = (body.apiKeyOverride || "").trim();
  if (override) {
    apiKey = override;
  } else {
    if (!perfil.api_key_encrypted) return NextResponse.json({ error: "sem_chave_api" }, { status: 400 });
    try {
      apiKey = decryptToken(byteaToBuffer(perfil.api_key_encrypted as Parameters<typeof byteaToBuffer>[0]));
    } catch {
      return NextResponse.json({ error: "chave_corrompida" }, { status: 500 });
    }
  }

  // Detecta mismatch entre prefixo da chave e provider escolhido.
  const provider = perfil.provider as string;
  const prefix = apiKey.slice(0, 4).toLowerCase();
  let dicaMismatch: string | null = null;
  if (prefix.startsWith("gsk_") && provider !== "groq") {
    dicaMismatch = `Esta chave parece ser do Groq (prefixo gsk_) mas o provider esta setado pra ${provider}. Troca o provider pra Groq.`;
  } else if (prefix.startsWith("sk-a") && provider !== "anthropic") {
    dicaMismatch = `Esta chave parece ser da Anthropic (prefixo sk-ant) mas o provider esta setado pra ${provider}. Troca o provider pra Anthropic (Claude).`;
  } else if (prefix.startsWith("sk-") && !prefix.startsWith("sk-a") && provider !== "openai") {
    dicaMismatch = `Esta chave parece ser da OpenAI (prefixo sk-) mas o provider esta setado pra ${provider}. Troca o provider pra OpenAI.`;
  }
  if (dicaMismatch) {
    return NextResponse.json({ ok: false, erro: dicaMismatch }, { status: 200 });
  }

  const inicio = Date.now();
  try {
    const resp = await chamarIA({
      provider: perfil.provider as "anthropic" | "openai" | "groq",
      modelo: perfil.modelo,
      apiKey,
      mensagens: [
        { role: "system", content: "Você é um assistente de teste. Responda com exatamente 5 palavras dizendo que está funcionando." },
        { role: "user", content: "teste de conexão" },
      ],
      tools: [],
      maxTokens: 100,
      temperatura: 0.3,
    });
    return NextResponse.json({
      ok: true,
      resposta: resp.texto,
      modelo: resp.modelo,
      tokens_in: resp.tokensIn,
      tokens_out: resp.tokensOut,
      latencia_ms: Date.now() - inicio,
    });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      erro: e instanceof Error ? e.message : String(e),
      latencia_ms: Date.now() - inicio,
    });
  }
}
