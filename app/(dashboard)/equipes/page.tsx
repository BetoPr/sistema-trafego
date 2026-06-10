import Link from "next/link";
import { requireAdmin } from "@/lib/crm/permissions";
import { createServiceClient } from "@/lib/supabase/service";
import { criarEquipe, atualizarEquipe, deletarEquipe } from "./_actions";

interface PageProps {
  searchParams: Promise<{ ok?: string; erro?: string; msg?: string; editar?: string }>;
}

export default async function EquipesPage({ searchParams }: PageProps) {
  const ctx = await requireAdmin();
  const sp = await searchParams;
  const sb = createServiceClient();

  const { data: equipes } = await sb
    .from("equipes")
    .select("id, nome, descricao, created_at")
    .eq("agencia_id", ctx.agenciaId)
    .order("nome");

  const editando = sp.editar ? equipes?.find((e) => e.id === sp.editar) : null;

  return (
    <section className="mk-page">
      <div className="mk-page-head">
        <div className="mk-eyebrow">Administração</div>
        <h1 className="mk-page-title">Equipes</h1>
        <p className="mk-page-sub">Agrupe usuários por equipes/squads.</p>
      </div>

      {sp.ok && <div style={banner("ok")}><i className="ti ti-circle-check" /> {{ criada: "Equipe criada.", atualizada: "Atualizada.", deletada: "Deletada." }[sp.ok] || "OK."}</div>}
      {sp.erro && <div style={banner("erro")}><i className="ti ti-alert-triangle" /> {sp.erro} {sp.msg && `— ${sp.msg}`}</div>}

      <div className="mk-card mk-card-lg" style={{ marginBottom: 14 }}>
        <h3 className="card-title" style={{ marginBottom: 14 }}>{editando ? `Editar — ${editando.nome}` : "Nova equipe"}</h3>
        <form action={editando ? atualizarEquipe : criarEquipe} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {editando && <input type="hidden" name="id" value={editando.id} />}
          <Field label="Nome" name="nome" defaultValue={editando?.nome ?? ""} required />
          <Field label="Descrição" name="descricao" defaultValue={editando?.descricao ?? ""} />
          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" className="cta-btn"><i className="ti ti-device-floppy" /> {editando ? "Salvar" : "Criar"}</button>
            {editando && <Link href="/equipes" className="ghost-btn">Cancelar</Link>}
          </div>
        </form>
      </div>

      <div className="mk-card mk-card-lg">
        <h3 className="card-title" style={{ marginBottom: 14 }}>Equipes ({equipes?.length || 0})</h3>
        {!equipes || equipes.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: "var(--mk-text-muted)", fontSize: 13 }}>Nenhuma equipe.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {equipes.map((e) => (
              <div key={e.id} style={rowSt}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--mk-text)" }}>{e.nome}</div>
                  {e.descricao && <div style={{ fontSize: 11, color: "var(--mk-text-muted)" }}>{e.descricao}</div>}
                </div>
                <Link href={`/equipes?editar=${e.id}`} className="ghost-btn" style={iconBtn}><i className="ti ti-edit" /></Link>
                <form action={deletarEquipe} style={{ display: "inline" }}>
                  <input type="hidden" name="id" value={e.id} />
                  <button type="submit" className="ghost-btn" style={{ ...iconBtn, color: "#C97064" }}><i className="ti ti-trash" /></button>
                </form>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function banner(t: "ok" | "erro"): React.CSSProperties {
  const cor = t === "ok" ? "#10b981" : "#C97064";
  return { background: t === "ok" ? "rgba(16,185,129,0.12)" : "rgba(201,112,100,0.12)", borderLeft: `3px solid ${cor}`, padding: "10px 14px", borderRadius: 8, fontSize: 12, color: "var(--mk-text-secondary)", marginBottom: 14 };
}
const iconBtn: React.CSSProperties = { fontSize: 11, padding: "4px 10px" };
const rowSt: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, border: "0.5px solid var(--mk-border)", background: "var(--mk-surface)" };

function Field({ label, name, defaultValue, required }: { label: string; name: string; defaultValue?: string; required?: boolean }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 11, color: "var(--mk-text-muted)", marginBottom: 4, fontFamily: "monospace" }}>{label}{required && <span style={{ color: "#C97064" }}> *</span>}</label>
      <input type="text" name={name} defaultValue={defaultValue} required={required} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "0.5px solid var(--mk-border)", background: "var(--mk-surface-2)", color: "var(--mk-text)", fontSize: 12.5 }} />
    </div>
  );
}
