import Link from "next/link";
import { requireAdmin, PERMISSOES_MENU } from "@/lib/crm/permissions";
import { createServiceClient } from "@/lib/supabase/service";
import { criarUsuario, atualizarUsuario, alternarAtivo, softDeleteUsuario } from "./_actions";

interface PageProps {
  searchParams: Promise<{ ok?: string; erro?: string; msg?: string; editar?: string; novo?: string }>;
}

const DIAS = [
  { id: "dom", nome: "Domingo" },
  { id: "seg", nome: "Segunda" },
  { id: "ter", nome: "Terça" },
  { id: "qua", nome: "Quarta" },
  { id: "qui", nome: "Quinta" },
  { id: "sex", nome: "Sexta" },
  { id: "sab", nome: "Sábado" },
];

const PERMS_LABEL: Record<string, string> = {
  envio_massa: "Envio em Massa",
  grupos: "Grupos",
  chat_privado: "Chat Privado",
  kanban: "Kanban",
  tarefas: "Tarefas",
  sessoes: "Sessões",
  relatorios: "Relatórios",
  filas: "Filas",
  equipes: "Equipes",
  mensagens_rapidas: "Mensagens Rápidas",
  chatbot: "Chatbot",
  agendamentos: "Agendamentos",
  aniversarios: "Aniversários",
  fechamento: "Fechamento",
  etiquetas: "Etiquetas",
  notas: "Notas",
  protocolos: "Protocolos",
  avaliacoes: "Avaliações",
  horario_atendimento: "Horário Atendimento",
  campanhas: "Campanhas",
  contatos: "Contatos",
  google_calendar: "Google Calendar",
};

