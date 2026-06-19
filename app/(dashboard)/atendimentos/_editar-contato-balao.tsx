"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Balao } from "@/components/ui/Balao";
import { salvarContatoBasico } from "@/app/(dashboard)/contatos/_actions";

/**
 * Edição rápida do contato em balão (fundo embaçado) — só os campos editáveis.
 * Sem navegar pra /contatos, sem follow-up. Usado no painel de detalhes.
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
      largura={420}
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
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <label style={lbl}>Nome</label>
          <input value={nome} onChange={(e) => setNome(e.target.value)} autoFocus style={inp} placeholder="Nome do contato" />
        </div>
        <div>
          <label style={lbl}>WhatsApp</label>
          <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} style={inp} placeholder="5511999999999" />
          <div style={{ fontSize: 10.5, color: "var(--mk-text-muted)", marginTop: 4 }}>Só dígitos (ex: 5511999999999). O estado é detectado pelo DDD.</div>
        </div>
      </div>
    </Balao>
  );
}

const lbl: React.CSSProperties = { display: "block", fontSize: 11, color: "var(--mk-text-muted)", marginBottom: 4, fontFamily: "monospace" };
const inp: React.CSSProperties = { width: "100%", padding: "8px 12px", borderRadius: 8, border: "0.5px solid var(--mk-border)", background: "var(--mk-surface-2)", color: "var(--mk-text)", fontSize: 12.5, boxSizing: "border-box" };
