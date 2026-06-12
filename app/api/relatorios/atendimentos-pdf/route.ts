/**
 * GET /api/relatorios/atendimentos-pdf?periodo=... | ?de=&ate=
 * PDF consolidado dos atendimentos FECHADOS no período, com o HISTÓRICO
 * COMPLETO da conversa atendente/cliente de cada ticket (não só o resumo).
 * Serve de anexo pra IA (Claude/ChatGPT) gerar um relatório de melhorias
 * do atendimento — use junto com o prompt copiável do Dashboard.
 *
 * Limites de segurança (evita PDF gigante / estouro de contexto da IA):
 *   - MAX_TICKETS tickets no relatório
 *   - MAX_MSGS mensagens por ticket (mantém as mais recentes, avisa o corte)
 */
import { createElement as h } from "react";
import { Document, Page, View, Text, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { resolverFaixa } from "@/lib/crm/dashboard-queries";

export const runtime = "nodejs";

const MAX_TICKETS = 200;
const MAX_MSGS = 60;

const s = StyleSheet.create({
  page: { padding: 30, fontSize: 10, fontFamily: "Helvetica", color: "#222" },
  h1: { fontSize: 16, marginBottom: 2, borderBottomWidth: 2, borderBottomColor: "#10b981", paddingBottom: 4 },
  sub: { fontSize: 10, color: "#555", marginBottom: 10 },
  resumoBox: { backgroundColor: "#F1F7F4", borderLeftWidth: 3, borderLeftColor: "#10b981", padding: 8, marginBottom: 14 },
  ticketHead: { backgroundColor: "#F4F4F2", borderRadius: 4, padding: 8, marginTop: 10, marginBottom: 4 },
  nome: { fontSize: 11.5, fontFamily: "Helvetica-Bold", color: "#111" },
  meta: { fontSize: 8.5, color: "#666", marginTop: 2 },
  tempos: { fontSize: 8.5, color: "#0c8a63", marginTop: 2 },
  motivo: { fontSize: 8.5, color: "#555", fontStyle: "italic", marginTop: 2 },
  corte: { fontSize: 8, color: "#b08", textAlign: "center", marginVertical: 3 },
  bubbleWrapL: { alignItems: "flex-start", marginVertical: 2 },
  bubbleWrapR: { alignItems: "flex-end", marginVertical: 2 },
  bubbleL: { maxWidth: "80%", backgroundColor: "#F2EFEA", padding: 6, borderRadius: 6 },
  bubbleR: { maxWidth: "80%", backgroundColor: "#E8E1F0", padding: 6, borderRadius: 6 },
  autorCliente: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: "#7A5BA0", marginBottom: 2 },
  autorAtend: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: "#3E6E8A", marginBottom: 2 },
  msg: { fontSize: 9.5, color: "#222", lineHeight: 1.35 },
  time: { fontSize: 6.5, color: "#aaa", textAlign: "right", marginTop: 1 },
  vazio: { fontSize: 8.5, color: "#aaa", fontStyle: "italic", marginTop: 2 },
  footer: { marginTop: 16, paddingTop: 6, borderTopWidth: 1, borderTopColor: "#eee", fontSize: 8, color: "#999", textAlign: "center" },
});

const LABEL: Record<string, string> = { muito_bom: "Muito bom", bom: "Bom", ruim: "Ruim" };
const BRL = (n: number) => `R$ ${n.toFixed(2).replace(".", ",")}`;

function fmtDur(seg: number | null): string {
  if (seg === null || seg < 0) return "—";
  if (seg < 60) return `${Math.round(seg)}s`;
  const min = seg / 60;
  if (min < 60) return `${Math.round(min)}m`;
  const hr = min / 60;
  if (hr < 24) { const hh = Math.floor(hr); const mm = Math.round(min - hh * 60); return mm ? `${hh}h ${mm}m` : `${hh}h`; }
  const d = Math.floor(hr / 24); const h2 = Math.round(hr - d * 24); return h2 ? `${d}d ${h2}h` : `${d}d`;
}
const diffSeg = (a: string | null, b: string | null) => (a && b ? (new Date(a).getTime() - new Date(b).getTime()) / 1000 : null);

