"use client";

import { useState } from "react";

interface Canal {
  id: string;
  nome: string;
}

interface Grupo {
  jid: string;
  nome: string;
  membros: number | null;
}

interface Participante {
  numero: string;
  admin: boolean;
}

export function GestaoGrupos({ canais }: { canais: Canal[] }) {
  const [canalSel, setCanalSel] = useState("");
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [grupoSel, setGrupoSel] = useState("");
  const [loadingGrupos, setLoadingGrupos] = useState(false);
  const [loadingPart, setLoadingPart] = useState(false);
  const [resultado, setResultado] = useState<null | { tipo: "grupos"; grupos: Grupo[] } | { tipo: "participantes"; grupoNome: string; participantes: Participante[] }>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function carregarGrupos(canalId: string): Promise<Grupo[]> {
    const r = await fetch(`/api/grupos/listar?canal=${canalId}`);
    const j = await r.json();
    if (!r.ok) throw new Error(j.msg || j.error || r.statusText);
    return j.grupos || [];
  }

  async function onTrocarCanal(canalId: string) {
    setCanalSel(canalId);
    setGrupoSel("");
    setGrupos([]);
    setResultado(null);
    setErro(null);
    if (!canalId) return;
    setLoadingGrupos(true);
    try {
      setGrupos(await carregarGrupos(canalId));
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingGrupos(false);
    }
  }

  async function listarIdsGrupos() {
    if (!canalSel) { alert("Escolha uma conexão primeiro."); return; }
    setErro(null);
    setLoadingGrupos(true);
    try {
      const gs = grupos.length ? grupos : await carregarGrupos(canalSel);
      setGrupos(gs);
      setResultado({ tipo: "grupos", grupos: gs });
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingGrupos(false);
    }
  }

  async function listarParticipantes() {
    if (!canalSel) { alert("Escolha uma conexão primeiro."); return; }
    if (!grupoSel) { alert("Escolha um grupo."); return; }
    setErro(null);
    setLoadingPart(true);
    try {
      const r = await fetch(`/api/grupos/participantes?canal=${canalSel}&jid=${encodeURIComponent(grupoSel)}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.msg || j.error || r.statusText);
      setResultado({ tipo: "participantes", grupoNome: j.grupo?.nome || "", participantes: j.participantes || [] });
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingPart(false);
    }
  }

  function exportarXls() {
    if (!canalSel) { alert("Escolha uma conexão primeiro."); return; }
    // Com grupo selecionado e resultado de participantes na tela → exporta participantes.
    // Senão exporta lista de grupos.
    const qs = resultado?.tipo === "participantes" && grupoSel
      ? `canal=${canalSel}&jid=${encodeURIComponent(grupoSel)}`
      : `canal=${canalSel}`;
    window.open(`/api/grupos/export-xls?${qs}`, "_blank");
  }

  function limpar() {
    setResultado(null);
    setErro(null);
  }

  const grupoNomeSel = grupos.find((g) => g.jid === grupoSel)?.nome;

  return (
    <div className="mk-card mk-card-lg">
      <h3 className="card-title" style={{ marginBottom: 16 }}>
        Gestão de Grupos em Massa <i className="ti ti-help-circle" style={{ fontSize: 14, color: "var(--mk-text-muted)" }} title="Liste grupos e participantes do WhatsApp conectado e exporte pra planilha" />
      </h3>

      <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 10 }}>Listar Participantes</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
        <div>
          <label style={lbl}>Conexão</label>
          <select value={canalSel} onChange={(e) => onTrocarCanal(e.target.value)} style={inp}>
            <option value="">Selecione uma conexão</option>
            {canais.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>Grupos</label>
          <select value={grupoSel} onChange={(e) => { setGrupoSel(e.target.value); }} disabled={!canalSel || loadingGrupos} style={{ ...inp, opacity: !canalSel ? 0.5 : 1 }}>
            <option value="">
              {!canalSel ? "Selecione uma conexão primeiro" : loadingGrupos ? "Carregando grupos…" : grupos.length === 0 ? "Sem grupos nesta conexão" : "Selecione um grupo"}
            </option>
            {grupos.map((g) => (
              <option key={g.jid} value={g.jid}>{g.nome}{g.membros != null ? ` (${g.membros})` : ""}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <button onClick={listarIdsGrupos} disabled={loadingGrupos} className="ghost-btn" style={{ fontSize: 12 }}>
          <i className="ti ti-list-numbers" /> {loadingGrupos ? "Carregando…" : "Listar IDs dos Grupos"}
        </button>
        <button onClick={listarParticipantes} disabled={loadingPart} className="ghost-btn" style={{ fontSize: 12 }}>
          <i className="ti ti-users" /> {loadingPart ? "Carregando…" : "Listar Participantes"}
        </button>
        <button onClick={exportarXls} className="ghost-btn" style={{ fontSize: 12 }}>
          <i className="ti ti-file-spreadsheet" /> Exportar para XLS
        </button>
        <button onClick={limpar} style={{ fontSize: 12, padding: "6px 14px", borderRadius: 8, border: 0, background: "#8B2E2E", color: "#FFFDF8", cursor: "pointer", fontFamily: "inherit" }}>
          <i className="ti ti-eraser" /> Limpar
        </button>
      </div>

      {erro && (
        <div style={{ padding: 12, background: "rgba(201,112,100,0.12)", borderRadius: 8, fontSize: 12, color: "#C97064", marginBottom: 14 }}>
          UAZAPI erro: {erro}
        </div>
      )}

      {/* Resultado */}
      {resultado?.tipo === "grupos" && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--mk-text-secondary)", marginBottom: 8 }}>
            {resultado.grupos.length} grupo{resultado.grupos.length === 1 ? "" : "s"}
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--mk-text-muted)", fontSize: 10.5 }}>
                <th style={th}>ID (JID)</th>
                <th style={th}>Nome</th>
                <th style={{ ...th, textAlign: "right" }}>Membros</th>
              </tr>
            </thead>
            <tbody>
              {resultado.grupos.map((g) => (
                <tr key={g.jid} style={{ borderTop: "0.5px solid var(--mk-border)" }}>
                  <td style={{ ...td, fontFamily: "monospace", fontSize: 11 }}>{g.jid}</td>
                  <td style={td}>{g.nome}</td>
                  <td style={{ ...td, textAlign: "right" }}>{g.membros ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {resultado?.tipo === "participantes" && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--mk-text-secondary)", marginBottom: 8 }}>
            {resultado.participantes.length} participante{resultado.participantes.length === 1 ? "" : "s"} — {resultado.grupoNome || grupoNomeSel}
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--mk-text-muted)", fontSize: 10.5 }}>
                <th style={th}>Número</th>
                <th style={th}>Admin</th>
              </tr>
            </thead>
            <tbody>
              {resultado.participantes.map((p) => (
                <tr key={p.numero} style={{ borderTop: "0.5px solid var(--mk-border)" }}>
                  <td style={{ ...td, fontFamily: "monospace" }}>{p.numero}</td>
                  <td style={td}>{p.admin ? <span style={{ color: "#C9A876" }}><i className="ti ti-shield-star" /> Admin</span> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!resultado && !erro && (
        <div style={{ padding: 24, textAlign: "center", color: "var(--mk-text-muted)", fontSize: 12 }}>
          Escolha a conexão e use os botões acima.
        </div>
      )}
    </div>
  );
}

const lbl: React.CSSProperties = { display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--mk-text-secondary)", marginBottom: 5 };
const inp: React.CSSProperties = { width: "100%", padding: "9px 12px", borderRadius: 8, border: "0.5px solid var(--mk-border)", background: "var(--mk-surface-2)", color: "var(--mk-text)", fontSize: 12.5 };
const th: React.CSSProperties = { padding: "7px 8px" };
const td: React.CSSProperties = { padding: "8px" };
