/**
 * GET /api/atendimentos/[id]/export-pdf-file
 * Gera um PDF REAL (via @react-pdf/renderer) e força download automático
 * (Content-Disposition: attachment). Diferente de /export-pdf que devolve
 * HTML pra impressão pelo navegador.
 */
import { createElement as h } from "react";
import { Document, Page, View, Text, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

const s = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica", color: "#222" },
  h1: { fontSize: 16, marginBottom: 4, color: "#222", borderBottomWidth: 2, borderBottomColor: "#10b981", paddingBottom: 4 },
  h2: { fontSize: 12, marginTop: 14, marginBottom: 6, color: "#555" },
  meta: { fontSize: 10, color: "#444", lineHeight: 1.5, marginTop: 6 },
  metaLabel: { color: "#111", fontFamily: "Helvetica-Bold" },
  resumo: { backgroundColor: "#F1F7F4", borderLeftWidth: 3, borderLeftColor: "#10b981", padding: 8, fontSize: 10, marginTop: 4, lineHeight: 1.5 },
  bubbleWrapL: { alignItems: "flex-start", marginVertical: 3 },
  bubbleWrapR: { alignItems: "flex-end", marginVertical: 3 },
  bubbleL: { maxWidth: "78%", backgroundColor: "#F2EFEA", padding: 7, borderRadius: 6 },
  bubbleR: { maxWidth: "78%", backgroundColor: "#E8E1F0", padding: 7, borderRadius: 6 },
  autorCliente: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#7A5BA0", marginBottom: 2 },
  autorAtend: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#3E6E8A", marginBottom: 2 },
  msg: { fontSize: 10, color: "#222", lineHeight: 1.4 },
  time: { fontSize: 7, color: "#999", textAlign: "right", marginTop: 2 },
  footer: { marginTop: 18, paddingTop: 6, borderTopWidth: 1, borderTopColor: "#eee", fontSize: 8, color: "#999", textAlign: "center" },
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return new Response("auth", { status: 401 });

  const sb = createServiceClient();
  const { data: u } = await sb.from("usuarios").select("agencia_id").eq("id", auth.user.id).single();
  if (!u) return new Response("no_user", { status: 403 });

  const [{ data: ticket }, { data: msgs }] = await Promise.all([
    sb
      .from("tickets")
      .select("numero, status, created_at, fechado_em, valor_fechado, sentimento, resumo, contato:contatos(nome, whatsapp, email), canal:canais(nome, numero_conectado)")
      .eq("id", id)
      .eq("agencia_id", u.agencia_id)
      .single(),
    sb
      .from("mensagens")
      .select("autor, tipo, conteudo, transcricao, created_at, usuario:usuarios(nome)")
      .eq("ticket_id", id)
      .eq("agencia_id", u.agencia_id)
      .order("created_at", { ascending: true })
      .limit(1000),
  ]);

  if (!ticket) return new Response("ticket_nao_encontrado", { status: 404 });

  const contato = Array.isArray(ticket.contato) ? ticket.contato[0] : ticket.contato;
  const canal = Array.isArray(ticket.canal) ? ticket.canal[0] : ticket.canal;
  const dt = (v: string) => new Date(v).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

  const metaLinhas: React.ReactNode[] = [
    h(Text, { key: "ct" }, [h(Text, { key: "l", style: s.metaLabel }, "Contato: "), contato?.nome || "—"]),
  ];
  if (contato?.whatsapp) metaLinhas.push(h(Text, { key: "wa" }, [h(Text, { key: "l", style: s.metaLabel }, "WhatsApp: "), contato.whatsapp]));
  if (canal?.nome) metaLinhas.push(h(Text, { key: "cn" }, [h(Text, { key: "l", style: s.metaLabel }, "Canal: "), `${canal.nome}${canal.numero_conectado ? ` - ${canal.numero_conectado}` : ""}`]));
  metaLinhas.push(h(Text, { key: "st" }, [h(Text, { key: "l", style: s.metaLabel }, "Status: "), ticket.status]));
  metaLinhas.push(h(Text, { key: "ab" }, [h(Text, { key: "l", style: s.metaLabel }, "Aberto em: "), dt(ticket.created_at)]));
  if (ticket.fechado_em) metaLinhas.push(h(Text, { key: "fc" }, [h(Text, { key: "l", style: s.metaLabel }, "Fechado em: "), dt(ticket.fechado_em)]));
  if (ticket.valor_fechado) metaLinhas.push(h(Text, { key: "vl" }, [h(Text, { key: "l", style: s.metaLabel }, "Valor: "), `R$ ${Number(ticket.valor_fechado).toFixed(2).replace(".", ",")}`]));
  if (ticket.sentimento) metaLinhas.push(h(Text, { key: "se" }, [h(Text, { key: "l", style: s.metaLabel }, "Sentimento IA: "), ticket.sentimento]));

  const bolhas = (msgs || []).map((m, i) => {
    const usr = Array.isArray(m.usuario) ? m.usuario[0] : m.usuario;
    const cliente = m.autor === "cliente";
    const autorNome = cliente ? contato?.nome || "Cliente" : usr?.nome || "Atendente";
    const conteudo = m.tipo === "audio"
      ? `[Audio]${m.transcricao ? ` ${m.transcricao}` : ""}`
      : m.tipo !== "texto"
        ? `[${m.tipo}] ${m.conteudo || ""}`
        : m.conteudo || "-";
    return h(View, { key: i, style: cliente ? s.bubbleWrapL : s.bubbleWrapR },
      h(View, { style: cliente ? s.bubbleL : s.bubbleR },
        h(Text, { style: cliente ? s.autorCliente : s.autorAtend }, autorNome),
        h(Text, { style: s.msg }, conteudo),
        h(Text, { style: s.time }, dt(m.created_at)),
      ),
    );
  });

  const doc = h(Document, {},
    h(Page, { size: "A4", style: s.page, wrap: true },
      h(Text, { style: s.h1 }, `Conversa - Ticket #${ticket.numero}`),
      h(View, { style: s.meta }, metaLinhas),
      ticket.resumo ? h(View, {}, h(Text, { style: s.h2 }, "Resumo IA"), h(View, { style: s.resumo }, h(Text, {}, ticket.resumo))) : null,
      h(Text, { style: s.h2 }, `Mensagens (${(msgs || []).length})`),
      bolhas.length ? h(View, {}, bolhas) : h(Text, { style: { color: "#999", textAlign: "center", marginTop: 16 } }, "Sem mensagens"),
      h(Text, { style: s.footer }, `Exportado em ${dt(new Date().toISOString())} - Sistema Trafego CRM`),
    ),
  );

  const buf = await renderToBuffer(doc);
  return new Response(new Uint8Array(buf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="conversa-${ticket.numero}.pdf"`,
      "cache-control": "no-store",
    },
  });
}