interface TicketRow {
  id: string;
  numero: number;
  created_at: string;
  primeira_resposta_em: string | null;
  fechado_em: string | null;
  valor_fechado: number | null;
  sentimento: string | null;
  sentimento_motivo: string | null;
  contato: { nome: string | null; whatsapp: string | null } | { nome: string | null; whatsapp: string | null }[] | null;
}
interface MsgRow {
  ticket_id: string;
  autor: string;
  tipo: string;
  conteudo: string | null;
  transcricao: string | null;
  created_at: string;
  usuario: { nome: string | null } | { nome: string | null }[] | null;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return new Response("auth", { status: 401 });

  const sb = createServiceClient();
  const { data: u } = await sb.from("usuarios").select("agencia_id").eq("id", auth.user.id).single();
  if (!u) return new Response("no_user", { status: 403 });

  const faixa = resolverFaixa(url.searchParams.get("periodo") || undefined, url.searchParams.get("de") || undefined, url.searchParams.get("ate") || undefined);

  const { data: tk } = await sb
    .from("tickets")
    .select("id, numero, created_at, primeira_resposta_em, fechado_em, valor_fechado, sentimento, sentimento_motivo, contato:contatos(nome, whatsapp)")
    .eq("agencia_id", u.agencia_id)
    .not("fechado_em", "is", null)
    .gte("fechado_em", faixa.inicio.toISOString())
    .lte("fechado_em", faixa.fim.toISOString())
    .order("fechado_em", { ascending: true })
    .limit(MAX_TICKETS + 1);

  const tickets = (tk || []) as TicketRow[];
  const truncadoTickets = tickets.length > MAX_TICKETS;
  if (truncadoTickets) tickets.length = MAX_TICKETS;

  // Mensagens de todos os tickets numa query só, agrupadas em memória.
  const ids = tickets.map((t) => t.id);
  const porTicket = new Map<string, MsgRow[]>();
  if (ids.length) {
    const { data: msgs } = await sb
      .from("mensagens")
      .select("ticket_id, autor, tipo, conteudo, transcricao, created_at, usuario:usuarios(nome)")
      .in("ticket_id", ids)
      .eq("agencia_id", u.agencia_id)
      .order("created_at", { ascending: true })
      .limit(12000);
    for (const m of (msgs || []) as MsgRow[]) {
      const arr = porTicket.get(m.ticket_id) || [];
      arr.push(m);
      porTicket.set(m.ticket_id, arr);
    }
  }

