"use client";

import { useMemo, useState, useTransition } from "react";
import { salvarEtiquetasDoAlvo } from "./_atribuicoes-actions";

export interface EtiquetaOpt {
  id: string;
  nome: string;
  cor: string;
}

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

export default function Atribuicoes({ campanhas: campanhasInit, etiquetas }: Props) {
  const [campanhas, setCampanhas] = useState(campanhasInit);
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState<Set<string>>(new Set());

  const etMap = useMemo(() => new Map(etiquetas.map((e) => [e.id, e])), [etiquetas]);

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
        Atribua etiquetas a campanhas ou conjuntos do Meta. Quando um lead chega pelo anúncio, recebe automaticamente
        as etiquetas vinculadas. Vínculo na <strong>campanha</strong> vale pra todos os conjuntos dela; no{" "}
        <strong>conjunto</strong> é mais granular.
      </p>

      {etiquetas.length === 0 && (
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
          Nenhuma etiqueta cadastrada ainda. Vá em <strong>Configuração → Etiquetas</strong> pra criar.
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
                etMap={etMap}
                open={open}
                onToggleOpen={() => toggleAberto(c.id)}
                onUpdateCampanha={(ids) => updateCampanha(c.id, ids)}
                onUpdateConjunto={(cjId, ids) => updateConjunto(c.id, cjId, ids)}
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
  etMap,
  open,
  onToggleOpen,
  onUpdateCampanha,
  onUpdateConjunto,
}: {
  camp: CampanhaNode;
  etiquetas: EtiquetaOpt[];
  etMap: Map<string, EtiquetaOpt>;
  open: boolean;
  onToggleOpen: () => void;
  onUpdateCampanha: (ids: string[]) => void;
  onUpdateConjunto: (conjId: string, ids: string[]) => void;
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
          etMap={etMap}
          selecionadas={camp.etiqueta_ids}
          onSalvo={onUpdateCampanha}
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
                etMap={etMap}
                selecionadas={cj.etiqueta_ids}
                onSalvo={(ids) => onUpdateConjunto(cj.id, ids)}
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
  etMap,
  selecionadas,
  onSalvo,
}: {
  alvo: "campanha" | "conjunto";
  alvoId: string;
  etiquetas: EtiquetaOpt[];
  etMap: Map<string, EtiquetaOpt>;
  selecionadas: string[];
  onSalvo: (ids: string[]) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [sel, setSel] = useState<Set<string>>(new Set(selecionadas));
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

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
              top: "calc(100% + 6px)",
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
