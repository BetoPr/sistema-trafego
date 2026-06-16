import Link from "next/link";
import { requireAdmin } from "@/lib/crm/permissions";
import { createServiceClient } from "@/lib/supabase/service";
import { criarFila, atualizarFila, deletarFila } from "./_actions";

interface PageProps {
  searchParams: Promise<{ ok?: string; erro?: string; msg?: string; editar?: string }>;
}

export default async function FilasPage({ searchParams }: PageProps) {
  const ctx = await requireAdmin();
  const sp = await searchParams;
  const sb = createServiceClient();

  const { data: filas } = await sb
    .from("filas")
    .select("id, nome, cor, descricao, ativa, ordem, fixa, tipo, created_at")
    .eq("agencia_id", ctx.agenciaId)
    .order("ordem")
    .order("nome");

  const editando = sp.editar ? filas?.find((f) => f.id === sp.editar) : null;

  return (
    <section className="mk-page">
      <div className="mk-page-head">
        <div className="mk-eyebrow">Administração</div>
        <h1 className="mk-page-title">Filas</h1>
        <p className="mk-page-sub">Filas de atendimento por departamento ou tipo de demanda.</p>
      </div>

      {sp.ok && <Banner tipo="ok">{labelOk(sp.ok)}</Banner>}
      {sp.erro && <Banner tipo="erro">{labelErr(sp.erro)} {sp.msg ? `— ${sp.msg}` : ""}</Banner>}

      <div className="mk-card mk-card-lg" style={{ marginBottom: 14 }}>
        <h3 className="card-title" style={{ marginBottom: 14 }}>
          {editando ? `Editar fila — ${editando.nome}` : "Nova fila"}
        </h3>
        <form action={editando ? atualizarFila : criarFila} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {editando && <input type="hidden" name="id" value={editando.id} />}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: 10 }}>
            <Field label="Nome" name="nome" defaultValue={editando?.nome ?? ""} required readOnly={!!editando?.fixa} />
            <Field label="Cor" name="cor" type="color" defaultValue={editando?.cor ?? "#9B7DBF"} />
          </div>
          {editando?.fixa && (
            <div style={{ fontSize: 11, color: "var(--mk-text-muted)", padding: "4px 0" }}>
              <i className="ti ti-lock" /> Fila fixa do sistema ({editando.tipo}). Cor, descrição e status podem ser alterados — nome e tipo não.
            </div>
          )}
          <Field label="Descrição" name="descricao" defaultValue={editando?.descricao ?? ""} />
          {editando && (
            <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, color: "var(--mk-text-secondary)" }}>
              <input type="checkbox" name="ativa" defaultChecked={editando.ativa} /> Ativa
            </label>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" className="cta-btn"><i className="ti ti-device-floppy" /> {editando ? "Salvar" : "Criar"}</button>
            {editando && <Link href="/filas" className="ghost-btn">Cancelar</Link>}
          </div>
        </form>
      </div>

      <div className="mk-card mk-card-lg">
        <h3 className="card-title" style={{ marginBottom: 14 }}>Filas ({filas?.length || 0})</h3>
        {!filas || filas.length === 0 ? (
          <EmptyMsg>Nenhuma fila cadastrada.</EmptyMsg>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {filas.map((f) => (
              <div key={f.id} style={row(f.ativa)}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: f.cor }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--mk-text)" }}>{f.nome}</div>
                  {f.descricao && <div style={{ fontSize: 11, color: "var(--mk-text-muted)" }}>{f.descricao}</div>}
                </div>
                <span className={`mk-badge ${f.ativa ? "b-green" : "b-gray"}`}>{f.ativa ? "● Ativa" : "○ Inativa"}</span>
                {f.fixa && (
                  <span title={`Fila fixa do sistema (${f.tipo})`} style={{ fontSize: 10.5, padding: "3px 8px", border: "0.5px solid var(--mk-border)", borderRadius: 6, color: "var(--mk-text-muted)" }}>
                    <i className="ti ti-lock" /> {f.tipo}
                  </span>
                )}
                <Link href={`/filas?editar=${f.id}`} className="ghost-btn" style={iconBtn}><i className="ti ti-edit" /></Link>
                {!f.fixa && (
                  <form action={deletarFila} style={{ display: "inline" }}>
                    <input type="hidden" name="id" value={f.id} />
                    <button type="submit" className="ghost-btn" style={{ ...iconBtn, color: "#C97064" }}>
                      <i className="ti ti-trash" />
                    </button>
                  </form>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function labelOk(k: string) {
  return { criada: "Fila criada.", atualizada: "Fila atualizada.", deletada: "Fila deletada." }[k] || "OK.";
}
function labelErr(k: string) {
  return ({ nome_vazio: "Nome obrigatório.", db: "Erro no banco.", fila_fixa: "Fila fixa do sistema." } as Record<string, string>)[k] || "Erro.";
}

function Banner({ tipo, children }: { tipo: "ok" | "erro"; children: React.ReactNode }) {
  const cor = tipo === "ok" ? "#10b981" : "#C97064";
  return (
    <div style={{ background: tipo === "ok" ? "rgba(16,185,129,0.12)" : "rgba(201,112,100,0.12)", borderLeft: `3px solid ${cor}`, padding: "10px 14px", borderRadius: 8, fontSize: 12, color: "var(--mk-text-secondary)", marginBottom: 14 }}>
      <i className={`ti ${tipo === "ok" ? "ti-circle-check" : "ti-alert-triangle"}`} style={{ marginRight: 8, color: cor }} />
      {children}
    </div>
  );
}

function EmptyMsg({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: "24px 14px", textAlign: "center", color: "var(--mk-text-muted)", fontSize: 13 }}>{children}</div>;
}

const iconBtn: React.CSSProperties = { fontSize: 11, padding: "4px 10px" };
const row = (ativa: boolean): React.CSSProperties => ({
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 12px",
  borderRadius: 8,
  border: "0.5px solid var(--mk-border)",
  background: "var(--mk-surface)",
  opacity: ativa ? 1 : 0.55,
});

function Field({ label, name, defaultValue, required, type = "text", readOnly }: { label: string; name: string; defaultValue?: string; required?: boolean; type?: string; readOnly?: boolean }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 11, color: "var(--mk-text-muted)", marginBottom: 4, fontFamily: "monospace" }}>{label}{required && <span style={{ color: "#C97064" }}> *</span>}</label>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        required={required}
        readOnly={readOnly}
        style={{
          width: "100%",
          padding: type === "color" ? "2px 4px" : "8px 12px",
          borderRadius: 8,
          border: "0.5px solid var(--mk-border)",
          background: "var(--mk-surface-2)",
          color: "var(--mk-text)",
          fontSize: 12.5,
          height: type === "color" ? 36 : "auto",
          opacity: readOnly ? 0.6 : 1,
          cursor: readOnly ? "not-allowed" : "auto",
        }}
        title={readOnly ? "Campo bloqueado em filas fixas" : undefined}
      />
    </div>
  );
}
