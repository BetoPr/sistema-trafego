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
          <i className="ti ti-circle-check" style={{ fontSize: 48, color: "#6B8E4E" }} />
          <div style={{ fontSize: 14, fontWeight: 600, marginTop: 10, color: "#6B8E4E" }}>Conectado!</div>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
          <div style={{ position: "relative", width: 240, height: 240 }}>
            {qr ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={qr.startsWith("data:") ? qr : `data:image/png;base64,${qr}`}
                alt="QR Code"
                style={{ width: 240, height: 240, borderRadius: 12, background: "#FFFDF8", padding: 12, opacity: gerando ? 0.4 : 1, transition: "opacity 0.2s" }}
              />
            ) : (
              <div style={{ width: 240, height: 240, borderRadius: 12, background: "var(--mk-surface-2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--mk-text-muted)", fontSize: 12 }}>
                {erro ? "Falha ao gerar" : "Gerando QR…"}
              </div>
            )}
            {/* Countdown badge */}
            {qr && (
              <span style={{ position: "absolute", top: -8, right: -8, minWidth: 34, height: 34, borderRadius: "50%", background: restante <= 5 ? "#C97064" : "var(--mk-accent)", color: "#1a1a1a", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>
                {gerando ? "…" : `${restante}s`}
              </span>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <ol style={{ fontSize: 12, color: "var(--mk-text-secondary)", lineHeight: 1.9, paddingLeft: 20 }}>
              <li>Abra o WhatsApp no celular dedicado</li>
              <li>Menu → <strong>Dispositivos conectados</strong></li>
              <li>Toque em <strong>Conectar um aparelho</strong></li>
              <li>Aponte a câmera pro QR ao lado</li>
            </ol>
            <div style={{ marginTop: 10, fontSize: 10.5, color: "var(--mk-text-muted)", lineHeight: 1.6 }}>
              <i className="ti ti-refresh" style={{ marginRight: 4 }} />
              O QR renova sozinho a cada {QR_TTL}s até conectar. Feche no X pra parar.
            </div>
            <div style={{ marginTop: 10, background: "rgba(201,168,118,0.14)", borderLeft: "3px solid #C9A876", padding: 10, borderRadius: 6, fontSize: 10.5, color: "var(--mk-text-secondary)", lineHeight: 1.65 }}>
              <strong style={{ color: "#C9A876" }}><i className="ti ti-device-mobile" style={{ marginRight: 4 }} />Está acessando pelo celular?</strong>
              <div style={{ marginTop: 4 }}>
                Você não consegue escanear o QR na mesma tela. Use um computador ou um segundo celular pra ler:
              </div>
              <ol style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                <li>Tire um print desta tela.</li>
                <li>Envie pra um amigo, ou pro WhatsApp/computador de alguém de confiança.</li>
                <li>Abra o WhatsApp do número que vai conectar e escaneie o QR por esse outro aparelho.</li>
              </ol>
            </div>
            {erro && (
              <div style={{ marginTop: 8, padding: 8, background: "rgba(201,112,100,0.12)", borderRadius: 6, fontSize: 11, color: "#C97064" }}>{erro}</div>
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
      <button onClick={() => setEtapa("form")} disabled={disabled} className="cta-btn">
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
