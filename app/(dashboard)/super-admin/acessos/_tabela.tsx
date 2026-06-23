"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Balao } from "@/components/ui/Balao";
import { alternarAtivoAcesso, deletarAcesso, restaurarAcesso } from "./_actions";
import { CobrancaIconBtn } from "./_abrir-cobrancas";

type Role = "atendente" | "admin" | "super_admin";

interface UsuarioLinha {
  id: string;
  nome: string;
  email: string;
  role: Role;
  ativo: boolean;
  agencia_id: string;
  tipo_cliente: string | null;
  ultimo_login: string | null;
  deleted_at: string | null;
}

interface Props {
  usuarios: UsuarioLinha[];
}

const ROLE_LABEL: Record<Role, string> = {
  atendente: "Atendentes",
  admin: "Administradores",
  super_admin: "Super Admins",
};

const ROLE_COR: Record<Role, string> = {
  atendente: "#94a3b8",
  admin: "#9B7DBF",
  super_admin: "#C97064",
};

export function TabelaAcessos({ usuarios }: Props) {
  const [rolesAtivos, setRolesAtivos] = useState<Set<Role>>(new Set(["atendente", "admin", "super_admin"]));
  const [mostrarExcluidos, setMostrarExcluidos] = useState(false);
  const [confirmando, setConfirmando] = useState<UsuarioLinha | null>(null);

  function toggleRole(r: Role) {
    setRolesAtivos((prev) => {
      const novo = new Set(prev);
      if (novo.has(r)) novo.delete(r);
      else novo.add(r);
      // Se desmarcou todos, volta tudo
      if (novo.size === 0) return new Set(["atendente", "admin", "super_admin"]);
      return novo;
    });
  }

  const filtrados = useMemo(() =>
    usuarios.filter((u) => {
      const ehExcluido = !!u.deleted_at;
      if (mostrarExcluidos) return ehExcluido;
      if (ehExcluido) return false;
      return rolesAtivos.has(u.role);
    }), [usuarios, rolesAtivos, mostrarExcluidos]);

  // Contagem por role pra mostrar nos pills
  const contagem = useMemo(() => {
    const c: Record<Role, number> = { atendente: 0, admin: 0, super_admin: 0 };
    let excluidos = 0;
    for (const u of usuarios) {
      if (u.deleted_at) { excluidos++; continue; }
      c[u.role]++;
    }
    return { ...c, excluidos };
  }, [usuarios]);

  return (
    <>
      {/* Filtros */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
        {(Object.keys(ROLE_LABEL) as Role[]).map((r) => {
          const ativo = !mostrarExcluidos && rolesAtivos.has(r);
          return (
            <button
              key={r}
              type="button"
              onClick={() => { setMostrarExcluidos(false); toggleRole(r); }}
              className="acesso-pill"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 999,
                border: `0.5px solid ${ativo ? ROLE_COR[r] : "var(--mk-border)"}`,
                background: ativo ? `${ROLE_COR[r]}22` : "var(--mk-surface)",
                color: ativo ? ROLE_COR[r] : "var(--mk-text-muted)",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                opacity: mostrarExcluidos ? 0.5 : 1,
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: ROLE_COR[r] }} />
              {ROLE_LABEL[r]}
              <span style={{ fontSize: 10.5, fontWeight: 700, opacity: 0.7 }}>{contagem[r]}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setMostrarExcluidos((v) => !v)}
          className="acesso-pill"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 12px",
            borderRadius: 999,
            border: `0.5px solid ${mostrarExcluidos ? "#C97064" : "var(--mk-border)"}`,
            background: mostrarExcluidos ? "rgba(201,112,100,0.14)" : "var(--mk-surface)",
            color: mostrarExcluidos ? "#C97064" : "var(--mk-text-muted)",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
          title="Mostra usuários excluídos (soft delete) — restaurar se quiser"
        >
          <i className="ti ti-trash" style={{ fontSize: 12 }} />
          Excluídos
          <span style={{ fontSize: 10.5, fontWeight: 700, opacity: 0.7 }}>{contagem.excluidos}</span>
        </button>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 11, color: "var(--mk-text-muted)", alignSelf: "center" }}>
          Mostrando {filtrados.length} de {usuarios.length}
        </div>
      </div>

      <div className="mk-card mk-card-lg">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 12.5 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--mk-text-muted)", fontSize: 11 }}>
                <th style={thLi}>Nome</th>
                <th style={thLi}>Email</th>
                <th style={thLi}>Tipo de cliente</th>
                <th style={thLi}>Perfil</th>
                <th style={thLi}>Status</th>
                <th style={thLi}>Último login</th>
                <th style={thLi}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((u) => (
                <tr key={u.id} className="acesso-row" style={{ borderTop: "0.5px solid var(--mk-border)" }}>
                  <td style={tdLi}>{u.nome}</td>
                  <td style={tdLi}><span style={{ fontFamily: "monospace", fontSize: 11.5 }}>{u.email}</span></td>
                  <td style={tdLi}>{u.tipo_cliente ? <span className="mk-badge b-purple">{u.tipo_cliente}</span> : <span style={{ color: "var(--mk-text-muted)" }}>—</span>}</td>
                  <td style={tdLi}>
                    <span className={`mk-badge ${u.role === "super_admin" ? "b-red" : u.role === "admin" ? "b-purple" : "b-gray"}`}>
                      {u.role === "super_admin" ? "Super" : u.role === "admin" ? "Admin" : "Atendente"}
                    </span>
                  </td>
                  <td style={tdLi}><span className={`mk-badge ${u.ativo ? "b-green" : "b-gray"}`}>{u.ativo ? "Ativo" : "Inativo"}</span></td>
                  <td style={tdLi}>{u.ultimo_login ? new Date(u.ultimo_login).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—"}</td>
                  <td style={tdLi}>
                    {u.deleted_at ? (
                      <form action={restaurarAcesso} style={{ display: "inline" }}>
                        <input type="hidden" name="id" value={u.id} />
                        <button type="submit" className="ghost-btn acesso-icon-btn" style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 10px", fontSize: 11, color: "#00E19A", border: "0.5px solid #00E19A", borderRadius: 8 }} title="Restaurar usuário">
                          <i className="ti ti-arrow-back-up" /> Restaurar
                        </button>
                      </form>
                    ) : (
                      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                        <Link href={`/super-admin/acessos?editar=${u.id}`} className="ghost-btn acesso-icon-btn" style={iconBtn}><i className="ti ti-pencil" /></Link>
                        <CobrancaIconBtn agenciaId={u.agencia_id} />
                        <form action={alternarAtivoAcesso} style={{ display: "inline" }}>
                          <input type="hidden" name="id" value={u.id} />
                          <input type="hidden" name="ativo" value={String(u.ativo)} />
                          <button type="submit" className={`toggle-switch ${u.ativo ? "is-on" : ""}`} aria-pressed={u.ativo} title={u.ativo ? "Desativar" : "Ativar"}>
                            <span className="toggle-knob" />
                          </button>
                        </form>
                        <button
                          type="button"
                          onClick={() => setConfirmando(u)}
                          className="ghost-btn acesso-icon-btn"
                          style={{ ...iconBtn, color: "#C97064" }}
                          title="Excluir"
                        >
                          <i className="ti ti-trash" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtrados.length === 0 && (
            <div style={{ padding: "32px 14px", textAlign: "center", color: "var(--mk-text-muted)", fontSize: 13 }}>
              {usuarios.length === 0 ? "Sem usuários." : "Nenhum usuário com esse filtro."}
            </div>
          )}
        </div>
      </div>

      {/* Balão de confirmação de exclusão */}
      <Balao
        open={!!confirmando}
        onClose={() => setConfirmando(null)}
        titulo="Excluir acesso"
        icone="ti-alert-triangle"
        largura={440}
        footer={
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" onClick={() => setConfirmando(null)} className="ghost-btn" style={{ fontSize: 12 }}>Cancelar</button>
            <form action={deletarAcesso} style={{ display: "inline" }}>
              <input type="hidden" name="id" value={confirmando?.id || ""} />
              <button type="submit" className="cta-btn" style={{ fontSize: 12, background: "#C97064", color: "#FFFDF8" }}>
                <i className="ti ti-trash" /> Excluir
              </button>
            </form>
          </div>
        }
      >
        {confirmando && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ fontSize: 13, color: "var(--mk-text-secondary)", lineHeight: 1.5, margin: 0 }}>
              Tem certeza que quer excluir o acesso de <strong style={{ color: "var(--mk-text)" }}>{confirmando.nome}</strong>?
            </p>
            <div style={{ background: "var(--mk-surface)", border: "0.5px solid var(--mk-border)", borderRadius: 8, padding: "10px 14px", fontSize: 12.5 }}>
              <div><span style={{ color: "var(--mk-text-muted)" }}>Email:</span> <code>{confirmando.email}</code></div>
              <div style={{ marginTop: 4 }}><span style={{ color: "var(--mk-text-muted)" }}>Perfil:</span> {confirmando.role === "super_admin" ? "Super Admin" : confirmando.role === "admin" ? "Administrador" : "Atendente"}</div>
              <div style={{ marginTop: 4 }}><span style={{ color: "var(--mk-text-muted)" }}>Tipo de cliente:</span> {confirmando.tipo_cliente || "—"}</div>
            </div>
            <div style={{ fontSize: 11.5, color: "var(--mk-text-muted)", lineHeight: 1.5 }}>
              <i className="ti ti-info-circle" style={{ marginRight: 4 }} />
              Soft delete: o histórico fica preservado. Pra restaurar, suporte técnico.
            </div>
          </div>
        )}
      </Balao>
    </>
  );
}

const thLi: React.CSSProperties = { padding: "10px 14px", fontWeight: 600, letterSpacing: 0.3 };
const tdLi: React.CSSProperties = { padding: "10px 14px" };
const iconBtn: React.CSSProperties = { width: 30, height: 30, padding: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 13 };
