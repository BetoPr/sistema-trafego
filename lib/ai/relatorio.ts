/**
 * Agregação do uso de IA (tabela ia_uso) pro hub "Análise de IAs" e pro PDF.
 * Fonte única — a página e o export PDF leem daqui.
 *
 * Escopo:
 *  - "meu"   → só a agência do usuário (o "meu CRM"). Padrão pra todo mundo.
 *  - "todos" → todas as agências/clientes (só super-admin). Agrupa por cliente.
 *  - "tipo"  → todas as agências, agrupado por tipo_cliente (só super-admin).
 */
import { createServiceClient } from "@/lib/supabase/service";

export interface FiltroUso {
  provider?: string; // "todos" | "groq" | "openai" | "anthropic"
  dias: number;
  escopo: "meu" | "todos" | "tipo";
  agenciaId: string;
  superAdmin: boolean;
}

interface Row {
  agencia_id: string;
  usuario_id: string | null;
  contato_id: string | null;
  ticket_id: string | null;
  tarefa: string;
  provider: string;
  modelo: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  audio_seg: number;
  custo_usd: number;
  status: string;
  criado_em: string;
}

export interface LinhaAgg { chave: string; rotulo: string; tokens: number; custo: number; chamadas: number }
export interface LogItem { data: string; usuario: string; cliente: string; tarefa: string; provider: string; modelo: string; tokens: number; custo: number; status: string }

export interface UsoAgregado {
  provider: string;
  dias: number;
  escopo: string;
  superAdmin: boolean;
  totais: { tokens: number; custo: number; chamadas: number; sucesso: number; erros: number; rateLimit: number; audioSeg: number; promptTokens: number; completionTokens: number };
  delta: { tokens: number; custo: number; chamadas: number }; // % vs período anterior
  chatGroqHoje: number;
  limiteChatDia: number;
  medias: { porConversa: number; porTicket: number; porRequest: number; custoPorConversa: number; contatos: number; tickets: number };
  eficiencia: { promptPct: number; completionPct: number }; // proporção prompt:completion
  porSessao: LinhaAgg[];
  porProvider: LinhaAgg[];
  porModelo: LinhaAgg[];
  porUsuario: LinhaAgg[];   // "Por Admin"
  porCliente: LinhaAgg[];   // por agência (escopo todos/tipo)
  porTipoCliente: LinhaAgg[];
  porDia: Array<{ dia: string; tokens: number }>;
  log: LogItem[];
}

const LABEL_TAREFA: Record<string, string> = {
  transcricao: "Transcrição de Áudio",
  resumo: "Resumo da Conversa",
  sentimento: "Análise de Sentimento",
  followup: "Follow-up com IA",
  atendimento: "Atendimento (chatbot)",
  outro: "Outro",
};
const TAREFAS_CHAT = new Set(["resumo", "sentimento", "followup", "atendimento", "outro"]);
const diaBR = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(iso));
const pctDelta = (atual: number, ant: number) => (ant > 0 ? Math.round(((atual - ant) / ant) * 100) : atual > 0 ? 100 : 0);

