import Link from "next/link";
import { requireAuth } from "@/lib/crm/permissions";
import { createServiceClient } from "@/lib/supabase/service";
import { criarMensagemRapida, atualizarMensagemRapida, deletarMensagemRapida } from "./_actions";
import { AvisaAlteracao } from "../_avisa-alteracao";
import { InserirAtalhoBtn } from "./_inserir-atalho-btn";

interface PageProps {
  searchParams: Promise<{ ok?: string; erro?: string; msg?: string; editar?: string; novo?: string }>;
}

export default async function MensagensRapidasPage({ searchParams }: PageProps) {
  const ctx = await requireAuth();
  const sp = await searchParams;
  const sb = createServiceClient();

  // Lê: globais da agência + minhas
  const { data: lista } = await sb
    .from("mensagens_rapidas")
    .select("id, comando, conteudo, global, usuario_id, updated_at")
    .eq("agencia_id", ctx.agenciaId)
    .or(`usuario_id.eq.${ctx.userId},global.eq.true`)
    .order("comando");

  const editando = sp.editar ? lista?.find((m) => m.id === sp.editar) : null;
  const mostrarForm = !!editando || sp.novo === "1";

  return (
    <section className="mk-page">
      <div className="mk-page-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div className="mk-eyebrow">Comunicação · Atalhos</div>
          <h1 className="mk-page-title">Mensagens Rápidas</h1>
          <p className="mk-page-sub">
            Atalhos <code>/comando</code>. No chat, digite o comando e ele <strong>preenche a barra</strong> pra você editar antes de enviar.
            Use <code>[nome]</code> como placeholder.
          </p>
        </div>
        {!mostrarForm && <Link href="/mensagens-rapidas?novo=1" className="cta-btn"><i className="ti ti-plus" /> Novo atalho</Link>}
      </div>

      {sp.ok && <Banner tipo="ok">{labelOk(sp.ok)}</Banner>}
      {sp.erro && <Banner tipo="erro">{labelErr(sp.erro)} {sp.msg && `— ${decodeURIComponent(sp.msg)}`}</Banner>}
      <AvisaAlteracao aba="Mensagens Rápidas" ativo={!!sp.ok} />

      {mostrarForm && (
        <div className="mk-card mk-card-lg" style={{ marginBottom: 14 }}>
          <h3 className="card-title" style={{ marginBottom: 14 }}>{editando ? `Editar — ${editando.comando}` : "Novo atalho"}</h3>
          <form action={editando ? atualizarMensagemRapida : criarMensagemRapida} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {editando && <input type="hidden" name="id" value={editando.id} />}
            <Field label="Comando (sem espaços)" name="comando" defaultValue={editando?.comando ?? ""} placeholder="/apresentacao1" required />
            <div>
              <label style={lbl}>Conteúdo</label>
              <textarea name="conteudo" defaultValue={editando?.conteudo ?? ""} required rows={5} style={{ ...inp, fontFamily: "monospace", resize: "vertical" }} placeholder="Oi [nome], tudo bem? Aqui é o Artur..." />
            </div>
            {!editando && (ctx.role === "admin" || ctx.role === "super_admin") && (
              <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, color: "var(--mk-text-secondary)" }}>
                <input type="checkbox" name="global" /> Compartilhar com toda agência (global)
              </label>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" className="cta-btn"><i className="ti ti-device-floppy" /> {editando ? "Salvar" : "Criar"}</button>
              <Link href="/mensagens-rapidas" className="ghost-btn">Cancelar</Link>
            </div>
          </form>
        </div>
      )}

      <div className="mk-card mk-card-lg">
        <h3 className="card-title" style={{ marginBottom: 14 }}>Atalhos ({lista?.length || 0})</h3>
        {!lista || lista.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: "var(--mk-text-muted)", fontSize: 13 }}>Sem atalhos.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {lista.map((m) => (
              <div key={m.id} style={{ padding: "10px 12px", borderRadius: 8, border: "0.5px solid var(--mk-border)", background: "var(--mk-surface)", display: "flex", gap: 12, alignItems: "flex-start" }}>
                <code style={{ fontSize: 11.5, padding: "3px 8px", background: "rgba(155,125,191,0.18)", color: "#9B7DBF", borderRadius: 5, fontFamily: "monospace" }}>{m.comando}</code>
                <div style={{ flex: 1, fontSize: 12, color: "var(--mk-text-secondary)", whiteSpace: "pre-wrap" }}>{m.conteudo}</div>
                {m.global && <span className="mk-badge b-purple" style={{ fontSize: 9.5 }}>GLOBAL</span>}
                <InserirAtalhoBtn texto={m.conteudo} />
                <Link href={`/mensagens-rapidas?editar=${m.id}`} className="ghost-btn" style={iconBtn}><i className="ti ti-edit" /></Link>
                <form action={deletarMensagemRapida} style={{ display: "inline" }}>
                  <input type="hidden" name="id" value={m.id} />
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

function labelOk(k: string) { return ({ criada: "Atalho criado.", atualizada: "Atualizado.", deletada: "Removido." } as Record<string, string>)[k] || "OK."; }
function labelErr(k: string) { return ({ campos: "Comando e conteúdo obrigatórios.", db: "Erro no banco.", permissao: "Sem permissão pra criar globais." } as Record<string, string>)[k] || "Erro."; }

function Banner({ tipo, children }: { tipo: "ok" | "erro"; children: React.ReactNode }) {
  const cor = tipo === "ok" ? "#10b981" : "#C97064";
  return <div style={{ background: tipo === "ok" ? "rgba(16,185,129,0.12)" : "rgba(201,112,100,0.12)", borderLeft: `3px solid ${cor}`, padding: "10px 14px", borderRadius: 8, fontSize: 12, color: "var(--mk-text-secondary)", marginBottom: 14 }}><i className={`ti ${tipo === "ok" ? "ti-circle-check" : "ti-alert-triangle"}`} style={{ marginRight: 8, color: cor }} />{children}</div>;
}

function Field({ label, name, defaultValue, placeholder, required }: { label: string; name: string; defaultValue?: string; placeholder?: string; required?: boolean }) {
  return (
    <div>
      <label style={lbl}>{label}{required && <span style={{ color: "#C97064" }}> *</span>}</label>
      <input type="text" name={name} defaultValue={defaultValue} placeholder={placeholder} required={required} style={inp} />
    </div>
  );
}

const lbl: React.CSSProperties = { display: "block", fontSize: 11, color: "var(--mk-text-muted)", marginBottom: 4, fontFamily: "monospace" };
const inp: React.CSSProperties = { width: "100%", padding: "8px 12px", borderRadius: 8, border: "0.5px solid var(--mk-border)", background: "var(--mk-surface-2)", color: "var(--mk-text)", fontSize: 12.5 };
const iconBtn: React.CSSProperties = { fontSize: 11, padding: "4px 10px" };
