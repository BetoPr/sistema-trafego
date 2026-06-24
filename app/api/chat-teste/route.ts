/**
 * POST /api/chat-teste
 * Body: { perfil_id: string, mensagens: Array<{role,content}>, mensagem: string }
 *
 * Roda IA do perfil contra um histórico local (não toca buffer/tickets reais).
 * Suporta modo modular (cápsulas com keyword-match local).
 * Retorna JSON com texto + tokens + cápsulas usadas.
 */
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { chamarIA, type MsgIA } from "@/lib/ia-atendimento/providers";
import { decryptToken, byteaToBuffer } from "@/lib/crypto/tokens";
import { buildContextoTemporal, aplicarPlaceholders } from "@/lib/ia-atendimento/contexto-temporal";
import {
  listarCapsulasPorPerfil,
  matchKeywordsLocal,
  montarPromptModular,
} from "@/lib/ia-atendimento/capsulas";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Body {
  perfil_id?: string;
  mensagens?: Array<{ role: "user" | "assistant"; content: string }>;
  mensagem?: string;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return Response.json({ erro: "auth" }, { status: 401 });

  const sb = createServiceClient();
  const { data: u } = await sb.from("usuarios").select("agencia_id").eq("id", auth.user.id).single();
  if (!u) return Response.json({ erro: "no_user" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as Body;
  const perfilId = String(body.perfil_id || "");
  const novaMsg = (body.mensagem || "").trim();
  const historico = Array.isArray(body.mensagens) ? body.mensagens.slice(-20) : [];
  if (!perfilId || !novaMsg) {
    return Response.json({ erro: "perfil_id + mensagem obrigatórios" }, { status: 400 });
  }

  const { data: perfil } = await sb
    .from("ia_atendimento_perfis")
    .select("*")
    .eq("id", perfilId)
    .eq("agencia_id", u.agencia_id)
    .maybeSingle();
  if (!perfil) return Response.json({ erro: "perfil_nao_encontrado" }, { status: 404 });

  if (!perfil.api_key_encrypted) {
    return Response.json({ erro: "perfil_sem_chave_api" }, { status: 400 });
  }
  let apiKey = "";
  try {
    apiKey = decryptToken(byteaToBuffer(perfil.api_key_encrypted as unknown as string));
  } catch {
    return Response.json({ erro: "chave_invalida" }, { status: 400 });
  }

  // Monta system prompt (idêntico ao executor, mas sem buffer/tickets)
  const tz = (perfil.timezone as string) || "America/Sao_Paulo";
  const ctxTemporal = buildContextoTemporal(tz);
  const promptBase = (perfil.prompt_sistema || "")
    .replaceAll("{nome_cliente}", "Tester")
    .replaceAll("{nome_agencia}", "");
  const promptComPlaceholders = aplicarPlaceholders(promptBase, ctxTemporal.replacements);

  let corpoPrompt = promptComPlaceholders;
  let capsulasUsadas: string[] = [];
  if (perfil.modo_modular) {
    const todas = await listarCapsulasPorPerfil(perfil.id);
    const ativas = todas.filter((c) => c.ativa);
    const relevantes = matchKeywordsLocal(novaMsg, ativas);
    capsulasUsadas = relevantes.map((c) => c.nome);
    corpoPrompt = montarPromptModular({
      identidade: (perfil.identidade as string) || "",
      objetivo: (perfil.objetivo as string) || "",
      regrasGlobais: (perfil.regras_globais as string) || "",
      capsulasInjetadas: relevantes,
      todasCapsulasAtivas: ativas,
    });
  }

  const promptSistema = `${ctxTemporal.block}\n\n[MODO TESTE — sem ferramentas, sem efeitos colaterais]\n\n${corpoPrompt}`;

  const mensagens: MsgIA[] = [{ role: "system", content: promptSistema }];
  for (const h of historico) {
    if (h.role === "user" || h.role === "assistant") {
      mensagens.push({ role: h.role, content: String(h.content || "").slice(0, 2000) });
    }
  }
  mensagens.push({ role: "user", content: novaMsg });

  try {
    const resp = await chamarIA({
      provider: perfil.provider,
      modelo: perfil.modelo,
      apiKey,
      mensagens,
      tools: [], // sem tools em modo teste
      maxTokens: perfil.max_tokens_por_resposta,
      temperatura: Number(perfil.temperatura),
    });
    return Response.json({
      texto: resp.texto || "(sem resposta)",
      tokens_in: resp.tokensIn,
      tokens_out: resp.tokensOut,
      modelo: perfil.modelo,
      modo_modular: !!perfil.modo_modular,
      capsulas_usadas: capsulasUsadas,
    });
  } catch (e) {
    const msg = (e as Error).message || "erro_ia";
    return Response.json({ erro: msg }, { status: 500 });
  }
}
