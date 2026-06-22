import { requireUserWithAgencia } from "@/lib/auth";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { RelatoriosClient } from "./_client";

export const dynamic = "force-dynamic";

interface SP {
  novo?: string;
  editar?: string;
  ok?: string;
  erro?: string;
}

interface RelatorioRow {
  id: string;
  nome: string;
  cliente_id: string | null;
  telefone_destino: string | null;
  canal_id: string | null;
  plataforma: "meta_ads" | "google_ads";
  frequencia: "diario" | "semanal" | "mensal";
  dia_semana: number | null;
  dia_mes: number | null;
  hora_envio: string;
  formato: "pdf" | "imagem" | "texto";
  periodo_dias: number;
  ativo: boolean;
  proximo_envio: string | null;
  ultimo_envio: string | null;
  ultimo_status: string | null;
  created_at: string;
}

export default async function RelatoriosPage({ searchParams }: { searchParams: Promise<SP> }) {
  const { supabase, usuario } = await requireUserWithAgencia();
  const sp = await searchParams;

  const [{ data: rels }, { data: clientes }, { data: canais }] = await Promise.all([
    supabase
      .from("relatorios_agendados")
      .select("*")
      .eq("agencia_id", usuario.agencia_id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("clientes")
      .select("id, nome")
      .eq("agencia_id", usuario.agencia_id)
      .is("deleted_at", null)
      .order("nome"),
    supabase
      .from("canais")
      .select("id, nome")
      .eq("agencia_id", usuario.agencia_id)
      .order("nome"),
  ]);

  const relatorios = (rels || []) as RelatorioRow[];
  const ativos = relatorios.filter((r) => r.ativo).length;
  const total = relatorios.length;

  const clientesMap = new Map((clientes || []).map((c) => [c.id, c.nome]));

  const lista = relatorios.map((r) => ({
    ...r,
    recebedor:
      r.cliente_id && clientesMap.get(r.cliente_id)
        ? (clientesMap.get(r.cliente_id) as string)
        : (r.telefone_destino || "—"),
    proximoFmt: r.proximo_envio
      ? format(new Date(r.proximo_envio), "dd/MMM · HH:mm", { locale: ptBR })
      : "—",
  }));

  return (
    <section className="mk-page">
      <div className="mk-page-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="mk-eyebrow">Tráfego (Ads) · Automação</div>
          <h1 className="mk-page-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <i className="ti ti-clipboard-list" style={{ fontSize: 22, color: "var(--mk-accent-2)" }} />
            Relatórios
            {total > 0 && (
              <span style={{
                fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: "var(--mk-accent-2)",
                background: "rgba(16,185,129,0.12)", border: "0.5px solid rgba(52,211,153,0.32)",
                borderRadius: 7, padding: "3px 9px",
              }}>
                {total} REGISTROS · {ativos} ATIVOS
              </span>
            )}
          </h1>
          <p className="mk-page-sub">Agende envios automáticos de relatório para clientes via WhatsApp.</p>
        </div>
      </div>

      {sp.ok && (
        <div style={{ marginBottom: 14, padding: "10px 14px", background: "rgba(16,185,129,0.1)", border: "0.5px solid rgba(52,211,153,0.32)", borderRadius: 10, fontSize: 13, color: "var(--mk-accent-2)" }}>
          <i className="ti ti-circle-check" style={{ marginRight: 6 }} />
          Relatório {sp.ok === "criado" ? "criado" : sp.ok === "atualizado" ? "atualizado" : "deletado"} com sucesso.
        </div>
      )}
      {sp.erro && (
        <div style={{ marginBottom: 14, padding: "10px 14px", background: "rgba(201,112,100,0.12)", border: "0.5px solid rgba(201,112,100,0.4)", borderRadius: 10, fontSize: 13, color: "#FB7185" }}>
          <i className="ti ti-alert-triangle" style={{ marginRight: 6 }} />
          {decodeURIComponent(sp.erro)}
        </div>
      )}

      <RelatoriosClient
        lista={lista}
        clientes={(clientes || []) as { id: string; nome: string }[]}
        canais={(canais || []) as { id: string; nome: string }[]}
        abrirNovo={sp.novo === "1"}
        editarId={sp.editar || null}
      />
    </section>
  );
}
