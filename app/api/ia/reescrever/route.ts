/**
 * POST /api/ia/reescrever
 * Body: { texto, estilo: 'profissional' | 'simpatico' | 'marketing' | 'ortografia' }
 * Retorna: { texto: string } reescrito via Groq Llama.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { chat } from "@/lib/groq/llm";
import { getGroqKey } from "@/lib/crm/ia";

export const runtime = "nodejs";

const PROMPTS: Record<string, string> = {
  profissional: "Reescreva o texto abaixo num tom formal, corporativo, claro e direto. Mantenha o significado original. Não adicione informação nova. Devolva APENAS o texto reescrito, sem comentários.",
  simpatico: "Reescreva o texto abaixo num tom amigável, caloroso, simpático. Use linguagem natural, sem ser formal demais. Mantenha o significado original. Devolva APENAS o texto reescrito.",
  marketing: "Reescreva o texto abaixo num tom persuasivo, envolvente, focado em conversão. Use gatilhos de venda sutis (urgência, benefício, prova). Mantenha o significado original. Devolva APENAS o texto reescrito.",
  ortografia: "Corrija apenas ortografia, acentuação, pontuação e concordância do texto abaixo. NÃO mude o estilo, tom ou estrutura. Devolva APENAS o texto corrigido.",
};

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "auth" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { texto?: string; estilo?: keyof typeof PROMPTS } | null;
  if (!body?.texto || !body?.estilo || !PROMPTS[body.estilo]) {
    return NextResponse.json({ error: "body_invalido" }, { status: 400 });
  }

  const sb = createServiceClient();
  const { data: u } = await sb.from("usuarios").select("agencia_id").eq("id", auth.user.id).single();
  if (!u) return NextResponse.json({ error: "no_user" }, { status: 403 });

  const apiKey = await getGroqKey(u.agencia_id);
  if (!apiKey) return NextResponse.json({ error: "groq_nao_configurado" }, { status: 400 });

  try {
    const r = await chat({
      apiKey,
      model: "llama-3.3-70b-versatile",
      temperature: 0.4,
      maxTokens: 500,
      messages: [
        { role: "system", content: PROMPTS[body.estilo] },
        { role: "user", content: body.texto },
      ],
    });
    return NextResponse.json({ texto: r.content.trim() });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
