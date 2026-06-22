"use client";

import { useState, useMemo, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { RelatorioFormBalao, type RelatorioForm } from "./_form-balao";
import { alternarAtivoRelatorio, deletarRelatorio } from "./_actions";

interface LinhaRelatorio {
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
  recebedor: string;
  proximoFmt: string;
}

interface Opcao { id: string; nome: string; }

type FiltroStatus = "todos" | "ativos" | "inativos";

const FREQ_LABEL: Record<string, string> = { diario: "Diário", semanal: "Semanal", mensal: "Mensal" };

export function RelatoriosClient({
  lista, clientes, canais, abrirNovo, editarId,
}: {
  lista: LinhaRelatorio[];
  clientes: Opcao[];
  canais: Opcao[];
  abrirNovo: boolean;
  editarId: string | null;
}) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState<FiltroStatus>("todos");
  const [aberto, setAberto] = useState<RelatorioForm | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (abrirNovo) {
      setAberto({
        nome: "", cliente_id: null, telefone_destino: null, canal_id: null,
        plataforma: "meta_ads", frequencia: "semanal", dia_semana: 1, dia_mes: 1,
        hora_envio: "09:00", formato: "pdf", periodo_dias: 7,
      });
    } else if (editarId) {
      const found = lista.find((l) => l.id === editarId);
      if (found) {
        setAberto({
          id: found.id, nome: found.nome,
          cliente_id: found.cliente_id, telefone_destino: found.telefone_destino,
          canal_id: found.canal_id, plataforma: found.plataforma,
          frequencia: found.frequencia, dia_semana: found.dia_semana,
          dia_mes: found.dia_mes, hora_envio: found.hora_envio,
          formato: found.formato, periodo_dias: found.periodo_dias,
        });
      }
    } else {
      setAberto(null);
    }
  }, [abrirNovo, editarId, lista]);

  const filtrada = useMemo(() => {
    return lista.filter((l) => {
      if (status === "ativos" && !l.ativo) return false;
      if (status === "inativos" && l.ativo) return false;
      if (busca) {
        const q = busca.toLowerCase();
        if (!l.nome.toLowerCase().includes(q) && !l.recebedor.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [lista, status, busca]);

  function abrirNovoLocal() {
    setAberto({
      nome: "", cliente_id: null, telefone_destino: null, canal_id: null,
      plataforma: "meta_ads", frequencia: "semanal", dia_semana: 1, dia_mes: 1,
      hora_envio: "09:00", formato: "pdf", periodo_dias: 7,
    });
  }

  function fechar() {
    setAberto(null);
    if (abrirNovo || editarId) router.replace("/relatorios");
  }

  function toggle(id: string, atual: boolean) {
    startTransition(async () => {
      await alternarAtivoRelatorio(id, !atual);
      router.refresh();
    });
  }

  function deletar(id: string, nome: string) {
    if (!confirm(`Deletar relatório "${nome}"?`)) return;
    startTransition(async () => {
      await deletarRelatorio(id);
    });
  }

  async function enviarAgora(id: string, nome: string) {
    if (!confirm(`Enviar "${nome}" agora?`)) return;
    startTransition(async () => {
      try {
        const r = await fetch(`/api/relatorios/${id}/enviar-agora`, { method: "POST" });
        const j = await r.json();
        if (!r.ok) {
          alert(`Falhou: ${j.error || "erro desconhecido"}`);
        } else {
          alert(`Despachado. Enviados: ${j.enviados}, falhas: ${j.falhas}`);
        }
        router.refresh();
      } catch (e) {
        alert("Erro de rede: " + (e instanceof Error ? e.message : String(e)));
      }
    });
  }

  return (
    <>
      {/* Toolbar */}
      <div className="mk-card" style={{ padding: "12px 14px", borderRadius: 12, marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "var(--mk-surface-2)", border: "0.5px solid var(--mk-border)",
            borderRadius: 9, padding: "8px 12px", flex: "1 1 240px", maxWidth: 320,
          }}>
            <i className="ti ti-search" style={{ fontSize: 14, color: "var(--mk-text-muted)" }} />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar relatório…"
              style={{ background: "transparent", border: 0, outline: 0, color: "var(--mk-text)", fontSize: 13, flex: 1, fontFamily: "inherit" }}
            />
          </div>

          <div data-chip-strip style={{ display: "flex", gap: 6 }}>
            {([
              { v: "todos", l: `Todos ${lista.length}` },
              { v: "ativos", l: `Ativos ${lista.filter((l) => l.ativo).length}` },
              { v: "inativos", l: `Inativos ${lista.filter((l) => !l.ativo).length}` },
            ] as { v: FiltroStatus; l: string }[]).map((opt) => {
              const a = status === opt.v;
              return (
                <button key={opt.v} onClick={() => setStatus(opt.v)} style={{
                  fontSize: 12, fontWeight: a ? 700 : 500,
                  color: a ? "#fff" : "var(--mk-text-secondary)",
                  background: a ? "rgba(16,185,129,0.16)" : "var(--mk-surface-2)",
                  border: a ? "0.5px solid rgba(52,211,153,0.4)" : "0.5px solid var(--mk-border)",
                  borderRadius: 8, padding: "6px 11px", cursor: "pointer", whiteSpace: "nowrap",
                }}>
                  {opt.l}
                </button>
              );
            })}
          </div>

          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button onClick={abrirNovoLocal} className="cta-btn">
              <i className="ti ti-plus" style={{ fontSize: 14, marginRight: 5 }} />
              Criar Relatório
            </button>
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="mk-card" style={{ borderRadius: 13, padding: 0, overflow: "hidden" }}>
        {filtrada.length === 0 ? (
          <div style={{ padding: "48px 22px", textAlign: "center", color: "var(--mk-text-muted)", fontSize: 13 }}>
            <i className="ti ti-clipboard-off" style={{ fontSize: 30, opacity: 0.5, display: "block", marginBottom: 8 }} />
            {lista.length === 0
              ? "Nenhum relatório agendado ainda. Clique em \"Criar Relatório\" pra começar."
              : "Nenhum relatório bate com o filtro atual."}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "0.5px solid var(--mk-border)" }}>
                  <Th style={{ width: 80 }}>Status</Th>
                  <Th>Nome</Th>
                  <Th>Recebedor</Th>
                  <Th style={{ width: 110 }}>Plataforma</Th>
                  <Th style={{ width: 100 }}>Frequência</Th>
                  <Th style={{ width: 160 }}>Próximo envio</Th>
                  <Th style={{ width: 90 }}>Ações</Th>
                </tr>
              </thead>
              <tbody>
                {filtrada.map((r) => (
                  <tr key={r.id} style={{ borderBottom: "0.5px solid var(--mk-border)", opacity: r.ativo ? 1 : 0.55 }}>
                    <Td>
                      <button
                        onClick={() => toggle(r.id, r.ativo)}
                        disabled={pending}
                        title={r.ativo ? "Desativar" : "Ativar"}
                        style={{
                          width: 38, height: 22, borderRadius: 14, padding: 0,
                          background: r.ativo ? "var(--mk-accent)" : "rgba(255,255,255,0.15)",
                          border: 0, position: "relative", cursor: "pointer",
                        }}>
                        <span style={{
                          position: "absolute", top: 2, left: r.ativo ? "auto" : 2, right: r.ativo ? 2 : "auto",
                          width: 18, height: 18, borderRadius: "50%",
                          background: r.ativo ? "#fff" : "#888",
                          transition: "all 0.16s",
                        }} />
                      </button>
                    </Td>
                    <Td style={{ fontWeight: 700, color: "var(--mk-text)" }}>{r.nome}</Td>
                    <Td style={{ color: "var(--mk-text-secondary)" }}>{r.recebedor}</Td>
                    <Td>
                      {r.plataforma === "meta_ads"
                        ? <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><i className="ti ti-brand-meta" style={{ fontSize: 16, color: "#1877F2" }} />Meta</span>
                        : <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><i className="ti ti-brand-google" style={{ fontSize: 16, color: "#EA4335" }} />Google</span>}
                    </Td>
                    <Td style={{ color: "var(--mk-text-secondary)" }}>{FREQ_LABEL[r.frequencia]}</Td>
                    <Td style={{ color: r.ativo ? "var(--mk-accent-2)" : "var(--mk-text-muted)", fontWeight: r.ativo ? 700 : 400 }}>
                      {r.ativo ? r.proximoFmt : "Inativo"}
                    </Td>
                    <Td>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button onClick={() => enviarAgora(r.id, r.nome)}
                          title="Enviar agora"
                          disabled={!r.ativo || pending}
                          style={{ ...btnAcao, opacity: r.ativo ? 1 : 0.4 }}>
                          <i className="ti ti-send" style={{ fontSize: 14 }} />
                        </button>
                        <button onClick={() => router.push(`/relatorios?editar=${r.id}`)}
                          title="Editar"
                          style={btnAcao}>
                          <i className="ti ti-adjustments-horizontal" style={{ fontSize: 14 }} />
                        </button>
                        <button onClick={() => deletar(r.id, r.nome)}
                          title="Deletar"
                          style={{ ...btnAcao, color: "#FB7185" }}>
                          <i className="ti ti-trash" style={{ fontSize: 14 }} />
                        </button>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ marginTop: 12, fontSize: 11.5, color: "var(--mk-text-muted)", textAlign: "center" }}>
        Mostrando {filtrada.length} de {lista.length} registros
      </div>

      {aberto && (
        <RelatorioFormBalao
          open={!!aberto}
          onClose={fechar}
          inicial={aberto}
          clientes={clientes}
          canais={canais}
        />
      )}
    </>
  );
}

const thStyle: React.CSSProperties = {
  fontSize: 10.5, fontWeight: 700, letterSpacing: 0.6, color: "var(--mk-text-muted)",
  textTransform: "uppercase", textAlign: "left", padding: "11px 14px",
};
const tdStyle: React.CSSProperties = { padding: "14px", fontSize: 13 };
const btnAcao: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  width: 30, height: 30, borderRadius: 7,
  background: "var(--mk-surface-2)", border: "0.5px solid var(--mk-border)",
  color: "var(--mk-accent-2)", cursor: "pointer",
};

function Th({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <th style={{ ...thStyle, ...style }}>{children}</th>;
}
function Td({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <td style={{ ...tdStyle, ...style }}>{children}</td>;
}
