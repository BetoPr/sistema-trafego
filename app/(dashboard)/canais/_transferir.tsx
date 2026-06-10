"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Balao } from "@/components/ui/Balao";
import { transferirCanalTudo } from "./_actions";

interface CanalOpt {
  id: string;
  nome: string;
  status: string;
}

/**
 * Transferência de canal: move todo o histórico (tickets + conversas +
 * fechamentos) deste canal pra outra sessão escolhida.
 */
export function TransferirCanalBtn({ canalId, canalNome, outros }: { canalId: string; canalNome: string; outros: CanalOpt[] }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [destino, setDestino] = useState("");
  const [executando, setExecutando] = useState(false);
  const [resultado, setResultado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function transferir() {
    const alvo = outros.find((c) => c.id === destino);
    if (!alvo) return;
    if (!confirm(`Transferir TODO o histórico de "${canalNome}" para "${alvo.nome}"?\n\nTodos os tickets, conversas e fechamentos passam a pertencer ao canal de destino. Ação não tem desfazer automático.`)) return;
    setExecutando(true);
    setErro(null);
    try {
      const r = await transferirCanalTudo(canalId, destino);
      if (!r.ok) { setErro(r.msg); return; }
      setResultado(`${r.movidos} ticket(s) transferido(s) pra "${alvo.nome}".`);
      router.refresh();
    } finally {
      setExecutando(false);
    }
  }

  function fechar() {
    setAberto(false);
    setDestino("");
    setResultado(null);
    setErro(null);
  }

  return (
    <>
      <button onClick={() => setAberto(true)} className="ghost-btn" style={{ fontSize: 11, padding: "4px 8px" }} title="Transferir canal (move todo o histórico pra outra sessão)">
        <i className="ti ti-arrows-exchange" />
      </button>

      <Balao open={aberto} onClose={fechar} titulo={`Transferir canal — ${canalNome}`} icone="ti-arrows-exchange" largura={480}>
        {resultado ? (
          <div style={{ textAlign: "center", padding: 24 }}>
            <i className="ti ti-circle-check" style={{ fontSize: 42, color: "#10b981" }} />
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 10 }}>{resultado}</div>
            <button onClick={fechar} className="cta-btn" style={{ marginTop: 16, fontSize: 12 }}>Fechar</button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ background: "rgba(201,168,118,0.15)", borderLeft: "3px solid #C9A876", padding: 10, borderRadius: 6, fontSize: 11.5, color: "var(--mk-text-secondary)", lineHeight: 1.6 }}>
              Move <strong>todos os tickets</strong> deste canal — com histórico de conversas, mensagens, transcrições e fechamentos — pra sessão de destino. Use quando precisar trocar de número/instância sem perder nada.
            </div>

            {outros.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--mk-text-muted)", textAlign: "center", padding: 16 }}>
                Não há outro canal cadastrado pra receber a transferência.
              </div>
            ) : (
              <>
                <div>
                  <label style={{ display: "block", fontSize: 11, color: "var(--mk-text-muted)", marginBottom: 4, fontFamily: "monospace" }}>SESSÃO DE DESTINO</label>
                  <select value={destino} onChange={(e) => setDestino(e.target.value)} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "0.5px solid var(--mk-border)", background: "var(--mk-surface-2)", color: "var(--mk-text)", fontSize: 12.5 }}>
                    <option value="">— Selecione —</option>
                    {outros.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.status === "connected" ? "🟢" : "🔴"} {c.nome}
                      </option>
                    ))}
                  </select>
                </div>
                {erro && <div style={{ padding: 8, background: "rgba(201,112,100,0.12)", borderRadius: 6, fontSize: 11.5, color: "#C97064" }}>{erro}</div>}
                <button onClick={transferir} disabled={!destino || executando} className="cta-btn" style={{ fontSize: 12 }}>
                  <i className={`ti ${executando ? "ti-loader-2" : "ti-arrows-exchange"}`} style={executando ? { animation: "spin 0.8s linear infinite", display: "inline-block" } : undefined} />
                  {executando ? " Transferindo…" : " Transferir tudo"}
                </button>
                <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
              </>
            )}
          </div>
        )}
      </Balao>
    </>
  );
}
