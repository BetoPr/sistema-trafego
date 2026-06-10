import { requireUserWithAgencia } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { toggleServicosHabilitados, criarServico, renomearServico, toggleServicoAtivo, excluirServico } from "./_actions";

export const dynamic = "force-dynamic";

export default async function ServicosConfigPage() {
  const { usuario } = await requireUserWithAgencia();
  const svc = createServiceClient();

  const { data: ag } = await svc
    .from("agencias")
    .select("id, servicos_habilitados")
    .eq("id", usuario.agencia_id)
    .single();
  const habilitado = !!ag?.servicos_habilitados;

  const { data: servicos } = await svc
    .from("servicos")
    .select("id, nome, ativo, created_at")
    .eq("agencia_id", usuario.agencia_id)
    .order("nome");

  return (
    <section className="mk-page">
      <div className="mk-page-head">
        <div className="mk-eyebrow">Configuração</div>
        <h1 className="mk-page-title">Serviços</h1>
        <p className="mk-page-sub">Cadastre serviços prestados pra metrificar fechamentos no Dashboard.</p>
      </div>

      {/* Toggle on/off */}
      <div className="mk-card mk-card-lg" style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 14 }}>
        <i className={`ti ${habilitado ? "ti-toggle-right" : "ti-toggle-left"}`} style={{ fontSize: 28, color: habilitado ? "#10b981" : "var(--mk-text-muted)" }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Serviços fixos {habilitado ? "habilitados" : "desabilitados"}</div>
          <div style={{ fontSize: 11.5, color: "var(--mk-text-muted)", marginTop: 2 }}>
            {habilitado
              ? "No card Fechamento (Atendimentos) o serviço vira dropdown da lista abaixo."
              : "Quando ativar, vai liberar cadastro de serviços fixos e o select dentro do Fechamento."}
          </div>
        </div>
        <form action={toggleServicosHabilitados}>
          <input type="hidden" name="habilitado" value={habilitado ? "0" : "1"} />
          <button type="submit" className="cta-btn" style={{ fontSize: 12 }}>
            {habilitado ? "Desativar" : "Ativar"}
          </button>
        </form>
      </div>

      {habilitado && (
        <>
          {/* Criar */}
          <div className="mk-card mk-card-lg" style={{ marginBottom: 14 }}>
            <h3 className="card-title">Novo serviço</h3>
            <form action={criarServico} style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <input
                type="text"
                name="nome"
                placeholder="Ex: Ensaio Gestante, Restauração, Stúdio…"
                required
                style={{ flex: 1, padding: "9px 12px", borderRadius: 8, border: "0.5px solid var(--mk-border)", background: "var(--mk-surface-2)", color: "var(--mk-text)", fontSize: 12.5 }}
              />
              <button type="submit" className="cta-btn" style={{ fontSize: 12 }}>
                <i className="ti ti-plus" /> Criar
              </button>
            </form>
          </div>

          {/* Lista */}
          <div className="mk-card mk-card-lg">
            <h3 className="card-title">Serviços cadastrados ({servicos?.length || 0})</h3>
            {!servicos || servicos.length === 0 ? (
              <div style={{ padding: 30, textAlign: "center", color: "var(--mk-text-muted)", fontSize: 12 }}>
                <i className="ti ti-package-off" style={{ display: "block", fontSize: 28, marginBottom: 6, opacity: 0.6 }} />
                Nenhum serviço cadastrado ainda.
              </div>
            ) : (
              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                {servicos.map((s) => (
                  <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "var(--mk-surface-2)", borderRadius: 8, opacity: s.ativo ? 1 : 0.55 }}>
                    <i className={`ti ${s.ativo ? "ti-check" : "ti-circle"}`} style={{ color: s.ativo ? "#10b981" : "var(--mk-text-muted)", fontSize: 14 }} />
                    <form action={renomearServico} style={{ flex: 1, display: "flex" }}>
                      <input type="hidden" name="id" value={s.id} />
                      <input
                        type="text"
                        name="nome"
                        defaultValue={s.nome}
                        style={{ flex: 1, padding: "5px 8px", border: 0, background: "transparent", color: "var(--mk-text)", fontSize: 12.5 }}
                      />
                      <button type="submit" title="Salvar nome" style={{ background: "transparent", border: 0, color: "var(--mk-text-muted)", cursor: "pointer", padding: "4px 8px", fontSize: 13 }}>
                        <i className="ti ti-device-floppy" />
                      </button>
                    </form>
                    <form action={toggleServicoAtivo}>
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="ativo" value={s.ativo ? "0" : "1"} />
                      <button type="submit" title={s.ativo ? "Pausar" : "Ativar"} style={{ background: "transparent", border: 0, color: s.ativo ? "#C9A876" : "#10b981", cursor: "pointer", padding: "4px 8px", fontSize: 13 }}>
                        <i className={`ti ${s.ativo ? "ti-player-pause" : "ti-player-play"}`} />
                      </button>
                    </form>
                    <form action={excluirServico}>
                      <input type="hidden" name="id" value={s.id} />
                      <button type="submit" title="Excluir" style={{ background: "transparent", border: 0, color: "#C97064", cursor: "pointer", padding: "4px 8px", fontSize: 13 }}>
                        <i className="ti ti-trash" />
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
