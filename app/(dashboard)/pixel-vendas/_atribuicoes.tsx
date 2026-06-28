"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { salvarEtiquetasDoAlvo, criarEtiquetaInline, previewEspelhamentoMeta, espelharDoMeta } from "./_atribuicoes-actions";
import { Balao } from "@/components/ui/Balao";

export interface EtiquetaOpt {
  id: string;
  nome: string;
  cor: string;
  etiqueta_pai_id?: string | null;
}

const PALETA_RAPIDA = ["#00E19A", "#14b8a6", "#3b82f6", "#8b5cf6", "#ec4899", "#f43f5e", "#f59e0b", "#84cc16"];

export interface AnuncioNode {
  id: string;
  nome: string;
  status: string | null;
  etiqueta_ids: string[];
}
export interface ConjuntoNode {
  id: string;
  nome: string;
  status: string | null;
  etiqueta_ids: string[];
  anuncios: AnuncioNode[];
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
  // Pasta = etiqueta-mãe que tem pelo menos 1 filha. Etiqueta solta (sem pai, sem filha) NÃO é Pasta.
  const pastas = useMemo(() => {
    const idsComFilhas = new Set(etiquetas.filter((e) => e.etiqueta_pai_id).map((e) => e.etiqueta_pai_id!));
    return etiquetas.filter((e) => !e.etiqueta_pai_id && idsComFilhas.has(e.id));
  }, [etiquetas]);
  // Linhas-mãe (todas que poderiam ser pasta) — usadas no select "Pasta-mãe" do criar nova
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
  function updateAnuncio(campId: string, conjId: string, anId: string, ids: string[]) {
    setCampanhas((cs) =>
      cs.map((c) =>
        c.id === campId
          ? {
              ...c,
              conjuntos: c.conjuntos.map((cj) =>
                cj.id === conjId
                  ? { ...cj, anuncios: cj.anuncios.map((an) => (an.id === anId ? { ...an, etiqueta_ids: ids } : an)) }
                  : cj,
              ),
            }
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
        c.conjuntos.some((cj) => cj.nome.toLowerCase().includes(q) || cj.anuncios.some((an) => an.nome.toLowerCase().includes(q))),
    );
  }, [campanhas, busca]);