  const dt = (v: string | null) => (v ? new Date(v).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—");
  const hora = (v: string) => new Date(v).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });

  // Agregados de cabeçalho
  const sat = { muito_bom: 0, bom: 0, ruim: 0 };
  let faturamento = 0;
  for (const t of tickets) {
    if (t.sentimento && t.sentimento in sat) sat[t.sentimento as keyof typeof sat]++;
    faturamento += Number(t.valor_fechado || 0);
  }
  const satTotal = sat.muito_bom + sat.bom + sat.ruim;
  const score = satTotal > 0 ? Math.round(((sat.muito_bom + sat.bom) / satTotal) * 100) : 0;

  const secoes = tickets.map((t, ti) => {
    const c = Array.isArray(t.contato) ? t.contato[0] : t.contato;
    const todas = porTicket.get(t.id) || [];
    const cortadas = Math.max(0, todas.length - MAX_MSGS);
    const visiveis = cortadas > 0 ? todas.slice(-MAX_MSGS) : todas;

    const tResp = fmtDur(diffSeg(t.primeira_resposta_em, t.created_at));
    const tDur = fmtDur(diffSeg(t.fechado_em, t.created_at));

    const head = h(View, { key: `h${ti}`, style: s.ticketHead, wrap: false },
      h(Text, { style: s.nome }, `#${t.numero}  ${c?.nome || "Contato"}`),
      h(Text, { style: s.meta }, `${c?.whatsapp || ""}  ·  Aberto ${dt(t.created_at)}  ·  Fechado ${dt(t.fechado_em)}${t.valor_fechado ? `  ·  ${BRL(Number(t.valor_fechado))}` : ""}${t.sentimento ? `  ·  ${LABEL[t.sentimento] || t.sentimento}` : ""}`),
      h(Text, { style: s.tempos }, `1ª resposta: ${tResp}   ·   Duração: ${tDur}`),
      t.sentimento_motivo ? h(Text, { style: s.motivo }, `"${t.sentimento_motivo}"`) : null,
    );

    const corte = cortadas > 0 ? h(Text, { key: `c${ti}`, style: s.corte }, `… ${cortadas} mensagem(ns) mais antiga(s) omitida(s) · mostrando as ${MAX_MSGS} últimas`) : null;

    const bolhas = visiveis.length
      ? visiveis.map((m, i) => {
          const usr = Array.isArray(m.usuario) ? m.usuario[0] : m.usuario;
          const cliente = m.autor === "cliente";
          const autorNome = cliente ? c?.nome || "Cliente" : m.autor === "sistema" ? "Sistema" : usr?.nome || "Atendente";
          const conteudo = m.tipo === "audio"
            ? `[Áudio]${m.transcricao ? ` ${m.transcricao}` : ""}`
            : m.tipo !== "texto"
              ? `[${m.tipo}] ${m.conteudo || ""}`
              : m.conteudo || "-";
          return h(View, { key: `${ti}-${i}`, style: cliente ? s.bubbleWrapL : s.bubbleWrapR, wrap: false },
            h(View, { style: cliente ? s.bubbleL : s.bubbleR },
              h(Text, { style: cliente ? s.autorCliente : s.autorAtend }, autorNome),
              h(Text, { style: s.msg }, conteudo),
              h(Text, { style: s.time }, hora(m.created_at)),
            ),
          );
        })
      : [h(Text, { key: `v${ti}`, style: s.vazio }, "(sem mensagens registradas)")];

    return h(View, { key: `sec${ti}` }, head, corte, h(View, {}, bolhas));
  });

  const doc = h(Document, {},
    h(Page, { size: "A4", style: s.page, wrap: true },
      h(Text, { style: s.h1 }, "Relatório de atendimentos — histórico completo"),
      h(Text, { style: s.sub }, `Período: ${faixa.label}  ·  ${tickets.length} atendimento(s) fechado(s)${truncadoTickets ? ` (limitado a ${MAX_TICKETS})` : ""}`),
      h(View, { style: s.resumoBox },
        h(Text, { style: { fontSize: 10, fontFamily: "Helvetica-Bold", marginBottom: 3 } }, `Satisfação: ${score}% satisfeitos`),
        h(Text, { style: { fontSize: 9, color: "#444" } }, `Muito bom: ${sat.muito_bom}  ·  Bom: ${sat.bom}  ·  Ruim: ${sat.ruim}  (${satTotal} analisados)`),
        h(Text, { style: { fontSize: 9, color: "#444", marginTop: 2 } }, `Faturamento no período: ${BRL(faturamento)}`),
      ),
      tickets.length ? h(View, {}, secoes) : h(Text, { style: { color: "#999", textAlign: "center", marginTop: 20 } }, "Nenhum atendimento fechado no período."),
      h(Text, { style: s.footer }, `Gerado em ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} - Sistema Trafego CRM. Anexe este PDF a uma IA junto com o prompt de análise do Dashboard.`),
    ),
  );

  const buf = await renderToBuffer(doc);
  const slug = faixa.label.replace(/[^\w]+/g, "-").toLowerCase();
  return new Response(new Uint8Array(buf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="relatorio-atendimentos-${slug}.pdf"`,
      "cache-control": "no-store",
    },
  });
}
