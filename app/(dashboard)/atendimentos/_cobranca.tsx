"use client";

import { useState } from "react";

interface Props {
  ticketId: string;
  canalConectado: boolean;
  canalId: string | null;
  servicos?: Array<{ id: string; nome: string }>;
  servicosHabilitados?: boolean;
}

export function BotaoCobranca({ ticketId, canalConectado, canalId, servicos = [], servicosHabilitados = false }: Props) {
  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState<"pix" | "cartao">("pix");
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [parcelas, setParcelas] = useState("1");
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<{ qrEncoded?: string; copiaCola?: string; link?: string } | null>(null);

  async function gerar() {
    const valorNum = Number(valor.replace(",", "."));
    if (!Number.isFinite(valorNum) || valorNum < 5) {
      alert("Valor mínimo Asaas: R$ 5,00");
      return;
    }
    setLoading(true);
    setResultado(null);
    try {
      const r = await fetch(`/api/atendimentos/${ticketId}/cobranca`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tipo,
          valor: Number(valor.replace(",", ".")),
          descricao,
          parcelas: tipo === "cartao" ? Number(parcelas) : undefined,
        }),
      });
      const j = await r.json();
      if (!r.ok) {
        alert(`Erro: ${j.error || j.msg || r.statusText}`);
      } else {
        setResultado(j);
      }
    } catch (e) {
      alert(`Erro: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  }

  async function copiarChat(texto: string) {
    await navigator.clipboard?.writeText(texto);
    alert("Copiado. Cole no chat e envie.");
  }

  const [enviando, setEnviando] = useState(false);

  async function enviarTudoChat() {
    if (!canalId || !resultado) return;
    setEnviando(true);
    try {
      // PIX → manda só copia-cola como texto
      if (resultado.copiaCola) {
        const r = await fetch(`/api/canais/${canalId}/send`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            ticketId,
            text: `📋 Copia e cola PIX:\n${resultado.copiaCola}`,
          }),
        });
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          alert(`Falha: ${j.error || j.msg || r.statusText}`);
          return;
        }
      }
      // Cartão → link
      if (resultado.link) {
        const r = await fetch(`/api/canais/${canalId}/send`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            ticketId,
            text: `💳 Link de pagamento:\n${resultado.link}`,
          }),
        });
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          alert(`Falha: ${j.error || j.msg || r.statusText}`);
          return;
        }
      }
      setOpen(false);
      setResultado(null);
      setValor("");
      setDescricao("");
    } catch (e) {
      alert(`Erro: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="ghost-btn" style={{ fontSize: 11 }} disabled={!canalConectado} title="Gerar cobrança">
        <i className="ti ti-coin" /> Cobrança
      </button>

      {open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div className="mk-card mk-card-lg" style={{ width: "min(520px, 90vw)", maxHeight: "90vh", overflow: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ flex: 1, fontSize: 15, fontWeight: 600 }}>Gerar cobrança</h3>
              <button onClick={() => { setOpen(false); setResultado(null); }} className="ghost-btn"><i className="ti ti-x" /></button>
            </div>

            {!resultado ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => setTipo("pix")} className={tipo === "pix" ? "cta-btn" : "ghost-btn"} style={{ flex: 1, fontSize: 12 }}>
                    <i className="ti ti-qrcode" /> PIX
                  </button>
                  <button onClick={() => setTipo("cartao")} className={tipo === "cartao" ? "cta-btn" : "ghost-btn"} style={{ flex: 1, fontSize: 12 }}>
                    <i className="ti ti-credit-card" /> Cartão
                  </button>
                </div>

                <div>
                  <label style={lbl}>Valor (R$) — mínimo 5,00</label>
                  <input type="text" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="99,90" style={inp} />
                </div>
                <div>
                  <label style={lbl}>{servicosHabilitados ? "Serviço" : "Descrição"}</label>
                  {servicosHabilitados ? (
                    <>
                      <select value={descricao} onChange={(e) => setDescricao(e.target.value)} style={inp}>
                        <option value="">— Selecione o serviço —</option>
                        {servicos.map((s) => (
                          <option key={s.id} value={s.nome}>{s.nome}</option>
                        ))}
                      </select>
                      {servicos.length === 0 && (
                        <a href="/configuracoes/servicos" style={{ fontSize: 10.5, color: "#10b981", textDecoration: "none", display: "inline-block", marginTop: 4 }}>
                          <i className="ti ti-plus" /> Cadastre serviços em Configurações → Serviços
                        </a>
                      )}
                    </>
                  ) : (
                    <input type="text" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Produto/Serviço" style={inp} />
                  )}
                </div>
                {tipo === "cartao" && (
                  <div>
                    <label style={lbl}>Parcelamento</label>
                    <select value={parcelas} onChange={(e) => setParcelas(e.target.value)} style={inp}>
                      {[1, 2, 3, 4, 6, 12].map((n) => <option key={n} value={n}>{n}x</option>)}
                    </select>
                  </div>
                )}
                <button onClick={gerar} disabled={loading || !valor} className="cta-btn" style={{ marginTop: 6 }}>
                  <i className="ti ti-bolt" /> {loading ? "Gerando..." : "Gerar cobrança"}
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {resultado.qrEncoded && (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`data:image/png;base64,${resultado.qrEncoded}`} alt="QR PIX" style={{ width: 220, height: 220, margin: "0 auto", background: "#FFFDF8", padding: 14, borderRadius: 10 }} />
                    {resultado.copiaCola && (
                      <div>
                        <label style={lbl}>Copia e cola</label>
                        <textarea readOnly value={resultado.copiaCola} rows={4} style={{ ...inp, fontFamily: "monospace", fontSize: 11 }} onClick={(e) => (e.target as HTMLTextAreaElement).select()} />
                      </div>
                    )}
                  </>
                )}
                {resultado.link && (
                  <div style={{ padding: 14, background: "var(--mk-surface-2)", borderRadius: 8, textAlign: "center" }}>
                    <a href={resultado.link} target="_blank" rel="noreferrer" style={{ color: "var(--mk-accent)", textDecoration: "underline", fontSize: 13, wordBreak: "break-all" }}>{resultado.link}</a>
                  </div>
                )}

                {/* Botão principal: envia tudo direto no chat */}
                <button
                  onClick={enviarTudoChat}
                  disabled={enviando || !canalId}
                  className="cta-btn"
                  style={{ background: "#25D366", color: "#FFFDF8" }}
                  title={!canalId ? "Canal desconectado" : "Envia QR + copia-cola direto no chat"}
                >
                  <i className="ti ti-brand-whatsapp" /> {enviando ? "Enviando..." : "Enviar no chat"}
                </button>

                {/* Botão alternativo: só copiar pra área de transferência */}
                {resultado.copiaCola && (
                  <button onClick={() => copiarChat(resultado.copiaCola!)} className="ghost-btn" style={{ fontSize: 11 }}>
                    <i className="ti ti-copy" /> Copiar copia-cola
                  </button>
                )}
                {resultado.link && (
                  <button onClick={() => copiarChat(resultado.link!)} className="ghost-btn" style={{ fontSize: 11 }}>
                    <i className="ti ti-copy" /> Copiar link
                  </button>
                )}
                <button onClick={() => { setResultado(null); setValor(""); setDescricao(""); }} className="ghost-btn">Nova cobrança</button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

const lbl: React.CSSProperties = { display: "block", fontSize: 11, color: "var(--mk-text-muted)", marginBottom: 4, fontFamily: "monospace" };
const inp: React.CSSProperties = { width: "100%", padding: "8px 12px", borderRadius: 8, border: "0.5px solid var(--mk-border)", background: "var(--mk-surface-2)", color: "var(--mk-text)", fontSize: 12.5 };
