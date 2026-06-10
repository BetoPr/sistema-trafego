"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { fmtBRL } from "@/lib/format";
import { ExcluirClienteBotao } from "./_excluir-btn";

export interface ClienteListItem {
  id: string;
  nome: string;
  slug: string;
  segmento: string | null;
  status: string;
  valor_mensal: number | null;
  integracoes_ativas: number;
  ultima_sync: string | null;
  created_at: string;
}

interface Props {
  clientes: ClienteListItem[];
}

const STATUS_LABEL: Record<string, string> = {
  ativo: "Ativo",
  pausado: "Pausado",
  encerrado: "Encerrado",
};

export function ClientesLista({ clientes }: Props) {
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<string>("todos");

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return clientes.filter((c) => {
      if (statusFiltro !== "todos" && c.status !== statusFiltro) return false;
      if (!q) return true;
      return (
        c.nome.toLowerCase().includes(q) ||
        (c.segmento ?? "").toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q)
      );
    });
  }, [clientes, busca, statusFiltro]);

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 14,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, segmento ou slug..."
          style={{
            flex: 1,
            minWidth: 220,
            padding: "8px 12px",
            borderRadius: 8,
            border: "0.5px solid var(--mk-border)",
            background: "var(--mk-surface-2)",
            color: "var(--mk-text)",
            fontSize: 12.5,
          }}
        />
        <select
          value={statusFiltro}
          onChange={(e) => setStatusFiltro(e.target.value)}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "0.5px solid var(--mk-border)",
            background: "var(--mk-surface-2)",
            color: "var(--mk-text)",
            fontSize: 12.5,
          }}
        >
          <option value="todos">Todos status</option>
          <option value="ativo">Ativos</option>
          <option value="pausado">Pausados</option>
          <option value="encerrado">Encerrados</option>
        </select>
      </div>

      {filtrados.length === 0 ? (
        <div
          className="mk-card"
          style={{ padding: 28, textAlign: "center", color: "var(--mk-text-muted)", fontSize: 13 }}
        >
          Nenhum cliente bate com o filtro.
        </div>
      ) : (
        <div
          className="mk-card"
          style={{ padding: 0, overflow: "hidden" }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead>
              <tr style={{ borderBottom: "0.5px solid var(--mk-border)" }}>
                <th style={th}>Cliente</th>
                <th style={th}>Segmento</th>
                <th style={th}>Status</th>
                <th style={{ ...th, textAlign: "right" }}>Mensal</th>
                <th style={{ ...th, textAlign: "center" }}>Integrações</th>
                <th style={th}>Última sync</th>
                <th style={{ ...th, textAlign: "right" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((c) => {
                const iniciais = c.nome
                  .split(" ")
                  .map((p) => p[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();
                return (
                  <tr
                    key={c.id}
                    style={{ borderBottom: "0.5px solid var(--mk-border-soft)" }}
                  >
                    <td style={td}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 8,
                            background: "linear-gradient(135deg, #8B6F47, #10b981)",
                            color: "#fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 12,
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          {iniciais}
                        </div>
                        <div>
                          <Link
                            href={`/clientes/${c.id}`}
                            style={{
                              color: "var(--mk-text)",
                              fontWeight: 600,
                              textDecoration: "none",
                              fontSize: 13,
                            }}
                          >
                            {c.nome}
                          </Link>
                          <div
                            style={{
                              fontSize: 10.5,
                              color: "var(--mk-text-muted)",
                              fontFamily: "monospace",
                            }}
                          >
                            {c.slug}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={td}>{c.segmento ?? "—"}</td>
                    <td style={td}>
                      <span
                        className={`mk-badge ${c.status === "ativo" ? "b-green" : "b-amber"}`}
                      >
                        {STATUS_LABEL[c.status] ?? c.status}
                      </span>
                    </td>
                    <td style={{ ...td, textAlign: "right" }}>
                      {c.valor_mensal != null ? fmtBRL(c.valor_mensal) : "—"}
                    </td>
                    <td style={{ ...td, textAlign: "center" }}>
                      {c.integracoes_ativas > 0 ? (
                        <span
                          style={{
                            background: "rgba(16,185,129,0.15)",
                            color: "#10b981",
                            padding: "2px 8px",
                            borderRadius: 10,
                            fontSize: 11,
                            fontWeight: 600,
                          }}
                        >
                          {c.integracoes_ativas}
                        </span>
                      ) : (
                        <span style={{ color: "var(--mk-text-muted)" }}>—</span>
                      )}
                    </td>
                    <td style={td}>
                      {c.ultima_sync ? (
                        <span style={{ color: "var(--mk-text-muted)", fontSize: 11 }}>
                          {new Date(c.ultima_sync).toLocaleString("pt-BR")}
                        </span>
                      ) : (
                        <span style={{ color: "var(--mk-text-muted)" }}>—</span>
                      )}
                    </td>
                    <td style={{ ...td, textAlign: "right" }}>
                      <div
                        style={{
                          display: "inline-flex",
                          gap: 6,
                          justifyContent: "flex-end",
                        }}
                      >
                        <Link
                          href={`/clientes/${c.id}`}
                          className="ghost-btn"
                          style={{ fontSize: 11 }}
                        >
                          Ver
                        </Link>
                        <ExcluirClienteBotao
                          clienteId={c.id}
                          clienteNome={c.nome}
                          variant="icon"
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 14px",
  fontSize: 10.5,
  textTransform: "uppercase",
  color: "var(--mk-text-muted)",
  fontWeight: 600,
  letterSpacing: "0.5px",
};

const td: React.CSSProperties = {
  padding: "10px 14px",
  color: "var(--mk-text)",
  verticalAlign: "middle",
};
