import Link from "next/link";
import { requireAuth } from "@/lib/crm/permissions";
import { createServiceClient } from "@/lib/supabase/service";
import { ChatView } from "./_chat";
import { PainelDireito } from "./_painel";
import { AtenderBotao } from "./_atender-btn";
import { AtendimentosRefresh } from "./_refresh";
import { ListaAtendimentos } from "./_lista";

interface PageProps {
  searchParams: Promise<{ tab?: string; t?: string; q?: string; canal?: string; detalhes?: string }>;
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

  // Counts (respeitam filtro de canal)
  const counts: Record<string, number> = { aberto: 0, pendente: 0, fechado: 0 };
  for (const t of TABS) {
    let cq = sb
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .eq("agencia_id", ctx.agenciaId)
      .eq("status", t.id);
    if (sp.canal && sp.canal !== "todos") cq = cq.eq("canal_id", sp.canal);
    const { count } = await cq;
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
  if (sp.canal && sp.canal !== "todos") {
    q = q.eq("canal_id", sp.canal);
  }
  const { data: tickets } = await q;

  // Canais ativos pra dropdown filtro
  const { data: canaisAtivos } = await sb
    .from("canais")
    .select("id, nome, status, numero_conectado, nome_perfil")
    .eq("agencia_id", ctx.agenciaId)
    .order("nome");

  // Filas/Usuarios pra modal transferir
  const [{ data: filasAll }, { data: usuariosAll }] = await Promise.all([
    sb.from("filas").select("id, nome, cor").eq("agencia_id", ctx.agenciaId).eq("ativa", true).order("nome"),
    sb.from("usuarios").select("id, nome").eq("agencia_id", ctx.agenciaId).eq("ativo", true).is("deleted_at", null).order("nome"),
  ]);

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
    valor_fechado: number | null;
    metadata: { servico?: string; quantidade?: number } | null;
    fila_id: string | null;
    usuario_id: string | null;
    contato: { id: string; nome: string; whatsapp: string | null; ia_habilitada: boolean; email?: string | null; empresa?: string | null; cidade?: string | null; estado?: string | null; cpf?: string | null };
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
  let etiquetas: Array<{ id: string; nome: string; cor: string; categoria: "etiqueta" | "flag" }> = [];
  let todasEtiquetas: Array<{ id: string; nome: string; cor: string; categoria: "etiqueta" | "flag" }> = [];
  let mensagensRapidas: Array<{ id: string; comando: string; conteudo: string }> = [];
  let userNomeMap: Record<string, string> = {};
  let servicosLista: Array<{ id: string; nome: string }> = [];
  let servicosHabilitados = false;
  let ticketSelFull: TicketSel | null = null;

  if (ticketAbertoId) {
    const { data: t } = await sb
      .from("tickets")
      .select("id, numero, sentimento, sentimento_confianca, sentimento_motivo, resumo, resumo_atualizado_em, valor_fechado, metadata, fila_id, usuario_id, contato:contatos(id, nome, whatsapp, ia_habilitada, email, empresa, cidade, estado, cpf), canal:canais(id, nome, status)")
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
      const [{ data: msgs }, { data: tags }, { data: rap }, { data: us }, { data: todasTagsAg }, { data: servicosRows }, { data: agRow }] = await Promise.all([
        sb
          .from("mensagens")
          .select("id, autor, tipo, conteudo, transcricao, midia_url, midia_mime, status, created_at, usuario_id")
          .eq("ticket_id", ticketAbertoId)
          .order("created_at", { ascending: true })
          .limit(500),
        sb
          .from("contato_etiquetas")
          .select("etiqueta:etiquetas(id, nome, cor, categoria)")
          .eq("contato_id", ticketSelFull.contato.id),
        sb
          .from("mensagens_rapidas")
          .select("id, comando, conteudo")
          .eq("agencia_id", ctx.agenciaId)
          .or(`usuario_id.eq.${ctx.userId},global.eq.true`),
        sb.from("usuarios").select("id, nome").eq("agencia_id", ctx.agenciaId),
        sb.from("etiquetas").select("id, nome, cor, categoria").eq("agencia_id", ctx.agenciaId).order("nome"),
        sb.from("servicos").select("id, nome").eq("agencia_id", ctx.agenciaId).eq("ativo", true).order("nome"),
        sb.from("agencias").select("servicos_habilitados").eq("id", ctx.agenciaId).single(),
      ]);
      servicosLista = (servicosRows || []) as Array<{ id: string; nome: string }>;
      servicosHabilitados = !!(agRow as { servicos_habilitados?: boolean } | null)?.servicos_habilitados;
      todasEtiquetas = (todasTagsAg || []) as Array<{ id: string; nome: string; cor: string; categoria: "etiqueta" | "flag" }>;
      mensagens = (msgs || []) as typeof mensagens;
      etiquetas = ((tags || []) as unknown as Array<{ etiqueta: { id: string; nome: string; cor: string; categoria: "etiqueta" | "flag" } | { id: string; nome: string; cor: string; categoria: "etiqueta" | "flag" }[] | null }>)
        .map((e) => (Array.isArray(e.etiqueta) ? e.etiqueta[0] : e.etiqueta))
        .filter((e): e is { id: string; nome: string; cor: string; categoria: "etiqueta" | "flag" } => !!e);
      mensagensRapidas = (rap || []) as typeof mensagensRapidas;
      userNomeMap = Object.fromEntries((us || []).map((u) => [u.id, u.nome]));
    }
  }

