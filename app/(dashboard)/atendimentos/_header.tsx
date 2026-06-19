"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { BotaoCobranca } from "./_cobranca";
import { LightboxFoto } from "@/components/ui/LightboxFoto";

interface FilaOption {
  id: string;
  nome: string;
  cor?: string | null;
}
interface UsuarioOption {
  id: string;
  nome: string;
}
interface CanalOption {
  id: string;
  nome: string;
  status: string;
  numero_conectado?: string | null;
}

interface Props {
  ticketId: string;
  canalId: string | null;
  canalConectado: boolean;
  contatoNome: string;
  contatoIniciais: string;
  contatoFotoUrl?: string | null;
  contatoTelefone?: string | null;
  ticketNumero: number;
  filaAtualNome?: string | null;
  usuarioAtualNome?: string | null;
  filas: FilaOption[];
  usuarios: UsuarioOption[];
  canais: CanalOption[];
  detalhesAbertos: boolean;
  onToggleDetalhes: () => void;
  onBack?: () => void;
  onRefresh?: () => void;
  servicos?: Array<{ id: string; nome: string }>;
  servicosHabilitados?: boolean;
}

export function ChatHeader(props: Props) {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const [lightboxFoto, setLightboxFoto] = useState(false);
  const [modal, setModal] = useState<null | "transferir" | "transferir-canal">(null);
  const [loading, setLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fecha menu ao clicar fora
  useEffect(() => {
    if (!showMenu) return;
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [showMenu]);

  async function call(path: string, body?: unknown) {
    setLoading(true);
    try {
      const r = await fetch(path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        alert(`Falha: ${j.error || r.statusText}`);
        return false;
      }
      return true;
    } finally {
      setLoading(false);
    }
  }

  async function encerrar() {
    if (!confirm("Encerrar atendimento? Move pra Fechados.")) return;
    if (await call(`/api/atendimentos/${props.ticketId}/encerrar`, {})) {
      router.push("/atendimentos");
    }
  }

  async function retornarFila() {
    if (!confirm("Retornar atendimento à fila (Pendentes)?")) return;
    if (await call(`/api/atendimentos/${props.ticketId}/retornar-fila`)) {
      router.push("/atendimentos?tab=pendente");
    }
  }

  async function transferir(filaId: string | null, usuarioId: string | null, msg: string) {
    if (await call(`/api/atendimentos/${props.ticketId}/transferir`, { filaId, usuarioId, mensagem: msg })) {
      setModal(null);
      if (props.onRefresh) props.onRefresh();
      else router.refresh();
    }
  }

  async function transferirCanal(canalId: string) {
    if (await call(`/api/atendimentos/${props.ticketId}/transferir-canal`, { canalId })) {
      setModal(null);
      if (props.onRefresh) props.onRefresh();
      else router.refresh();
    }
  }

  return (
    <>
      <div className="chat-header" style={{ display: "flex", alignItems: "center", padding: "10px 14px", borderBottom: "0.5px solid var(--mk-border)", gap: 4 }}>
        {props.onBack && (
          <button onClick={props.onBack} title="Voltar à lista" aria-label="Voltar" style={{ background: "transparent", border: 0, color: "var(--mk-text-secondary)", cursor: "pointer", fontSize: 19, padding: "2px 4px 2px 0", flexShrink: 0 }}>
            <i className="ti ti-arrow-left" />
          </button>
        )}
        {props.contatoFotoUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={props.contatoFotoUrl}
            alt={props.contatoNome}
            title={`${props.contatoNome} · #${props.ticketNumero}`}
            onClick={() => setLightboxFoto(true)}
            style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "0.5px solid var(--mk-border)", cursor: "zoom-in" }}
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div title={`${props.contatoNome} · #${props.ticketNumero}`} style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(155,125,191,0.2)", color: "#9B7DBF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
            {props.contatoIniciais}
          </div>
        )}
        {/* Info do contato — some quando header aperta (tela pequena + painel aberto), sobram só os ícones */}
        <div className="chat-header-info" style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--mk-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{props.contatoNome}</div>
          <div style={{ fontSize: 10.5, color: "var(--mk-text-muted)", display: "flex", gap: 8, overflow: "hidden", whiteSpace: "nowrap" }}>
            <span style={{ fontFamily: "monospace" }}>#{props.ticketNumero}</span>
            {props.contatoTelefone && <span>· {props.contatoTelefone}</span>}
            {props.filaAtualNome && <span>· {props.filaAtualNome}</span>}
            {props.usuarioAtualNome && <span>· {props.usuarioAtualNome}</span>}
          </div>
        </div>
        <div className="chat-header-spacer" style={{ flex: 1, display: "none" }} />

        {/* Ícones de ação inline */}
        <IconBtn icon="ti-arrow-back-up" title="Retornar à fila" onClick={retornarFila} disabled={loading} />
        <IconBtn icon="ti-circle-check" title="Marcar como resolvido (encerrar)" onClick={encerrar} disabled={loading} color="#10b981" />
        <IconBtn icon="ti-arrows-exchange" title="Transferir (fila/atendente)" onClick={() => setModal("transferir")} />
        <IconBtn icon="ti-broadcast" title="Transferir canal" onClick={() => setModal("transferir-canal")} />
        <BotaoCobranca ticketId={props.ticketId} canalConectado={props.canalConectado} canalId={props.canalId} servicos={props.servicos} servicosHabilitados={props.servicosHabilitados} />
        <IconBtn icon="ti-info-circle" title={props.detalhesAbertos ? "Fechar detalhes" : "Detalhes do contato"} onClick={props.onToggleDetalhes} active={props.detalhesAbertos} />

        {/* Menu 3 pontos */}
        <div style={{ position: "relative" }} ref={menuRef}>
          <IconBtn icon="ti-dots-vertical" title="Mais ações" onClick={() => setShowMenu((s) => !s)} active={showMenu} />
          {showMenu && (
            <div style={menuStyle}>
              <MenuItem icon="ti-info-circle" onClick={() => { setShowMenu(false); props.onToggleDetalhes(); }}>{props.detalhesAbertos ? "Fechar detalhes" : "Ver detalhes do contato"}</MenuItem>
              <MenuSep />
              <MenuItem icon="ti-arrows-exchange" onClick={() => { setShowMenu(false); setModal("transferir"); }}>Transferir</MenuItem>
              <MenuItem icon="ti-broadcast" onClick={() => { setShowMenu(false); setModal("transferir-canal"); }}>Transferir Canal</MenuItem>
              <MenuSep />
              <MenuItem icon="ti-arrow-back-up" onClick={() => { setShowMenu(false); retornarFila(); }}>Retornar à fila</MenuItem>
              <MenuItem icon="ti-x" onClick={() => { setShowMenu(false); encerrar(); }} color="#C97064">Encerrar atendimento</MenuItem>
            </div>
          )}
        </div>
      </div>

      {modal === "transferir" && (
        <ModalTransferir
          filas={props.filas}
          usuarios={props.usuarios}
          loading={loading}
          onClose={() => setModal(null)}
          onSubmit={transferir}
        />
      )}
      {modal === "transferir-canal" && (
        <ModalTransferirCanal
          canais={props.canais.filter((c) => c.id !== props.canalId)}
          loading={loading}
          onClose={() => setModal(null)}
          onSubmit={transferirCanal}
        />
      )}
      <LightboxFoto src={props.contatoFotoUrl} alt={props.contatoNome} open={lightboxFoto} onClose={() => setLightboxFoto(false)} />
    </>
  );
}

