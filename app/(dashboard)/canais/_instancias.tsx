"use client";

import { useState } from "react";
import { listarInstanciasDisponiveis, importarCanalExistente } from "./_actions";

interface Instancia {
  id: string;
  name: string;
  status: string;
  profileName: string | null;
  numberConectado: string | null;
}

/**
 * Busca on-demand de instâncias no servidor UAZAPI.
 * Antes rodava em todo load da página (1-3s de UAZAPI no caminho crítico);
 * agora só quando o admin clica em buscar.
 */
export function InstanciasDisponiveis() {
  const [instancias, setInstancias] = useState<Instancia[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [tokenAberto, setTokenAberto] = useState<string | null>(null);

  async function buscar() {
    setLoading(true);
    setErro(null);
    try {
      const r = await listarInstanciasDisponiveis();
      setInstancias(r);
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mk-card mk-card-lg" id="importar" style={{ marginBottom: 14, borderLeft: "3px solid #6B8E4E" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <h3 className="card-title" style={{ marginBottom: 4 }}>
            <i className="ti ti-download" style={{ marginRight: 6, color: "#6B8E4E" }} />
            Sessões existentes no servidor
          </h3>
          <p style={{ fontSize: 11.5, color: "var(--mk-text-muted)" }}>
            Busca conexões e desconexões já existentes no servidor que ainda não foram importadas pro sistema.
          </p>
        </div>
        <button onClick={buscar} disabled={loading} className="cta-btn" style={{ fontSize: 12 }}>
          <i className={`ti ${loading ? "ti-loader-2" : "ti-radar-2"}`} style={loading ? { animation: "spin 1s linear infinite", display: "inline-block" } : undefined} />
          {loading ? " Buscando…" : " Buscar instâncias"}
        </button>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>

      {erro && (
        <div style={{ marginTop: 12, padding: 10, background: "rgba(201,112,100,0.12)", borderRadius: 8, fontSize: 12, color: "#C97064" }}>
          {erro}
        </div>
      )}

      {instancias !== null && !erro && (
        <div style={{ marginTop: 14 }}>
          {instancias.length === 0 ? (
            <div style={{ padding: 16, textAlign: "center", fontSize: 12, color: "var(--mk-text-muted)" }}>
              Nenhuma instância nova — tudo que existe no servidor já está importado.
            </div>
          ) : (
            <>
              <div style={{ fontSize: 11.5, color: "var(--mk-text-secondary)", marginBottom: 10 }}>
                {instancias.length} instância(s) ainda não importadas:
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {instancias.map((i) => {
                  const conectada = i.status === "connected";
                  const aberto = tokenAberto === i.id;
                  return (
                    <div key={i.id} style={{ borderRadius: 8, border: "0.5px solid var(--mk-border)", background: "var(--mk-surface)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px" }}>
                        <div style={{ width: 36, height: 36, borderRadius: 9, background: "linear-gradient(135deg, #25D366, #128C7E)", display: "flex", alignItems: "center", justifyContent: "center", color: "#FFFDF8", flexShrink: 0 }}>
                          <i className="ti ti-brand-whatsapp" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{i.name}</div>
                          <div style={{ fontSize: 10.5, color: "var(--mk-text-muted)", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {i.id} · {i.profileName || "—"} · {i.numberConectado || "—"}
                          </div>
                        </div>
                        <span className={`mk-badge ${conectada ? "b-green" : "b-gray"}`} style={{ fontSize: 10 }}>
                          {i.status.toUpperCase()}
                        </span>
                        <button onClick={() => setTokenAberto(aberto ? null : i.id)} className="ghost-btn" style={{ fontSize: 11 }}>
                          <i className="ti ti-download" /> {aberto ? "Fechar" : "Importar"}
                        </button>
                      </div>
                      {aberto && (
                        <form action={importarCanalExistente} style={{ display: "flex", gap: 8, alignItems: "flex-end", padding: "0 12px 12px", borderTop: "0.5px solid var(--mk-border)", paddingTop: 10 }}>
                          <input type="hidden" name="nome" value={i.name} />
                          <div style={{ flex: 1 }}>
                            <label style={{ display: "block", fontSize: 10.5, color: "var(--mk-text-muted)", marginBottom: 4, fontFamily: "monospace" }}>
                              INSTANCE TOKEN (UUID) — pega no painel do provedor desta sessão
                            </label>
                            <input
                              name="instance_token"
                              required
                              placeholder="ex: 04a631c8-d7bf-420b-87c1-…"
                              style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "0.5px solid var(--mk-border)", background: "var(--mk-surface-2)", color: "var(--mk-text)", fontSize: 12, fontFamily: "monospace" }}
                            />
                          </div>
                          <button type="submit" className="cta-btn" style={{ fontSize: 11.5 }}>
                            <i className="ti ti-check" /> Importar
                          </button>
                        </form>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
