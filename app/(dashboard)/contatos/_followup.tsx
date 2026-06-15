"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface FollowUpAvulsoRow {
  id: string;
  agenda_em: string;
  mensagens: Array<{ texto: string }>;
  intervalos_seg: number[];
  status: "agendado" | "enviado" | "cancelado" | "respondido" | "falha";
  motivo: string | null;
  enviado_em: string | null;
}

interface Props {
  contatoId: string;
  agendados: FollowUpAvulsoRow[];
  historico: FollowUpAvulsoRow[];
  temConversa: boolean;
}

const MIN_GAP = 2;

function isoMin(addMin: number) {
  const d = new Date(Date.now() + addMin * 60_000);
  // ajusta pro fuso local pra <input type="datetime-local">
  const off = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}

function fmtBR(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function FollowUpAvulsoBloco({ contatoId, agendados, historico, temConversa }: Props) {
  const router = useRouter();
  const [qtd, setQtd] = useState<1 | 2 | 3>(1);
  const [textos, setTextos] = useState<string[]>(["", "", ""]);
  const [gaps, setGaps] = useState<number[]>([2, 2]);
  const [agenda, setAgenda] = useState<string>(isoMin(15));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  function setTexto(i: number, v: string) {
    setTextos((t) => { const c = [...t]; c[i] = v; return c; });
  }
  function setGap(i: number, v: number) {
    setGaps((g) => { const c = [...g]; c[i] = Math.max(MIN_GAP, Math.floor(v) || MIN_GAP); return c; });
  }

  async function agendar() {
    setErro(null); setOk(null);
    const msgs = textos.slice(0, qtd).map((t) => ({ texto: t.trim() })).filter((m) => m.texto);
    if (msgs.length !== qtd) { setErro("Preencha todas as mensagens."); return; }
    if (!agenda) { setErro("Escolha data e hora."); return; }
    setSalvando(true);
    try {
      const r = await fetch(`/api/contatos/${contatoId}/follow-up-avulso`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          agendaEm: new Date(agenda).toISOString(),
          mensagens: msgs,
          intervalosSeg: gaps.slice(0, qtd - 1),
        }),
      });
      const j = await r.json();
      if (!r.ok) {
        setErro(j.motivo || labelErro(j.error) || "Falha ao agendar.");
        setSalvando(false);
        return;
      }
      setOk("Follow-up agendado.");
      setTextos(["", "", ""]);
      setQtd(1);
      setAgenda(isoMin(15));
      router.refresh();
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    }
    setSalvando(false);
  }

  async function cancelar(id: string) {
    if (!confirm("Cancelar este follow-up?")) return;
    const r = await fetch(`/api/contatos/${contatoId}/follow-up-avulso/${id}/cancelar`, { method: "POST" });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      alert(`Falha: ${j.error || r.statusText}`);
      return;
    }
    router.refresh();
  }

  return (
    <div style={{ borderTop: "0.5px solid var(--mk-border)", paddingTop: 14 }}>
      <label style={lblMono}>Follow-up agendado</label>

      {!temConversa && (
        <div style={aviso("#f59e0b")}>
          <i className="ti ti-alert-triangle" /> Esse contato ainda não tem conversa aberta. Inicie um atendimento primeiro pra agendar.
        </div>
      )}

      {temConversa && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, background: "var(--mk-surface)", border: "0.5px solid var(--mk-border)", borderRadius: 10, padding: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={lblMono}>Quando disparar</label>
              <input
                type="datetime-local"
                value={agenda}
                min={isoMin(2)}
                onChange={(e) => setAgenda(e.target.value)}
                style={inp}
              />
            </div>
            <div>
              <label style={lblMono}>Quantas mensagens</label>
              <div style={{ display: "flex", gap: 6 }}>
                {[1, 2, 3].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setQtd(n as 1 | 2 | 3)}
                    className={qtd === n ? "cta-btn" : "ghost-btn"}
                    style={{ flex: 1, fontSize: 12, padding: "8px 0" }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {Array.from({ length: qtd }).map((_, i) => (
            <div key={i}>
              <label style={lblMono}>Mensagem {i + 1}</label>
              <textarea
                rows={2}
                value={textos[i]}
                onChange={(e) => setTexto(i, e.target.value)}
                placeholder={`Texto da mensagem ${i + 1}`}
                style={{ ...inp, resize: "vertical", minHeight: 50 }}
              />
              {i < qtd - 1 && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 4px", color: "var(--mk-text-muted)", fontSize: 11.5 }}>
                  <i className="ti ti-arrow-down" />
                  <span>Aguardar</span>
                  <input
                    type="number"
                    min={MIN_GAP}
                    value={gaps[i]}
                    onChange={(e) => setGap(i, Number(e.target.value))}
                    style={{ width: 70, padding: "4px 8px", borderRadius: 6, border: "0.5px solid var(--mk-border)", background: "var(--mk-surface-2)", color: "var(--mk-text)", fontSize: 12 }}
                  />
                  <span>segundos antes da próxima (mín {MIN_GAP}s)</span>
                </div>
              )}
            </div>
          ))}

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button type="button" onClick={agendar} disabled={salvando} className="cta-btn" style={{ fontSize: 12 }}>
              <i className="ti ti-calendar-plus" /> {salvando ? "Agendando…" : "Agendar follow-up"}
            </button>
            <span style={{ fontSize: 10.5, color: "var(--mk-text-muted)" }}>
              <i className="ti ti-info-circle" style={{ marginRight: 4 }} />
              Cancela automático se o cliente enviar mensagem antes do disparo.
            </span>
          </div>

          {erro && <div style={aviso("#C97064")}><i className="ti ti-alert-triangle" /> {erro}</div>}
          {ok && <div style={aviso("#10b981")}><i className="ti ti-circle-check" /> {ok}</div>}
        </div>
      )}

      {agendados.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <label style={lblMono}>Agendados</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {agendados.map((a) => (
              <CardFollowUp key={a.id} fua={a} onCancelar={() => cancelar(a.id)} />
            ))}
          </div>
        </div>
      )}

      {historico.length > 0 && (
        <details style={{ marginTop: 12 }}>
          <summary style={{ cursor: "pointer", fontSize: 11, color: "var(--mk-text-muted)", fontFamily: "monospace" }}>
            Histórico ({historico.length})
          </summary>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
            {historico.map((a) => <CardFollowUp key={a.id} fua={a} />)}
          </div>
        </details>
      )}
    </div>
  );
}