  return (
    <div className="mk-card" style={{ padding: 16, marginTop: 16, borderRadius: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <i className="ti ti-tags" style={{ fontSize: 16, color: "var(--mk-accent-2)" }} />
        <span style={{ fontSize: 13, fontWeight: 700 }}>Etiquetas por campanha / conjunto / anúncio</span>
      </div>
      {/* Diagrama: como o Sonar etiqueta seus leads */}
      <div
        style={{
          padding: "12px 14px",
          background: "linear-gradient(135deg, rgba(0,225,154,0.06), rgba(155,125,191,0.04))",
          border: ".5px solid var(--mk-border)",
          borderRadius: 10,
          marginBottom: 10,
        }}
      >
        <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--mk-text-muted)", letterSpacing: 0.4, marginBottom: 8 }}>
          COMO O SONAR ETIQUETA SEUS LEADS
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", fontSize: 12 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <i className="ti ti-speakerphone" style={{ color: "#1877F2" }} />
            <span style={{ color: "var(--mk-text)" }}>Campanha Meta</span>
          </span>
          <i className="ti ti-arrow-right" style={{ color: "var(--mk-text-muted)" }} />
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <i className="ti ti-folder" style={{ color: "#00E19A" }} />
            <span style={{ color: "var(--mk-text)" }}><strong>Pasta</strong> no Sonar</span>
          </span>
          <span style={{ width: "100%", height: 0 }} />
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <i className="ti ti-target" style={{ color: "var(--mk-text-muted)" }} />
            <span style={{ color: "var(--mk-text)" }}>Conjunto</span>
          </span>
          <i className="ti ti-arrow-right" style={{ color: "var(--mk-text-muted)" }} />
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <i className="ti ti-tag" style={{ color: "#9B7DBF" }} />
            <span style={{ color: "var(--mk-text)" }}><strong>Etiqueta</strong> filha</span>
          </span>
          <span style={{ width: "100%", height: 0 }} />
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <i className="ti ti-photo" style={{ color: "var(--mk-text-muted)" }} />
            <span style={{ color: "var(--mk-text)" }}>Anúncio</span>
          </span>
          <i className="ti ti-arrow-right" style={{ color: "var(--mk-text-muted)" }} />
          <span style={{ fontSize: 11.5, color: "var(--mk-text-muted)" }}>etiqueta opcional (granular)</span>
        </div>
        <div style={{ fontSize: 11, color: "var(--mk-text-muted)", marginTop: 8, lineHeight: 1.5 }}>
          Lead chega pelo anúncio → recebe Pasta + Etiqueta. No Dashboard você filtra por Pasta (visão geral) ou Etiqueta (campanha específica).
        </div>
      </div>

      <EspelharMetaButton onConcluido={() => window.location.reload()} />

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
        {pastas.length === 0 ? (
          <span style={{ fontSize: 11.5, color: "var(--mk-text-muted)", fontStyle: "italic" }}>
            Nenhuma criada ainda.
          </span>
        ) : (
          pastas.map((l) => (
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
                abertoSet={aberto}
                onToggleOpen={(idAbrir: string) => toggleAberto(idAbrir)}
                onUpdateCampanha={(ids) => updateCampanha(c.id, ids)}
                onUpdateConjunto={(cjId, ids) => updateConjunto(c.id, cjId, ids)}
                onUpdateAnuncio={(cjId, anId, ids) => updateAnuncio(c.id, cjId, anId, ids)}
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
  abertoSet,
  onToggleOpen,
  onUpdateCampanha,
  onUpdateConjunto,
  onUpdateAnuncio,
  onEtiquetaCriada,
}: {
  camp: CampanhaNode;
  etiquetas: EtiquetaOpt[];
  linhasMae: EtiquetaOpt[];
  etMap: Map<string, EtiquetaOpt>;
  abertoSet: Set<string>;
  onToggleOpen: (id: string) => void;
  onUpdateCampanha: (ids: string[]) => void;
  onUpdateConjunto: (conjId: string, ids: string[]) => void;
  onUpdateAnuncio: (conjId: string, anuncioId: string, ids: string[]) => void;
  onEtiquetaCriada: (e: EtiquetaOpt) => void;
}) {
  const open = abertoSet.has(camp.id);
  const totalAnuncios = camp.conjuntos.reduce((s, cj) => s + cj.anuncios.length, 0);
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
        onClick={camp.conjuntos.length > 0 ? () => onToggleOpen(camp.id) : undefined}
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
            {totalAnuncios > 0 ? ` · ${totalAnuncios} anúncio${totalAnuncios === 1 ? "" : "s"}` : ""}
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
          {camp.conjuntos.map((cj) => {
            const cjOpen = abertoSet.has(cj.id);
            return (
              <div key={cj.id} style={{ borderBottom: ".5px solid var(--mk-border)" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 0",
                    cursor: cj.anuncios.length > 0 ? "pointer" : "default",
                  }}
                  onClick={cj.anuncios.length > 0 ? () => onToggleOpen(cj.id) : undefined}
                >
                  {cj.anuncios.length > 0 ? (
                    <i
                      className={`ti ti-chevron-${cjOpen ? "down" : "right"}`}
                      style={{ fontSize: 12, color: "var(--mk-text-muted)" }}
                    />
                  ) : (
                    <span style={{ width: 12 }} />
                  )}
                  <i className="ti ti-target" style={{ fontSize: 12, color: "var(--mk-text-muted)" }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: "var(--mk-text)" }}>{cj.nome}</div>
                    <div style={{ fontSize: 9.5, color: "var(--mk-text-muted)" }}>
                      {cj.anuncios.length > 0 ? `${cj.anuncios.length} anúncio${cj.anuncios.length === 1 ? "" : "s"}` : ""}
                      {cj.status && cj.status !== "ACTIVE" ? `${cj.anuncios.length > 0 ? " · " : ""}${cj.status.toLowerCase()}` : ""}
                    </div>
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
                {cjOpen && cj.anuncios.length > 0 && (
                  <div
                    style={{
                      paddingLeft: 24,
                      paddingBottom: 6,
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                    }}
                  >
                    {cj.anuncios.map((an) => (
                      <div
                        key={an.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "4px 0",
                          borderTop: ".5px dashed var(--mk-border)",
                        }}
                      >
                        <span style={{ width: 12 }} />
                        <i className="ti ti-photo" style={{ fontSize: 11, color: "#9B7DBF" }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 11.5, color: "var(--mk-text)" }}>{an.nome}</div>
                          {an.status && an.status !== "ACTIVE" && (
                            <div style={{ fontSize: 9, color: "var(--mk-text-muted)" }}>{an.status.toLowerCase()}</div>
                          )}
                        </div>
                        <EtiquetaCell
                          alvo="anuncio"
                          alvoId={an.id}
                          etiquetas={etiquetas}
                          linhasMae={linhasMae}
                          etMap={etMap}
                          selecionadas={an.etiqueta_ids}
                          onSalvo={(ids) => onUpdateAnuncio(cj.id, an.id, ids)}
                          onEtiquetaCriada={onEtiquetaCriada}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
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
  alvo: "campanha" | "conjunto" | "anuncio";
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
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number; abrePraCima: boolean } | null>(null);
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    setMontado(true);
  }, []);

  // Sincroniza sel local quando prop selecionadas muda (após onSalvo cascade).
  useEffect(() => {
    if (!aberto) setSel(new Set(selecionadas));
  }, [selecionadas, aberto]);

  // Calcula posição absoluta na viewport pro portal.
  useLayoutEffect(() => {
    if (!aberto || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const dropdownH = 360;
    const dropdownW = 280;
    const espacoAbaixo = window.innerHeight - r.bottom;
    const abrePraCima = espacoAbaixo < dropdownH && r.top > dropdownH;
    const top = abrePraCima ? r.top - dropdownH - 6 : r.bottom + 6;
    const left = Math.max(8, Math.min(window.innerWidth - dropdownW - 8, r.right - dropdownW));
    setPos({ top, left, width: dropdownW, abrePraCima });
  }, [aberto]);

  // Reposiciona em resize/scroll.
  useEffect(() => {
    if (!aberto) return;
    function recalc() {
      if (!btnRef.current) return;
      const r = btnRef.current.getBoundingClientRect();
      const dropdownH = 360;
      const dropdownW = 280;
      const espacoAbaixo = window.innerHeight - r.bottom;
      const abrePraCima = espacoAbaixo < dropdownH && r.top > dropdownH;
      const top = abrePraCima ? r.top - dropdownH - 6 : r.bottom + 6;
      const left = Math.max(8, Math.min(window.innerWidth - dropdownW - 8, r.right - dropdownW));
      setPos({ top, left, width: dropdownW, abrePraCima });
    }
    window.addEventListener("scroll", recalc, true);
    window.addEventListener("resize", recalc);
    return () => {
      window.removeEventListener("scroll", recalc, true);
      window.removeEventListener("resize", recalc);
    };
  }, [aberto]);

  function criarNova() {
    const nome = novoNome.trim();
    if (!nome) return;
    const paiUsado = novoPai;
    startTransition(async () => {
      const r = await criarEtiquetaInline(nome, novoCor, paiUsado || null);
      if (!r.ok || !r.id) {
        setErro(r.msg || "Falha");
        return;
      }
      const nova: EtiquetaOpt = { id: r.id, nome, cor: novoCor, etiqueta_pai_id: paiUsado || null };
      onEtiquetaCriada(nova);
      // Se criou com Pasta-mãe (hierarquia), auto-salva vinculando + fecha
      if (paiUsado) {
        const novaSel = new Set([...sel, nova.id]);
        // remove Pasta-mãe da seleção se estava marcada (evita "já possui")
        novaSel.delete(paiUsado);
        const ids = Array.from(novaSel);
        const rs = await salvarEtiquetasDoAlvo(alvo, alvoId, ids);
        if (!rs.ok) {
          setErro(rs.msg || "Falha ao salvar");
          return;
        }
        onSalvo(ids);
        setAberto(false);
      } else {
        setSel((s) => new Set([...s, nova.id]));
      }
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

      {aberto && montado && pos && createPortal(
        <>
          <div
            style={{ position: "fixed", inset: 0, zIndex: 9998 }}
            onClick={fechar}
          />
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              width: pos.width,
              maxHeight: 360,
              overflowY: "auto",
              background: "var(--mk-bg)",
              border: ".5px solid var(--mk-border)",
              borderRadius: 10,
              boxShadow: "0 14px 40px rgba(0,0,0,.5)",
              zIndex: 9999,
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
              (() => {
                // Indexa filhas por pai_id
                const filhasPorPai = new Map<string, EtiquetaOpt[]>();
                for (const e of etiquetas) {
                  if (e.etiqueta_pai_id) {
                    const arr = filhasPorPai.get(e.etiqueta_pai_id) || [];
                    arr.push(e);
                    filhasPorPai.set(e.etiqueta_pai_id, arr);
                  }
                }
                const idsComFilhas = new Set(filhasPorPai.keys());
                const pastasLocal = etiquetas.filter((e) => !e.etiqueta_pai_id && idsComFilhas.has(e.id));
                const soltas = etiquetas.filter((e) => !e.etiqueta_pai_id && !idsComFilhas.has(e.id));

                function temFilhaMarcada(pastaId: string) {
                  return (filhasPorPai.get(pastaId) || []).some((f) => sel.has(f.id));
                }

                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {pastasLocal.map((p) => {
                      const filhas = filhasPorPai.get(p.id) || [];
                      const pastaBloqueada = temFilhaMarcada(p.id);
                      return (
                        <div key={p.id} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          {!pastaBloqueada && (
                            <label
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "6px 8px",
                                borderRadius: 6,
                                cursor: "pointer",
                                background: sel.has(p.id) ? "rgba(0,225,154,.10)" : "transparent",
                                fontSize: 12,
                                fontWeight: 700,
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={sel.has(p.id)}
                                onChange={() => {
                                  // Marca Pasta → desmarca filhas (mutuamente excludentes)
                                  setSel((s) => {
                                    const n = new Set(s);
                                    if (n.has(p.id)) {
                                      n.delete(p.id);
                                    } else {
                                      n.add(p.id);
                                      for (const f of filhas) n.delete(f.id);
                                    }
                                    return n;
                                  });
                                }}
                              />
                              <i
                                className="ti ti-folder"
                                style={{ fontSize: 12, color: p.cor, flex: "none" }}
                              />
                              <span style={{ flex: 1, color: p.cor }}>{p.nome}</span>
                            </label>
                          )}
                          {filhas.map((f) => (
                            <label
                              key={f.id}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "5px 8px 5px 22px",
                                borderRadius: 6,
                                cursor: "pointer",
                                background: sel.has(f.id) ? "rgba(0,225,154,.10)" : "transparent",
                                fontSize: 11.5,
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={sel.has(f.id)}
                                onChange={() => {
                                  setSel((s) => {
                                    const n = new Set(s);
                                    if (n.has(f.id)) {
                                      n.delete(f.id);
                                    } else {
                                      n.add(f.id);
                                      n.delete(p.id); // marcar filha desmarca Pasta-mãe
                                    }
                                    return n;
                                  });
                                }}
                              />
                              <i className="ti ti-tag" style={{ fontSize: 11, color: f.cor, flex: "none" }} />
                              <span style={{ flex: 1 }}>{f.nome}</span>
                            </label>
                          ))}
                        </div>
                      );
                    })}
                    {soltas.length > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        {pastasLocal.length > 0 && (
                          <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: ".4px", color: "var(--mk-text-muted)", padding: "4px 6px 2px" }}>
                            ETIQUETAS SOLTAS
                          </div>
                        )}
                        {soltas.map((e) => (
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
                            <i className="ti ti-tag" style={{ fontSize: 11, color: e.cor, flex: "none" }} />
                            <span style={{ flex: 1 }}>{e.nome}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()
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
        </>,
        document.body,
      )}
    </div>
  );
}

function EspelharMetaButton({ onConcluido }: { onConcluido: () => void }) {
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [executando, setExecutando] = useState(false);
  const [preview, setPreview] = useState<{ pastasNovas: number; etiquetasNovas: number; vinculosCampanha: number; vinculosConjunto: number; pastasExistentes: number; etiquetasExistentes: number } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<typeof preview>(null);

  async function abrir() {
    setAberto(true);
    setCarregando(true);
    setErro(null);
    setResultado(null);
    try {
      const r = await previewEspelhamentoMeta();
      if (r.ok && r.preview) setPreview(r.preview);
      else setErro(r.msg || "Erro ao calcular prévia");
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setCarregando(false);
    }
  }

  async function executar() {
    setExecutando(true);
    setErro(null);
    try {
      const r = await espelharDoMeta();
      if (r.ok && r.resumo) {
        setResultado(r.resumo);
        setTimeout(() => {
          setAberto(false);
          onConcluido();
        }, 1800);
      } else {
        setErro(r.msg || "Erro ao espelhar");
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setExecutando(false);
    }
  }

  const totalNovo = preview ? preview.pastasNovas + preview.etiquetasNovas + preview.vinculosCampanha + preview.vinculosConjunto : 0;
  const semTrabalho = preview && totalNovo === 0;

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        style={{
          width: "100%",
          padding: "12px 16px",
          background: "linear-gradient(135deg, rgba(0,225,154,0.10), rgba(155,125,191,0.06))",
          border: "1px solid rgba(0,225,154,0.30)",
          borderRadius: 10,
          color: "var(--mk-text)",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          marginBottom: 12,
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          textAlign: "left",
        }}
      >
        <i className="ti ti-sparkles" style={{ fontSize: 18, color: "#00E19A" }} />
        <span style={{ flex: 1 }}>
          <span style={{ display: "block" }}>Espelhar do Meta automaticamente</span>
          <span style={{ display: "block", fontSize: 11, color: "var(--mk-text-muted)", fontWeight: 400, marginTop: 2 }}>
            Cria Pasta por Campanha + Etiqueta por Conjunto, vincula tudo. 1 clique.
          </span>
        </span>
        <i className="ti ti-chevron-right" style={{ color: "var(--mk-text-muted)" }} />
      </button>

      <Balao open={aberto} onClose={() => setAberto(false)} titulo="Espelhar estrutura do Meta" icone="ti-sparkles" largura={520}>
        <div style={{ padding: "6px 4px 14px", display: "flex", flexDirection: "column", gap: 14 }}>
          {carregando && (
            <div style={{ fontSize: 13, color: "var(--mk-text-muted)", textAlign: "center", padding: 20 }}>
              Calculando prévia...
            </div>
          )}

          {erro && (
            <div style={{ padding: 12, background: "rgba(255,92,114,0.10)", border: "1px solid rgba(255,92,114,0.30)", borderRadius: 8, color: "#FF5C72", fontSize: 12.5 }}>
              {erro}
            </div>
          )}

          {resultado && !erro && (
            <div style={{ padding: 14, background: "rgba(0,225,154,0.10)", border: "1px solid rgba(0,225,154,0.40)", borderRadius: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#00E19A", marginBottom: 8 }}>
                <i className="ti ti-check" /> Estrutura espelhada!
              </div>
              <div style={{ fontSize: 12.5, color: "var(--mk-text)", lineHeight: 1.6 }}>
                {resultado.pastasNovas} pasta{resultado.pastasNovas === 1 ? "" : "s"} nova{resultado.pastasNovas === 1 ? "" : "s"} ·{" "}
                {resultado.etiquetasNovas} etiqueta{resultado.etiquetasNovas === 1 ? "" : "s"} nova{resultado.etiquetasNovas === 1 ? "" : "s"} ·{" "}
                {resultado.vinculosCampanha + resultado.vinculosConjunto} vínculo{resultado.vinculosCampanha + resultado.vinculosConjunto === 1 ? "" : "s"} criado{resultado.vinculosCampanha + resultado.vinculosConjunto === 1 ? "" : "s"}.
              </div>
            </div>
          )}

          {preview && !resultado && (
            <>
              <div style={{ fontSize: 12.5, color: "var(--mk-text-secondary)", lineHeight: 1.55 }}>
                Vou criar Pastas a partir das suas <strong>Campanhas</strong> Meta e Etiquetas filhas a partir dos <strong>Conjuntos</strong>. Itens já existentes (mesmo nome) são preservados — sem duplicar.
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                <CardPreview icone="ti-folder-plus" cor="#00E19A" titulo={`${preview.pastasNovas} Pasta${preview.pastasNovas === 1 ? "" : "s"} novas`} sub={`${preview.pastasExistentes} já existe${preview.pastasExistentes === 1 ? "" : "m"}`} />
                <CardPreview icone="ti-tag-plus" cor="#9B7DBF" titulo={`${preview.etiquetasNovas} Etiqueta${preview.etiquetasNovas === 1 ? "" : "s"} novas`} sub={`${preview.etiquetasExistentes} já existe${preview.etiquetasExistentes === 1 ? "" : "m"}`} />
                <CardPreview icone="ti-link" cor="#5cd0ff" titulo={`${preview.vinculosCampanha} vínculo${preview.vinculosCampanha === 1 ? "" : "s"} pasta↔campanha`} sub="auto-conectado" />
                <CardPreview icone="ti-link" cor="#FFB547" titulo={`${preview.vinculosConjunto} vínculo${preview.vinculosConjunto === 1 ? "" : "s"} etiqueta↔conjunto`} sub="auto-conectado" />
              </div>

              {semTrabalho && (
                <div style={{ padding: 12, background: "var(--mk-surface)", border: "1px dashed var(--mk-border)", borderRadius: 8, fontSize: 12, color: "var(--mk-text-muted)", textAlign: "center" }}>
                  Tudo já está espelhado — nada novo pra fazer.
                </div>
              )}

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 6 }}>
                <button
                  type="button"
                  onClick={() => setAberto(false)}
                  disabled={executando}
                  style={{ padding: "9px 16px", background: "transparent", border: ".5px solid var(--mk-border)", borderRadius: 8, color: "var(--mk-text-muted)", fontSize: 12.5, cursor: "pointer" }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={executar}
                  disabled={executando || !!semTrabalho}
                  style={{
                    padding: "9px 18px",
                    background: semTrabalho ? "var(--mk-surface)" : "#00E19A",
                    border: 0,
                    borderRadius: 8,
                    color: semTrabalho ? "var(--mk-text-muted)" : "#0c0c0c",
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: semTrabalho ? "not-allowed" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <i className="ti ti-sparkles" />
                  {executando ? "Espelhando..." : "Espelhar agora"}
                </button>
              </div>
            </>
          )}
        </div>
      </Balao>
    </>
  );
}

function CardPreview({ icone, cor, titulo, sub }: { icone: string; cor: string; titulo: string; sub: string }) {
  return (
    <div style={{ padding: 10, background: "var(--mk-surface)", border: ".5px solid var(--mk-border)", borderRadius: 8, display: "flex", gap: 10, alignItems: "center" }}>
      <i className={`ti ${icone}`} style={{ fontSize: 20, color: cor }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--mk-text)" }}>{titulo}</div>
        <div style={{ fontSize: 10.5, color: "var(--mk-text-muted)" }}>{sub}</div>
      </div>
    </div>
  );
}
