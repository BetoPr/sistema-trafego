"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { deletarContato } from "./_actions";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export interface LinhaContato {
  id: string;
  nome: string;
  whatsapp: string | null;
  estado: string;
  tags: Array<{ id: string; nome: string; cor: string }>;
  fech: {
    total: number;
    fechamentos: number;
    quantidade: number;
    servicos: Array<{ nome: string; qtd: number; valor: number }>;
  } | null;
}

function fmtWhats(n: string | null): string {
  if (!n) return "—";
  if (n.length === 13) return `+${n.slice(0, 2)} (${n.slice(2, 4)}) ${n.slice(4, 9)}-${n.slice(9)}`;
  if (n.length === 12) return `+${n.slice(0, 2)} (${n.slice(2, 4)}) ${n.slice(4, 8)}-${n.slice(8)}`;
  return n;
}

export function ContatosTabela({ linhas }: { linhas: LinhaContato[] }) {
  const [busca, setBusca] = useState("");

  const visiveis = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return linhas;
    return linhas.filter((c) =>
      `${c.nome} ${c.whatsapp || ""} ${c.estado}`.toLowerCase().includes(q)
    );
  }, [linhas, busca]);

  return (
    <>
      <div style={{ marginBottom: 14, position: "relative" }}>
        <i className="ti ti-search" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--mk-text-muted)", fontSize: 14 }} />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar nome ou número… (filtra enquanto digita)"
          style={{ width: "100%", padding: "9px 12px 9px 34px", borderRadius: 8, border: "0.5px solid var(--mk-border)", background: "var(--mk-surface-2)", color: "var(--mk-text)", fontSize: 12.5 }}
        />
      </div>

      <div className="mk-card mk-card-lg">
        <h3 className="card-title" style={{ marginBottom: 14 }}>
          Contatos ({visiveis.length}{busca && visiveis.length !== linhas.length ? ` de ${linhas.length}` : ""})
        </h3>
        {visiveis.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: "var(--mk-text-muted)", fontSize: 13 }}>
            {busca ? "Nenhum contato bate com a busca." : "Sem contatos."}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 12.5 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--mk-text-muted)", fontSize: 11 }}>
                <th style={thLi}>Nome</th>
                <th style={thLi}>WhatsApp</th>
                <th style={thLi}>Estado</th>
                <th style={thLi}>Fechamentos</th>
                <th style={thLi}>Tags</th>
                <th style={thLi}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {visiveis.map((c) => (
                <tr key={c.id} style={{ borderTop: "0.5px solid var(--mk-border)" }}>
                  <td style={tdLi}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(155,125,191,0.2)", color: "#9B7DBF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600 }}>
                        {c.nome.slice(0, 2).toUpperCase()}
                      </div>
                      {c.nome}
                    </div>
                  </td>
                  <td style={{ ...tdLi, fontFamily: "monospace", fontSize: 11.5 }}>{fmtWhats(c.whatsapp)}</td>
                  <td style={tdLi}>{c.estado}</td>
                  <td style={tdLi}>
                    {c.fech ? (
                      <div title={c.fech.servicos.map((s) => `${s.nome} × ${s.qtd} (${BRL.format(s.valor)})`).join("\n")}>
                        <span style={{ fontWeight: 700, color: "#6B8E4E" }}>{BRL.format(c.fech.total)}</span>
                        <span style={{ fontSize: 10.5, color: "var(--mk-text-muted)", marginLeft: 6 }}>
                          {c.fech.fechamentos}× · {c.fech.quantidade} serviço{c.fech.quantidade === 1 ? "" : "s"}
                        </span>
                      </div>
                    ) : (
                      <span style={{ color: "var(--mk-text-muted)" }}>—</span>
                    )}
                  </td>
                  <td style={tdLi}>
                    {c.tags.length > 0 ? (
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {c.tags.map((t) => (
                          <span key={t.id} style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: `${t.cor}33`, color: t.cor, border: `0.5px solid ${t.cor}` }}>{t.nome}</span>
                        ))}
                      </div>
                    ) : "—"}
                  </td>
                  <td style={tdLi}>
                    <Link href={`/contatos?editar=${c.id}`} className="ghost-btn" style={iconBtn}><i className="ti ti-edit" /></Link>
                    <form action={deletarContato} style={{ display: "inline", marginLeft: 4 }}>
                      <input type="hidden" name="id" value={c.id} />
                      <button type="submit" className="ghost-btn" style={{ ...iconBtn, color: "#C97064" }}><i className="ti ti-trash" /></button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

const iconBtn: React.CSSProperties = { fontSize: 11, padding: "4px 10px" };
const thLi: React.CSSProperties = { padding: "8px 10px" };
const tdLi: React.CSSProperties = { padding: "10px" };
