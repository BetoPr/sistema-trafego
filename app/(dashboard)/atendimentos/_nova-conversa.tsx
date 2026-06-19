"use client";

import { useState } from "react";
import { Balao } from "@/components/ui/Balao";

interface CanalOpt {
  id: string;
  nome: string;
  status: string;
  numero_conectado?: string | null;
}

function digits(s: string): string {
  return (s || "").replace(/\D/g, "");
}

const ERROS: Record<string, string> = {
  numero_invalido: "Número inválido. Confira DDD + número.",
  canal_obrigatorio: "Selecione um canal.",
  canal_nao_encontrado: "Canal não encontrado.",
  canal_desconectado: "Esse canal está desconectado. Reconecte em Canais.",
  contato_falhou: "Não consegui criar o contato.",
  ticket_falhou: "Não consegui abrir a conversa.",
};

/**
 * Botão "Nova conversa" (avulsa): digita um número → abre/reaproveita um ticket
 * no canal escolhido e leva direto pro chat. Fica ao lado do sino no header.
 */
export function NovaConversa({ canais }: { canais: CanalOpt[] }) {
  const [aberto, setAberto] = useState(false);
  const [numero, setNumero] = useState("");
  const [nome, setNome] = useState("");
  const [canalId, setCanalId] = useState("");
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const conectados = canais.filter((c) => c.status === "connected");

  function abrir() {
    setErro(null);
    setNumero("");
    setNome("");
    setCanalId(conectados[0]?.id || "");
    setAberto(true);
  }

  async function criar() {
    setErro(null);
    if (!canalId) {
      setErro("Selecione um canal conectado.");
      return;
    }
    if (digits(numero).length < 10) {
      setErro("Número incompleto. Use DDD + número.");
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/atendimentos/nova-conversa", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ numero, canalId, nome }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErro(ERROS[j.error as string] || "Não consegui iniciar a conversa.");
        setBusy(false);
        return;
      }
      // Abre o ticket recém-criado (full load garante snapshot fresco do servidor).
      window.location.href = `/atendimentos?t=${j.ticketId}`;
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <>
      <button onClick={abrir} className="ghost-btn" style={btnHdr} title="Nova conversa">
        <i className="ti ti-message-plus" />
      </button>

      <Balao open={aberto} onClose={() => !busy && setAberto(false)} titulo="Nova conversa" icone="ti-message-plus" largura={420}
        footer={
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={() => setAberto(false)} className="ghost-btn" disabled={busy}>Cancelar</button>
            <button onClick={criar} className="cta-btn" disabled={busy || conectados.length === 0}>
              {busy ? "Abrindo…" : "Abrir conversa"}
            </button>
          </div>
        }
      >
        {conectados.length === 0 ? (
          <div style={{ fontSize: 12.5, color: "#E8B5AC", background: "rgba(201,112,100,0.12)", border: "0.5px solid rgba(201,112,100,0.4)", borderRadius: 8, padding: 12, lineHeight: 1.5 }}>
            <i className="ti ti-plug-connected-x" style={{ marginRight: 6 }} />
            Nenhum canal do WhatsApp conectado. Conecte um em <a href="/canais" style={{ color: "var(--mk-accent)", textDecoration: "underline" }}>Canais</a> pra iniciar conversas.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={lbl}>Número (com DDD)</label>
              <input
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                inputMode="tel"
                autoFocus
                placeholder="11 99999-9999"
                onKeyDown={(e) => { if (e.key === "Enter") criar(); }}
                style={inp}
              />
              <div style={hint}>Sem DDI vira Brasil (+55). Ex.: 11 98888-7777</div>
            </div>

            <div>
              <label style={lbl}>Nome (opcional)</label>
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Como salvar o contato"
                onKeyDown={(e) => { if (e.key === "Enter") criar(); }}
                style={inp}
              />
            </div>

            {conectados.length > 1 && (
              <div>
                <label style={lbl}>Enviar pelo canal</label>
                <select value={canalId} onChange={(e) => setCanalId(e.target.value)} style={inp}>
                  {conectados.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}{c.numero_conectado ? ` · ${c.numero_conectado}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {erro && (
              <div style={{ fontSize: 11.5, color: "#E8B5AC", display: "flex", alignItems: "center", gap: 6 }}>
                <i className="ti ti-alert-circle" /> {erro}
              </div>
            )}
            <div style={{ fontSize: 10.5, color: "var(--mk-text-muted)", lineHeight: 1.5 }}>
              <i className="ti ti-info-circle" style={{ marginRight: 4 }} />
              Só funciona com números que têm WhatsApp. Se já houver conversa aberta com esse contato, ela é reaproveitada.
            </div>
          </div>
        )}
      </Balao>
    </>
  );
}

const btnHdr: React.CSSProperties = {
  background: "transparent",
  border: "0.5px solid transparent",
  borderRadius: 6,
  padding: "4px 7px",
  cursor: "pointer",
  color: "var(--mk-text-secondary)",
  fontSize: 14,
};
const lbl: React.CSSProperties = { display: "block", fontSize: 11, color: "var(--mk-text-muted)", marginBottom: 4, fontFamily: "monospace" };
const inp: React.CSSProperties = { width: "100%", padding: "8px 12px", borderRadius: 8, border: "0.5px solid var(--mk-border)", background: "var(--mk-surface-2)", color: "var(--mk-text)", fontSize: 12.5 };
const hint: React.CSSProperties = { fontSize: 10, color: "var(--mk-text-muted)", marginTop: 4 };
