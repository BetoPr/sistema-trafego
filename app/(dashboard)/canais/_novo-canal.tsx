"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Balao } from "@/components/ui/Balao";
import { criarCanalJson, gerarQrCanal, statusCanalJson } from "./_actions";

interface Opt {
  id: string;
  nome: string;
}

const QR_TTL = 30; // segundos até renovar o QR

/**
 * Balão de QR Code com countdown:
 * - gera QR, conta 30s regressivos; zerou → gera outro (loop até conectar)
 * - poll de status a cada 4s; conectou → sucesso e fecha
 * - X fecha e para tudo
 */
function useQrLoop(canalId: string | null, ativo: boolean, onConnected: () => void) {
  const [qr, setQr] = useState<string | null>(null);
  const [restante, setRestante] = useState(QR_TTL);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const ativoRef = useRef(ativo);
  ativoRef.current = ativo;

  const gerar = useCallback(async (id: string) => {
    setGerando(true);
    setErro(null);
    try {
      const r = await gerarQrCanal(id);
      if (!ativoRef.current) return;
      if (!r.ok) { setErro(r.msg); return; }
      if (r.connected) { onConnected(); return; }
      setQr(r.qr);
      setRestante(QR_TTL);
    } finally {
      setGerando(false);
    }
  }, [onConnected]);

  // Gera ao abrir
  useEffect(() => {
    if (ativo && canalId) {
      setQr(null);
      gerar(canalId);
    }
  }, [ativo, canalId, gerar]);

  // Countdown 1s + renovação ao zerar
  useEffect(() => {
    if (!ativo || !canalId) return;
    const iv = setInterval(() => {
      setRestante((r) => {
        if (r <= 1) {
          gerar(canalId);
          return QR_TTL;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [ativo, canalId, gerar]);

  // Poll status 4s
  useEffect(() => {
    if (!ativo || !canalId) return;
    const iv = setInterval(async () => {
      const r = await statusCanalJson(canalId);
      if (ativoRef.current && r.ok && r.connected) onConnected();
    }, 4000);
    return () => clearInterval(iv);
  }, [ativo, canalId, onConnected]);

  return { qr, restante, gerando, erro };
}

function QrBalao({ canalId, nome, onClose }: { canalId: string; nome: string; onClose: () => void }) {
  const router = useRouter();
  const [conectado, setConectado] = useState(false);

  const onConnected = useCallback(() => {
    setConectado(true);
    router.refresh();
    setTimeout(onClose, 1800);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { qr, restante, gerando, erro } = useQrLoop(canalId, !conectado, onConnected);

  return (
    <Balao open onClose={onClose} titulo={`QR Code — ${nome}`} icone="ti-qrcode" largura={520}>
      {conectado ? (
        <div style={{ textAlign: "center", padding: 30 }}>
          <i className="ti ti-circle-check" style={{ fontSize: 48, color: "#00E19A" }} />
          <div style={{ fontSize: 14, fontWeight: 600, marginTop: 10, color: "#00E19A" }}>Conectado!</div>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 22, alignItems: "flex-start", flexWrap: "wrap", justifyContent: "center" }}>
          {/* QR Code + countdown */}
          <div style={{ position: "relative", width: 240, height: 240, flexShrink: 0 }}>
            {qr ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={qr.startsWith("data:") ? qr : `data:image/png;base64,${qr}`}
                alt="QR Code"
                style={{ width: 240, height: 240, borderRadius: 14, background: "#FFFDF8", padding: 14, opacity: gerando ? 0.35 : 1, transition: "opacity 0.25s", boxShadow: "0 6px 20px rgba(0,0,0,0.35)" }}
              />
            ) : (
              <div style={{ width: 240, height: 240, borderRadius: 14, background: "var(--mk-surface-2)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--mk-text-muted)", fontSize: 12, gap: 8 }}>
                <i className={`ti ${erro ? "ti-alert-triangle" : "ti-loader-2"}`} style={{ fontSize: 32, color: erro ? "#C97064" : "#00E19A", animation: erro ? undefined : "spin 1s linear infinite" }} />
                <span>{erro ? "Falha ao gerar" : "Gerando QR…"}</span>
                <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
              </div>
            )}
            {/* Countdown badge */}
            {qr && (
              <span style={{ position: "absolute", top: -10, right: -10, minWidth: 38, height: 38, borderRadius: "50%", background: restante <= 5 ? "#C97064" : "#00E19A", color: "#0a0f10", fontWeight: 800, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.5)", border: "3px solid var(--mk-bg)" }}>
                {gerando ? <i className="ti ti-refresh" style={{ animation: "spin 0.6s linear infinite" }} /> : `${restante}s`}
              </span>
            )}
          </div>

          {/* Instruções */}
          <div style={{ flex: 1, minWidth: 240, display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <div style={{ fontSize: 11.5, color: "var(--mk-text-muted)", textTransform: "uppercase", letterSpacing: 0.7, fontWeight: 600, marginBottom: 10 }}>
                Como escanear
              </div>
              {[
                <>Abra o <strong style={{ color: "var(--mk-text)" }}>WhatsApp</strong> no celular dedicado</>,
                <>Vá em <strong style={{ color: "var(--mk-text)" }}>Menu → Dispositivos conectados</strong></>,
                <>Toque em <strong style={{ color: "var(--mk-text)" }}>Conectar um aparelho</strong></>,
                <>Aponte a câmera pro <strong style={{ color: "var(--mk-text)" }}>QR Code</strong> ao lado</>,
              ].map((texto, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 7 }}>
                  <span style={{ flexShrink: 0, width: 22, height: 22, borderRadius: "50%", background: "rgba(0,225,154,0.14)", border: "1px solid rgba(0,225,154,0.5)", color: "#00E19A", fontWeight: 700, fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1 }}>
                    {i + 1}
                  </span>
                  <span style={{ fontSize: 12.5, color: "var(--mk-text-secondary)", lineHeight: 1.55, paddingTop: 2 }}>
                    {texto}
                  </span>
                </div>
              ))}
            </div>

            {/* Renew hint */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10.5, color: "var(--mk-text-muted)", padding: "6px 10px", background: "var(--mk-surface-2)", borderRadius: 6, alignSelf: "flex-start" }}>
              <i className="ti ti-refresh" style={{ fontSize: 12, color: "#00E19A" }} />
              <span>QR renova automático a cada {QR_TTL}s</span>
            </div>

            {/* Aviso mobile */}
            <details style={{ background: "rgba(0,225,154,0.08)", border: "1px solid rgba(0,225,154,0.28)", borderRadius: 8, padding: "8px 12px", fontSize: 11.5, color: "var(--mk-text-secondary)" }}>
              <summary style={{ cursor: "pointer", listStyle: "none", display: "flex", alignItems: "center", gap: 8, color: "#00E19A", fontWeight: 600 }}>
                <i className="ti ti-device-mobile" style={{ fontSize: 14 }} />
                <span>Acessando pelo celular?</span>
                <i className="ti ti-chevron-down" style={{ fontSize: 12, marginLeft: "auto" }} />
              </summary>
              <div style={{ marginTop: 8, lineHeight: 1.6 }}>
                Não dá pra escanear o QR na mesma tela. Você precisa de um <strong style={{ color: "var(--mk-text)" }}>segundo aparelho</strong>:
                <ol style={{ margin: "8px 0 0", paddingLeft: 18, lineHeight: 1.7 }}>
                  <li>Tire print desta tela</li>
                  <li>Envie pra outro celular ou computador</li>
                  <li>No WhatsApp do número a conectar → escaneie o print pelo segundo aparelho</li>
                </ol>
              </div>
            </details>

            {erro && (
              <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 12px", background: "rgba(201,112,100,0.12)", border: "1px solid rgba(201,112,100,0.32)", borderRadius: 8, fontSize: 11.5, color: "#C97064" }}>
                <i className="ti ti-alert-triangle" style={{ fontSize: 14 }} />
                <span>{erro}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </Balao>
  );
}

/** Botão "Adicionar canal" → balão com form → balão QR. */
export function NovoCanalBalao({ filas, usuarios, disabled }: { filas: Opt[]; usuarios: Opt[]; disabled?: boolean }) {
  const [etapa, setEtapa] = useState<"fechado" | "form" | "qr">("fechado");
  const [nome, setNome] = useState("");
  const [padrao, setPadrao] = useState(false);
  const [filaId, setFilaId] = useState("");
  const [usuarioId, setUsuarioId] = useState("");
  const [despedida, setDespedida] = useState("");
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [canalCriado, setCanalCriado] = useState<{ id: string; nome: string } | null>(null);

  async function criar() {
    if (!nome.trim()) { setErro("Nome obrigatório."); return; }
    setCriando(true);
    setErro(null);
    try {
      const r = await criarCanalJson({ nome, padrao, filaId: filaId || null, usuarioId: usuarioId || null, mensagemDespedida: despedida || null });
      if (!r.ok) { setErro(r.msg); return; }
      setCanalCriado({ id: r.canalId, nome });
      setEtapa("qr");
    } finally {
      setCriando(false);
    }
  }

  function reset() {
    setEtapa("fechado");
    setNome(""); setPadrao(false); setFilaId(""); setUsuarioId(""); setDespedida("");
    setErro(null); setCanalCriado(null);
  }

  return (
    <>
      <button onClick={() => setEtapa("form")} disabled={disabled} className="cta-btn" data-guide="canais-adicionar">
        <i className="ti ti-plus" /> Adicionar canal
      </button>

      <Balao open={etapa === "form"} onClose={reset} titulo="Conectar novo número via QR Code" icone="ti-qrcode" largura={520}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ background: "rgba(91,139,166,0.10)", borderLeft: "3px solid #5B8BA6", padding: 10, borderRadius: 6, fontSize: 11, color: "var(--mk-text-secondary)", lineHeight: 1.6 }}>
            <strong>Atenção:</strong> use uma conta WhatsApp dedicada, com celular de internet estável.
          </div>
          <div>
            <label style={lbl}>Nome do canal <span style={{ color: "#C97064" }}>*</span></label>
            <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Comercial SDR" autoFocus style={inp} />
          </div>
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, color: "var(--mk-text-secondary)", cursor: "pointer" }}>
            <input type="checkbox" checked={padrao} onChange={(e) => setPadrao(e.target.checked)} /> Definir como canal padrão
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={lbl}>Fila padrão</label>
              <select value={filaId} onChange={(e) => setFilaId(e.target.value)} style={inp}>
                <option value="">Nenhuma</option>
                {filas.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Usuário padrão</label>
              <select value={usuarioId} onChange={(e) => setUsuarioId(e.target.value)} style={inp}>
                <option value="">Nenhum</option>
                {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={lbl}>Mensagem de despedida (opcional)</label>
            <textarea value={despedida} onChange={(e) => setDespedida(e.target.value)} rows={2} placeholder="Atendimento encerrado. Volte sempre!" style={{ ...inp, resize: "vertical", fontFamily: "inherit" }} />
          </div>
          {erro && <div style={{ padding: 8, background: "rgba(201,112,100,0.12)", borderRadius: 6, fontSize: 11.5, color: "#C97064" }}>{erro}</div>}
          <button onClick={criar} disabled={criando || !nome.trim()} className="cta-btn">
            <i className="ti ti-plus" /> {criando ? "Criando instância…" : "Criar e gerar QR Code"}
          </button>
        </div>
      </Balao>

      {etapa === "qr" && canalCriado && (
        <QrBalao canalId={canalCriado.id} nome={canalCriado.nome} onClose={reset} />
      )}
    </>
  );
}

/** Botão "Ver QR Code" dos cards — reabre o balão QR com o loop de renovação. */
export function VerQrButton({ canalId, nome }: { canalId: string; nome: string }) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <button onClick={() => setAberto(true)} className="cta-btn" style={{ fontSize: 11 }}>
        <i className="ti ti-qrcode" /> Ver QR Code
      </button>
      {aberto && <QrBalao canalId={canalId} nome={nome} onClose={() => setAberto(false)} />}
    </>
  );
}

const lbl: React.CSSProperties = { display: "block", fontSize: 11, color: "var(--mk-text-muted)", marginBottom: 4, fontFamily: "monospace" };
const inp: React.CSSProperties = { width: "100%", padding: "8px 12px", borderRadius: 8, border: "0.5px solid var(--mk-border)", background: "var(--mk-surface-2)", color: "var(--mk-text)", fontSize: 12.5 };
