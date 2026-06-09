/**
 * GET /api/atendimentos/[id]/resumo-stream
 * SSE — streams o resumo IA token por token enquanto Groq gera.
 *
 * Eventos:
 *  - data: {"delta": "palavra"}
 *  - data: {"done": true}
 *  - data: {"error": "msg"}
 */
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { decryptToken, byteaToBuffer } from "@/lib/crypto/tokens";
import { formatConversaParaIA } from "@/lib/groq/llm";

export const runtime = "nodejs";

async function getGroqKeyInline(agenciaId: string): Promise<string | null> {
  const sb = createServiceClient();
  const { data } = await sb
    .from("configuracoes_agencia")
    .select("groq_key_encrypted")
    .eq("agencia_id", agenciaId)
    .maybeSingle();
  if (data?.groq_key_encrypted) {
    try {
      return decryptToken(byteaToBuffer(data.groq_key_encrypted));
    } catch {}
  }
  return process.env.GROQ_API_KEY || null;
}

async function getPromptResumo(agenciaId: string): Promise<{ conteudo: string; modelo: string | null }> {
  const sb = createServiceClient();
  const { data: own } = await sb
    .from("ia_prompts")
    .select("conteudo, modelo_default, ativo")
    .eq("agencia_id", agenciaId)
    .eq("chave", "resumo")
    .eq("ativo", true)
    .maybeSingle();
  if (own) return { conteudo: own.conteudo, modelo: own.modelo_default };
  const { data: global } = await sb
    .from("ia_prompts")
    .select("conteudo, modelo_default")
    .is("agencia_id", null)
    .eq("chave", "resumo")
    .eq("ativo", true)
    .single();
  return { conteudo: global?.conteudo || "", modelo: global?.modelo_default || null };
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) {
    return new Response("auth", { status: 401 });
  }

  const sb = createServiceClient();
  const { data: u } = await sb.from("usuarios").select("agencia_id").eq("id", auth.user.id).single();
  if (!u) return new Response("no_user", { status: 403 });

  const apiKey = await getGroqKeyInline(u.agencia_id);
  if (!apiKey) return new Response("groq_nao_configurado", { status: 400 });

  const [{ conteudo: prompt, modelo }, { data: msgs }, { data: ticket }] = await Promise.all([
    getPromptResumo(u.agencia_id),
    sb
      .from("mensagens")
      .select("autor, conteudo, transcricao, tipo, created_at")
      .eq("ticket_id", id)
      .order("created_at", { ascending: true })
      .limit(500),
    sb.from("tickets").select("contato:contatos(nome)").eq("id", id).single(),
  ]);

  const contatoNome = (ticket?.contato as unknown as { nome?: string } | null)?.nome;
  const conversa = formatConversaParaIA(
    (msgs || []) as Array<{ autor: "cliente" | "atendente" | "sistema" | "bot"; conteudo: string | null; transcricao: string | null; tipo: string; created_at: string }>,
    contatoNome,
  );

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function emit(obj: unknown) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      }

      try {
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "content-type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: modelo || "llama-3.3-70b-versatile",
            messages: [
              { role: "system", content: prompt },
              { role: "user", content: conversa },
            ],
            temperature: 0.3,
            max_tokens: 800,
            stream: true,
          }),
        });

        if (!groqRes.ok || !groqRes.body) {
          const errText = await groqRes.text();
          emit({ error: `Groq ${groqRes.status}: ${errText.slice(0, 200)}` });
          controller.close();
          return;
        }

        const reader = groqRes.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let resumoCompleto = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          // SSE chunks separados por \n\n
          let idx;
          while ((idx = buffer.indexOf("\n\n")) !== -1) {
            const chunk = buffer.slice(0, idx).trim();
            buffer = buffer.slice(idx + 2);
            if (!chunk.startsWith("data:")) continue;
            const data = chunk.slice(5).trim();
            if (data === "[DONE]") continue;
            try {
              const json = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string } }> };
              const delta = json.choices?.[0]?.delta?.content;
              if (delta) {
                resumoCompleto += delta;
                emit({ delta });
              }
            } catch {
              // ignore parse errors
            }
          }
        }

        // Salva no banco final
        if (resumoCompleto) {
          await sb
            .from("tickets")
            .update({ resumo: resumoCompleto, resumo_atualizado_em: new Date().toISOString() })
            .eq("id", id);
          await sb.from("ia_execucoes").insert({
            agencia_id: u.agencia_id,
            ticket_id: id,
            tipo: "resumo",
            modelo: modelo || "llama-3.3-70b-versatile",
            prompt_usado: prompt,
            entrada_chars: conversa.length,
            resultado: { resumo: resumoCompleto },
          });
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
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}
