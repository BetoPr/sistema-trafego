/**
 * Worker principal: lê buffer pendente, chama IA com tools, executa ações,
 * divide resposta em blocos e envia via UAZAPI com delays anti-ban.
 *
 * Disparado por /api/cron/ia-atendimento (pg_cron 1/min).
 */
import { createServiceClient } from "@/lib/supabase/service";
import { decryptToken, byteaToBuffer } from "@/lib/crypto/tokens";
import { instanceSendText } from "@/lib/uazapi/client";
import { chamarIA, type MsgIA } from "./providers";
import { buildToolsSchema, executarTool, type CtxIA } from "./tools-runner";
import { dividirEmBlocos, gapAleatorio, type FormatoResposta } from "./split";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Gera variantes BR pra um número (com e sem o "9" inicial de celular).
 * Tem números antigos no WhatsApp salvos sem o 9, então a comparação
 * precisa cobrir ambos.
 */
function variantesNumeroBr(n: string): string[] {
  const limpo = (n || "").replace(/\D/g, "");
  if (!limpo) return [];
  const set = new Set<string>([limpo]);
  if (limpo.length === 13 && limpo.startsWith("55")) {
    // 55 + DDD(2) + 9XXXXXXXX → adiciona variante sem o 9
    const ddd = limpo.slice(2, 4);
    const resto = limpo.slice(4);
    if (resto.startsWith("9") && resto.length === 9) {
      set.add(`55${ddd}${resto.slice(1)}`);
    }
  } else if (limpo.length === 12 && limpo.startsWith("55")) {
    // 55 + DDD(2) + XXXXXXXX (mobile sem o 9) → adiciona variante com 9
    const ddd = limpo.slice(2, 4);
    const resto = limpo.slice(4);
    if (resto.length === 8 && /^[6-9]/.test(resto)) {
      set.add(`55${ddd}9${resto}`);
    }
  }
  return Array.from(set);
}

export interface IAResultado {
  processados: number;
  respondidos: number;
  pausados: number;
  erros: number;
  detalhes: Array<{ ticketId: string; status: string; erro?: string }>;
}

export async function processarBufferIA(limite = 10): Promise<IAResultado> {
  const sb = createServiceClient();
  const agora = new Date();
  const res: IAResultado = { processados: 0, respondidos: 0, pausados: 0, erros: 0, detalhes: [] };

  const { data: buffer } = await sb
    .from("ia_atendimento_buffer")
    .select("ticket_id, perfil_id, agencia_id, mensagens_pendentes, ultimo_recebido_em, processar_apos")
    .eq("trava_processando", false)
    .lte("processar_apos", agora.toISOString())
    .order("processar_apos", { ascending: true })
    .limit(limite);

  for (const b of buffer || []) {
    res.processados++;
    const detalhe: { ticketId: string; status: string; erro?: string } = { ticketId: b.ticket_id, status: "" };

    // Trava
    const { data: travado } = await sb
      .from("ia_atendimento_buffer")
      .update({ trava_processando: true })
      .eq("ticket_id", b.ticket_id)
      .eq("trava_processando", false)
      .select("ticket_id")
      .maybeSingle();
    if (!travado) {
      detalhe.status = "lock_perdido";
      res.detalhes.push(detalhe);
      continue;
    }

    try {
      await processarUm(b, sb);
      res.respondidos++;
      detalhe.status = "respondido";
    } catch (e) {
      res.erros++;
      detalhe.status = "erro";
      detalhe.erro = e instanceof Error ? e.message : String(e);
      await sb.from("ia_atendimento_log").insert({
        agencia_id: b.agencia_id,
        perfil_id: b.perfil_id,
        ticket_id: b.ticket_id,
        evento: "erro",
        erro: detalhe.erro,
      });
    } finally {
      // Remove buffer (processado ou erro — em erro a próxima msg do cliente recria)
      await sb.from("ia_atendimento_buffer").delete().eq("ticket_id", b.ticket_id);
    }
    res.detalhes.push(detalhe);
  }
  return res;
}

interface BufferRow {
  ticket_id: string;
  perfil_id: string;
  agencia_id: string;
  mensagens_pendentes: Array<{ conteudo: string; recebido_em: string; tipo?: string }>;
  ultimo_recebido_em: string;
  processar_apos: string;
}