function CardFollowUp({ fua, onCancelar }: { fua: FollowUpAvulsoRow; onCancelar?: () => void }) {
  const cor = corStatus(fua.status);
  return (
    <div style={{ padding: "8px 12px", borderLeft: `3px solid ${cor}`, background: "var(--mk-surface)", borderRadius: 6, fontSize: 12 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 10.5, padding: "2px 8px", borderRadius: 999, background: `${cor}22`, color: cor, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.3 }}>{fua.status}</span>
          <span style={{ color: "var(--mk-text)" }}>{fmtBR(fua.agenda_em)}</span>
          <span style={{ fontSize: 10.5, color: "var(--mk-text-muted)" }}>· {fua.mensagens.length} msg</span>
        </div>
        {onCancelar && fua.status === "agendado" && (
          <button type="button" onClick={onCancelar} className="ghost-btn" style={{ fontSize: 11, padding: "4px 10px" }}>
            <i className="ti ti-x" /> Cancelar
          </button>
        )}
      </div>
      {fua.motivo && <div style={{ fontSize: 10.5, color: "var(--mk-text-muted)", marginTop: 4 }}>{fua.motivo}</div>}
    </div>
  );
}

function corStatus(s: FollowUpAvulsoRow["status"]) {
  return {
    agendado: "#3b82f6",
    enviado: "#10b981",
    cancelado: "#94a3b8",
    respondido: "#f59e0b",
    falha: "#C97064",
  }[s];
}

function labelErro(k?: string) {
  return ({
    sem_canal: "Contato sem conversa aberta. Inicie um atendimento primeiro.",
    canal_desconectado: "Canal desconectado.",
    agenda_no_passado: "Data/hora já passaram.",
    agenda_invalida: "Data/hora inválida.",
    mensagem_vazia: "Pelo menos uma mensagem precisa ter texto.",
  } as Record<string, string>)[k || ""] || k || null;
}

const lblMono: React.CSSProperties = { display: "block", fontSize: 11, color: "var(--mk-text-muted)", marginBottom: 4, fontFamily: "monospace" };
const inp: React.CSSProperties = { width: "100%", padding: "8px 12px", borderRadius: 8, border: "0.5px solid var(--mk-border)", background: "var(--mk-surface-2)", color: "var(--mk-text)", fontSize: 12.5 };
const aviso = (c: string): React.CSSProperties => ({ background: `${c}22`, borderLeft: `3px solid ${c}`, padding: "8px 12px", borderRadius: 6, fontSize: 12, display: "flex", gap: 6, alignItems: "center", marginTop: 6 });