export default async function UsuariosPage({ searchParams }: PageProps) {
  const ctx = await requireAdmin();
  const sp = await searchParams;
  const sb = createServiceClient();

  const { data: usuarios } = await sb
    .from("usuarios")
    .select("id, nome, email, telefone, role, ativo, online, restrito, permissoes_menu, horario_atendimento, ultimo_login")
    .eq("agencia_id", ctx.agenciaId)
    .is("deleted_at", null)
    .order("nome");

  const editando = sp.editar ? usuarios?.find((u) => u.id === sp.editar) : null;
  const mostrarForm = !!editando || sp.novo === "1";

  return (
    <section className="mk-page">
      <div className="mk-page-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div className="mk-eyebrow">Administração</div>
          <h1 className="mk-page-title">Usuários</h1>
          <p className="mk-page-sub">Gerencie os usuários do sistema.</p>
        </div>
        {!mostrarForm && <Link href="/usuarios?novo=1" className="cta-btn"><i className="ti ti-plus" /> Novo usuário</Link>}
      </div>

      {sp.ok && <Banner tipo="ok">{labelOk(sp.ok)}</Banner>}
      {sp.erro && <Banner tipo="erro">{labelErr(sp.erro)} {sp.msg && `— ${decodeURIComponent(sp.msg)}`}</Banner>}

      {mostrarForm && (
        <div className="mk-card mk-card-lg" style={{ marginBottom: 14 }}>
          <h3 className="card-title" style={{ marginBottom: 14 }}>
            {editando ? `Editar usuário — ${editando.nome}` : "Novo usuário"}
          </h3>
          <form action={editando ? atualizarUsuario : criarUsuario} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {editando && <input type="hidden" name="id" value={editando.id} />}

            <div style={grid2}>
              <Field label="Nome" name="nome" defaultValue={editando?.nome ?? ""} required />
              <Field label="Email" name="email" type="email" defaultValue={editando?.email ?? ""} required />
            </div>

            <div style={grid2}>
              <Field
                label={editando ? "Nova senha (deixe em branco para manter)" : "Senha"}
                name="senha"
                type="password"
                required={!editando}
                placeholder="••••••"
              />
              <Field label="Telefone" name="telefone" defaultValue={editando?.telefone ?? ""} placeholder="(00) 00000-0000" />
            </div>

            <div style={grid2}>
              <div>
                <label style={lblSt}>Perfil <span style={{ color: "#C97064" }}>*</span></label>
                <select name="role" defaultValue={editando?.role ?? "atendente"} style={inpSt}>
                  <option value="atendente">Atendente</option>
                  <option value="admin">Administrador</option>
                  {ctx.role === "super_admin" && <option value="super_admin">Super Admin</option>}
                </select>
              </div>
              <div>
                <label style={lblSt}>Usuário Restrito</label>
                <select name="restrito_select" disabled style={{ ...inpSt, opacity: 0.6 }}>
                  <option>Configurar via toggle abaixo</option>
                </select>
                <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 11, color: "var(--mk-text-secondary)", marginTop: 4 }}>
                  <input type="checkbox" name="restrito" defaultChecked={editando?.restrito ?? false} /> Habilitado (vê só próprios tickets)
                </label>
              </div>
            </div>

            {/* Permissões de Menu */}
            <details open={!editando}>
              <summary style={summarySt}>Permissões de Menu</summary>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 10, paddingLeft: 14 }}>
                {PERMISSOES_MENU.map((p) => {
                  const def = (editando?.permissoes_menu as Record<string, boolean>)?.[p] ?? true;
                  return (
                    <label key={p} style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 11.5, color: "var(--mk-text-secondary)", padding: "6px 8px", borderRadius: 6, border: "0.5px solid var(--mk-border)" }}>
                      <input type="checkbox" name={`perm_${p}`} defaultChecked={def} /> {PERMS_LABEL[p]}
                    </label>
                  );
                })}
              </div>
            </details>

            <details>
              <summary style={summarySt}>Config SIP (em breve)</summary>
              <div style={{ fontSize: 11, color: "var(--mk-text-muted)", padding: 10 }}>
                Telefonia VoIP via SIP — placeholder para integração futura.
              </div>
            </details>

            <details>
              <summary style={summarySt}>Horário de Atendimento</summary>
              <table style={{ width: "100%", marginTop: 10, fontSize: 11, color: "var(--mk-text-secondary)", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={thSt}>Dia</th>
                    <th style={thSt}>Status</th>
                    <th style={thSt}>1º período</th>
                    <th style={thSt}>2º período</th>
                  </tr>
                </thead>
                <tbody>
                  {DIAS.map((d) => {
                    const def = (editando?.horario_atendimento as Record<string, { status: string; p1?: string; p2?: string }>)?.[d.id] ?? { status: "Aberto" };
                    return (
                      <tr key={d.id}>
                        <td style={tdSt}>{d.nome}</td>
                        <td style={tdSt}>
                          <select name={`hor_${d.id}_status`} defaultValue={def.status} style={{ ...inpSt, fontSize: 11, padding: "4px 8px" }}>
                            <option>Aberto</option>
                            <option>Fechado</option>
                          </select>
                        </td>
                        <td style={tdSt}><input name={`hor_${d.id}_p1`} defaultValue={def.p1 || ""} placeholder="08:00-12:00" style={{ ...inpSt, fontSize: 11, padding: "4px 8px" }} /></td>
                        <td style={tdSt}><input name={`hor_${d.id}_p2`} defaultValue={def.p2 || ""} placeholder="14:00-18:00" style={{ ...inpSt, fontSize: 11, padding: "4px 8px" }} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </details>

            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <button type="submit" className="cta-btn"><i className="ti ti-device-floppy" /> {editando ? "Salvar" : "Criar usuário"}</button>
              <Link href="/usuarios" className="ghost-btn">Cancelar</Link>
            </div>
          </form>
        </div>
      )}

      <div className="mk-card mk-card-lg">
        <h3 className="card-title" style={{ marginBottom: 14 }}>Usuários ({usuarios?.length || 0})</h3>
        {!usuarios || usuarios.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: "var(--mk-text-muted)", fontSize: 13 }}>
            Nenhum usuário cadastrado.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 12.5 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--mk-text-muted)", fontSize: 11 }}>
                <th style={thLi}>Nome</th>
                <th style={thLi}>Email</th>
                <th style={thLi}>Telefone</th>
                <th style={thLi}>Perfil</th>
                <th style={thLi}>Status</th>
                <th style={thLi}>Online</th>
                <th style={thLi}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id} style={{ borderTop: "0.5px solid var(--mk-border)" }}>
                  <td style={tdLi}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 7, background: "rgba(155,125,191,0.2)", color: "#9B7DBF", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 11 }}>
                        {u.nome.slice(0, 2).toUpperCase()}
                      </div>
                      {u.nome}
                    </div>
                  </td>
                  <td style={tdLi}>{u.email}</td>
                  <td style={tdLi}>{u.telefone || "—"}</td>
                  <td style={tdLi}>
                    <span className={`mk-badge ${u.role === "super_admin" ? "b-red" : u.role === "admin" ? "b-purple" : "b-gray"}`}>
                      {u.role === "super_admin" ? "Super Admin" : u.role === "admin" ? "Administrador" : "Atendente"}
                    </span>
                  </td>
                  <td style={tdLi}><span className={`mk-badge ${u.ativo ? "b-green" : "b-gray"}`}>{u.ativo ? "Ativo" : "Inativo"}</span></td>
                  <td style={tdLi}>{u.online ? <i className="ti ti-circle-filled" style={{ color: "#6B8E4E", fontSize: 11 }} /> : <i className="ti ti-circle" style={{ color: "var(--mk-text-muted)", fontSize: 11 }} />}</td>
                  <td style={tdLi}>
                    <div style={{ display: "flex", gap: 4 }}>
                      <Link href={`/usuarios?editar=${u.id}`} className="ghost-btn" style={iconBtn}><i className="ti ti-edit" /></Link>
                      <form action={alternarAtivo} style={{ display: "inline" }}>
                        <input type="hidden" name="id" value={u.id} />
                        <input type="hidden" name="ativo" value={String(u.ativo)} />
                        <button type="submit" className="ghost-btn" style={iconBtn} title={u.ativo ? "Desativar" : "Ativar"}>
                          <i className={`ti ${u.ativo ? "ti-toggle-right" : "ti-toggle-left"}`} />
                        </button>
                      </form>
                      <form action={softDeleteUsuario} style={{ display: "inline" }}>
                        <input type="hidden" name="id" value={u.id} />
                        <button type="submit" className="ghost-btn" style={{ ...iconBtn, color: "#C97064" }} title="Excluir">
                          <i className="ti ti-trash" />
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