export async function agregarUso(f: FiltroUso): Promise<UsoAgregado> {
  const sb = createServiceClient();
  const dias = Math.max(1, Math.min(90, f.dias || 7));
  const crossCliente = f.superAdmin && (f.escopo === "todos" || f.escopo === "tipo");
  const desde = new Date(Date.now() - dias * 86400000).toISOString();
  const desde2 = new Date(Date.now() - 2 * dias * 86400000).toISOString(); // janela anterior (delta)

  let q = sb
    .from("ia_uso")
    .select("agencia_id, usuario_id, contato_id, ticket_id, tarefa, provider, modelo, prompt_tokens, completion_tokens, total_tokens, audio_seg, custo_usd, status, criado_em")
    .gte("criado_em", desde2)
    .order("criado_em", { ascending: false })
    .limit(50000);
  if (!crossCliente) q = q.eq("agencia_id", f.agenciaId);
  if (f.provider && f.provider !== "todos") q = q.eq("provider", f.provider);
  const { data } = await q;
  const todasRows = (data || []) as Row[];
  const rows = todasRows.filter((r) => r.criado_em >= desde);
  const rowsAnt = todasRows.filter((r) => r.criado_em < desde);

  // Mapas auxiliares (usuários + agências).
  const uq = sb.from("usuarios").select("id, nome, agencia_id, tipo_cliente, role");
  const { data: us } = await (crossCliente ? uq : uq.eq("agencia_id", f.agenciaId));
  const userInfo = new Map((us || []).map((u) => [u.id as string, { nome: (u.nome as string) || "Usuário", tipo: (u.tipo_cliente as string) || null }]));
  const agq = sb.from("agencias").select("id, nome");
  const { data: ags } = await (crossCliente ? agq : agq.eq("id", f.agenciaId));
  const nomeAgencia = new Map((ags || []).map((a) => [a.id as string, (a.nome as string) || "Cliente"]));

  // nº chaves Groq (teto 100k/chave). Pré-Fase 2: 1.
  let nChavesGroq = 1;
  try {
    const { count } = await sb.from("ia_chaves").select("id", { count: "exact", head: true }).eq("agencia_id", f.agenciaId).eq("provider", "groq").eq("ativa", true);
    if (count && count > 0) nChavesGroq = count;
  } catch { /* tabela ainda não existe */ }

  const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const totais = { tokens: 0, custo: 0, chamadas: 0, sucesso: 0, erros: 0, rateLimit: 0, audioSeg: 0, promptTokens: 0, completionTokens: 0 };
  const sessao = new Map<string, LinhaAgg>(), prov = new Map<string, LinhaAgg>(), modelo = new Map<string, LinhaAgg>();
  const usr = new Map<string, LinhaAgg>(), cli = new Map<string, LinhaAgg>(), tipo = new Map<string, LinhaAgg>();
  const dia = new Map<string, number>(), contatos = new Set<string>(), tickets = new Set<string>();
  let chatGroqHoje = 0;

  const bump = (m: Map<string, LinhaAgg>, chave: string, rotulo: string, tok: number, custo: number) => {
    const cur = m.get(chave) || { chave, rotulo, tokens: 0, custo: 0, chamadas: 0 };
    cur.tokens += tok; cur.custo += custo; cur.chamadas += 1; m.set(chave, cur);
  };

  for (const r of rows) {
    const tok = r.total_tokens || 0, custo = Number(r.custo_usd) || 0;
    totais.tokens += tok; totais.custo += custo; totais.chamadas += 1; totais.audioSeg += Number(r.audio_seg) || 0;
    totais.promptTokens += r.prompt_tokens || 0; totais.completionTokens += r.completion_tokens || 0;
    if (r.status === "ok") totais.sucesso += 1; else if (r.status === "rate_limit") totais.rateLimit += 1; else totais.erros += 1;

    bump(sessao, r.tarefa, LABEL_TAREFA[r.tarefa] || r.tarefa, tok, custo);
    bump(prov, r.provider, r.provider, tok, custo);
    bump(modelo, r.modelo, r.modelo, tok, custo);
    const uInfo = r.usuario_id ? userInfo.get(r.usuario_id) : null;
    const rotuloUsr = r.usuario_id
      ? (uInfo?.nome || "Usuário") + (crossCliente && uInfo?.tipo ? ` · ${uInfo.tipo}` : "")
      : "IA / automático";
    bump(usr, r.usuario_id || "_ia", rotuloUsr, tok, custo);
    bump(cli, r.agencia_id, nomeAgencia.get(r.agencia_id) || "Cliente", tok, custo);
    bump(tipo, uInfo?.tipo || "_sem", uInfo?.tipo || "(sem tipo / IA)", tok, custo);

    const d = diaBR(r.criado_em);
    dia.set(d, (dia.get(d) || 0) + tok);
    if (r.contato_id) contatos.add(r.contato_id);
    if (r.ticket_id) tickets.add(r.ticket_id);
    if (r.provider === "groq" && TAREFAS_CHAT.has(r.tarefa) && d === hoje) chatGroqHoje += tok;
  }

  // Cross-cliente (super-admin): semeia TODOS os clientes/admins/tipos, mesmo com 0 uso de IA,
  // pra o roster aparecer completo (ex: tipos de cliente que o super-admin preencheu nos acessos).
  if (crossCliente) {
    for (const [aid, nome] of nomeAgencia) {
      if (!cli.has(aid)) cli.set(aid, { chave: aid, rotulo: nome, tokens: 0, custo: 0, chamadas: 0 });
    }
    for (const u of (us || []) as Array<{ id: string; nome: string | null; tipo_cliente: string | null; role: string | null }>) {
      const t = (u.tipo_cliente || "").trim();
      if (t && !tipo.has(t)) tipo.set(t, { chave: t, rotulo: t, tokens: 0, custo: 0, chamadas: 0 });
      if ((u.role === "admin" || u.role === "super_admin") && !usr.has(u.id)) {
        usr.set(u.id, { chave: u.id, rotulo: (u.nome || "Usuário") + (t ? ` · ${t}` : ""), tokens: 0, custo: 0, chamadas: 0 });
      }
    }
  }

  // Totais da janela anterior (delta).
  let antTok = 0, antCusto = 0, antCh = 0;
  for (const r of rowsAnt) { antTok += r.total_tokens || 0; antCusto += Number(r.custo_usd) || 0; antCh += 1; }

  const porDia: Array<{ dia: string; tokens: number }> = [];
  for (let i = Math.min(dias, 30) - 1; i >= 0; i--) {
    const d = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(Date.now() - i * 86400000));
    porDia.push({ dia: d, tokens: dia.get(d) || 0 });
  }

  const ordena = (m: Map<string, LinhaAgg>) => [...m.values()].sort((a, b) => b.tokens - a.tokens);
  const log: LogItem[] = rows.slice(0, 300).map((r) => ({
    data: r.criado_em,
    usuario: r.usuario_id ? (userInfo.get(r.usuario_id)?.nome || "Usuário") : "IA / automático",
    cliente: nomeAgencia.get(r.agencia_id) || "—",
    tarefa: LABEL_TAREFA[r.tarefa] || r.tarefa,
    provider: r.provider, modelo: r.modelo,
    tokens: r.total_tokens || 0, custo: Number(r.custo_usd) || 0, status: r.status,
  }));

  const somaTok = totais.promptTokens + totais.completionTokens;
  return {
    provider: f.provider || "todos",
    dias, escopo: f.escopo, superAdmin: f.superAdmin,
    totais,
    delta: { tokens: pctDelta(totais.tokens, antTok), custo: pctDelta(totais.custo, antCusto), chamadas: pctDelta(totais.chamadas, antCh) },
    chatGroqHoje, limiteChatDia: 100000 * nChavesGroq,
    medias: {
      porConversa: contatos.size ? Math.round(totais.tokens / contatos.size) : 0,
      porTicket: tickets.size ? Math.round(totais.tokens / tickets.size) : 0,
      porRequest: totais.chamadas ? Math.round(totais.tokens / totais.chamadas) : 0,
      custoPorConversa: contatos.size ? totais.custo / contatos.size : 0,
      contatos: contatos.size, tickets: tickets.size,
    },
    eficiencia: {
      promptPct: somaTok ? Math.round((totais.promptTokens / somaTok) * 100) : 0,
      completionPct: somaTok ? Math.round((totais.completionTokens / somaTok) * 100) : 0,
    },
    porSessao: ordena(sessao), porProvider: ordena(prov), porModelo: ordena(modelo),
    porUsuario: ordena(usr), porCliente: ordena(cli), porTipoCliente: ordena(tipo),
    porDia, log,
  };
}