  return (
    <section style={{ display: "grid", gridTemplateColumns: "340px 1fr", height: "calc(100vh - 60px)", minHeight: 0, gap: 0, background: "var(--mk-bg)", position: "relative", overflow: "hidden", margin: "-12px -28px -30px", border: "0.5px solid var(--mk-border)" }}>
      <AtendimentosRefresh />
      {/* COLUNA 1 — Lista (nova versão ZPRO style) */}
      <div style={{ borderRight: "0.5px solid var(--mk-border)", display: "flex", flexDirection: "column", minHeight: 0 }}>
        <ListaAtendimentos
          tab={tab}
          ticketSel={sp.t}
          q={sp.q}
          canal={sp.canal}
          tickets={(tickets || []).map((t) => ({
            id: t.id,
            numero: t.numero,
            status: t.status,
            ultima_mensagem_em: t.ultima_mensagem_em,
            ultima_mensagem_preview: t.ultima_mensagem_preview,
            sentimento: t.sentimento,
            contato: (Array.isArray(t.contato) ? t.contato[0] : t.contato) as { id: string; nome: string; whatsapp: string | null; foto_url: string | null } | null,
            canal: (Array.isArray(t.canal) ? t.canal[0] : t.canal) as { id: string; nome: string; status: string; instance_id: string | null } | null,
            fila: (Array.isArray(t.fila) ? t.fila[0] : t.fila) as { id: string; nome: string; cor: string } | null,
          }))}
          canais={(canaisAtivos || []).map((c) => ({ id: c.id, nome: c.nome, status: c.status, numero_conectado: c.numero_conectado }))}
          counts={counts}
        />
      </div>
      <aside style={{ display: "none" }}>
        <div style={{ padding: "12px 14px", borderBottom: "0.5px solid var(--mk-border)" }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--mk-text)" }}>Atendimentos</h2>
          <form method="get" style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
            <select name="canal" defaultValue={sp.canal || "todos"} style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: "0.5px solid var(--mk-border)", background: "var(--mk-surface-2)", color: "var(--mk-text)", fontSize: 11.5 }}>
              <option value="todos">📥 Todos canais ({canaisAtivos?.length || 0})</option>
              {canaisAtivos?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.status === "connected" ? "● " : "○ "}
                  {c.nome}
                  {c.numero_conectado ? ` · ${c.numero_conectado}` : ""}
                </option>
              ))}
            </select>
            <input name="q" defaultValue={sp.q || ""} placeholder="Buscar mensagem…" style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: "0.5px solid var(--mk-border)", background: "var(--mk-surface-2)", color: "var(--mk-text)", fontSize: 11.5 }} />
            <input type="hidden" name="tab" value={tab} />
            <button type="submit" className="ghost-btn" style={{ fontSize: 11 }}><i className="ti ti-filter" /> Aplicar</button>
          </form>
        </div>
        <div style={{ display: "flex", borderBottom: "0.5px solid var(--mk-border)" }}>
          {TABS.map((t) => (
            <Link
              key={t.id}
              href={`/atendimentos?tab=${t.id}${sp.canal && sp.canal !== "todos" ? `&canal=${sp.canal}` : ""}`}
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
                  href={`/atendimentos?tab=${tab}${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ""}${sp.canal && sp.canal !== "todos" ? `&canal=${sp.canal}` : ""}&t=${t.id}`}
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

      {/* COLUNA 2 — Chat (margem dinâmica pro painel direito) */}
      <main
        style={{
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          marginRight: ticketSelFull && sp.detalhes !== "0" ? 340 : 0,
          transition: "margin-right 280ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {!ticketSelFull ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--mk-text-muted)", fontSize: 13 }}>
            <div style={{ textAlign: "center" }}>
              <i className="ti ti-messages" style={{ fontSize: 48, opacity: 0.5 }} />
              <div style={{ marginTop: 12 }}>Selecione um ticket à esquerda.</div>
            </div>
          </div>
        ) : tab === "pendente" ? (
          <PendingView ticketId={ticketSelFull.id} mensagens={mensagens} contatoNome={ticketSelFull.contato.nome} />
        ) : (() => {
          const detalhesAbertos = sp.detalhes !== "0";
          // Toggle URL: mantém tudo e flipa detalhes
          const params = new URLSearchParams();
          params.set("tab", tab);
          if (sp.q) params.set("q", sp.q);
          if (sp.canal && sp.canal !== "todos") params.set("canal", sp.canal);
          params.set("t", ticketSelFull.id);
          if (detalhesAbertos) params.set("detalhes", "0");
          const urlToggleDetalhes = `/atendimentos?${params.toString()}`;
          const filaNome = ticketSelFull.fila_id ? (filasAll || []).find((f) => f.id === ticketSelFull!.fila_id)?.nome : null;
          const userNome = ticketSelFull.usuario_id ? userNomeMap[ticketSelFull.usuario_id] : null;
          return (
            <ChatView
              ticketId={ticketSelFull.id}
              ticketNumero={ticketSelFull.numero}
              canalId={ticketSelFull.canal?.id ?? null}
              canalConectado={ticketSelFull.canal?.status === "connected"}
              contatoNome={ticketSelFull.contato.nome}
              contatoNomeCurto={(ticketSelFull.contato.nome.slice(0, 2) || "?").toUpperCase()}
              contatoTelefone={ticketSelFull.contato.whatsapp}
              filaAtualNome={filaNome}
              usuarioAtualNome={userNome}
              filas={(filasAll || []) as Array<{ id: string; nome: string; cor?: string | null }>}
              usuarios={(usuariosAll || []) as Array<{ id: string; nome: string }>}
              canais={(canaisAtivos || []) as Array<{ id: string; nome: string; status: string; numero_conectado?: string | null }>}
              detalhesAbertos={detalhesAbertos}
              urlToggleDetalhes={urlToggleDetalhes}
              mensagensIniciais={mensagens}
              mensagensRapidas={mensagensRapidas}
              userNomeMap={userNomeMap}
            />
          );
        })()}
      </main>

      {/* COLUNA 3 — Painel direito (slide animado) */}
      {ticketSelFull && (
        <aside
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            width: 340,
            borderLeft: "0.5px solid var(--mk-border)",
            display: "flex",
            flexDirection: "column",
            background: "var(--mk-bg)",
            transform: sp.detalhes === "0" ? "translateX(100%)" : "translateX(0)",
            opacity: sp.detalhes === "0" ? 0 : 1,
            transition: "transform 280ms cubic-bezier(0.4, 0, 0.2, 1), opacity 220ms",
            boxShadow: sp.detalhes === "0" ? "none" : "-4px 0 12px rgba(0,0,0,0.08)",
            zIndex: 10,
          }}
        >
          <PainelDireito ticket={ticketSelFull} contato={ticketSelFull.contato} etiquetas={etiquetas} todasEtiquetas={todasEtiquetas} servicos={servicosLista} servicosHabilitados={servicosHabilitados} />
        </aside>
      )}
    </section>
  );
}