function labelOk(k: string) {
  return ({ criado: "Usuário criado.", atualizado: "Usuário atualizado.", ativo_alterado: "Status alterado.", deletado: "Usuário removido." } as Record<string, string>)[k] || "OK.";
}
function labelErr(k: string) {
  return ({ campos_obrigatorios: "Preencha campos obrigatórios.", senha_curta: "Senha precisa de mín. 6 caracteres.", autodelete: "Você não pode se excluir.", auth: "Erro Auth Supabase.", db: "Erro no banco.", permissao_negada: "Sem permissão pra atribuir Super Admin." } as Record<string, string>)[k] || "Erro.";
}

function Banner({ tipo, children }: { tipo: "ok" | "erro"; children: React.ReactNode }) {
  const cor = tipo === "ok" ? "#6B8E4E" : "#C97064";
  return (
    <div style={{ background: tipo === "ok" ? "rgba(107,142,78,0.12)" : "rgba(201,112,100,0.12)", borderLeft: `3px solid ${cor}`, padding: "10px 14px", borderRadius: 8, fontSize: 12, color: "var(--mk-text-secondary)", marginBottom: 14 }}>
      <i className={`ti ${tipo === "ok" ? "ti-circle-check" : "ti-alert-triangle"}`} style={{ marginRight: 8, color: cor }} />
      {children}
    </div>
  );
}

function Field({ label, name, defaultValue, placeholder, required, type = "text" }: { label: string; name: string; defaultValue?: string; placeholder?: string; required?: boolean; type?: string }) {
  return (
    <div>
      <label style={lblSt}>{label}{required && <span style={{ color: "#C97064" }}> *</span>}</label>
      <input type={type} name={name} defaultValue={defaultValue} placeholder={placeholder} required={required} style={inpSt} />
    </div>
  );
}

const grid2: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 };
const lblSt: React.CSSProperties = { display: "block", fontSize: 11, color: "var(--mk-text-muted)", marginBottom: 4, fontFamily: "monospace" };
const inpSt: React.CSSProperties = { width: "100%", padding: "8px 12px", borderRadius: 8, border: "0.5px solid var(--mk-border)", background: "var(--mk-surface-2)", color: "var(--mk-text)", fontSize: 12.5 };
const summarySt: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "var(--mk-text)", cursor: "pointer", padding: "8px 0", borderTop: "0.5px solid var(--mk-border)" };
const iconBtn: React.CSSProperties = { fontSize: 11, padding: "4px 10px" };
const thLi: React.CSSProperties = { padding: "8px 10px", textAlign: "left" };
const tdLi: React.CSSProperties = { padding: "10px", verticalAlign: "middle" };
const thSt: React.CSSProperties = { padding: "6px 8px", fontWeight: 600, textAlign: "left", borderBottom: "0.5px solid var(--mk-border)" };
const tdSt: React.CSSProperties = { padding: "6px 8px" };
