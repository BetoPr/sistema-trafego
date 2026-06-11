/**
 * GET /api/relatorios/atendimentos-pdf?periodo=... | ?de=&ate=
 * PDF consolidado dos atendimentos FECHADOS no período: contato, data,
 * sentimento, valor e o resumo automático. Pra levar pro Claude/ChatGPT
 * e fazer análise geral de comportamento/conversão/cortesia.
 */
import { createElement as h } from "react";
import { Document, Page, View, Text, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { resolverFaixa } from "@/lib/crm/dashboard-queries";

export const runtime = "nodejs";

const s = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica", color: "#222" },
  h1: { fontSize: 16, marginBottom: 2, borderBottomWidth: 2, borderBottomColor: "#10b981", paddingBottom: 4 },
  sub: { fontSize: 10, color: "#555", marginBottom: 10 },
  resumoBox: { backgroundColor: "#F1F7F4", borderLeftWidth: 3, borderLeftColor: "#10b981", padding: 8, marginBottom: 12 },
  card: { borderWidth: 0.5, borderColor: "#ddd", borderRadius: 4, padding: 8, marginBottom: 8 },
  linha1: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  nome: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#111" },
  meta: { fontSize: 8, color: "#777" },
  resumo: { fontSize: 9.5, color: "#333", lineHeight: 1.4, marginTop: 2 },
  footer: { marginTop: 14, paddingTop: 6, borderTopWidth: 1, borderTopColor: "#eee", fontSize: 8, color: "#999", textAlign: "center" },
});

const LABEL: Record<string, string> = { muito_bom: "Muito bom", bom: "Bom", ruim: "Ruim" };

export async function GET(req: Request) {
  const url = new URL(req.url);
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return new Response("auth", { status: 401 });

  const sb = createServiceClient();
  const { data: u } = await sb.from("usuarios").select("agencia_id").eq("id", auth.user.id).single();
  if (!u) return new Response("no_user", { status: 403 });

  const faixa = resolverFaixa(url.searchParams.get("periodo") || undefined, url.searchParams.get("de") || undefined, url.searchParams.get("ate") || undefined);

  const { data: tickets } = await sb
    .from("tickets")
    .select("numero, fechado_em, valor_fechado, sentimento, sentimento_motivo, resumo, contato:contatos(nome, whatsapp)")
    .eq("agencia_id", u.agencia_id)
    .not("fechado_em", "is", null)
    .gte("fechado_em", faixa.inicio.toISOString())
    .lte("fechado_em", faixa.fim.toISOString())
    .order("fechado_em", { ascending: true })
    .limit(2000);

  const rows = tickets || [];
  const dt = (v: string | null) => (v ? new Date(v).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—");

  const sat = { muito_bom: 0, bom: 0, ruim: 0 };
  let faturamento = 0;
  for (const t of rows) {
    if (t.sentimento && t.sentimento in sat) sat[t.sentimento as keyof typeof sat]++;
    faturamento += Number(t.valor_fechado || 0);
  }
  const satTotal = sat.muito_bom + sat.bom + sat.ruim;
  const score = satTotal > 0 ? Math.round(((sat.muito_bom + sat.bom) / satTotal) * 100) : 0;
  const BRL = (n: number) => `R$ ${n.toFixed(2).replace(".", ",")}`;

  const cards = rows.map((t, i) => {
    const c = Array.isArray(t.contato) ? t.contato[0] : t.contato;
    return h(View, { key: i, style: s.card, wrap: false },
      h(View, { style: s.linha1 },
        h(Text, { style: s.nome }, `${c?.nome || "Contato"}  #${t.numero}`),
        h(Text, { style: s.meta }, `${dt(t.fechado_em)}${t.valor_fechado ? `  ·  ${BRL(Number(t.valor_fechado))}` : ""}`),
      ),
      h(Text, { style: s.meta }, `${c?.whatsapp || ""}${t.sentimento ? `   ·   Sentimento: ${LABEL[t.sentimento] || t.sentimento}` : ""}`),
      t.resumo ? h(Text, { style: s.resumo }, t.resumo) : h(Text, { style: { ...s.resumo, color: "#aaa" } }, "(sem resumo)"),
    );
  });

  const doc = h(Document, {},
    h(Page, { size: "A4", style: s.page, wrap: true },
      h(Text, { style: s.h1 }, "Análise de atendimentos"),
      h(Text, { style: s.sub }, `Período: ${faixa.label}  ·  ${rows.length} atendimento(s) fechado(s)`),
      h(View, { style: s.resumoBox },
        h(Text, { style: { fontSize: 10, fontFamily: "Helvetica-Bold", marginBottom: 3 } }, `Satisfação: ${score}% satisfeitos`),
        h(Text, { style: { fontSize: 9, color: "#444" } }, `Muito bom: ${sat.muito_bom}  ·  Bom: ${sat.bom}  ·  Ruim: ${sat.ruim}  (${satTotal} analisados)`),
        h(Text, { style: { fontSize: 9, color: "#444", marginTop: 2 } }, `Faturamento no período: ${BRL(faturamento)}`),
      ),
      rows.length ? h(View, {}, cards) : h(Text, { style: { color: "#999", textAlign: "center", marginTop: 20 } }, "Nenhum atendimento fechado no período."),
      h(Text, { style: s.footer }, `Gerado em ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} - Sistema Trafego CRM. Use este PDF como entrada pra uma IA (Claude/ChatGPT) analisar padroes, conversao e cortesia.`),
    ),
  );

  const buf = await renderToBuffer(doc);
  const slug = faixa.label.replace(/[^\w]+/g, "-").toLowerCase();
  return new Response(new Uint8Array(buf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="analise-atendimentos-${slug}.pdf"`,
      "cache-control": "no-store",
    },
  });
}
