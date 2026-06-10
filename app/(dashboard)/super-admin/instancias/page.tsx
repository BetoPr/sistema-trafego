import Link from "next/link";
import { requireSuperAdmin } from "@/lib/crm/permissions";
import { createServiceClient } from "@/lib/supabase/service";
import { listarInstanciasServidores, alternarFavorita, alternarVisivel, salvarAlias } from "./_actions";

interface PageProps {
  searchParams: Promise<{
    servidor?: string;
    filtro?: "todas" | "visiveis" | "favoritas";
    q?: string;
    editar?: string;
    ok?: string;
  }>;
}

export default async function InstanciasPage({ searchParams }: PageProps) {
  await requireSuperAdmin();
  const sp = await searchParams;
  const sb = createServiceClient();

  const { data: servidores } = await sb
    .from("super_admin_servidores")
    .select("id, nome, base_url, ativo")
    .eq("ativo", true)
    .order("nome");

  const filtro = sp.filtro || "visiveis";

  const instancias = await listarInstanciasServidores({
    servidorId: sp.servidor || undefined,
    apenasVisiveis: filtro === "visiveis",
    apenasFavoritas: filtro === "favoritas",
    busca: sp.q || undefined,
  });

  const editando = sp.editar ? instancias.find((i) => `${i.servidorId}|${i.id}` === sp.editar) : null;

  return (
    <section className="mk-page">
      <div className="mk-page-head">
        <Link href="/super-admin/servidores" style={{ fontSize: 12, color: "var(--mk-accent)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
          <i className="ti ti-arrow-left" /> Servidores
        </Link>
        <div className="mk-eyebrow" style={{ color: "#C97064" }}>Super Admin · Acesso exclusivo</div>
        <h1 className="mk-page-title">Instâncias UAZAPI</h1>
        <p className="mk-page-sub">
          Veja todas as instâncias dos seus servidores. Marque como <strong>favoritas</strong> as que mais usa, ou esconda
          as que não interessam pra não poluir a lista.
        </p>
      </div>

      {sp.ok && (
        <div style={banner("ok")}>
          <i className="ti ti-circle-check" style={{ marginRight: 8, color: "#10b981" }} />
          {sp.ok === "fav" ? "Favorito alterado." : sp.ok === "vis" ? "Visibilidade alterada." : sp.ok === "alias" ? "Apelido salvo." : "OK."}
        </div>
      )}

      <div className="mk-card mk-card-lg" style={{ marginBottom: 14 }}>
        <form method="get" style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1.5fr auto", gap: 8, alignItems: "end" }}>
          <div>
            <Label>Servidor</Label>
            <select name="servidor" defaultValue={sp.servidor || ""} style={inp}>
              <option value="">Todos servidores ativos</option>
              {servidores?.map((s) => (
                <option key={s.id} value={s.id}>{s.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Buscar</Label>
            <input name="q" defaultValue={sp.q || ""} placeholder="Nome, ID, número, profile..." style={inp} />
          </div>
          <div>
            <Label>Filtro</Label>
            <select name="filtro" defaultValue={filtro} style={inp}>
              <option value="favoritas">⭐ Só favoritas</option>
              <option value="visiveis">👁 Visíveis (default)</option>
              <option value="todas">Tudo (inclui ocultas)</option>
            </select>
          </div>
          <button type="submit" className="cta-btn"><i className="ti ti-search" /> Aplicar</button>
        </form>
      </div>

      {editando && (
        <div className="mk-card mk-card-lg" style={{ marginBottom: 14, borderLeft: "3px solid #9B7DBF" }}>
          <h3 className="card-title" style={{ marginBottom: 12 }}>
            <i className="ti ti-edit" /> Editar — {editando.name}
          </h3>
          <form action={salvarAlias} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input type="hidden" name="servidor_id" value={editando.servidorId} />
            <input type="hidden" name="instance_id" value={editando.id} />
            <Field label="Apelido (alias)" name="alias" defaultValue={editando.alias ?? ""} placeholder={editando.name} />
            <div>
              <Label>Observações</Label>
              <textarea name="observacoes" defaultValue={editando.observacoes ?? ""} rows={3} style={{ ...inp, resize: "vertical" }} placeholder="Anotações privadas sobre esta instância" />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" className="cta-btn"><i className="ti ti-device-floppy" /> Salvar</button>
              <Link href="/super-admin/instancias" className="ghost-btn">Cancelar</Link>
            </div>
          </form>
        </div>
      )}

      <div className="mk-card mk-card-lg">
        <h3 className="card-title" style={{ marginBottom: 14 }}>
          {filtro === "favoritas" ? "Favoritas" : filtro === "visiveis" ? "Visíveis" : "Todas"} ({instancias.length})
        </h3>

        {instancias.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: "var(--mk-text-muted)", fontSize: 13 }}>
            {filtro === "favoritas" ? "Nenhuma favorita ainda. Marque ★ nas instâncias importantes." : "Sem instâncias."}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 10 }}>
            {instancias.map((i) => {
              const conectada = i.status === "connected";
              return (
                <div key={`${i.servidorId}|${i.id}`} style={{
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: i.favorita ? "1px solid #10b981" : "0.5px solid var(--mk-border)",
                  background: i.favorita ? "rgba(16,185,129,0.06)" : "var(--mk-surface)",
                  opacity: i.visivel ? 1 : 0.55,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: conectada ? "linear-gradient(135deg, #25D366, #128C7E)" : "var(--mk-surface-2)", display: "flex", alignItems: "center", justifyContent: "center", color: conectada ? "#FFFDF8" : "var(--mk-text-muted)" }}>
                      <i className="ti ti-brand-whatsapp" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                        <span style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{i.name}</span>
                        {i.favorita && <i className="ti ti-star-filled" style={{ color: "#10b981", fontSize: 11 }} />}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--mk-text-muted)", fontFamily: "monospace" }}>{i.servidorNome}</div>
                    </div>
                    <span className={`mk-badge ${conectada ? "b-green" : "b-gray"}`} style={{ fontSize: 9.5 }}>{i.status.toUpperCase()}</span>
                  </div>

                  <div style={{ fontSize: 11, color: "var(--mk-text-secondary)", lineHeight: 1.5, paddingBottom: 8, borderBottom: "0.5px solid var(--mk-border)" }}>
                    {i.profileName && <div>👤 {i.profileName}</div>}
                    {i.numberConectado && <div style={{ fontFamily: "monospace" }}>📱 {i.numberConectado}</div>}
                    <div style={{ fontFamily: "monospace", fontSize: 10, color: "var(--mk-text-muted)", marginTop: 2 }}>{i.id}</div>
                    {i.observacoes && <div style={{ marginTop: 4, fontStyle: "italic", color: "var(--mk-text-muted)" }}>{i.observacoes}</div>}
                  </div>

                  <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
                    <form action={alternarFavorita} style={{ display: "inline" }}>
                      <input type="hidden" name="servidor_id" value={i.servidorId} />
                      <input type="hidden" name="instance_id" value={i.id} />
                      <input type="hidden" name="favorita" value={String(i.favorita)} />
                      <button type="submit" className="ghost-btn" style={iconBtn} title={i.favorita ? "Desmarcar favorita" : "Marcar como favorita"}>
                        <i className={`ti ${i.favorita ? "ti-star-filled" : "ti-star"}`} style={{ color: i.favorita ? "#10b981" : undefined }} />
                      </button>
                    </form>
                    <form action={alternarVisivel} style={{ display: "inline" }}>
                      <input type="hidden" name="servidor_id" value={i.servidorId} />
                      <input type="hidden" name="instance_id" value={i.id} />
                      <input type="hidden" name="visivel" value={String(i.visivel)} />
                      <button type="submit" className="ghost-btn" style={iconBtn} title={i.visivel ? "Ocultar da lista padrão" : "Tornar visível"}>
                        <i className={`ti ${i.visivel ? "ti-eye" : "ti-eye-off"}`} />
                      </button>
                    </form>
                    <Link href={`/super-admin/instancias?editar=${i.servidorId}|${i.id}${sp.servidor ? `&servidor=${sp.servidor}` : ""}&filtro=${filtro}`} className="ghost-btn" style={iconBtn} title="Alias + observações">
                      <i className="ti ti-edit" />
                    </Link>
                  </div>
                </div>
              );
            })}
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
function Label({ children }: { children: React.ReactNode }) { return <label style={{ display: "block", fontSize: 11, color: "var(--mk-text-muted)", marginBottom: 4, fontFamily: "monospace" }}>{children}</label>; }
function Field({ label, name, defaultValue, placeholder }: { label: string; name: string; defaultValue?: string; placeholder?: string }) {
  return <div><Label>{label}</Label><input type="text" name={name} defaultValue={defaultValue} placeholder={placeholder} style={inp} /></div>;
}
const iconBtn: React.CSSProperties = { fontSize: 12, padding: "4px 10px" };
const inp: React.CSSProperties = { width: "100%", padding: "8px 12px", borderRadius: 8, border: "0.5px solid var(--mk-border)", background: "var(--mk-surface-2)", color: "var(--mk-text)", fontSize: 12.5 };
