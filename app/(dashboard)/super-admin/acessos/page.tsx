import Link from "next/link";
import { requireSuperAdmin } from "@/lib/crm/permissions";
import { createServiceClient } from "@/lib/supabase/service";
import { criarAcesso, atualizarAcesso, alternarAtivoAcesso, deletarAcesso } from "./_actions";

// Apenas funções que existem no CRM hoje.
const PERMS_LABEL: Record<string, string> = {
  atendimentos: "Atendimentos",
  contatos: "Contatos",
  etiquetas: "Etiquetas",
  mensagens_rapidas: "Mensagens Rápidas",
  canais: "Canais (WhatsApp)",
  filas: "Filas",
  equipes: "Equipes",
  follow_up: "Follow-up",
  cobrancas: "Cobranças",
  relatorios: "Relatórios",
  ia: "IA & Prompts",
  webhooks: "Webhooks",
  configuracoes: "Configurações",
};

interface PageProps {
  searchParams: Promise<{ ok?: string; erro?: string; msg?: string; editar?: string; novo?: string }>;
}

export default async function AcessosPage({ searchParams }: PageProps) {
  await requireSuperAdmin();
  const sp = await searchParams;
  const sb = createServiceClient();

  const [{ data: usuarios }, { data: agencias }] = await Promise.all([
    sb.from("usuarios").select("id, nome, email, telefone, role, ativo, permissoes_menu, agencia_id, ultimo_login, deleted_at").is("deleted_at", null).order("nome"),
    sb.from("agencias").select("id, nome").order("nome"),
  ]);

  const agenciaPorId = new Map((agencias || []).map((a) => [a.id, a.nome] as const));
  const editando = sp.editar ? usuarios?.find((u) => u.id === sp.editar) : null;
  const mostrarForm = !!editando || sp.novo === "1";

  return (
    <section className="mk-page">
      <div className="mk-page-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div className="mk-eyebrow">Super Admin</div>
          <h1 className="mk-page-title">Acessos</h1>
          <p className="mk-page-sub">Gerencia usuários de TODAS as agências. Crie novos acessos, edite permissões, ative/desative.</p>
        </div>
        {!mostrarForm && <Link href="/super-admin/acessos?novo=1" className="cta-btn"><i className="ti ti-plus" /> Novo acesso</Link>}
      </div>

      {sp.ok && <Banner tipo="ok">{labelOk(sp.ok)}</Banner>}
      {sp.erro && <Banner tipo="erro">{labelErr(sp.erro)} {sp.msg && `— ${decodeURIComponent(sp.msg)}`}</Banner>}

      {mostrarForm && (
        <div className="mk-card mk-card-lg" style={{ marginBottom: 14 }}>
          <h3 className="card-title" style={{ marginBottom: 14 }}>{editando ? `Editar — ${editando.nome}` : "Novo acesso"}</h3>
          <form action={editando ? atualizarAcesso : criarAcesso} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {editando && <input type="hidden" name="id" value={editando.id} />}
            <div style={grid2}>
              <Field label="Nome" name="nome" defaultValue={editando?.nome ?? ""} required />
              <Field label="Email" name="email" type="email" defaultValue={editando?.email ?? ""} required disabled={!!editando} />
            </div>
            <div style={grid2}>
              <Field label={editando ? "Nova senha (deixe em branco pra manter)" : "Senha (mín. 6)"} name="senha" type="password" required={!editando} />
              <Field label="Telefone" name="telefone" defaultValue={editando?.telefone ?? ""} />
            </div>
            <div style={grid2}>
              <div>
                <label style={lblMono}>Agência *</label>
                <select name="agencia_id" defaultValue={editando?.agencia_id ?? ""} required style={inpStyle}>
                  <option value="">— Selecione —</option>
                  {(agencias || []).map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
                </select>
              </div>
              <div>
                <label style={lblMono}>Perfil *</label>
                <select name="role" defaultValue={editando?.role ?? "atendente"} required style={inpStyle}>
                  <option value="atendente">Atendente</option>
                  <option value="admin">Administrador</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
            </div>

            <div style={{ borderTop: "0.5px solid var(--mk-border)", paddingTop: 12 }}>
              <label style={lblMono}>Permissões de menu</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 6 }}>
                {Object.entries(PERMS_LABEL).map(([k, label]) => {
                  const def = (editando?.permissoes_menu as Record<string, boolean>)?.[k] ?? true;
                  return (
                    <label key={k} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", border: "0.5px solid var(--mk-border)", borderRadius: 8, background: "var(--mk-surface)", fontSize: 12, cursor: "pointer" }}>
                      <input type="checkbox" name={`perm_${k}`} defaultChecked={def} />
                      <span>{label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button type="submit" className="cta-btn"><i className="ti ti-device-floppy" /> {editando ? "Salvar" : "Criar acesso"}</button>
              <Link href="/super-admin/acessos" className="ghost-btn">Cancelar</Link>
            </div>
          </form>
        </div>
      )}

      <div className="mk-card mk-card-lg">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 12.5 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--mk-text-muted)", fontSize: 11 }}>
                <th style={thLi}>Nome</th>
                <th style={thLi}>Email</th>
                <th style={thLi}>Agência</th>
                <th style={thLi}>Perfil</th>
                <th style={thLi}>Status</th>
                <th style={thLi}>Último login</th>
                <th style={thLi}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {(usuarios || []).map((u) => (
                <tr key={u.id} style={{ borderTop: "0.5px solid var(--mk-border)" }}>
                  <td style={tdLi}>{u.nome}</td>
                  <td style={tdLi}><span style={{ fontFamily: "monospace", fontSize: 11.5 }}>{u.email}</span></td>
                  <td style={tdLi}>{agenciaPorId.get(u.agencia_id as string) || <span style={{ color: "var(--mk-text-muted)" }}>—</span>}</td>
                  <td style={tdLi}>
                    <span className={`mk-badge ${u.role === "super_admin" ? "b-red" : u.role === "admin" ? "b-purple" : "b-gray"}`}>
                      {u.role === "super_admin" ? "Super" : u.role === "admin" ? "Admin" : "Atendente"}
                    </span>
                  </td>
                  <td style={tdLi}><span className={`mk-badge ${u.ativo ? "b-green" : "b-gray"}`}>{u.ativo ? "Ativo" : "Inativo"}</span></td>
                  <td style={tdLi}>{u.ultimo_login ? new Date(u.ultimo_login).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—"}</td>
                  <td style={tdLi}>
                    <div style={{ display: "flex", gap: 4 }}>
                      <Link href={`/super-admin/acessos?editar=${u.id}`} className="ghost-btn" style={iconBtn}><i className="ti ti-pencil" /></Link>
                      <form action={alternarAtivoAcesso} style={{ display: "inline" }}>
                        <input type="hidden" name="id" value={u.id} />
                        <input type="hidden" name="ativo" value={String(u.ativo)} />
                        <button type="submit" className={`toggle-switch ${u.ativo ? "is-on" : ""}`} aria-pressed={u.ativo ?? false} title={u.ativo ? "Desativar" : "Ativar"}>
                          <span className="toggle-knob" />
                        </button>
                      </form>
                      <form action={deletarAcesso} style={{ display: "inline" }}>
                        <input type="hidden" name="id" value={u.id} />
                        <button type="submit" className="ghost-btn" style={{ ...iconBtn, color: "#C97064" }} title="Excluir"><i className="ti ti-trash" /></button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!usuarios || usuarios.length === 0) && (
            <div style={{ padding: "32px 14px", textAlign: "center", color: "var(--mk-text-muted)", fontSize: 13 }}>Sem usuários.</div>
          )}
        </div>
      </div>
    </section>
  );
}

function labelOk(k: string) { return ({ criado: "Acesso criado.", atualizado: "Atualizado.", alterado: "Status alterado.", deletado: "Excluído." } as Record<string, string>)[k] || "OK."; }
function labelErr(k: string) { return ({ campos: "Campos obrigatórios.", senha_curta: "Senha precisa ter 6+ caracteres.", auth: "Erro de autenticação.", db: "Erro no banco.", id: "ID inválido." } as Record<string, string>)[k] || "Erro."; }

function Banner({ tipo, children }: { tipo: "ok" | "erro"; children: React.ReactNode }) {
  const cor = tipo === "ok" ? "#10b981" : "#C97064";
  return <div style={{ background: tipo === "ok" ? "rgba(16,185,129,0.12)" : "rgba(201,112,100,0.12)", borderLeft: `3px solid ${cor}`, padding: "10px 14px", borderRadius: 8, fontSize: 12, color: "var(--mk-text-secondary)", marginBottom: 14 }}><i className={`ti ${tipo === "ok" ? "ti-circle-check" : "ti-alert-triangle"}`} style={{ marginRight: 8, color: cor }} />{children}</div>;
}

function Field({ label, name, defaultValue, placeholder, required, type = "text", disabled }: { label: string; name: string; defaultValue?: string; placeholder?: string; required?: boolean; type?: string; disabled?: boolean }) {
  return (
    <div>
      <label style={lblMono}>{label}{required && <span style={{ color: "#C97064" }}> *</span>}</label>
      <input type={type} name={name} defaultValue={defaultValue} placeholder={placeholder} required={required} disabled={disabled} style={inpStyle} />
    </div>
  );
}

const lblMono: React.CSSProperties = { display: "block", fontSize: 11, color: "var(--mk-text-muted)", marginBottom: 4, fontFamily: "monospace" };
const inpStyle: React.CSSProperties = { width: "100%", padding: "8px 12px", borderRadius: 8, border: "0.5px solid var(--mk-border)", background: "var(--mk-surface-2)", color: "var(--mk-text)", fontSize: 12.5 };
const grid2: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 };
const thLi: React.CSSProperties = { padding: "10px 14px", fontWeight: 600, letterSpacing: 0.3 };
const tdLi: React.CSSProperties = { padding: "10px 14px" };
const iconBtn: React.CSSProperties = { width: 30, height: 30, padding: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 13 };
