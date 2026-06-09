/**
 * GET /api/atendimentos/[id]/export-pdf
 * Renderiza HTML formatado pra impressão (browser exporta como PDF via Ctrl+P).
 * Mais simples que dependência jsPDF — funciona em qualquer browser.
 */
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

function esc(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

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

  const mensagensHTML = (msgs || [])
    .map((m) => {
      const usr = Array.isArray(m.usuario) ? m.usuario[0] : m.usuario;
      const autorNome = m.autor === "cliente" ? contato?.nome || "Cliente" : usr?.nome || "Atendente";
      const cor = m.autor === "cliente" ? "#9B7DBF" : "#5B8BA6";
      const align = m.autor === "cliente" ? "left" : "right";
      const bg = m.autor === "cliente" ? "#F4F1ED" : "#E8E1F0";
      const conteudo = m.tipo === "audio"
        ? `🎤 Áudio${m.transcricao ? ` — ${esc(m.transcricao)}` : ""}`
        : m.tipo !== "texto"
        ? `[${esc(m.tipo)}] ${esc(m.conteudo)}`
        : esc(m.conteudo);
      return `
        <tr><td style="text-align:${align};padding:6px 0;">
          <div style="display:inline-block;max-width:70%;background:${bg};padding:8px 12px;border-radius:8px;text-align:left;">
            <div style="font-size:10px;font-weight:600;color:${cor};margin-bottom:4px;">${esc(autorNome)}</div>
            <div style="font-size:11px;color:#222;white-space:pre-wrap;line-height:1.5;">${conteudo || "—"}</div>
            <div style="font-size:9px;color:#888;text-align:right;margin-top:4px;">${new Date(m.created_at).toLocaleString("pt-BR")}</div>
          </div>
        </td></tr>`;
    })
    .join("");

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Conversa #${ticket.numero}</title>
<style>
  @page { margin: 16mm; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #222; max-width: 720px; margin: 0 auto; padding: 16px; background: #fff; }
  h1 { font-size: 18px; border-bottom: 2px solid #9B7DBF; padding-bottom: 6px; }
  h2 { font-size: 13px; color: #555; margin-top: 18px; }
  .meta { font-size: 11px; color: #555; line-height: 1.6; }
  .meta strong { color: #222; }
  table { width: 100%; border-collapse: collapse; }
  .resumo { background: #F8F5F0; padding: 12px; border-left: 3px solid #C9A876; font-size: 11px; line-height: 1.6; margin: 8px 0; }
  @media print {
    button { display: none; }
  }
</style>
</head>
<body>
  <div style="float:right;margin-top:-8px;">
    <button onclick="window.print()" style="background:#9B7DBF;color:#fff;border:0;padding:6px 14px;border-radius:6px;cursor:pointer;font-size:12px;">🖨 Imprimir/PDF</button>
  </div>

  <h1>Conversa — Ticket #${ticket.numero}</h1>
  <div class="meta">
    <strong>Contato:</strong> ${esc(contato?.nome)}<br/>
    ${contato?.whatsapp ? `<strong>WhatsApp:</strong> ${esc(contato.whatsapp)}<br/>` : ""}
    ${canal?.nome ? `<strong>Canal:</strong> ${esc(canal.nome)}${canal.numero_conectado ? ` · ${esc(canal.numero_conectado)}` : ""}<br/>` : ""}
    <strong>Status:</strong> ${esc(ticket.status)}<br/>
    <strong>Aberto em:</strong> ${new Date(ticket.created_at).toLocaleString("pt-BR")}<br/>
    ${ticket.fechado_em ? `<strong>Fechado em:</strong> ${new Date(ticket.fechado_em).toLocaleString("pt-BR")}<br/>` : ""}
    ${ticket.valor_fechado ? `<strong>Valor:</strong> R$ ${Number(ticket.valor_fechado).toFixed(2).replace(".", ",")}<br/>` : ""}
    ${ticket.sentimento ? `<strong>Sentimento IA:</strong> ${esc(ticket.sentimento)}<br/>` : ""}
  </div>

  ${ticket.resumo ? `<h2>Resumo IA</h2><div class="resumo">${esc(ticket.resumo)}</div>` : ""}

  <h2>Mensagens (${(msgs || []).length})</h2>
  <table>${mensagensHTML || '<tr><td style="text-align:center;color:#888;padding:20px;font-size:11px;">Sem mensagens</td></tr>'}</table>

  <div style="text-align:center;font-size:9px;color:#888;margin-top:24px;border-top:1px solid #eee;padding-top:8px;">
    Exportado em ${new Date().toLocaleString("pt-BR")} · Sistema Tráfego CRM
  </div>
  <script>setTimeout(() => window.print(), 400);</script>
</body>
</html>`;

  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
