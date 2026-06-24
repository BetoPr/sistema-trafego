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
import { buildToolsSchema } from "@/lib/ia-atendimento/tools-runner";
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

  // Carrega ferramentas do perfil pra IA poder chamar (simulado)
  const { data: ferramentasRows } = await sb
    .from("ia_atendimento_ferramentas")
    .select("id, nome, descricao, acao, parametros")
    .eq("perfil_id", perfil.id)
    .eq("ativo", true);
  const tools = await buildToolsSchema(
    (ferramentasRows || []) as Array<{ id: string; nome: string; descricao: string; acao: string; parametros: Record<string, unknown> }>,
    { sb, agenciaId: u.agencia_id },
  );

  // Etiquetas configuradas (mesma lógica do executor)
  const { data: etiquetasCfg } = await sb
    .from("ia_atendimento_perfil_etiquetas")
    .select("descricao_uso, ordem, etiqueta:etiquetas!inner(id, nome, ativo)")
    .eq("perfil_id", perfil.id)
    .order("ordem");
  type EtqRow = {
    descricao_uso: string;
    ordem: number;
    etiqueta: { id: string; nome: string; ativo: boolean } | { id: string; nome: string; ativo: boolean }[] | null;
  };
  const etqRowsRaw = (etiquetasCfg || []) as EtqRow[];
  const etqRows = etqRowsRaw
    .map((r) => {
      const e = Array.isArray(r.etiqueta) ? r.etiqueta[0] : r.etiqueta;
      return e ? { descricao_uso: r.descricao_uso, ordem: r.ordem, etiqueta: e } : null;
    })
    .filter((r): r is { descricao_uso: string; ordem: number; etiqueta: { id: string; nome: string; ativo: boolean } } => r !== null && r.etiqueta.ativo);

  const blocoEtiquetas = etqRows.length
    ? `[ETIQUETAS DISPONIVEIS]\nVoce SO pode aplicar essas etiquetas via aplicar_etiqueta. NAO invente outras.\n${
        etqRows.map((r) => `- ${r.etiqueta.nome}: ${r.descricao_uso || "(sem instrucao especifica)"}`).join("\n")
      }\n\n`
    : "";

  const blocoFerramentas = tools.length
    ? `[FERRAMENTAS / AÇÕES — OBRIGATÓRIO]\nVocê tem estas funções. Assim que a situação se encaixar, CHAME a função correspondente NA MESMA resposta, ANTES de conversar.\n${
        tools.map((t) => `- ${t.name}: ${(t.description || "").split("\n")[0]}`).join("\n")
      }\n\n`
    : "";

  const promptSistema = `${ctxTemporal.block}\n\n[MODO TESTE — IA pode chamar ferramentas, mas execução é SIMULADA (efeitos não saem do chat)]\n\n${blocoFerramentas}${blocoEtiquetas}${corpoPrompt}`;

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
      tools, // tools ativadas mas execução é simulada (não roda handler)
      maxTokens: perfil.max_tokens_por_resposta,
      temperatura: Number(perfil.temperatura),
    });

    const toolCalls = (resp.toolCalls || []).map((tc) => ({
      tool: tc.name,
      args: tc.arguments || {},
    }));

    return Response.json({
      texto: resp.texto || (toolCalls.length > 0 ? "(IA chamou ferramentas — sem texto adicional)" : "(sem resposta)"),
      tokens_in: resp.tokensIn,
      tokens_out: resp.tokensOut,
      modelo: perfil.modelo,
      modo_modular: !!perfil.modo_modular,
      capsulas_usadas: capsulasUsadas,
      tool_calls: toolCalls,
    });
  } catch (e) {
    const msg = (e as Error).message || "erro_ia";
    return Response.json({ erro: msg }, { status: 500 });
  }
}
