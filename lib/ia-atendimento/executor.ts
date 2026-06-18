/**
 * Worker principal: lê buffer pendente, chama IA com tools, executa ações,
 * divide resposta em blocos e envia via UAZAPI com delays anti-ban.
 *
 * Disparado por /api/cron/ia-atendimento (pg_cron 1/min).
 */
import { createServiceClient } from "@/lib/supabase/service";
import { decryptToken, byteaToBuffer } from "@/lib/crypto/tokens";
import { instanceSendText, instanceSendMedia } from "@/lib/uazapi/client";
import { chamarIA, type MsgIA } from "./providers";
import { buildToolsSchema, executarTool, type CtxIA } from "./tools-runner";
import { dividirEmBlocos, gapAleatorio, type FormatoResposta } from "./split";
import { buildContextoTemporal, aplicarPlaceholders } from "./contexto-temporal";
import { inscreverFollowUpIA } from "./followup-worker";

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
    sb.from("tickets").select("id, agencia_id, canal_id, contato_id, ia_pausada, status, ia_reset_em").eq("id", b.ticket_id).maybeSingle(),
  ]);

  if (!perfil) {
    await sb.from("ia_atendimento_log").insert({
      agencia_id: b.agencia_id,
      perfil_id: b.perfil_id,
      ticket_id: b.ticket_id,
      evento: "erro",
      payload: { motivo: "perfil_nao_encontrado" },
    });
    return;
  }
  if (!perfil.ativo) {
    await sb.from("ia_atendimento_log").insert({
      agencia_id: b.agencia_id,
      perfil_id: b.perfil_id,
      ticket_id: b.ticket_id,
      evento: "pausa_humano",
      payload: { motivo: "perfil_inativo", dica: "Ative o perfil em /ia-atendimento." },
    });
    return;
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
  if (!contato || !canal) {
    await sb.from("ia_atendimento_log").insert({
      agencia_id: b.agencia_id,
      perfil_id: b.perfil_id,
      ticket_id: b.ticket_id,
      evento: "erro",
      payload: { motivo: !contato ? "contato_nao_encontrado" : "canal_nao_encontrado" },
    });
    return;
  }
  if (canal.status !== "connected") {
    await sb.from("ia_atendimento_log").insert({
      agencia_id: b.agencia_id,
      perfil_id: b.perfil_id,
      ticket_id: b.ticket_id,
      evento: "pausa_humano",
      payload: { motivo: "canal_desconectado", status: canal.status, dica: "Reconecte o WhatsApp em /canais." },
    });
    return;
  }

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

  // 2. Confere se humano respondeu desde último cliente.
  // Baseline = MAX(ultimo_recebido_em, ia_reset_em) — ignora msgs do atendente
  // anteriores a uma reativação manual da IA (botão toggle, RETOMAR).
  if (perfil.pausa_se_humano_responder) {
    const resetEm = (ticket as unknown as { ia_reset_em?: string | null }).ia_reset_em || null;
    const baseline = resetEm && resetEm > b.ultimo_recebido_em ? resetEm : b.ultimo_recebido_em;
    const { data: humanoMsg } = await sb
      .from("mensagens")
      .select("id")
      .eq("ticket_id", b.ticket_id)
      .eq("autor", "atendente")
      .gt("created_at", baseline)
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

  // 3b. Comando especial "LIMPAR" do cliente: reseta memória, IA esquece histórico
  const textoBuffer = (b.mensagens_pendentes as Array<{ conteudo: string }>).map((m) => m.conteudo).join("\n");
  if (textoBuffer.trim() === "LIMPAR") {
    await sb.from("tickets").update({ ia_reset_em: new Date().toISOString() }).eq("id", b.ticket_id);
    // Envia ack rápido
    const servidorR = Array.isArray((canal as unknown as { servidor: unknown }).servidor)
      ? ((canal as unknown as { servidor: Array<{ base_url: string }> }).servidor[0])
      : ((canal as unknown as { servidor: { base_url: string } }).servidor);
    const baseUrlR = servidorR.base_url;
    const tokenR = decryptToken(byteaToBuffer(canal.instance_token_encrypted as Parameters<typeof byteaToBuffer>[0]));
    const waIdR = (contato.wa_id || contato.whatsapp || "") as string;
    try {
      const r = await instanceSendText({ baseUrl: baseUrlR, token: tokenR }, { number: waIdR, text: "🧹 Memória limpa! Vamos começar do zero." });
      await sb.from("mensagens").insert({
        ticket_id: b.ticket_id,
        agencia_id: b.agencia_id,
        autor: "bot",
        tipo: "texto",
        conteudo: "🧹 Memória limpa! Vamos começar do zero.",
        wa_message_id: r.id || null,
        status: "enviada",
        metadata: { ia_perfil_id: perfil.id, comando: "LIMPAR" },
      });
    } catch {}
    await sb.from("ia_atendimento_log").insert({
      agencia_id: b.agencia_id,
      perfil_id: b.perfil_id,
      ticket_id: b.ticket_id,
      evento: "tool_call",
      payload: { tool: "LIMPAR", resultado: "memoria_resetada" },
    });
    return;
  }

  // 4+5. Carrega historico + ferramentas EM PARALELO (Promise.all)
  const resetEm = (ticket as unknown as { ia_reset_em?: string }).ia_reset_em || null;
  // Exclui do historico as msgs que estao no buffer (evita duplicacao:
  // ingestMensagem ja gravou em `mensagens` antes de cair no buffer).
  const primeiroBufferEm = (b.mensagens_pendentes[0]?.recebido_em as string | undefined) || b.ultimo_recebido_em;
  let histQuery = sb
    .from("mensagens")
    .select("autor, conteudo, transcricao, created_at")
    .eq("ticket_id", b.ticket_id)
    .is("deleted_em", null)
    .lt("created_at", primeiroBufferEm);
  if (resetEm) histQuery = histQuery.gte("created_at", resetEm);

  const [{ data: histRows }, { data: ferramentas }, { data: etiquetasCfg }] = await Promise.all([
    histQuery.order("created_at", { ascending: false }).limit(20),
    sb.from("ia_atendimento_ferramentas")
      .select("id, nome, descricao, acao, parametros")
      .eq("perfil_id", perfil.id)
      .eq("ativo", true),
    sb.from("ia_atendimento_perfil_etiquetas")
      .select("descricao_uso, ordem, etiqueta:etiquetas!inner(id, nome, ativo)")
      .eq("perfil_id", perfil.id)
      .order("ordem"),
  ]);
  const historico = (histRows || []).reverse();
  const tools = await buildToolsSchema(
    (ferramentas || []) as Array<{ id: string; nome: string; descricao: string; acao: string; parametros: Record<string, unknown> }>,
    { sb, agenciaId: b.agencia_id },
  );

  // 6. Monta prompt (com contexto temporal + placeholders {{...}})
  const tz = (perfil.timezone as string) || "America/Sao_Paulo";
  const ctxTemporal = buildContextoTemporal(tz);
  const promptBase = (perfil.prompt_sistema || "")
    .replaceAll("{nome_cliente}", contato.nome || "Cliente")
    .replaceAll("{nome_agencia}", "");
  const promptComPlaceholders = aplicarPlaceholders(promptBase, ctxTemporal.replacements);

  // L2: bloco de etiquetas disponiveis (so injeta se perfil tiver etiquetas configuradas)
  type EtqCfgRow = {
    descricao_uso: string;
    ordem: number;
    etiqueta: { id: string; nome: string; ativo: boolean } | { id: string; nome: string; ativo: boolean }[] | null;
  };
  const etqRowsRaw = (etiquetasCfg || []) as EtqCfgRow[];
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

  // Reforço: lista as funções disponíveis pra modelos fracos (ex: gpt-4o-mini)
  // de fato CHAMAREM a ferramenta, não só responderem texto.
  const blocoFerramentas = tools.length
    ? `[FERRAMENTAS / ACOES DISPONIVEIS]\nVoce tem estas funcoes. Quando a situacao se encaixar, CHAME a funcao correspondente (nao escreva o nome dela no texto):\n${
        tools.map((t) => `- ${t.name}: ${(t.description || "").split("\n")[0]}`).join("\n")
      }\n\n`
    : "";

  // Sempre prepende bloco temporal (garante baseline). Tag SEM_CONTEXTO_TEMPORAL
  // no inicio suprime.
  const suprimir = /^\s*SEM_CONTEXTO_TEMPORAL\b/i.test(promptComPlaceholders);
  const promptSistema = suprimir
    ? promptComPlaceholders.replace(/^\s*SEM_CONTEXTO_TEMPORAL\b/i, "").trimStart()
    : `${ctxTemporal.block}\n\n${blocoFerramentas}${blocoEtiquetas}${promptComPlaceholders}`;

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
  // Mensagens novas (concatenadas do buffer). Historico ja foi filtrado pra
  // nao incluir msgs do buffer, entao sempre PUSH (nao sobrescrever).
  const novoTexto = b.mensagens_pendentes.map((m) => m.conteudo).filter(Boolean).join("\n");
  if (novoTexto.trim()) {
    mensagens.push({ role: "user", content: novoTexto });
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

  const enviarMidiaUazapi = async (p: {
    file: string;
    type: "image" | "video" | "document" | "audio" | "ptt";
    text?: string;
    docName?: string;
  }) => {
    const r = await instanceSendMedia({ baseUrl, token }, {
      number: waId,
      type: p.type,
      file: p.file,
      text: p.text,
      docName: p.docName,
    });
    return { id: r.id };
  };

  // L2: map nome (lowercase) -> etiqueta_id pras etiquetas permitidas do perfil
  const etiquetasPermitidasMap = new Map<string, string>(
    etqRows.map((r) => [r.etiqueta.nome.toLowerCase(), r.etiqueta.id]),
  );

  const ctxIA: CtxIA = {
    sb,
    agenciaId: b.agencia_id,
    ticketId: b.ticket_id,
    contatoId: contato.id,
    perfilId: perfil.id,
    canalId: ticket.canal_id,
    timezone: tz,
    etiquetasPermitidas: etiquetasPermitidasMap,
    enviarMensagemUazapi,
    enviarMidiaUazapi,
  };

  // 10. Executa tool calls (na ordem que a IA pediu)
  let encerraIA = false;
  let respondeuCliente = false; // garante que o cliente nunca fica sem resposta
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
    // Nota visível no histórico do chat (autor=sistema): mostra que a IA usou a ferramenta
    await sb.from("mensagens").insert({
      ticket_id: b.ticket_id,
      agencia_id: b.agencia_id,
      autor: "sistema",
      tipo: "texto",
      conteudo: `IA usou a ferramenta ${tc.name}${r.resultado ? ` — ${r.resultado}` : ""}`,
      status: "enviada",
      metadata: { ia_perfil_id: perfil.id, tool_call: tc.name },
    });
    if (r.encerra_ia) encerraIA = true;
    // Tools que JÁ mandam mensagem pro cliente (não deixam ele sem retorno)
    if (r.ok && (tool.acao === "manda_biscoito" || tool.acao === "enviar_imagem_galeria")) respondeuCliente = true;
  }

  // 10b. Marca o perfil no ticket sempre que IA assume — isso liga o ícone de robô
  // na lista (ia_perfil_id && !ia_pausada). NÃO mexe em fila_id: as filas fixas
  // foram aposentadas e setar uma fila inexistente quebrava FK (tickets_fila_id_fkey).
  await sb.from("tickets").update({ ia_perfil_id: perfil.id }).eq("id", b.ticket_id);

  // 11. Envia resposta texto (em blocos)
  if (resp.texto.trim()) {
    respondeuCliente = true;
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

  // 11b. REDE DE SEGURANÇA: cliente nunca pode ficar sem resposta.
  // Se a IA só chamou ferramenta (ou a ferramenta falhou) e não mandou texto,
  // e não é transferência pra humano, faz um 2º call SEM ferramentas pra gerar
  // uma resposta natural. Último recurso: mensagem genérica.
  if (!encerraIA && !respondeuCliente) {
    let textoFallback = "";
    try {
      const resp2 = await chamarIA({
        provider: perfil.provider,
        modelo: perfil.modelo,
        apiKey,
        mensagens: [
          ...mensagens,
          { role: "system", content: "Responda ao cliente AGORA, em texto, de forma natural e útil. NÃO chame nenhuma ferramenta." },
        ],
        tools: [],
        maxTokens: perfil.max_tokens_por_resposta,
        temperatura: Number(perfil.temperatura),
      });
      textoFallback = resp2.texto.trim();
    } catch (e) {
      console.warn("[executor] fallback 2o call falhou:", e);
    }
    if (!textoFallback) {
      textoFallback = "Recebi sua mensagem! 😊 Me dá um instante que já te ajudo com isso.";
    }
    const formato = (perfil.formato_resposta || {}) as FormatoResposta;
    const blocos = dividirEmBlocos(textoFallback, formato);
    const minSeg = perfil.delay_min_resposta_seg ?? 3;
    const maxSeg = perfil.delay_max_resposta_seg ?? 8;
    for (let i = 0; i < blocos.length; i++) {
      const r = await instanceSendText({ baseUrl, token }, { number: waId, text: blocos[i] });
      await sb.from("mensagens").insert({
        ticket_id: b.ticket_id,
        agencia_id: b.agencia_id,
        autor: "bot",
        tipo: "texto",
        conteudo: blocos[i],
        wa_message_id: r.id || null,
        status: "enviada",
        metadata: { ia_perfil_id: perfil.id, fallback: true },
      });
      if (i < blocos.length - 1) await sleep(gapAleatorio(minSeg, maxSeg));
    }
    respondeuCliente = true;
    await sb.from("ia_atendimento_log").insert({
      agencia_id: b.agencia_id,
      perfil_id: b.perfil_id,
      ticket_id: b.ticket_id,
      evento: "resposta",
      payload: { fallback: true, texto: textoFallback },
    });
  }

  if (encerraIA) {
    await sb.from("ia_atendimento_log").insert({
      agencia_id: b.agencia_id,
      perfil_id: b.perfil_id,
      ticket_id: b.ticket_id,
      evento: "encerrado",
    });
  }

  // L4: inscreve em follow-up sequencial sempre que IA responde com texto.
  // inscreverFollowUpIA() dedupica via guard `jaExiste` (status IN agendado/executando).
  // Status 'respondido'/'finalizado' libera reinscrever no proximo turno.
  try {
    if (resp.texto.trim() && ticket.canal_id) {
      await inscreverFollowUpIA({
        agenciaId: b.agencia_id,
        perfilId: perfil.id,
        ticketId: b.ticket_id,
        contatoId: contato.id,
        canalId: ticket.canal_id,
      });
    }
  } catch (e) {
    console.warn("[executor] inscrever followup falhou:", e);
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
}): Promise<{ ok: boolean; motivo?: string; perfilId?: string; debounceMs?: number }> {
  const sb = createServiceClient();

  // PARALELO: ticket + perfis ativos + buffer existente
  const [
    { data: ticket },
    { data: perfis },
    { data: bufferExistente },
  ] = await Promise.all([
    sb.from("tickets").select("fila_id, ia_pausada, ia_perfil_id, canal_id").eq("id", params.ticketId).maybeSingle(),
    sb.from("ia_atendimento_perfis")
      .select("id, canais_ativos, filas_ativas, delay_debounce_seg")
      .eq("agencia_id", params.agenciaId)
      .eq("ativo", true),
    sb.from("ia_atendimento_buffer").select("mensagens_pendentes, ultimo_recebido_em").eq("ticket_id", params.ticketId).maybeSingle(),
  ]);

  if (!ticket) return { ok: false, motivo: "ticket nao encontrado" };
  if (ticket.ia_pausada) return { ok: false, motivo: "ia pausada nesse ticket" };

  // Match: canal precisa bater. Fila opcional — se perfil declara filas_ativas
  // e ticket está em fila diferente, MOVE ticket pra primeira fila ativa do perfil
  // (IA está assumindo, então força a fila correta visualmente).
  const perfilEscolhido = (perfis || []).find((p) => {
    const canaisArr = (p.canais_ativos || []) as string[];
    return canaisArr.length === 0 || (params.canalId && canaisArr.includes(params.canalId));
  });

  if (!perfilEscolhido) return { ok: false, motivo: "nenhum perfil ativo cobre esse canal" };

  // Se ticket está em fila fora das filas_ativas do perfil, move agora
  const filasArr = (perfilEscolhido.filas_ativas || []) as string[];
  if (filasArr.length > 0 && ticket.fila_id && !filasArr.includes(ticket.fila_id)) {
    await sb.from("tickets").update({ fila_id: filasArr[0] }).eq("id", params.ticketId);
  } else if (filasArr.length > 0 && !ticket.fila_id) {
    await sb.from("tickets").update({ fila_id: filasArr[0] }).eq("id", params.ticketId);
  }

  const agora = new Date();
  const debounceMs = Math.max(0, perfilEscolhido.delay_debounce_seg) * 1000;
  const processarApos = new Date(agora.getTime() + debounceMs).toISOString();

  // Upsert no buffer (buffer existente ja vem do fetch paralelo acima)
  const nova = { conteudo: params.conteudo, recebido_em: agora.toISOString(), tipo: params.tipo };
  const lista = bufferExistente ? [...(bufferExistente.mensagens_pendentes as Array<unknown>), nova] : [nova];

  // Upsert + opcional update ia_perfil_id em paralelo
  await Promise.all([
    sb.from("ia_atendimento_buffer").upsert({
      ticket_id: params.ticketId,
      perfil_id: perfilEscolhido.id,
      agencia_id: params.agenciaId,
      mensagens_pendentes: lista,
      ultimo_recebido_em: agora.toISOString(),
      processar_apos: processarApos,
      trava_processando: false,
    }, { onConflict: "ticket_id" }),
    !ticket.ia_perfil_id
      ? sb.from("tickets").update({ ia_perfil_id: perfilEscolhido.id }).eq("id", params.ticketId)
      : Promise.resolve(),
  ]);

  return { ok: true, perfilId: perfilEscolhido.id, debounceMs };
}

/**
 * Processa um ticket especifico (substitui o loop processarBufferIA).
 * Espera debounceMs apos chamada, depois processa o buffer desse ticket.
 * Usado pelo webhook via after() pra responder em ~debounce + IA latency.
 */
export async function processarTicket(ticketId: string, debounceMs: number): Promise<{ ok: boolean; motivo?: string; erro?: string }> {
  if (debounceMs > 0) await sleep(debounceMs);
  const sb = createServiceClient();
  // Trava buffer atomicamente
  const { data: travado } = await sb
    .from("ia_atendimento_buffer")
    .update({ trava_processando: true })
    .eq("ticket_id", ticketId)
    .eq("trava_processando", false)
    .lte("processar_apos", new Date().toISOString())
    .select("ticket_id, perfil_id, agencia_id, mensagens_pendentes, ultimo_recebido_em, processar_apos")
    .maybeSingle();
  if (!travado) return { ok: false, motivo: "buffer_nao_disponivel" };
  try {
    await processarUm(travado as unknown as BufferRow, sb);
    await sb.from("ia_atendimento_buffer").delete().eq("ticket_id", ticketId);
    return { ok: true };
  } catch (e) {
    const erro = e instanceof Error ? e.message : String(e);
    await sb.from("ia_atendimento_log").insert({
      agencia_id: travado.agencia_id,
      perfil_id: travado.perfil_id,
      ticket_id: ticketId,
      evento: "erro",
      erro,
    });
    await sb.from("ia_atendimento_buffer").delete().eq("ticket_id", ticketId);
    return { ok: false, erro };
  }
}
