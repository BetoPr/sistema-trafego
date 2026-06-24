/**
 * POST /api/chat-assistente
 * Body: { bot: 'suporte'|'dados', sessao_id?: string, mensagem: string }
 *
 * Cria/atualiza sessao, salva msg user, chama Groq, salva msg assistant.
 * Bot 'dados' suporta tool_use: faz round-trip executando tools server-side.
 * Resposta: SSE (data: {delta|done|error|tool_call}\n\n).
 */
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { resolverChaves } from "@/lib/ai/keys";
import { KB_SUPORTE } from "@/lib/chat-assistente/kb-suporte";
import { TOOLS_DADOS, executarTool } from "@/lib/chat-assistente/tools-dados";

export const runtime = "nodejs";
export const maxDuration = 60;

interface MsgIn { papel: "user" | "assistant" | "tool"; conteudo: string; tool_calls?: unknown }

const MODELO_SUPORTE = "llama-3.1-8b-instant";
const MODELO_DADOS = "llama-3.3-70b-versatile";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return new Response("auth", { status: 401 });

  const sb = createServiceClient();
  const { data: u } = await sb.from("usuarios").select("agencia_id").eq("id", auth.user.id).single();
  if (!u) return new Response("no_user", { status: 403 });

  const body = (await req.json().catch(() => ({}))) as { bot?: "suporte" | "dados"; sessao_id?: string; mensagem?: string };
  const bot = body.bot === "dados" ? "dados" : "suporte";
  const msg = (body.mensagem || "").trim();
  if (!msg) return new Response("mensagem_obrigatoria", { status: 400 });

  // Resolve chave Groq
  const chaves = await resolverChaves(u.agencia_id);
  if (chaves.groq.length === 0) {
    return new Response("Sem chave Groq configurada em /configuracoes/ia", { status: 400 });
  }
  const apiKey = chaves.groq[0].key;

  // Sessao
  let sessaoId = body.sessao_id;
  if (!sessaoId) {
    const { data: s } = await sb
      .from("chat_sessoes")
      .insert({ agencia_id: u.agencia_id, usuario_id: auth.user.id, bot, titulo: msg.slice(0, 60) })
      .select("id")
      .single();
    sessaoId = s?.id;
  } else {
    await sb.from("chat_sessoes").update({ updated_at: new Date().toISOString() }).eq("id", sessaoId).eq("agencia_id", u.agencia_id);
  }

  // Salva user msg
  await sb.from("chat_mensagens").insert({ sessao_id: sessaoId, papel: "user", conteudo: msg });

  // Carrega historico
  const { data: hist } = await sb
    .from("chat_mensagens")
    .select("papel, conteudo, tool_calls")
    .eq("sessao_id", sessaoId)
    .order("created_at", { ascending: true })
    .limit(40);

  const systemPrompt = bot === "suporte" ? KB_SUPORTE : `Voce e o assistente de Analise de Dados do Sonar CRM. Acessa metricas reais da agencia via tools. Sempre chame tools pra dados reais — nunca invente numeros. Linguagem direta, pt-BR. Foca em insights acionaveis. Quando mostrar numero, formate BR (R$ com separador, %).`;

  const messages: Array<{ role: string; content: string; tool_call_id?: string; tool_calls?: unknown[] }> = [
    { role: "system", content: systemPrompt },
  ];
  for (const m of (hist || []) as MsgIn[]) {
    if (m.papel === "tool") {
      messages.push({ role: "tool", content: m.conteudo, tool_call_id: (m.tool_calls as { id?: string } | null)?.id || "t" });
    } else if (m.papel === "assistant" && m.tool_calls) {
      messages.push({ role: "assistant", content: m.conteudo, tool_calls: Array.isArray(m.tool_calls) ? (m.tool_calls as unknown[]) : undefined });
    } else {
      messages.push({ role: m.papel, content: m.conteudo });
    }
  }

  const modelo = bot === "suporte" ? MODELO_SUPORTE : MODELO_DADOS;
  const tools = bot === "dados" ? TOOLS_DADOS : undefined;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (obj: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));

      try {
        emit({ sessao_id: sessaoId });

        let respostaFinal = "";
        let rounds = 0;
        const maxRounds = 4;

        while (rounds < maxRounds) {
          rounds++;
          const reqBody: Record<string, unknown> = {
            model: modelo,
            messages,
            temperature: 0.4,
            max_tokens: 1500,
            stream: true,
          };
          if (tools) reqBody.tools = tools;

          const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "content-type": "application/json", Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify(reqBody),
          });
          if (!r.ok || !r.body) {
            const err = await r.text();
            emit({ error: `Groq ${r.status}: ${err.slice(0, 200)}` });
            break;
          }

          let buffer = "";
          let contentAcum = "";
          let toolCallsAcum: Array<{ id: string; type: string; function: { name: string; arguments: string } }> = [];
          const reader = r.body.getReader();
          const decoder = new TextDecoder();
          let stopReason: string | null = null;

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            let idx;
            while ((idx = buffer.indexOf("\n\n")) !== -1) {
              const chunk = buffer.slice(0, idx).trim();
              buffer = buffer.slice(idx + 2);
              if (!chunk.startsWith("data:")) continue;
              const data = chunk.slice(5).trim();
              if (data === "[DONE]") continue;
              try {
                const j = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string; tool_calls?: Array<{ index: number; id?: string; function?: { name?: string; arguments?: string } }> }; finish_reason?: string }> };
                const choice = j.choices?.[0];
                const delta = choice?.delta;
                if (delta?.content) {
                  contentAcum += delta.content;
                  emit({ delta: delta.content });
                }
                if (delta?.tool_calls) {
                  for (const tc of delta.tool_calls) {
                    const i = tc.index;
                    if (!toolCallsAcum[i]) toolCallsAcum[i] = { id: tc.id || `tc_${i}`, type: "function", function: { name: "", arguments: "" } };
                    if (tc.id) toolCallsAcum[i].id = tc.id;
                    if (tc.function?.name) toolCallsAcum[i].function.name += tc.function.name;
                    if (tc.function?.arguments) toolCallsAcum[i].function.arguments += tc.function.arguments;
                  }
                }
                if (choice?.finish_reason) stopReason = choice.finish_reason;
              } catch {}
            }
          }

          if (toolCallsAcum.length > 0) {
            // Salva msg assistant com tool_calls + executa cada tool
            messages.push({ role: "assistant", content: contentAcum, tool_calls: toolCallsAcum });
            await sb.from("chat_mensagens").insert({ sessao_id: sessaoId, papel: "assistant", conteudo: contentAcum, tool_calls: toolCallsAcum as unknown as object, modelo });
            for (const tc of toolCallsAcum) {
              emit({ tool_call: { name: tc.function.name } });
              try {
                const args = JSON.parse(tc.function.arguments || "{}");
                const result = await executarTool(sb, u.agencia_id, tc.function.name, args);
                const resultStr = JSON.stringify(result);
                messages.push({ role: "tool", content: resultStr, tool_call_id: tc.id });
                await sb.from("chat_mensagens").insert({ sessao_id: sessaoId, papel: "tool", conteudo: resultStr, tool_calls: { id: tc.id, name: tc.function.name } });
              } catch (e) {
                const err = e instanceof Error ? e.message : String(e);
                messages.push({ role: "tool", content: JSON.stringify({ error: err }), tool_call_id: tc.id });
                await sb.from("chat_mensagens").insert({ sessao_id: sessaoId, papel: "tool", conteudo: JSON.stringify({ error: err }), tool_calls: { id: tc.id, name: tc.function.name } });
              }
            }
            // Continua loop pra LLM processar resultados
            continue;
          }

          respostaFinal = contentAcum;
          if (stopReason === "stop" || stopReason === "length" || !stopReason) break;
        }

        if (respostaFinal) {
          await sb.from("chat_mensagens").insert({ sessao_id: sessaoId, papel: "assistant", conteudo: respostaFinal, modelo });
        }
        emit({ done: true });
      } catch (e) {
        emit({ error: e instanceof Error ? e.message : String(e) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "content-type": "text/event-stream", "cache-control": "no-cache, no-transform", connection: "keep-alive" },
  });
}
