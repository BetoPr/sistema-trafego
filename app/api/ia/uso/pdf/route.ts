import React from "react";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { agregarUso, type UsoAgregado, type LinhaAgg } from "@/lib/ai/relatorio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const nf = new Intl.NumberFormat("pt-BR");
const e = React.createElement;

const s = StyleSheet.create({
  page: { padding: 28, fontSize: 9, color: "#222", fontFamily: "Helvetica" },
  h1: { fontSize: 16, marginBottom: 2 },
  sub: { fontSize: 9, color: "#666", marginBottom: 12 },
  h2: { fontSize: 11, marginTop: 14, marginBottom: 5 },
  kpis: { flexDirection: "row", marginBottom: 6 },
  kpi: { flex: 1, borderWidth: 0.5, borderColor: "#ccc", borderRadius: 4, padding: 6, marginRight: 6 },
  kpiV: { fontSize: 13 },
  kpiT: { fontSize: 7, color: "#666", marginTop: 2 },
  th: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#999", paddingVertical: 2 },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#ddd", paddingVertical: 2 },
  bold: { fontFamily: "Helvetica-Bold" },
});

function fmtData(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}
function cell(txt: string, flex: number, right = false, bold = false) {
  return e(Text, { style: [{ flex, paddingRight: 4 }, right ? { textAlign: "right" as const } : {}, bold ? s.bold : {}] }, txt);
}
function kpi(titulo: string, valor: string) {
  return e(View, { style: s.kpi }, [e(Text, { key: "v", style: s.kpiV }, valor), e(Text, { key: "t", style: s.kpiT }, titulo)]);
}
function secaoTabela(titulo: string, linhas: LinhaAgg[]) {
  return e(View, { wrap: false }, [
    e(Text, { key: "h", style: s.h2 }, titulo),
    e(View, { key: "th", style: s.th }, [cell("Item", 3, false, true), cell("Tokens", 1, true, true), cell("Custo", 1, true, true), cell("Chamadas", 1, true, true)]),
    ...linhas.map((l, i) =>
      e(View, { key: i, style: s.row }, [cell(l.rotulo, 3), cell(nf.format(l.tokens), 1, true), cell("$" + l.custo.toFixed(4), 1, true), cell(nf.format(l.chamadas), 1, true)]),
    ),
  ]);
}

function Doc({ d, provider, dias }: { d: UsoAgregado; provider: string; dias: number }) {
  const log = d.log.slice(0, 150);
  return e(Document, {}, e(Page, { size: "A4", style: s.page, wrap: true }, [
    e(Text, { key: "h1", style: s.h1 }, "Relatório de uso de IA — Sonar CRM"),
    e(Text, { key: "sub", style: s.sub }, `Provedor: ${provider} · Período: ${dias} dia(s) · Gerado em ${fmtData(new Date().toISOString())}`),
    e(View, { key: "kpis", style: s.kpis }, [
      kpi("Tokens (total)", nf.format(d.totais.tokens)),
      kpi("Custo estimado (USD)", "$" + d.totais.custo.toFixed(4)),
      kpi("Chamadas", nf.format(d.totais.chamadas)),
      kpi("Sucesso", d.totais.chamadas ? Math.round((d.totais.sucesso / d.totais.chamadas) * 100) + "%" : "—"),
    ]),
    e(Text, { key: "mc", style: { fontSize: 9, color: "#444", marginBottom: 4 } },
      `Escopo: ${d.escopo} · Áudio: ${Math.round(d.totais.audioSeg / 60)} min · Erros: ${d.totais.erros} · Limites: ${d.totais.rateLimit} · Chat Groq hoje: ${nf.format(d.chatGroqHoje)}/${nf.format(d.limiteChatDia)} · Média/conversa: ${nf.format(d.medias.porConversa)} tok · Média/ticket: ${nf.format(d.medias.porTicket)} tok · Média/chamada: ${nf.format(d.medias.porRequest)} tok`),
    secaoTabela("Por sessão", d.porSessao),
    secaoTabela("Por modelo", d.porModelo),
    secaoTabela("Por Admin / usuário", d.porUsuario),
    secaoTabela("Por provedor", d.porProvider),
    ...(d.escopo === "todos" ? [secaoTabela("Por cliente (agência)", d.porCliente)] : []),
    ...(d.escopo === "tipo" ? [secaoTabela("Por tipo de cliente", d.porTipoCliente)] : []),
    e(Text, { key: "logh", style: s.h2 }, `Log de uso (${log.length} de ${d.log.length})`),
    e(View, { key: "logth", style: s.th }, [cell("Data", 2, false, true), cell("Usuário", 2, false, true), cell("Sessão", 2, false, true), cell("Prov.", 1, false, true), cell("Tokens", 1, true, true), cell("Custo", 1, true, true), cell("St", 1, false, true)]),
    ...log.map((l, i) =>
      e(View, { key: "l" + i, style: s.row }, [cell(fmtData(l.data), 2), cell(l.usuario, 2), cell(l.tarefa, 2), cell(l.provider, 1), cell(nf.format(l.tokens), 1, true), cell("$" + l.custo.toFixed(4), 1, true), cell(l.status === "rate_limit" ? "lim" : l.status, 1)]),
    ),
  ]));
}

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return new Response("auth", { status: 401 });

  const sb = createServiceClient();
  const { data: u } = await sb.from("usuarios").select("agencia_id, role").eq("id", auth.user.id).single();
  if (!u || !["admin", "super_admin"].includes(u.role as string)) return new Response("forbidden", { status: 403 });

  const url = new URL(req.url);
  const provider = url.searchParams.get("provider") || "todos";
  const dias = Number(url.searchParams.get("dias")) || 7;
  const superAdmin = (u.role as string) === "super_admin";
  const escRaw = url.searchParams.get("escopo");
  const escopo = (superAdmin && (escRaw === "todos" || escRaw === "tipo")) ? escRaw : "meu";
  const d = await agregarUso({ provider, dias, escopo, agenciaId: u.agencia_id as string, superAdmin });

  const buffer = await renderToBuffer(e(Doc, { d, provider, dias }) as unknown as Parameters<typeof renderToBuffer>[0]);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="uso-ia-${provider}-${dias}d.pdf"`,
      "cache-control": "no-store",
    },
  });
}