function PendingView({ ticketId, mensagens, contatoNome }: { ticketId: string; mensagens: Array<{ id: string; autor: string; tipo: string; conteudo: string | null; transcricao: string | null; midia_url?: string | null; created_at: string }>; contatoNome: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <div style={{ padding: "10px 14px", borderBottom: "0.5px solid var(--mk-border)", display: "flex", gap: 8, alignItems: "center" }}>
        <i className="ti ti-eye" style={{ color: "#C9A876" }} />
        <span style={{ fontSize: 13, fontWeight: 600 }}>Espiando — {contatoNome}</span>
        <div style={{ marginLeft: "auto" }}>
          <AtenderBotao ticketId={ticketId} />
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px", background: "var(--mk-surface-2)", display: "flex", flexDirection: "column", gap: 10 }}>
        {mensagens.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--mk-text-muted)", fontSize: 12, padding: 40 }}>Sem mensagens.</div>
        ) : (
          mensagens.map((m) => (
            <div key={m.id} style={{ display: "flex", justifyContent: m.autor === "cliente" ? "flex-start" : "flex-end" }}>
              <div
                style={{
                  maxWidth: "72%",
                  padding: "8px 12px",
                  borderRadius: 10,
                  background: m.autor === "cliente" ? "var(--mk-surface)" : "rgba(155,125,191,0.18)",
                  border: "0.5px solid var(--mk-border)",
                  color: "var(--mk-text)",
                  fontSize: 12.5,
                  lineHeight: 1.5,
                  whiteSpace: "pre-wrap",
                }}
              >
                <div style={{ fontSize: 9.5, fontWeight: 600, color: m.autor === "cliente" ? "#9B7DBF" : "#5B8BA6", marginBottom: 3 }}>
                  {m.autor === "cliente" ? contatoNome : "Atendente"}
                </div>
                {m.tipo === "audio" ? (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--mk-text-secondary)", fontSize: 12 }}>
                      <i className="ti ti-microphone" /> Áudio
                    </div>
                    {m.transcricao && (
                      <div style={{ marginTop: 6, fontSize: 11, color: "var(--mk-text-muted)", fontStyle: "italic", borderLeft: "2px solid var(--mk-accent)", paddingLeft: 6 }}>
                        <div style={{ fontSize: 9.5, color: "var(--mk-accent)", fontWeight: 600, letterSpacing: 0.5, marginBottom: 2 }}>📝 TRANSCRIÇÃO</div>
                        {m.transcricao}
                      </div>
                    )}
                  </>
                ) : (
                  m.conteudo || m.transcricao || `[${m.tipo}]`
                )}
                <div style={{ fontSize: 9.5, color: "var(--mk-text-muted)", marginTop: 4, textAlign: "right" }}>
                  {new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
