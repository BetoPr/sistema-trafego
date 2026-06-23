"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition } from "react";
import { salvarEtiquetasDoAlvo, criarEtiquetaInline } from "./_atribuicoes-actions";

export interface EtiquetaOpt {
  id: string;
  nome: string;
  cor: string;
  etiqueta_pai_id?: string | null;
}

const PALETA_RAPIDA = ["#00E19A", "#14b8a6", "#3b82f6", "#8b5cf6", "#ec4899", "#f43f5e", "#f59e0b", "#84cc16"];

export interface ConjuntoNode {
  id: string;
  nome: string;
  status: string | null;
  etiqueta_ids: string[];
}
export interface CampanhaNode {
  id: string;
  nome: string;
  status: string | null;
  cliente_nome: string | null;
  etiqueta_ids: string[];
  conjuntos: ConjuntoNode[];
}

interface Props {
  campanhas: CampanhaNode[];
  etiquetas: EtiquetaOpt[];
}

export default function Atribuicoes({ campanhas: campanhasInit, etiquetas: etiquetasInit }: Props) {
  const [campanhas, setCampanhas] = useState(campanhasInit);
  const [etiquetas, setEtiquetas] = useState<EtiquetaOpt[]>(etiquetasInit);
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState<Set<string>>(new Set());
  const [novaLinhaAberto, setNovaLinhaAberto] = useState(false);
  const [novaLinhaNome, setNovaLinhaNome] = useState("");
  const [novaLinhaCor, setNovaLinhaCor] = useState(PALETA_RAPIDA[0]);
  const [, startTransition] = useTransition();

  const etMap = useMemo(() => new Map(etiquetas.map((e) => [e.id, e])), [etiquetas]);
  const linhasMae = useMemo(() => etiquetas.filter((e) => !e.etiqueta_pai_id), [etiquetas]);

  function criarLinha() {
    const nome = novaLinhaNome.trim();
    if (!nome) return;
    startTransition(async () => {
      const r = await criarEtiquetaInline(nome, novaLinhaCor, null);
      if (!r.ok || !r.id) {
        alert(r.msg || "Falha");
        return;
      }
      setEtiquetas((arr) => [...arr, { id: r.id!, nome, cor: novaLinhaCor, etiqueta_pai_id: null }]);
      setNovaLinhaNome("");
      setNovaLinhaCor(PALETA_RAPIDA[0]);
      setNovaLinhaAberto(false);
    });
  }

  function criadaInline(nova: EtiquetaOpt) {
    setEtiquetas((arr) => (arr.some((x) => x.id === nova.id) ? arr : [...arr, nova]));
  }

  function toggleAberto(id: string) {
    setAberto((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function updateCampanha(id: string, ids: string[]) {
    setCampanhas((cs) => cs.map((c) => (c.id === id ? { ...c, etiqueta_ids: ids } : c)));
  }
  function updateConjunto(campId: string, conjId: string, ids: string[]) {
    setCampanhas((cs) =>
      cs.map((c) =>
        c.id === campId
          ? { ...c, conjuntos: c.conjuntos.map((cj) => (cj.id === conjId ? { ...cj, etiqueta_ids: ids } : cj)) }
          : c,
      ),
    );
  }

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return campanhas;
    return campanhas.filter(
      (c) =>
        c.nome.toLowerCase().includes(q) ||
        (c.cliente_nome || "").toLowerCase().includes(q) ||
        c.conjuntos.some((cj) => cj.nome.toLowerCase().includes(q)),
    );
  }, [campanhas, busca]);

  return (
    <div className="mk-card" style={{ padding: 16, marginTop: 16, borderRadius: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <i className="ti ti-tags" style={{ fontSize: 16, color: "var(--mk-accent-2)" }} />
        <span style={{ fontSize: 13, fontWeight: 700 }}>Etiquetas por campanha / conjunto</span>
      </div>
      <p style={{ fontSize: 12, color: "var(--mk-text-muted)", margin: "0 0 12px", lineHeight: 1.5 }}>
        <strong>Pasta</strong> agrupa um conjunto de campanhas (ex.: <em>Restauração</em>). <strong>Etiqueta</strong> marca
        cada campanha individual dentro da Pasta (ex.: <em>Bebê</em>, <em>Mofo</em>, <em>Casal</em>). Quando um lead chega
        pelo anúncio, recebe Pasta + Etiqueta automaticamente — daí no Dashboard você filtra por Pasta (visão geral) ou
        Etiqueta (campanha específica).
      </p>

      {/* Linhas comerciais (etiquetas-mãe) + botão Nova Linha */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 12px",
          background: "var(--mk-bg-deep)",
          border: ".5px solid var(--mk-border)",
          borderRadius: 9,
          marginBottom: 10,
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".4px", color: "var(--mk-text-muted)" }}>
          PASTAS
        </span>
        {linhasMae.length === 0 ? (
          <span style={{ fontSize: 11.5, color: "var(--mk-text-muted)", fontStyle: "italic" }}>
            Nenhuma criada ainda.
          </span>
        ) : (
          linhasMae.map((l) => (
            <span
              key={l.id}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "2px 8px",
                background: `${l.cor}22`,
                color: l.cor,
                border: `1px solid ${l.cor}`,
                borderRadius: 12,
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              <i className="ti ti-folder" style={{ fontSize: 10 }} /> {l.nome}
            </span>
          ))
        )}
        <div style={{ flex: 1 }} />
        {!novaLinhaAberto ? (
          <button
            type="button"
            onClick={() => setNovaLinhaAberto(true)}
            className="ghost-btn"
            style={{ fontSize: 11.5, padding: "5px 10px", borderRadius: 7 }}
          >
            <i className="ti ti-folder-plus" /> Nova Pasta
          </button>
        ) : (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <input
              autoFocus
              value={novaLinhaNome}
              onChange={(e) => setNovaLinhaNome(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && criarLinha()}
              placeholder="Ex.: Restauração"
              style={{
                padding: "5px 8px",
                background: "var(--mk-surface-2)",
                border: ".5px solid var(--mk-border)",
                borderRadius: 7,
                color: "var(--mk-text)",
                fontSize: 12,
                width: 160,
              }}
            />
            <div style={{ display: "inline-flex", gap: 2 }}>
              {PALETA_RAPIDA.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNovaLinhaCor(c)}
                  title={c}
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 4,
                    background: c,
                    border: c === novaLinhaCor ? "2px solid var(--mk-text)" : "1px solid rgba(255,255,255,.2)",
                    cursor: "pointer",
                  }}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={criarLinha}
              className="cta-btn"
              style={{ fontSize: 11.5, padding: "5px 10px", borderRadius: 7, fontWeight: 700 }}
            >
              Criar
            </button>
            <button
              type="button"
              onClick={() => {
                setNovaLinhaAberto(false);
                setNovaLinhaNome("");
              }}
              className="ghost-btn"
              style={{ fontSize: 11.5, padding: "5px 8px", borderRadius: 7 }}
            >
              ×
            </button>
          </div>
        )}
      </div>

      {etiquetas.length === 0 && !novaLinhaAberto && (
        <div
          style={{
            padding: 12,
            background: "rgba(240,163,94,0.10)",
            border: ".5px solid rgba(240,163,94,0.32)",
            borderRadius: 9,
            fontSize: 12,
            color: "var(--mk-text)",
            marginBottom: 12,
          }}
        >
          <i className="ti ti-alert-triangle" style={{ marginRight: 6, color: "#f0a35e" }} />
          Crie uma <strong>Pasta</strong> acima (ex.: &quot;Restauração&quot;). Depois cria as Etiquetas vinculadas às campanhas Meta de dentro dela.
        </div>
      )}

      <input
        type="text"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Filtrar campanhas / conjuntos…"
        style={{
          width: "100%",
          padding: "9px 12px",
          background: "var(--mk-bg-deep)",
          border: ".5px solid var(--mk-border)",
          borderRadius: 9,
          color: "var(--mk-text)",
          fontSize: 12.5,
          marginBottom: 10,
        }}
      />

      {campanhas.length === 0 ? (
        <div
          style={{
            padding: 18,
            textAlign: "center",
            border: "1px dashed var(--mk-border)",
            borderRadius: 10,
            color: "var(--mk-text-secondary)",
            fontSize: 12.5,
          }}
        >
          Nenhuma campanha Meta sincronizada ainda. Conecte uma conta em{" "}
          <strong>Integrações → Meta Ads</strong>.
        </div>
      ) : filtradas.length === 0 ? (
        <div style={{ padding: 14, textAlign: "center", color: "var(--mk-text-muted)", fontSize: 12 }}>
          Nada bate com o filtro.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {filtradas.map((c) => {
            const open = aberto.has(c.id);
            return (
              <CampanhaCard
                key={c.id}
                camp={c}
                etiquetas={etiquetas}
                linhasMae={linhasMae}
                etMap={etMap}
                open={open}
                onToggleOpen={() => toggleAberto(c.id)}
                onUpdateCampanha={(ids) => updateCampanha(c.id, ids)}
                onUpdateConjunto={(cjId, ids) => updateConjunto(c.id, cjId, ids)}
                onEtiquetaCriada={criadaInline}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function CampanhaCard({
  camp,
  etiquetas,
  linhasMae,
  etMap,
  open,
  onToggleOpen,
  onUpdateCampanha,
  onUpdateConjunto,
  onEtiquetaCriada,
}: {
  camp: CampanhaNode;
  etiquetas: EtiquetaOpt[];
  linhasMae: EtiquetaOpt[];
  etMap: Map<string, EtiquetaOpt>;
  open: boolean;
  onToggleOpen: () => void;
  onUpdateCampanha: (ids: string[]) => void;
  onUpdateConjunto: (conjId: string, ids: string[]) => void;
  onEtiquetaCriada: (e: EtiquetaOpt) => void;
}) {
  return (
    <div
      style={{
        border: ".5px solid var(--mk-border)",
        borderRadius: 10,
        background: "var(--mk-surface)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 12px",
          cursor: camp.conjuntos.length > 0 ? "pointer" : "default",
        }}
        onClick={camp.conjuntos.length > 0 ? onToggleOpen : undefined}
      >
        {camp.conjuntos.length > 0 ? (
          <i
            className={`ti ti-chevron-${open ? "down" : "right"}`}
            style={{ fontSize: 14, color: "var(--mk-text-muted)" }}
          />
        ) : (
          <span style={{ width: 14 }} />
        )}
        <i className="ti ti-speakerphone" style={{ fontSize: 15, color: "#1877F2" }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--mk-text)" }}>{camp.nome}</div>
          <div style={{ fontSize: 10.5, color: "var(--mk-text-muted)", marginTop: 1 }}>
            {camp.cliente_nome ? `${camp.cliente_nome} · ` : ""}
            {camp.conjuntos.length} conjunto{camp.conjuntos.length === 1 ? "" : "s"}
            {camp.status && camp.status !== "ACTIVE" ? ` · ${camp.status.toLowerCase()}` : ""}
          </div>
        </div>
        <EtiquetaCell
          alvo="campanha"
          alvoId={camp.id}
          etiquetas={etiquetas}
          linhasMae={linhasMae}
          etMap={etMap}
          selecionadas={camp.etiqueta_ids}
          onSalvo={onUpdateCampanha}
          onEtiquetaCriada={onEtiquetaCriada}
        />
      </div>

      {open && camp.conjuntos.length > 0 && (
        <div
          style={{
            borderTop: ".5px solid var(--mk-border)",
            background: "var(--mk-bg-deep)",
            padding: "8px 12px 8px 28px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {camp.conjuntos.map((cj) => (
            <div
              key={cj.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 0",
                borderBottom: ".5px solid var(--mk-border)",
              }}
            >
              <i className="ti ti-target" style={{ fontSize: 12, color: "var(--mk-text-muted)" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: "var(--mk-text)" }}>{cj.nome}</div>
                {cj.status && cj.status !== "ACTIVE" && (
                  <div style={{ fontSize: 9.5, color: "var(--mk-text-muted)" }}>{cj.status.toLowerCase()}</div>
                )}
              </div>
              <EtiquetaCell
                alvo="conjunto"
                alvoId={cj.id}
                etiquetas={etiquetas}
                linhasMae={linhasMae}
                etMap={etMap}
                selecionadas={cj.etiqueta_ids}
                onSalvo={(ids) => onUpdateConjunto(cj.id, ids)}
                onEtiquetaCriada={onEtiquetaCriada}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EtiquetaCell({
  alvo,
  alvoId,
  etiquetas,
  linhasMae,
  etMap,
  selecionadas,
  onSalvo,
  onEtiquetaCriada,
}: {
  alvo: "campanha" | "conjunto";
  alvoId: string;
  etiquetas: EtiquetaOpt[];
  linhasMae: EtiquetaOpt[];
  etMap: Map<string, EtiquetaOpt>;
  selecionadas: string[];
  onSalvo: (ids: string[]) => void;
  onEtiquetaCriada: (e: EtiquetaOpt) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [sel, setSel] = useState<Set<string>>(new Set(selecionadas));
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [criandoAberto, setCriandoAberto] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoPai, setNovoPai] = useState<string>("");
  const [novoCor, setNovoCor] = useState(PALETA_RAPIDA[0]);
  const [abrePraCima, setAbrePraCima] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  // Sincroniza sel local quando prop selecionadas muda (após onSalvo cascade).
  useEffect(() => {
    if (!aberto) setSel(new Set(selecionadas));
  }, [selecionadas, aberto]);

  // Detecta overflow vertical antes do paint: abre pra cima se faltar espaço.
  useLayoutEffect(() => {
    if (!aberto || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const espacoAbaixo = window.innerHeight - r.bottom;
    setAbrePraCima(espacoAbaixo < 360 && r.top > 360);
  }, [aberto]);

  function criarNova() {
    const nome = novoNome.trim();
    if (!nome) return;
    startTransition(async () => {
      const r = await criarEtiquetaInline(nome, novoCor, novoPai || null);
      if (!r.ok || !r.id) {
        setErro(r.msg || "Falha");
        return;
      }
      const nova: EtiquetaOpt = { id: r.id, nome, cor: novoCor, etiqueta_pai_id: novoPai || null };
      onEtiquetaCriada(nova);
      setSel((s) => new Set([...s, nova.id]));
      setNovoNome("");
      setNovoPai("");
      setNovoCor(PALETA_RAPIDA[0]);
      setCriandoAberto(false);
      setErro(null);
    });
  }

  function abrir() {
    setSel(new Set(selecionadas));
    setErro(null);
    setAberto(true);
  }
  function fechar() {
    setAberto(false);
  }
  function toggleEt(id: string) {
    setSel((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }
  function salvar() {
    const ids = Array.from(sel);
    setErro(null);
    startTransition(async () => {
      const r = await salvarEtiquetasDoAlvo(alvo, alvoId, ids);
      if (!r.ok) {
        setErro(r.msg || "Falha ao salvar");
        return;
      }
      onSalvo(ids);
      setAberto(false);
    });
  }

  return (
    <div style={{ position: "relative", flex: "none" }} onClick={(e) => e.stopPropagation()}>
      <button
        ref={btnRef}
        type="button"
        onClick={abrir}
        style={{
          background: selecionadas.length > 0 ? "rgba(0,225,154,.10)" : "transparent",
          border: selecionadas.length > 0 ? ".5px solid rgba(0,225,154,.4)" : ".5px solid var(--mk-border)",
          borderRadius: 8,
          padding: "5px 10px",
          fontSize: 11.5,
          fontWeight: 600,
          color: selecionadas.length > 0 ? "var(--mk-accent-2)" : "var(--mk-text-secondary)",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          maxWidth: 280,
          overflow: "hidden",
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
        }}
        title={
          selecionadas.length === 0
            ? "Vincular etiqueta"
            : selecionadas.map((id) => etMap.get(id)?.nome || id).join(", ")
        }
      >
        {selecionadas.length === 0 ? (
          <>
            <i className="ti ti-plus" /> Vincular etiqueta
          </>
        ) : (
          <>
            <i className="ti ti-tag" />
            {selecionadas
              .slice(0, 2)
              .map((id) => etMap.get(id)?.nome || "?")
              .join(", ")}
            {selecionadas.length > 2 ? ` +${selecionadas.length - 2}` : ""}
          </>
        )}
      </button>

      {aberto && (
        <>
          <div
            style={{ position: "fixed", inset: 0, zIndex: 39 }}
            onClick={fechar}
          />
          <div
            style={{
              position: "absolute",
              [abrePraCima ? "bottom" : "top"]: "calc(100% + 6px)",
              right: 0,
              width: 280,
              maxHeight: 320,
              overflowY: "auto",
              background: "var(--mk-bg)",
              border: ".5px solid var(--mk-border)",
              borderRadius: 10,
              boxShadow: "0 14px 40px rgba(0,0,0,.5)",
              zIndex: 40,
              padding: 8,
            }}
          >
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".5px", color: "var(--mk-text-muted)", padding: "4px 6px 8px" }}>
              ETIQUETAS DISPONÍVEIS
            </div>
            {etiquetas.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--mk-text-muted)", padding: 8 }}>
                Sem etiquetas cadastradas.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {etiquetas.map((e) => (
                  <label
                    key={e.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 8px",
                      borderRadius: 6,
                      cursor: "pointer",
                      background: sel.has(e.id) ? "rgba(0,225,154,.10)" : "transparent",
                      fontSize: 12,
                    }}
                  >
                    <input type="checkbox" checked={sel.has(e.id)} onChange={() => toggleEt(e.id)} />
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: e.cor,
                        flex: "none",
                      }}
                    />
                    <span style={{ flex: 1 }}>{e.nome}</span>
                  </label>
                ))}
              </div>
            )}

            <div style={{ borderTop: ".5px solid var(--mk-border)", marginTop: 6, paddingTop: 6 }}>
              {!criandoAberto ? (
                <button
                  type="button"
                  onClick={() => setCriandoAberto(true)}
                  className="ghost-btn"
                  style={{ fontSize: 11, padding: "4px 8px", borderRadius: 6, width: "100%", textAlign: "left" }}
                >
                  <i className="ti ti-plus" /> Criar nova etiqueta
                </button>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 5, padding: 4 }}>
                  <input
                    autoFocus
                    value={novoNome}
                    onChange={(e) => setNovoNome(e.target.value)}
                    placeholder={novoPai ? "Nome da Etiqueta (ex.: Bebê)" : "Nome (Pasta nova ou Etiqueta solta)"}
                    style={{ width: "100%", padding: "5px 8px", background: "var(--mk-surface-2)", border: ".5px solid var(--mk-border)", borderRadius: 6, color: "var(--mk-text)", fontSize: 11.5 }}
                  />
                  {linhasMae.length > 0 && (
                    <select
                      value={novoPai}
                      onChange={(e) => setNovoPai(e.target.value)}
                      style={{ width: "100%", padding: "5px 8px", background: "var(--mk-surface-2)", border: ".5px solid var(--mk-border)", borderRadius: 6, color: "var(--mk-text)", fontSize: 11.5 }}
                    >
                      <option value="">— Pasta nova / Etiqueta solta</option>
                      {linhasMae.map((l) => (
                        <option key={l.id} value={l.id}>
                          📁 {l.nome}
                        </option>
                      ))}
                    </select>
                  )}
                  <div style={{ display: "flex", gap: 3, justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "inline-flex", gap: 2 }}>
                      {PALETA_RAPIDA.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setNovoCor(c)}
                          style={{ width: 16, height: 16, borderRadius: 4, background: c, border: c === novoCor ? "2px solid var(--mk-text)" : "1px solid rgba(255,255,255,.2)", cursor: "pointer" }}
                        />
                      ))}
                    </div>
                    <div style={{ display: "inline-flex", gap: 4 }}>
                      <button type="button" onClick={() => { setCriandoAberto(false); setNovoNome(""); }} className="ghost-btn" style={{ fontSize: 10.5, padding: "4px 8px", borderRadius: 6 }}>
                        ×
                      </button>
                      <button type="button" onClick={criarNova} disabled={pending || !novoNome.trim()} className="cta-btn" style={{ fontSize: 10.5, padding: "4px 10px", borderRadius: 6, fontWeight: 700 }}>
                        {pending ? "…" : "Criar"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {erro && (
              <div style={{ fontSize: 11, color: "var(--mk-icon-pink)", padding: "4px 6px" }}>{erro}</div>
            )}

            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", padding: 4, marginTop: 4 }}>
              <button
                type="button"
                onClick={fechar}
                className="ghost-btn"
                disabled={pending}
                style={{ fontSize: 11.5, padding: "6px 10px", borderRadius: 7 }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={salvar}
                className="cta-btn"
                disabled={pending}
                style={{ fontSize: 11.5, padding: "6px 12px", borderRadius: 7, fontWeight: 700 }}
              >
                {pending ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