function IconBtn({
  icon,
  title,
  onClick,
  disabled,
  active,
  color,
}: {
  icon: string;
  title: string;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        background: active ? "var(--mk-surface)" : "transparent",
        border: "0.5px solid transparent",
        borderColor: active ? "var(--mk-border)" : "transparent",
        borderRadius: 6,
        padding: "6px 8px",
        cursor: disabled ? "not-allowed" : "pointer",
        color: color || "var(--mk-text-secondary)",
        opacity: disabled ? 0.4 : 1,
        fontSize: 14,
      }}
    >
      <i className={`ti ${icon}`} />
    </button>
  );
}

function MenuItem({ icon, children, onClick, disabled, color }: { icon: string; children: React.ReactNode; onClick?: () => void; disabled?: boolean; color?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 14px",
        width: "100%",
        background: "transparent",
        border: 0,
        cursor: disabled ? "not-allowed" : "pointer",
        textAlign: "left",
        color: color || "var(--mk-text)",
        fontSize: 12,
        opacity: disabled ? 0.4 : 1,
      }}
      onMouseEnter={(e) => { if (!disabled) (e.target as HTMLButtonElement).style.background = "var(--mk-surface)"; }}
      onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.background = "transparent"; }}
    >
      <i className={`ti ${icon}`} style={{ fontSize: 14, color }} />
      {children}
    </button>
  );
}

