/**
 * Executor de tools chamadas pela IA. Cada tool é validada server-side
 * contra agencia_id antes de qualquer mutação.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export interface ToolDef {
  name: string;
  description: string;
  acao: string;
  parametros_padrao: Record<string, unknown>;
  input_schema: Record<string, unknown>;
}

export interface CtxIA {
  sb: SupabaseClient;
  agenciaId: string;
  ticketId: string;
  contatoId: string;
  perfilId: string;
  canalId: string | null;
  enviarMensagemUazapi: (texto: string) => Promise<{ id?: string }>;
}

/**
 * Constrói schema de tools no formato esperado pelos providers.
 * Tools fixas (definidas no enum acao) + tools custom do user.
 */
export function buildToolsSchema(ferramentas: Array<{ nome: string; descricao: string; acao: string; parametros: Record<string, unknown> }>): ToolDef[] {
  const tools: ToolDef[] = [];

  // Tool fixa "biscoito" pra teste — sempre disponível
  tools.push({
    name: "manda_biscoito",
    description: "Use SEMPRE que o cliente mencionar a palavra 'biscoito'. Envia uma resposta divertida com biscoito.",
    acao: "manda_biscoito",
    parametros_padrao: {},
    input_schema: {
      type: "object",
      properties: {
        motivo: { type: "string", description: "Por que chamou (1 linha)" },
      },
      required: [],
    },
  });

  // Tools fixas universais
  tools.push({
    name: "transferir_para_humano",
    description: "Tira a IA do atendimento e marca pra humano assumir. Use quando: cliente pede falar com pessoa, demonstra irritação, pede preço/proposta firme, ou você não souber responder com certeza.",
    acao: "transferir_para_humano",
    parametros_padrao: {},
    input_schema: {
      type: "object",
      properties: {
        motivo: { type: "string", description: "Motivo curto da transferência (será logado)" },
      },
      required: ["motivo"],
    },
  });

  tools.push({
    name: "aplicar_etiqueta",
    description: "Marca o contato com uma etiqueta. Use pra qualificar lead (Lead Quente, Lead Morno, Lead Qualificado, Urgente, etc.). Crie etiqueta automaticamente se ainda não existir.",
    acao: "aplicar_etiqueta",
    parametros_padrao: {},
    input_schema: {
      type: "object",
      properties: {
        etiqueta_nome: { type: "string", description: "Nome da etiqueta (ex: 'Lead Quente')" },
      },
      required: ["etiqueta_nome"],
    },
  });

  tools.push({
    name: "criar_nota",
    description: "Cria uma nota interna no ticket pra equipe ver. Use pra registrar informação importante levantada na conversa (orçamento mencionado, prazo, restrição).",
    acao: "criar_nota",
    parametros_padrao: {},
    input_schema: {
      type: "object",
      properties: {
        texto: { type: "string", description: "Texto da nota" },
      },
      required: ["texto"],
    },
  });

  // Tools custom do user (mescla com fixas pelo nome — custom sobrescreve)
  const nomesFixos = new Set(tools.map((t) => t.name));
  for (const f of ferramentas) {
    if (nomesFixos.has(f.nome)) continue; // não duplica
    tools.push({
      name: f.nome,
      description: f.descricao,
      acao: f.acao,
      parametros_padrao: f.parametros || {},
      input_schema: {
        type: "object",
        properties: {
          observacao: { type: "string", description: "Observação curta (1 linha)" },
        },
        required: [],
      },
    });
  }

  return tools;
}

export async function executarTool(
  ctx: CtxIA,
  tool: ToolDef,
  argumentos: Record<string, unknown>,
): Promise<{ ok: boolean; resultado: string; encerra_ia?: boolean }> {
  const merged = { ...tool.parametros_padrao, ...argumentos };

  switch (tool.acao) {
    case "manda_biscoito": {
      const msg = "🍪 Tomaaa seu biscoito! 🍪";
      await ctx.enviarMensagemUazapi(msg);
      await ctx.sb.from("mensagens").insert({
        ticket_id: ctx.ticketId,
        agencia_id: ctx.agenciaId,
        autor: "bot",
        tipo: "texto",
        conteudo: msg,
        status: "enviada",
        metadata: { ia_perfil_id: ctx.perfilId, tool: "manda_biscoito" },
      });
      return { ok: true, resultado: "biscoito enviado" };
    }

    case "transferir_para_humano": {
      const motivo = String(merged.motivo || "transferência pela IA");
      await ctx.sb.from("tickets").update({
        ia_pausada: true,
        usuario_id: null,
      }).eq("id", ctx.ticketId);
      try {
        await ctx.sb.from("notas_internas").insert({
          ticket_id: ctx.ticketId,
          agencia_id: ctx.agenciaId,
          usuario_id: null,
          conteudo: `🤖 IA transferiu pra humano: ${motivo}`,
        });
      } catch { /* notas_internas opcional */ }
      return { ok: true, resultado: `transferido — ${motivo}`, encerra_ia: true };
    }

    case "aplicar_etiqueta": {
      const nome = String(merged.etiqueta_nome || "").trim();
      if (!nome) return { ok: false, resultado: "etiqueta_nome vazio" };
      let etiquetaId: string | null = null;
      const { data: existente } = await ctx.sb
        .from("etiquetas")
        .select("id")
        .eq("agencia_id", ctx.agenciaId)
        .ilike("nome", nome)
        .maybeSingle();
      if (existente) {
        etiquetaId = existente.id;
      } else {
        const cores = ["#10b981", "#9B7DBF", "#f59e0b", "#C97064", "#5B8BA6"];
        const cor = cores[Math.floor(Math.random() * cores.length)];
        const { data: nova } = await ctx.sb
          .from("etiquetas")
          .insert({ agencia_id: ctx.agenciaId, nome, cor, categoria: "etiqueta", ativo: true })
          .select("id")
          .single();
        etiquetaId = nova?.id || null;
      }
      if (etiquetaId) {
        await ctx.sb
          .from("contato_etiquetas")
          .upsert({ contato_id: ctx.contatoId, etiqueta_id: etiquetaId }, { onConflict: "contato_id,etiqueta_id", ignoreDuplicates: true });
      }
      return { ok: true, resultado: `etiqueta "${nome}" aplicada` };
    }

    case "criar_nota": {
      const texto = String(merged.texto || "").trim();
      if (!texto) return { ok: false, resultado: "texto vazio" };
      await ctx.sb.from("notas_internas").insert({
        ticket_id: ctx.ticketId,
        agencia_id: ctx.agenciaId,
        usuario_id: null,
        conteudo: `🤖 IA: ${texto}`,
      });
      return { ok: true, resultado: "nota criada" };
    }

    case "marcar_qualificado": {
      const score = Number(merged.score || 5);
      const obs = String(merged.observacao || "qualificado pela IA");
      await ctx.sb.from("notas_internas").insert({
        ticket_id: ctx.ticketId,
        agencia_id: ctx.agenciaId,
        usuario_id: null,
        conteudo: `🤖 Qualificado pela IA — score ${score}: ${obs}`,
      });
      return { ok: true, resultado: `score ${score}` };
    }

    default:
      return { ok: false, resultado: `ação desconhecida: ${tool.acao}` };
  }
}
