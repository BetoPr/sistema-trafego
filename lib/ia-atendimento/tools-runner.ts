/**
 * Executor de tools chamadas pela IA. Cada tool é validada server-side
 * contra agencia_id antes de qualquer mutação.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { resolverReferenciaTemporal } from "./contexto-temporal";

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
  timezone: string;
  /** L2: map nome lowercase -> etiqueta_id permitidas pelo perfil. Undefined/vazio = comportamento legado. */
  etiquetasPermitidas?: Map<string, string>;
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

  // Tool fixa: consulta data deterministicamente (sem chutar)
  tools.push({
    name: "consultar_data",
    description: "Resolve uma referência temporal (ex: 'amanhã', 'próxima segunda', 'daqui a 3 dias', '22/06/2026') na data exata no timezone do perfil. Use SEMPRE que precisar agendar, lembrar ou confirmar uma data com o cliente. Nunca invente datas.",
    acao: "consultar_data",
    parametros_padrao: {},
    input_schema: {
      type: "object",
      properties: {
        referencia: { type: "string", description: "Referência em pt-BR: 'amanhã', 'próxima quinta', 'daqui a 5 dias', '2026-06-22', '22/06/2026'." },
      },
      required: ["referencia"],
    },
  });

  // Tools custom do user. Se o nome bate com uma fixa (ex: user criou um row
  // chamado "transferir_para_humano" pra configurar fila destino), faz OVERLAY
  // de parametros_padrao em vez de duplicar — assim user configura sem perder
  // a descrição cuidadosa da fixa.
  const idxPorNome = new Map<string, number>();
  tools.forEach((t, i) => idxPorNome.set(t.name, i));
  for (const f of ferramentas) {
    const idx = idxPorNome.get(f.nome);
    if (idx !== undefined) {
      tools[idx] = {
        ...tools[idx],
        parametros_padrao: { ...tools[idx].parametros_padrao, ...(f.parametros || {}) },
      };
      continue;
    }
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

      // Configurável via parametros_padrao da ferramenta:
      //   fila_destino_id?: uuid       (default: fila tipo='humano' da agência)
      //   status_destino?: 'aberto' | 'pendente' | 'fechado'  (default: 'aberto')
      //   etiqueta_id?: uuid           (opcional — aplica no contato)
      let filaDestinoId = (merged.fila_destino_id as string | undefined) || undefined;
      const statusDestino = (merged.status_destino as string | undefined) || "aberto";
      const etiquetaId = (merged.etiqueta_id as string | undefined) || undefined;

      // Fallback: fila tipo='humano' da agência
      if (!filaDestinoId) {
        const { data: filaHumano } = await ctx.sb
          .from("filas")
          .select("id")
          .eq("agencia_id", ctx.agenciaId)
          .eq("tipo", "humano")
          .eq("ativa", true)
          .limit(1)
          .maybeSingle();
        if (filaHumano?.id) filaDestinoId = filaHumano.id as string;
      }

      const patch: Record<string, unknown> = {
        ia_pausada: true,
        usuario_id: null,
        status: statusDestino,
      };
      if (filaDestinoId) patch.fila_id = filaDestinoId;
      await ctx.sb.from("tickets").update(patch).eq("id", ctx.ticketId);

      if (etiquetaId) {
        try {
          await ctx.sb.from("contato_etiquetas").upsert(
            { contato_id: ctx.contatoId, etiqueta_id: etiquetaId },
            { onConflict: "contato_id,etiqueta_id", ignoreDuplicates: true },
          );
        } catch { /* contato_etiquetas opcional */ }
      }

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
      const nomeRaw = String(merged.etiqueta_nome || "").trim();
      const idRaw = String(merged.etiqueta_id || "").trim();
      if (!nomeRaw && !idRaw) return { ok: false, resultado: "etiqueta_nome ou etiqueta_id obrigatorio" };

      const lista = ctx.etiquetasPermitidas;
      let etiquetaId: string | null = null;
      let nomeUsado = nomeRaw;

      // L2: se perfil tem etiquetas configuradas, valida e usa id quando vier
      if (lista && lista.size > 0) {
        if (idRaw) {
          const idsPermitidos = new Set(Array.from(lista.values()));
          if (!idsPermitidos.has(idRaw)) {
            return { ok: false, resultado: `etiqueta_id "${idRaw}" nao esta na lista permitida` };
          }
          etiquetaId = idRaw;
          const nomeEntry = Array.from(lista.entries()).find(([, id]) => id === idRaw);
          if (nomeEntry) nomeUsado = nomeEntry[0];
        } else {
          const id = lista.get(nomeRaw.toLowerCase());
          if (!id) {
            const nomes = Array.from(lista.keys()).join(", ");
            return { ok: false, resultado: `Etiqueta "${nomeRaw}" nao esta disponivel. Use uma de: ${nomes}` };
          }
          etiquetaId = id;
        }
      } else {
        // Legado: busca/cria por nome
        if (!nomeRaw) return { ok: false, resultado: "etiqueta_nome vazio" };
        const { data: existente } = await ctx.sb
          .from("etiquetas")
          .select("id")
          .eq("agencia_id", ctx.agenciaId)
          .ilike("nome", nomeRaw)
          .maybeSingle();
        if (existente) {
          etiquetaId = existente.id;
        } else {
          const cores = ["#10b981", "#9B7DBF", "#f59e0b", "#C97064", "#5B8BA6"];
          const cor = cores[Math.floor(Math.random() * cores.length)];
          const { data: nova } = await ctx.sb
            .from("etiquetas")
            .insert({ agencia_id: ctx.agenciaId, nome: nomeRaw, cor, categoria: "etiqueta", ativo: true })
            .select("id")
            .single();
          etiquetaId = nova?.id || null;
        }
      }

      if (etiquetaId) {
        await ctx.sb
          .from("contato_etiquetas")
          .upsert({ contato_id: ctx.contatoId, etiqueta_id: etiquetaId }, { onConflict: "contato_id,etiqueta_id", ignoreDuplicates: true });
      } else {
        return { ok: false, resultado: "nao foi possivel resolver etiqueta_id" };
      }
      return { ok: true, resultado: `etiqueta "${nomeUsado}" aplicada` };
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

    case "consultar_data": {
      const referencia = String(merged.referencia || "").trim();
      if (!referencia) {
        return { ok: false, resultado: "Parâmetro 'referencia' obrigatório (ex: 'amanhã', 'próxima segunda', '22/06/2026')." };
      }
      const res = resolverReferenciaTemporal(referencia, ctx.timezone);
      if (!res.resolvido) return { ok: false, resultado: res.motivo };
      return { ok: true, resultado: `${res.descricao}: ${res.dia_semana}, ${res.iso}` };
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