function MenuSep() {
  return <div style={{ height: 1, background: "var(--mk-border)", margin: "4px 0" }} />;
}

const menuStyle: React.CSSProperties = {
  position: "absolute",
  top: "100%",
  right: 0,
  marginTop: 4,
  background: "var(--mk-bg)",
  border: "0.5px solid var(--mk-border)",
  borderRadius: 8,
  boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
  minWidth: 220,
  zIndex: 50,
  padding: "4px 0",
};

function ModalTransferir({
  filas,
  usuarios,
  loading,
  onClose,
  onSubmit,
}: {
  filas: FilaOption[];
  usuarios: UsuarioOption[];
  loading: boolean;
  onClose: () => void;
  onSubmit: (fila: string | null, user: string | null, msg: string) => void;
}) {
  const [filaId, setFilaId] = useState("");
  const [usuarioId, setUsuarioId] = useState("");
  const [msg, setMsg] = useState("");
  return (
    <Modal title="Transferir Atendimento" subtitle="Selecione a fila e o atendente" onClose={onClose}>
      <div>
        <label style={lbl}>Fila</label>
        <select value={filaId} onChange={(e) => setFilaId(e.target.value)} style={inp}>
          <option value="">— Manter atual —</option>
          {filas.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
        </select>
      </div>
      <div>
        <label style={lbl}>Atendente</label>
        <select value={usuarioId} onChange={(e) => setUsuarioId(e.target.value)} style={inp}>
          <option value="">— Sem atendente (volta pra fila) —</option>
          {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
        </select>
      </div>
      <div>
        <label style={lbl}>Mensagem (opcional)</label>
        <textarea
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          rows={3}
          placeholder="Digite uma mensagem para enviar ao transferir..."
          style={{ ...inp, resize: "vertical", fontFamily: "inherit" }}
        />
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
        <button onClick={onClose} className="ghost-btn">Cancelar</button>
        <button onClick={() => onSubmit(filaId || null, usuarioId || null, msg)} disabled={loading} className="cta-btn">
          {loading ? "Transferindo..." : "Transferir"}
        </button>
      </div>
    </Modal>
  );
}

function ModalTransferirCanal({
  canais,
  loading,
  onClose,
  onSubmit,
}: {
  canais: CanalOption[];
  loading: boolean;
  onClose: () => void;
  onSubmit: (canalId: string) => void;
}) {
  const [canalId, setCanalId] = useState("");
  return (
    <Modal title="Transferir Canal" subtitle="Mude o canal WhatsApp do ticket" onClose={onClose}>
      {canais.length === 0 ? (
        <div style={{ padding: 20, textAlign: "center", fontSize: 12.5, color: "var(--mk-text-muted)", lineHeight: 1.6 }}>
          <i className="ti ti-info-circle" style={{ fontSize: 24, color: "#10b981", display: "block", marginBottom: 8 }} />
          Não há outros canais cadastrados pra transferir.<br />
          <a href="/canais" style={{ color: "var(--mk-accent)", textDecoration: "underline" }}>Cadastra um novo canal</a> em Administração → Canais.
        </div>
      ) : (
        <>
          <div>
            <label style={lbl}>Novo canal</label>
            <select value={canalId} onChange={(e) => setCanalId(e.target.value)} style={inp}>
              <option value="">— Selecione —</option>
              {canais.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.status === "connected" ? "● " : "○ "} {c.nome} {c.numero_conectado ? `· ${c.numero_conectado}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
            <button onClick={onClose} className="ghost-btn">Cancelar</button>
            <button onClick={() => canalId && onSubmit(canalId)} disabled={loading || !canalId} className="cta-btn">
              {loading ? "..." : "Transferir"}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

function Modal({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div className="mk-card mk-card-lg" style={{ width: "min(480px, 90vw)", maxHeight: "90vh", overflow: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "flex-start", marginBottom: 4 }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600 }}>{title}</h3>
            {subtitle && <p style={{ fontSize: 11.5, color: "var(--mk-text-muted)", marginTop: 2 }}>{subtitle}</p>}
          </div>
          <button onClick={onClose} className="ghost-btn"><i className="ti ti-x" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

const lbl: React.CSSProperties = { display: "block", fontSize: 11, color: "var(--mk-text-muted)", marginBottom: 4, fontFamily: "monospace" };
const inp: React.CSSProperties = { width: "100%", padding: "8px 12px", borderRadius: 8, border: "0.5px solid var(--mk-border)", background: "var(--mk-surface-2)", color: "var(--mk-text)", fontSize: 12.5 };
