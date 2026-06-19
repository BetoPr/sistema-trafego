/**
 * Agregação do uso de IA (tabela ia_uso) pro hub "Análise de IAs" e pro PDF.
 * Fonte única — a página e o export PDF leem daqui.
 */
import { createServiceClient } from "@/lib/supabase/service";

export interface FiltroUso {
  provider?: string; // "todos" | "groq" | "openai" | "anthropic"
  dias: number;
}

interface Row {
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
export interface LogItem { data: string; usuario: string; tarefa: string; provider: string; modelo: string; tokens: number; custo: number; status: string }

export interface UsoAgregado {
  provider: string;
  dias: number;
  totais: { tokens: number; custo: number; chamadas: number; sucesso: number; erros: number; rateLimit: number; audioSeg: number };
  chatGroqHoje: number; // tokens de chat (groq) usados HOJE
  limiteChatDia: number; // teto diário de chat (groq) — 100k por chave
  porSessao: LinhaAgg[];
  porProvider: LinhaAgg[];
  porUsuario: LinhaAgg[];
  porDia: Array<{ dia: string; tokens: number }>;
  medias: { porContato: number; porTicket: number; contatos: number; tickets: number };
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

function diaBR(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(iso));
}

export async function agregarUso(agenciaId: string, f: FiltroUso): Promise<UsoAgregado> {
  const sb = createServiceClient();
  const dias = Math.max(1, Math.min(90, f.dias || 7));
  const desde = new Date(Date.now() - dias * 86400000).toISOString();

  let q = sb
    .from("ia_uso")
    .select("usuario_id, contato_id, ticket_id, tarefa, provider, modelo, prompt_tokens, completion_tokens, total_tokens, audio_seg, custo_usd, status, criado_em")
    .eq("agencia_id", agenciaId)
    .gte("criado_em", desde)
    .order("criado_em", { ascending: false })
    .limit(20000);
  if (f.provider && f.provider !== "todos") q = q.eq("provider", f.provider);
  const { data } = await q;
  const rows = (data || []) as Row[];

  const { data: us } = await sb.from("usuarios").select("id, nome").eq("agencia_id", agenciaId);
  const nomeUser = new Map((us || []).map((u) => [u.id as string, u.nome as string]));

  // Quantas chaves Groq ativas (teto diário = 100k por chave). Hoje: ia_chaves se existir, senão 1.
  let nChavesGroq = 1;
  try {
    const { count } = await sb.from("ia_chaves").select("id", { count: "exact", head: true }).eq("agencia_id", agenciaId).eq("provider", "groq").eq("ativa", true);
    if (count && count > 0) nChavesGroq = count;
  } catch { /* tabela ainda não existe (pré Fase 2) */ }

  const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());

  const totais = { tokens: 0, custo: 0, chamadas: 0, sucesso: 0, erros: 0, rateLimit: 0, audioSeg: 0 };
  const sessao = new Map<string, LinhaAgg>();
  const prov = new Map<string, LinhaAgg>();
  const usr = new Map<string, LinhaAgg>();
  const dia = new Map<string, number>();
  const contatos = new Set<string>();
  const tickets = new Set<string>();
  let chatGroqHoje = 0;

  const bump = (m: Map<string, LinhaAgg>, chave: string, rotulo: string, tok: number, custo: number) => {
    const cur = m.get(chave) || { chave, rotulo, tokens: 0, custo: 0, chamadas: 0 };
    cur.tokens += tok; cur.custo += custo; cur.chamadas += 1; m.set(chave, cur);
  };

  for (const r of rows) {
    const tok = r.total_tokens || 0;
    const custo = Number(r.custo_usd) || 0;
    totais.tokens += tok; totais.custo += custo; totais.chamadas += 1; totais.audioSeg += Number(r.audio_seg) || 0;
    if (r.status === "ok") totais.sucesso += 1;
    else if (r.status === "rate_limit") totais.rateLimit += 1;
    else totais.erros += 1;

    bump(sessao, r.tarefa, LABEL_TAREFA[r.tarefa] || r.tarefa, tok, custo);
    bump(prov, r.provider, r.provider, tok, custo);
    bump(usr, r.usuario_id || "_ia", r.usuario_id ? (nomeUser.get(r.usuario_id) || "Usuário") : "IA / automático", tok, custo);

    const d = diaBR(r.criado_em);
    dia.set(d, (dia.get(d) || 0) + tok);
    if (r.contato_id) contatos.add(r.contato_id);
    if (r.ticket_id) tickets.add(r.ticket_id);
    if (r.provider === "groq" && TAREFAS_CHAT.has(r.tarefa) && d === hoje) chatGroqHoje += tok;
  }

  // Série dos últimos N dias (preenche zeros).
  const porDia: Array<{ dia: string; tokens: number }> = [];
  for (let i = Math.min(dias, 30) - 1; i >= 0; i--) {
    const d = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(Date.now() - i * 86400000));
    porDia.push({ dia: d, tokens: dia.get(d) || 0 });
  }

  const ordena = (m: Map<string, LinhaAgg>) => [...m.values()].sort((a, b) => b.tokens - a.tokens);

  const log: LogItem[] = rows.slice(0, 300).map((r) => ({
    data: r.criado_em,
    usuario: r.usuario_id ? (nomeUser.get(r.usuario_id) || "Usuário") : "IA / automático",
    tarefa: LABEL_TAREFA[r.tarefa] || r.tarefa,
    provider: r.provider,
    modelo: r.modelo,
    tokens: r.total_tokens || 0,
    custo: Number(r.custo_usd) || 0,
    status: r.status,
  }));

  return {
    provider: f.provider || "todos",
    dias,
    totais,
    chatGroqHoje,
    limiteChatDia: 100000 * nChavesGroq,
    porSessao: ordena(sessao),
    porProvider: ordena(prov),
    porUsuario: ordena(usr),
    porDia,
    medias: {
      porContato: contatos.size ? Math.round(totais.tokens / contatos.size) : 0,
      porTicket: tickets.size ? Math.round(totais.tokens / tickets.size) : 0,
      contatos: contatos.size,
      tickets: tickets.size,
    },
    log,
  };
}