async function processarUm(b: BufferRow, sb: ReturnType<typeof createServiceClient>) {
  // 1. Carrega perfil + ticket + contato + canal
  const [{ data: perfil }, { data: ticket }] = await Promise.all([
    sb.from("ia_atendimento_perfis").select("*").eq("id", b.perfil_id).maybeSingle(),
    sb.from("tickets").select("id, agencia_id, canal_id, contato_id, ia_pausada, status").eq("id", b.ticket_id).maybeSingle(),
  ]);

  if (!perfil || !perfil.ativo) {
    throw new Error("perfil inativo ou não encontrado");
  }
  if (!ticket) return;
  if (ticket.status === "fechado") {
    await sb.from("ia_atendimento_log").insert({
      agencia_id: b.agencia_id,
      perfil_id: b.perfil_id,
      ticket_id: b.ticket_id,
      evento: "encerrado",
      payload: { motivo: "ticket fechado" },
    });
    return;
  }
  if (ticket.ia_pausada) {
    await sb.from("ia_atendimento_log").insert({
      agencia_id: b.agencia_id,
      perfil_id: b.perfil_id,
      ticket_id: b.ticket_id,
      evento: "pausa_humano",
      payload: { motivo: "ticket.ia_pausada=true — alguém respondeu via CRM. Use 'Retornar à fila' pra reativar." },
    });
    return;
  }

  const [{ data: contato }, { data: canal }] = await Promise.all([
    sb.from("contatos").select("id, nome, wa_id, whatsapp").eq("id", ticket.contato_id).maybeSingle(),
    sb.from("canais").select("id, status, instance_token_encrypted, servidor:super_admin_servidores(base_url)").eq("id", ticket.canal_id).maybeSingle(),
  ]);
  if (!contato || !canal) throw new Error("contato ou canal não encontrado");
  if (canal.status !== "connected") throw new Error("canal desconectado");

  // Whitelist (modo teste) — normaliza variantes BR (com/sem 9 inicial)
  const whitelist = (perfil.whatsapp_teste_lista || []) as string[];
  const numeroLimpo = (contato.wa_id || contato.whatsapp || "").replace(/@.+$/, "").replace(/\D/g, "");
  if (whitelist.length > 0) {
    const variantesContato = new Set(variantesNumeroBr(numeroLimpo));
    const autorizado = whitelist.some((w) => {
      const vw = variantesNumeroBr(w);
      return vw.some((v) => variantesContato.has(v));
    });
    if (!autorizado) {
      await sb.from("ia_atendimento_log").insert({
        agencia_id: b.agencia_id,
        perfil_id: b.perfil_id,
        ticket_id: b.ticket_id,
        contato_id: contato.id,
        evento: "pausa_humano",
        payload: { motivo: "fora_whitelist", numero: numeroLimpo, whitelist },
      });
      return; // não responde, mas não erra
    }
  }

  // 2. Confere se humano respondeu desde último cliente
  if (perfil.pausa_se_humano_responder) {
    const { data: humanoMsg } = await sb
      .from("mensagens")
      .select("id")
      .eq("ticket_id", b.ticket_id)
      .eq("autor", "atendente")
      .gt("created_at", b.ultimo_recebido_em)
      .limit(1);
    if (humanoMsg && humanoMsg.length) {
      await sb.from("tickets").update({ ia_pausada: true }).eq("id", b.ticket_id);
      await sb.from("ia_atendimento_log").insert({
        agencia_id: b.agencia_id,
        perfil_id: b.perfil_id,
        ticket_id: b.ticket_id,
        evento: "pausa_humano",
      });
      return;
    }
  }

  // 3. Decripta API key
  if (!perfil.api_key_encrypted) throw new Error("chave API não cadastrada");
  const apiKey = decryptToken(byteaToBuffer(perfil.api_key_encrypted));

  // 4. Carrega histórico recente (últimas 20 msgs)
  const { data: histRows } = await sb
    .from("mensagens")
    .select("autor, conteudo, transcricao, created_at")
    .eq("ticket_id", b.ticket_id)
    .is("deleted_em", null)
    .order("created_at", { ascending: false })
    .limit(20);
  const historico = (histRows || []).reverse();

  // 5. Carrega ferramentas
  const { data: ferramentas } = await sb
    .from("ia_atendimento_ferramentas")
    .select("nome, descricao, acao, parametros")
    .eq("perfil_id", perfil.id)
    .eq("ativo", true);
  const tools = buildToolsSchema((ferramentas || []) as Array<{ nome: string; descricao: string; acao: string; parametros: Record<string, unknown> }>);

  // 6. Monta prompt
  const promptSistema = (perfil.prompt_sistema || "")
    .replaceAll("{nome_cliente}", contato.nome || "Cliente")
    .replaceAll("{nome_agencia}", "");

  const mensagens: MsgIA[] = [
    { role: "system", content: promptSistema },
  ];
  for (const h of historico) {
    if (h.autor === "cliente") {
      mensagens.push({ role: "user", content: (h.conteudo || h.transcricao || "").slice(0, 2000) });
    } else if (h.autor === "atendente" || h.autor === "bot") {
      mensagens.push({ role: "assistant", content: (h.conteudo || "").slice(0, 2000) });
    }
  }
  // Mensagens novas (concatenadas do buffer)
  const novoTexto = b.mensagens_pendentes.map((m) => m.conteudo).filter(Boolean).join("\n");
  if (novoTexto.trim() && historico[historico.length - 1]?.autor !== "cliente") {
    mensagens.push({ role: "user", content: novoTexto });
  } else if (novoTexto.trim()) {
    // Já tem histórico cliente recente; sobrescreve último user
    mensagens[mensagens.length - 1] = { role: "user", content: novoTexto };
  }

  // 7. Chama IA
  const resp = await chamarIA({
    provider: perfil.provider,
    modelo: perfil.modelo,
    apiKey,
    mensagens,
    tools,
    maxTokens: perfil.max_tokens_por_resposta,
    temperatura: Number(perfil.temperatura),
  });

  // 8. Log da resposta
  await sb.from("ia_atendimento_log").insert({
    agencia_id: b.agencia_id,
    perfil_id: b.perfil_id,
    ticket_id: b.ticket_id,
    contato_id: contato.id,
    evento: "resposta",
    modelo: resp.modelo,
    tokens_in: resp.tokensIn,
    tokens_out: resp.tokensOut,
    payload: { texto: resp.texto, tool_calls: resp.toolCalls.length },
  });

  // 9. Prepara contexto pra tools
  const servidor = Array.isArray((canal as unknown as { servidor: unknown }).servidor)
    ? ((canal as unknown as { servidor: Array<{ base_url: string }> }).servidor[0])
    : ((canal as unknown as { servidor: { base_url: string } }).servidor);
  const baseUrl = servidor.base_url;
  const token = decryptToken(byteaToBuffer(canal.instance_token_encrypted as Parameters<typeof byteaToBuffer>[0]));
  const waId = (contato.wa_id || contato.whatsapp || "") as string;

  const enviarMensagemUazapi = async (texto: string) => {
    const r = await instanceSendText({ baseUrl, token }, { number: waId, text: texto });
    return { id: r.id };
  };

  const ctxIA: CtxIA = {
    sb,
    agenciaId: b.agencia_id,
    ticketId: b.ticket_id,
    contatoId: contato.id,
    perfilId: perfil.id,
    canalId: ticket.canal_id,
    enviarMensagemUazapi,
  };

  // 10. Executa tool calls (na ordem que a IA pediu)
  let encerraIA = false;
  for (const tc of resp.toolCalls) {
    const tool = tools.find((t) => t.name === tc.name);
    if (!tool) continue;
    const r = await executarTool(ctxIA, tool, tc.arguments);
    await sb.from("ia_atendimento_log").insert({
      agencia_id: b.agencia_id,
      perfil_id: b.perfil_id,
      ticket_id: b.ticket_id,
      contato_id: contato.id,
      evento: "tool_call",
      payload: { tool: tc.name, args: tc.arguments, resultado: r.resultado },
    });
    if (r.encerra_ia) encerraIA = true;
  }

  // 10b. Move ticket pra primeira fila ativa do perfil (IA Atendendo) sempre que IA assume
  if ((perfil.filas_ativas || []).length > 0) {
    const filaIA = (perfil.filas_ativas as string[])[0];
    await sb.from("tickets").update({ fila_id: filaIA, ia_perfil_id: perfil.id }).eq("id", b.ticket_id);
  }

  // 11. Envia resposta texto (em blocos)
  if (resp.texto.trim()) {
    const formato = (perfil.formato_resposta || {}) as FormatoResposta;
    const blocos = dividirEmBlocos(resp.texto, formato);
    const minSeg = perfil.delay_min_resposta_seg ?? 3;
    const maxSeg = perfil.delay_max_resposta_seg ?? 8;
    for (let i = 0; i < blocos.length; i++) {
      const bloco = blocos[i];
      const r = await instanceSendText({ baseUrl, token }, { number: waId, text: bloco });
      await sb.from("mensagens").insert({
        ticket_id: b.ticket_id,
        agencia_id: b.agencia_id,
        autor: "bot",
        tipo: "texto",
        conteudo: bloco,
        wa_message_id: r.id || null,
        status: "enviada",
        metadata: { ia_perfil_id: perfil.id, bloco: i + 1, total_blocos: blocos.length },
      });
      if (i < blocos.length - 1) {
        await sleep(gapAleatorio(minSeg, maxSeg));
      }
    }
  }

  if (encerraIA) {
    await sb.from("ia_atendimento_log").insert({
      agencia_id: b.agencia_id,
      perfil_id: b.perfil_id,
      ticket_id: b.ticket_id,
      evento: "encerrado",
    });
  }
}

