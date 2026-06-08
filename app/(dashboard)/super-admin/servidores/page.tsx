import Link from "next/link";
import { requireSuperAdmin } from "@/lib/crm/permissions";
import { createServiceClient } from "@/lib/supabase/service";
import { criarServidor, atualizarServidor, deletarServidor, testarServidor } from "./_actions";

interface PageProps {
  searchParams: Promise<{ ok?: string; erro?: string; msg?: string; editar?: string }>;
}

const ERROS: Record<string, string> = {
  campos_obrigatorios: "Preencha nome, URL e admin token.",
  base_url_invalida: "URL deve começar com https://.",
  db_error: "Erro ao salvar no banco.",
  nao_encontrado: "Servidor não encontrado.",
  teste_falhou: "Teste de conectividade falhou — verifique URL e token.",
};

const OKS: Record<string, string> = {
  criado: "Servidor criado.",
  atualizado: "Servidor atualizado.",
  deletado: "Servidor deletado.",
  teste_ok: "Conectividade OK.",
};

export default async function ServidoresPage({ searchParams }: PageProps) {
  await requireSuperAdmin();
  const sp = await searchParams;
  const sb = createServiceClient();

  const { data: servidores } = await sb
    .from("super_admin_servidores")
    .select("id, nome, plataforma, base_url, ativo, observacoes, created_at, updated_at")
    .order("created_at", { ascending: false });

  const editandoId = sp.editar;
  const editando = editandoId ? servidores?.find((s) => s.id === editandoId) : null;

  return (
    <section className="mk-page">
      <div className="mk-page-head">
        <Link href="/dashboard" style={{ fontSize: 12, color: "var(--mk-accent)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
          <i className="ti ti-arrow-left" style={{ fontSize: 13 }} />
          Voltar ao dashboard
        </Link>
        <div className="mk-eyebrow" style={{ color: "#C97064" }}>Super Admin · Acesso exclusivo</div>
        <h1 className="mk-page-title">Servidores UAZAPI</h1>
        <p className="mk-page-sub">
          Cadastre os servidores UAZAPI usados pelo sistema. Apenas Super Admin enxerga essa tela.
          Admin token fica criptografado at-rest.
        </p>
      </div>

      {sp.ok && (
        <div style={banner("ok")}>
          <i className="ti ti-circle-check" style={{ marginRight: 8, color: "#6B8E4E" }} />
          {OKS[sp.ok] || "OK."}
          {sp.msg && <div style={{ marginTop: 4, fontSize: 11, opacity: 0.8 }}>{sp.msg}</div>}
        </div>
      )}
      {sp.erro && (
        <div style={banner("erro")}>
          <i className="ti ti-alert-triangle" style={{ marginRight: 8, color: "#C97064" }} />
          <strong>{ERROS[sp.erro] || "Erro."}</strong>
          {sp.msg && <div style={{ marginTop: 4, fontSize: 11, opacity: 0.8 }}>{sp.msg}</div>}
        </div>
      )}

      {/* Formulário criar/editar */}
      <div className="mk-card mk-card-lg" style={{ marginBottom: 14 }}>
        <h3 className="card-title" style={{ marginBottom: 14 }}>
          {editando ? `Editar — ${editando.nome}` : "Novo servidor UAZAPI"}
        </h3>
        <form action={editando ? atualizarServidor : criarServidor} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {editando && <input type="hidden" name="id" value={editando.id} />}
          <Field label="Nome" name="nome" defaultValue={editando?.nome ?? ""} placeholder="Servidor principal" required />
          <Field label="Base URL" name="base_url" defaultValue={editando?.base_url ?? ""} placeholder="https://infinitycomercialia.uazapi.com" required />
          <Field
            label="Admin Token"
            name="admin_token"
            type="password"
            defaultValue={editando ? "•••GUARDADO•••" : ""}
            placeholder={editando ? "Deixe '•••GUARDADO•••' pra manter, ou cole novo token" : "N00m..."}
            required={!editando}
          />
          <Field label="Observações" name="observacoes" defaultValue={editando?.observacoes ?? ""} placeholder="ex: servidor de produção, suporta 50 instâncias" />
          {editando && (
            <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, color: "var(--mk-text-secondary)" }}>
              <input type="checkbox" name="ativo" defaultChecked={editando.ativo} /> Ativo
            </label>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button type="submit" className="cta-btn">
              <i className="ti ti-device-floppy" style={{ fontSize: 14 }} />
              {editando ? "Salvar alterações" : "Criar servidor"}
            </button>
            {editando && (
              <Link href="/super-admin/servidores" className="ghost-btn">
                Cancelar
              </Link>
            )}
          </div>
        </form>
      </div>

      {/* Lista */}
      <div className="mk-card mk-card-lg">
        <h3 className="card-title" style={{ marginBottom: 14 }}>
          Servidores cadastrados ({servidores?.length || 0})
        </h3>
        {!servidores || servidores.length === 0 ? (
          <div style={{ padding: "24px 14px", textAlign: "center", color: "var(--mk-text-muted)", fontSize: 13 }}>
            Nenhum servidor cadastrado.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {servidores.map((s) => (
              <div
                key={s.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: "0.5px solid var(--mk-border)",
                  background: "var(--mk-surface)",
                  opacity: s.ativo ? 1 : 0.5,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--mk-text)" }}>{s.nome}</div>
                  <div style={{ fontSize: 11, color: "var(--mk-text-muted)", fontFamily: "monospace", marginTop: 2 }}>
                    {s.base_url}
                  </div>
                  {s.observacoes && (
                    <div style={{ fontSize: 10.5, color: "var(--mk-text-muted)", marginTop: 4 }}>{s.observacoes}</div>
                  )}
                </div>
                <span className={`mk-badge ${s.ativo ? "b-green" : "b-gray"}`}>
                  {s.ativo ? "● Ativo" : "○ Inativo"}
                </span>
                <form action={testarServidor} style={{ display: "inline" }}>
                  <input type="hidden" name="id" value={s.id} />
                  <button type="submit" className="ghost-btn" style={{ fontSize: 11, padding: "4px 10px" }}>
                    <i className="ti ti-plug-connected" /> Testar
                  </button>
                </form>
                <Link href={`/super-admin/servidores?editar=${s.id}`} className="ghost-btn" style={{ fontSize: 11, padding: "4px 10px" }}>
                  <i className="ti ti-edit" /> Editar
                </Link>
                <form action={deletarServidor} style={{ display: "inline" }}>
                  <input type="hidden" name="id" value={s.id} />
                  <button
                    type="submit"
                    className="ghost-btn"
                    style={{ fontSize: 11, padding: "4px 10px", color: "#C97064" }}
                  >
                    <i className="ti ti-trash" />
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function banner(tipo: "ok" | "erro"): React.CSSProperties {
  const cor = tipo === "ok" ? "#6B8E4E" : "#C97064";
  return {
    background: tipo === "ok" ? "rgba(107,142,78,0.12)" : "rgba(201,112,100,0.12)",
    borderLeft: `3px solid ${cor}`,
    padding: "10px 14px",
    borderRadius: 8,
    fontSize: 12,
    color: "var(--mk-text-secondary)",
    marginBottom: 14,
  };
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  type = "text",
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 11, color: "var(--mk-text-muted)", marginBottom: 4, fontFamily: "monospace", letterSpacing: 0.3 }}>
        {label} {required && <span style={{ color: "#C97064" }}>*</span>}
      </label>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        style={{
          width: "100%",
          padding: "8px 12px",
          borderRadius: 8,
          border: "0.5px solid var(--mk-border)",
          background: "var(--mk-surface-2)",
          color: "var(--mk-text)",
          fontSize: 12.5,
          fontFamily: type === "password" || name === "base_url" || name === "admin_token" ? "monospace" : "inherit",
        }}
      />
    </div>
  );
}
