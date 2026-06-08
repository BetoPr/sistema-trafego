import Link from "next/link";
import { requireAuth } from "@/lib/crm/permissions";
import { createServiceClient } from "@/lib/supabase/service";
import { ChatView } from "./_chat";
import { PainelDireito } from "./_painel";

interface PageProps {
  searchParams: Promise<{ tab?: string; t?: string; q?: string }>;
}

const TABS: Array<{ id: "aberto" | "pendente" | "fechado"; label: string }> = [
  { id: "aberto", label: "Abertos" },
  { id: "pendente", label: "Pendentes" },
  { id: "fechado", label: "Fechados" },
];

export default async function AtendimentosPage({ searchParams }: PageProps) {
  const ctx = await requireAuth();
  const sp = await searchParams;
  const sb = createServiceClient();
  const tab = (TABS.find((t) => t.id === sp.tab)?.id) || "aberto";

  // Counts
  const counts: Record<string, number> = { aberto: 0, pendente: 0, fechado: 0 };
  for (const t of TABS) {
    const { count } = await sb
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .eq("agencia_id", ctx.agenciaId)
      .eq("status", t.id);
    counts[t.id] = count || 0;
  }

  // Lista tickets do tab atual
  let q = sb
    .from("tickets")
    .select("id, numero, status, ultima_mensagem_em, ultima_mensagem_preview, sentimento, contato:contatos(id, nome, whatsapp, foto_url), canal:canais(id, nome, status, instance_id), fila:filas(id, nome, cor)")
    .eq("agencia_id", ctx.agenciaId)
    .eq("status", tab)
    .order("ultima_mensagem_em", { ascending: false, nullsFirst: false })
    .limit(80);

  if (sp.q) {
    q = q.ilike("ultima_mensagem_preview", `%${sp.q}%`);
  }
  const { data: tickets } = await q;

  // Ticket aberto
  const ticketAbertoId = sp.t;
  interface TicketSel {
    id: string;
    numero: number;
    sentimento: string | null;
    sentimento_confianca: number | null;
    sentimento_motivo: string | null;
    resumo: string | null;
    resumo_atualizado_em: string | null;
    contato: { id: string; nome: string; whatsapp: string | null; ia_habilitada: boolean };
    canal: { id: string; nome: string; status: string } | null;
  }
  let mensagens: Array<{
    id: string;
    autor: "cliente" | "atendente" | "sistema" | "bot";
    tipo: string;
    conteudo: string | null;
    transcricao: string | null;
    midia_url: string | null;
    midia_mime: string | null;
    status: string;
    created_at: string;
    usuario_id: string | null;
  }> = [];
  let etiquetas: Array<{ id: string; nome: string; cor: string }> = [];
  let mensagensRapidas: Array<{ id: string; comando: string; conteudo: string }> = [];
  let userNomeMap: Record<string, string> = {};
  let ticketSelFull: TicketSel | null = null;

  if (ticketAbertoId) {
    const { data: t } = await sb
      .from("tickets")
      .select("id, numero, sentimento, sentimento_confianca, sentimento_motivo, resumo, resumo_atualizado_em, contato:contatos(id, nome, whatsapp, ia_habilitada), canal:canais(id, nome, status)")
      .eq("id", ticketAbertoId)
      .eq("agencia_id", ctx.agenciaId)
      .maybeSingle();
    if (t) {
      // supabase-js retorna nested relations como array (mesmo pra FK 1-to-1).
      const tt = t as unknown as Omit<TicketSel, "contato" | "canal"> & {
        contato: TicketSel["contato"] | TicketSel["contato"][] | null;
        canal: TicketSel["canal"] | TicketSel["canal"][] | null;
      };
      const contato = Array.isArray(tt.contato) ? tt.contato[0] : tt.contato;
      const canal = Array.isArray(tt.canal) ? tt.canal[0] : tt.canal;
      if (contato) {
        ticketSelFull = { ...tt, contato, canal: canal ?? null } as TicketSel;
      }
    }

    if (ticketSelFull) {
      const [{ data: msgs }, { data: tags }, { data: rap }, { data: us }] = await Promise.all([
        sb
          .from("mensagens")
          .select("id, autor, tipo, conteudo, transcricao, midia_url, midia_mime, status, created_at, usuario_id")
          .eq("ticket_id", ticketAbertoId)
          .order("created_at", { ascending: true })
          .limit(500),
        sb
          .from("contato_etiquetas")
          .select("etiqueta:etiquetas(id, nome, cor)")
          .eq("contato_id", ticketSelFull.contato.id),
        sb
          .from("mensagens_rapidas")
          .select("id, comando, conteudo")
          .eq("agencia_id", ctx.agenciaId)
          .or(`usuario_id.eq.${ctx.userId},global.eq.true`),
        sb.from("usuarios").select("id, nome").eq("agencia_id", ctx.agenciaId),
      ]);
      mensagens = (msgs || []) as typeof mensagens;
      etiquetas = ((tags || []) as unknown as Array<{ etiqueta: { id: string; nome: string; cor: string } | { id: string; nome: string; cor: string }[] | null }>)
        .map((e) => (Array.isArray(e.etiqueta) ? e.etiqueta[0] : e.etiqueta))
        .filter((e): e is { id: string; nome: string; cor: string } => !!e);
      mensagensRapidas = (rap || []) as typeof mensagensRapidas;
      userNomeMap = Object.fromEntries((us || []).map((u) => [u.id, u.nome]));
    }
  }

  return (
    <section style={{ display: "grid", gridTemplateColumns: ticketSelFull ? "340px 1fr 340px" : "340px 1fr", height: "calc(100vh - 80px)", minHeight: 0, gap: 0, background: "var(--mk-bg)" }}>
      {/* COLUNA 1 — Lista */}
      <aside style={{ borderRight: "0.5px solid var(--mk-border)", display: "flex", flexDirection: "column", minHeight: 0 }}>
        <div style={{ padding: "12px 14px", borderBottom: "0.5px solid var(--mk-border)" }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--mk-text)" }}>Atendimentos</h2>
          <form method="get" style={{ marginTop: 8 }}>
            <input name="q" defaultValue={sp.q || ""} placeholder="Buscar mensagem…" style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: "0.5px solid var(--mk-border)", background: "var(--mk-surface-2)", color: "var(--mk-text)", fontSize: 11.5 }} />
            <input type="hidden" name="tab" value={tab} />
          </form>
        </div>
        <div style={{ display: "flex", borderBottom: "0.5px solid var(--mk-border)" }}>
          {TABS.map((t) => (
            <Link
              key={t.id}
              href={`/atendimentos?tab=${t.id}`}
              style={{
                flex: 1,
                padding: "8px 6px",
                textAlign: "center",
                textDecoration: "none",
                background: tab === t.id ? "var(--mk-surface)" : "transparent",
                borderBottom: tab === t.id ? "2px solid var(--mk-accent)" : "2px solid transparent",
                color: tab === t.id ? "var(--mk-text)" : "var(--mk-text-muted)",
                fontSize: 11.5,
                fontWeight: 600,
              }}
            >
              {t.label} <span style={{ fontSize: 10, opacity: 0.7 }}>({counts[t.id]})</span>
            </Link>
          ))}
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {!tickets || tickets.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--mk-text-muted)", fontSize: 12 }}>Sem tickets.</div>
          ) : (
            tickets.map((t) => {
              const c = t.contato as unknown as { id: string; nome: string; whatsapp: string | null; foto_url: string | null } | null;
              const f = t.fila as unknown as { id: string; nome: string; cor: string } | null;
              const isOpen = t.id === ticketAbertoId;
              return (
                <Link
                  key={t.id}
                  href={`/atendimentos?tab=${tab}${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ""}&t=${t.id}`}
                  style={{
                    display: "flex",
                    gap: 10,
                    padding: "10px 14px",
                    borderBottom: "0.5px solid var(--mk-border)",
                    textDecoration: "none",
                    color: "var(--mk-text)",
                    background: isOpen ? "var(--mk-surface)" : "transparent",
                    borderLeft: isOpen ? "2px solid var(--mk-accent)" : "2px solid transparent",
                  }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(155,125,191,0.18)", color: "#9B7DBF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11.5, fontWeight: 600, flexShrink: 0 }}>
                    {c?.nome.slice(0, 2).toUpperCase() || "?"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <span style={{ fontSize: 12.5, fontWeight: 600, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c?.nome || c?.whatsapp || "—"}</span>
                      <span style={{ fontSize: 10, color: "var(--mk-text-muted)", fontFamily: "monospace" }}>#{t.numero}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--mk-text-muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {t.ultima_mensagem_preview || "—"}
                    </div>
                    <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                      {f && <span style={{ fontSize: 9.5, padding: "1px 5px", borderRadius: 3, background: `${f.cor}22`, color: f.cor, border: `0.5px solid ${f.cor}` }}>{f.nome}</span>}
                      {t.sentimento === "muito_bom" && <span style={{ fontSize: 9.5, color: "#6B8E4E" }}>● ótimo</span>}
                      {t.sentimento === "ruim" && <span style={{ fontSize: 9.5, color: "#C97064" }}>● ruim</span>}
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </aside>

      {/* COLUNA 2 — Chat */}
      <main style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
        {!ticketSelFull ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--mk-text-muted)", fontSize: 13 }}>
            <div style={{ textAlign: "center" }}>
              <i className="ti ti-messages" style={{ fontSize: 48, opacity: 0.5 }} />
              <div style={{ marginTop: 12 }}>Selecione um ticket à esquerda.</div>
            </div>
          </div>
        ) : tab === "pendente" ? (
          <PendingView ticketId={ticketSelFull.id} mensagens={mensagens} contatoNome={ticketSelFull.contato.nome} />
        ) : (
          <ChatView
            ticketId={ticketSelFull.id}
            canalId={ticketSelFull.canal?.id ?? null}
            canalConectado={ticketSelFull.canal?.status === "connected"}
            contatoNome={ticketSelFull.contato.nome}
            contatoNomeCurto={(ticketSelFull.contato.nome.slice(0, 2) || "?").toUpperCase()}
            mensagensIniciais={mensagens}
            mensagensRapidas={mensagensRapidas}
            userNomeMap={userNomeMap}
          />
        )}
      </main>

      {/* COLUNA 3 — Painel direito */}
      {ticketSelFull && (
        <aside style={{ borderLeft: "0.5px solid var(--mk-border)", display: "flex", flexDirection: "column", minHeight: 0 }}>
          <PainelDireito ticket={ticketSelFull} contato={ticketSelFull.contato} etiquetas={etiquetas} />
        </aside>
      )}
    </section>
  );
}

function PendingView({ ticketId, mensagens, contatoNome }: { ticketId: string; mensagens: Array<{ id: string; autor: string; tipo: string; conteudo: string | null; transcricao: string | null; created_at: string }>; contatoNome: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <div style={{ padding: "10px 14px", borderBottom: "0.5px solid var(--mk-border)", display: "flex", gap: 8, alignItems: "center" }}>
        <i className="ti ti-eye" style={{ color: "#C9A876" }} />
        <span style={{ fontSize: 13, fontWeight: 600 }}>Espiando — {contatoNome}</span>
        <form action={`/api/atendimentos/${ticketId}/atender`} method="post" style={{ marginLeft: "auto" }}>
          <button type="submit" className="cta-btn" style={{ fontSize: 11 }}>
            <i className="ti ti-arrow-narrow-right" /> Atender
          </button>
        </form>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 14, background: "var(--mk-surface-2)" }}>
        {mensagens.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--mk-text-muted)", fontSize: 12, padding: 40 }}>Sem mensagens.</div>
        ) : (
          mensagens.map((m) => (
            <div key={m.id} style={{ marginBottom: 8, padding: "8px 12px", borderRadius: 8, background: "var(--mk-surface)", border: "0.5px solid var(--mk-border)", fontSize: 12, color: "var(--mk-text)" }}>
              <div style={{ fontSize: 10, color: "var(--mk-text-muted)", marginBottom: 2 }}>{m.autor} · {new Date(m.created_at).toLocaleString("pt-BR")}</div>
              {m.conteudo || m.transcricao || `[${m.tipo}]`}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
