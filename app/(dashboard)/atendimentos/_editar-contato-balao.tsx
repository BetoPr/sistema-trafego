"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Balao } from "@/components/ui/Balao";
import { salvarContatoBasico } from "@/app/(dashboard)/contatos/_actions";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

interface Etq { id: string; nome: string; cor: string }
interface Fechamento { ticketId: string; numero: number; valor: number; servico: string | null; quantidade: number | null; fechado_em: string | null }

/**
 * Balão de edição do contato (fundo embaçado) — tudo num lugar, sem navegar:
 * nome + WhatsApp, etiquetas (toggle ao vivo) e o LOG de fechamentos do cliente
 * (total de fechamentos, total R$, serviço/qtd/valor e data de cada um + último).
 */
export function EditarContatoBalao({ open, onClose, contatoId, nomeAtual, whatsappAtual, onSalvo }: {
  open: boolean;
  onClose: () => void;
  contatoId: string;
  nomeAtual: string;
  whatsappAtual: string | null;
  onSalvo?: () => void;
}) {
  const router = useRouter();
  const [nome, setNome] = useState(nomeAtual);
  const [whatsapp, setWhatsapp] = useState(whatsappAtual || "");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [carregando, setCarregando] = useState(false);
  const [todasEtq, setTodasEtq] = useState<Etq[]>([]);
  const [aplicadas, setAplicadas] = useState<Etq[]>([]);
  const [fechamentos, setFechamentos] = useState<Fechamento[]>([]);
  const [totais, setTotais] = useState<{ quantidadeFechamentos: number; totalValor: number; totalQtd: number; ultimo: string | null } | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const r = await fetch(`/api/contatos/${contatoId}/ficha`);
      const j = await r.json();
      if (j.ok) {
        setNome(j.nome ?? nomeAtual);
        setWhatsapp(j.whatsapp ?? "");
        setTodasEtq(j.todasEtiquetas || []);
        setAplicadas(j.etiquetasAplicadas || []);
        setFechamentos(j.fechamentos || []);
        setTotais(j.totais || null);
      }
    } catch {} finally { setCarregando(false); }
  }, [contatoId, nomeAtual]);

  useEffect(() => { if (open) { setErro(null); carregar(); } }, [open, carregar]);

  const aplicadasIds = new Set(aplicadas.map((e) => e.id));

  async function toggleEtq(e: Etq) {
    const tinha = aplicadasIds.has(e.id);
    setAplicadas((prev) => tinha ? prev.filter((x) => x.id !== e.id) : [...prev, e]); // otimista
    try {
      if (tinha) await fetch(`/api/contatos/${contatoId}/etiquetas?etiquetaId=${e.id}`, { method: "DELETE" });
      else await fetch(`/api/contatos/${contatoId}/etiquetas`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ etiquetaId: e.id }) });
    } catch {
      setAplicadas((prev) => tinha ? [...prev, e] : prev.filter((x) => x.id !== e.id)); // reverte
    }
  }

  async function salvar() {
    setErro(null);
    setSalvando(true);
    try {
      const r = await salvarContatoBasico({ id: contatoId, nome, whatsapp });
      if (!r.ok) { setErro(r.erro || "Falha ao salvar"); return; }
      onClose();
      if (onSalvo) onSalvo(); else router.refresh();
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Balao
      open={open}
      onClose={onClose}
      titulo="Editar contato"
      icone="ti-edit"
      largura={520}
      footer={
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", width: "100%" }}>
          {erro && <span style={{ color: "#C97064", fontSize: 11.5, marginRight: "auto", alignSelf: "center" }}>{erro}</span>}
          <button className="ghost-btn" onClick={onClose}>Cancelar</button>
          <button className="cta-btn" onClick={salvar} disabled={salvando}>
            <i className="ti ti-device-floppy" /> {salvando ? "Salvando…" : "Salvar"}
          </button>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Dados */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label style={lbl}>Nome</label>
            <input value={nome} onChange={(e) => setNome(e.target.value)} autoFocus style={inp} placeholder="Nome do contato" />
          </div>
          <div>
            <label style={lbl}>WhatsApp</label>
            <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} style={inp} placeholder="5511999999999" />
          </div>
        </div>

        {/* Etiquetas */}
        <div>
          <label style={lbl}>Etiquetas <span style={{ color: "var(--mk-text-muted)", fontWeight: 400 }}>(clique pra marcar/desmarcar)</span></label>
          {todasEtq.length === 0 ? (
            <div style={{ fontSize: 11, color: "var(--mk-text-muted)" }}>Sem etiquetas. Crie em <a href="/configuracoes/etiquetas" style={{ color: "var(--mk-accent)" }}>Etiquetas</a>.</div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {todasEtq.map((e) => {
                const on = aplicadasIds.has(e.id);
                return (
                  <button key={e.id} onClick={() => toggleEtq(e)} style={{
                    display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontFamily: "inherit", cursor: "pointer",
                    padding: "5px 10px", borderRadius: 999, transition: "all .15s",
                    border: `1px solid ${on ? e.cor : "var(--mk-border)"}`,
                    background: on ? `${e.cor}26` : "var(--mk-surface-2)",
                    color: on ? "var(--mk-text)" : "var(--mk-text-secondary)",
                  }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: e.cor }} />
                    {e.nome}
                    {on && <i className="ti ti-check" style={{ fontSize: 12, color: e.cor }} />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Fechamentos do cliente */}
        <div style={{ borderTop: "0.5px solid var(--mk-border)", paddingTop: 12 }}>
          <label style={lbl}>Fechamentos com este cliente</label>
          {carregando ? (
            <div style={{ fontSize: 11.5, color: "var(--mk-text-muted)" }}><i className="ti ti-loader-2 anim-spin" /> Carregando…</div>
          ) : !totais || totais.quantidadeFechamentos === 0 ? (
            <div style={{ fontSize: 11.5, color: "var(--mk-text-muted)" }}><i className="ti ti-receipt-off" /> Nenhum fechamento ainda.</div>
          ) : (
            <>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", padding: "8px 12px", background: "rgba(16,185,129,0.10)", border: "0.5px solid rgba(16,185,129,0.4)", borderRadius: 8, marginBottom: 8 }}>
                <Stat label="TOTAL" valor={BRL.format(totais.totalValor)} cor="#00E19A" />
                {totais.totalQtd > 0 && <Stat label="SERVIÇOS (QTD)" valor={String(totais.totalQtd)} />}
                <Stat label="FECHAMENTOS" valor={String(totais.quantidadeFechamentos)} />
                {totais.ultimo && <Stat label="ÚLTIMO" valor={new Date(totais.ultimo).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })} />}
              </div>
              <div className="chat-scroll" style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 220, overflowY: "auto" }}>
                {fechamentos.map((f) => (
                  <div key={f.ticketId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", border: "0.5px solid var(--mk-border)", borderRadius: 8, background: "var(--mk-surface)" }}>
                    <i className="ti ti-circle-check" style={{ color: "#00E19A", fontSize: 16, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: "var(--mk-text)" }}>
                        {f.servico || "Sem serviço"}{f.quantidade != null && <span style={{ color: "var(--mk-text-muted)" }}> × {f.quantidade}</span>}
                        <span style={{ color: "var(--mk-text-muted)", fontFamily: "monospace", fontSize: 10.5 }}> · #{f.numero}</span>
                      </div>
                      <div style={{ fontSize: 10.5, color: "var(--mk-text-muted)" }}>
                        {f.fechado_em ? new Date(f.fechado_em).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }) : "—"}
                      </div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#00E19A", whiteSpace: "nowrap" }}>{BRL.format(f.valor)}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </Balao>
  );
}

function Stat({ label, valor, cor }: { label: string; valor: string; cor?: string }) {
  return (
    <div>
      <div style={{ fontSize: 9, color: "var(--mk-text-muted)", letterSpacing: 0.4 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: cor || "var(--mk-text)" }}>{valor}</div>
    </div>
  );
}

const lbl: React.CSSProperties = { display: "block", fontSize: 11, color: "var(--mk-text-muted)", marginBottom: 4, fontFamily: "monospace" };
const inp: React.CSSProperties = { width: "100%", padding: "8px 12px", borderRadius: 8, border: "0.5px solid var(--mk-border)", background: "var(--mk-surface-2)", color: "var(--mk-text)", fontSize: 12.5, boxSizing: "border-box" };