/**
 * Webhook hook: adiciona msg do cliente ao buffer.
 * Chamada inline pelo handler /api/webhooks/uazapi/[secret].
 */
export async function adicionarAoBuffer(params: {
  ticketId: string;
  agenciaId: string;
  canalId: string | null;
  contatoId: string;
  conteudo: string;
  tipo: string;
}): Promise<{ ok: boolean; motivo?: string }> {
  const sb = createServiceClient();

  // Procura perfil ativo na agência que cobre esse canal/fila
  const { data: ticket } = await sb.from("tickets").select("fila_id, ia_pausada, ia_perfil_id").eq("id", params.ticketId).maybeSingle();
  if (!ticket) return { ok: false, motivo: "ticket nao encontrado" };
  if (ticket.ia_pausada) return { ok: false, motivo: "ia pausada nesse ticket" };

  const { data: perfis } = await sb
    .from("ia_atendimento_perfis")
    .select("id, canais_ativos, filas_ativas, delay_debounce_seg")
    .eq("agencia_id", params.agenciaId)
    .eq("ativo", true);

  const perfilEscolhido = (perfis || []).find((p) => {
    const canaisOk = !p.canais_ativos.length || (params.canalId && p.canais_ativos.includes(params.canalId));
    const filasOk = !p.filas_ativas.length || (ticket.fila_id && p.filas_ativas.includes(ticket.fila_id));
    return canaisOk && filasOk;
  });

  if (!perfilEscolhido) return { ok: false, motivo: "nenhum perfil cobre esse canal/fila" };

  const agora = new Date();
  const processarApos = new Date(agora.getTime() + perfilEscolhido.delay_debounce_seg * 1000).toISOString();

  // Upsert no buffer
  const { data: existente } = await sb
    .from("ia_atendimento_buffer")
    .select("mensagens_pendentes")
    .eq("ticket_id", params.ticketId)
    .maybeSingle();

  const nova = { conteudo: params.conteudo, recebido_em: agora.toISOString(), tipo: params.tipo };
  const lista = existente ? [...(existente.mensagens_pendentes as Array<unknown>), nova] : [nova];

  await sb.from("ia_atendimento_buffer").upsert({
    ticket_id: params.ticketId,
    perfil_id: perfilEscolhido.id,
    agencia_id: params.agenciaId,
    mensagens_pendentes: lista,
    ultimo_recebido_em: agora.toISOString(),
    processar_apos: processarApos,
    trava_processando: false,
  }, { onConflict: "ticket_id" });

  if (!ticket.ia_perfil_id) {
    await sb.from("tickets").update({ ia_perfil_id: perfilEscolhido.id }).eq("id", params.ticketId);
  }

  return { ok: true };
}
