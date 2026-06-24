"use client";

import { useEffect, useRef, useState } from "react";
import { useFiltroAtivo, type FiltroTipo } from "@/lib/filtro-ativo/context";

interface Opcao {
  tipo: "pasta" | "etiqueta" | "campanha";
  id: string;
  nome: string;
  cor?: string;
  status?: string | null;
}

interface OpcoesResp {
  ok: boolean;
  pastas: Opcao[];
  etiquetas: Opcao[];
  campanhas: Opcao[];
}

export function FiltroGlobal() {
  const { filtro, setFiltro, limpar } = useFiltroAtivo();
  const [aberto, setAberto] = useState(false);
  const [q, setQ] = useState("");
  const [data, setData] = useState<OpcoesResp | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Fecha clicando fora
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setAberto(false);
    }
    if (aberto) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [aberto]);

  // Foca ao abrir
  useEffect(() => { if (aberto) setTimeout(() => inputRef.current?.focus(), 50); }, [aberto]);

  // Busca debounced
  useEffect(() => {
    if (!aberto) return;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/filtro-ativo/opcoes?q=${encodeURIComponent(q)}`);
        const j = (await r.json()) as OpcoesResp;
        setData(j);
      } catch {
        setData({ ok: false, pastas: [], etiquetas: [], campanhas: [] });
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [q, aberto]);

  function escolher(o: Opcao) {
    setFiltro(o.tipo as FiltroTipo, o.id, o.nome);
    setAberto(false);
    setQ("");
  }

  const ativo = !!filtro.tipo;
  const corAtivo = ativo ? "#00E19A" : "var(--mk-border)";
  const iconeAtivo =
    filtro.tipo === "pasta" ? "ti-folder" :
    filtro.tipo === "etiqueta" ? "ti-tag" :
    filtro.tipo === "campanha" ? "ti-speakerphone" : "ti-filter";

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        aria-label={ativo ? `Filtro ativo: ${filtro.nome}` : "Aplicar filtro global"}
        aria-expanded={aberto}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 12px",
          background: ativo ? "rgba(0,225,154,.10)" : "var(--mk-surface)",
          border: `.5px solid ${corAtivo}`,
          borderRadius: 18,
          color: ativo ? "#00E19A" : "var(--mk-text-secondary)",
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
          maxWidth: 240,
          overflow: "hidden",
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
        }}
        title={ativo ? `${rotuloTipo(filtro.tipo)}: ${filtro.nome}` : "Aplicar filtro global"}
      >
        <i className={`ti ${iconeAtivo}`} />
        {ativo ? filtro.nome : "Filtro global"}
        {ativo && (
          <span
            onClick={(e) => { e.stopPropagation(); limpar(); }}
            role="button"
            aria-label="Limpar filtro"
            style={{ marginLeft: 4, display: "inline-flex", padding: 2, borderRadius: 4, cursor: "pointer" }}
          >
            <i className="ti ti-x" style={{ fontSize: 12 }} />
          </span>
        )}
      </button>

      {aberto && (
        <div
          role="dialog"
          aria-label="Selecionar filtro"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            width: 320,
            maxHeight: 440,
            overflowY: "auto",
            background: "var(--mk-bg)",
            border: ".5px solid var(--mk-border)",
            borderRadius: 12,
            boxShadow: "0 14px 40px rgba(0,0,0,.5)",
            zIndex: 60,
            padding: 8,
          }}
        >
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar pasta, etiqueta ou campanha…"
            aria-label="Buscar filtro"
            style={{
              width: "100%",
              padding: "8px 10px",
              background: "var(--mk-surface-2)",
              border: ".5px solid var(--mk-border)",
              borderRadius: 8,
              color: "var(--mk-text)",
              fontSize: 12.5,
              marginBottom: 8,
            }}
          />
          {ativo && (
            <button
              type="button"
              onClick={() => { limpar(); setAberto(false); }}
              style={{
                width: "100%",
                padding: "8px 10px",
                background: "rgba(201,112,100,.10)",
                border: ".5px solid rgba(201,112,100,.30)",
                borderRadius: 8,
                color: "#C97064",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                marginBottom: 8,
              }}
            >
              <i className="ti ti-x" /> Limpar filtro
            </button>
          )}

          {loading && <div style={{ fontSize: 11.5, color: "var(--mk-text-muted)", padding: 8 }}>Buscando…</div>}

          {data && !loading && (
            <>
              <Grupo titulo="Pastas" icone="ti-folder" itens={data.pastas} onEscolher={escolher} ativo={filtro} />
              <Grupo titulo="Etiquetas" icone="ti-tag" itens={data.etiquetas} onEscolher={escolher} ativo={filtro} />
              <Grupo titulo="Campanhas Meta" icone="ti-speakerphone" itens={data.campanhas} onEscolher={escolher} ativo={filtro} />
              {data.pastas.length === 0 && data.etiquetas.length === 0 && data.campanhas.length === 0 && (
                <div style={{ fontSize: 11.5, color: "var(--mk-text-muted)", padding: 8, textAlign: "center" }}>
                  Nada encontrado pra &quot;{q}&quot;.
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function rotuloTipo(t: FiltroTipo): string {
  return t === "pasta" ? "Pasta" : t === "etiqueta" ? "Etiqueta" : t === "campanha" ? "Campanha" : "";
}

function Grupo({
  titulo, icone, itens, onEscolher, ativo,
}: {
  titulo: string;
  icone: string;
  itens: Opcao[];
  onEscolher: (o: Opcao) => void;
  ativo: { id: string | null };
}) {
  if (itens.length === 0) return null;
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: ".4px", color: "var(--mk-text-muted)", padding: "6px 8px 2px" }}>
        {titulo.toUpperCase()}
      </div>
      {itens.map((o) => (
        <button
          key={`${o.tipo}:${o.id}`}
          type="button"
          onClick={() => onEscolher(o)}
          aria-label={`Filtrar por ${titulo}: ${o.nome}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            width: "100%",
            padding: "7px 10px",
            background: ativo.id === o.id ? "rgba(0,225,154,.10)" : "transparent",
            border: 0,
            borderRadius: 6,
            color: "var(--mk-text)",
            fontSize: 12,
            textAlign: "left",
            cursor: "pointer",
          }}
        >
          <i className={`ti ${icone}`} style={{ fontSize: 12, color: o.cor || "var(--mk-text-muted)" }} />
          <span style={{ flex: 1, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{o.nome}</span>
          {o.status && o.status !== "ACTIVE" && (
            <span style={{ fontSize: 9, color: "var(--mk-text-muted)", padding: "1px 5px", border: ".5px solid var(--mk-border)", borderRadius: 4 }}>
              {o.status.toLowerCase()}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
