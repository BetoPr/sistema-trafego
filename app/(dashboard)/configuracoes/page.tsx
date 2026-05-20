import { requireUserWithAgencia } from "@/lib/auth";
import { PerfilForm } from "./_components/PerfilForm";
import { AgenciaForm } from "./_components/AgenciaForm";
import { ConfigToggles } from "./_components/ConfigToggles";

export default async function ConfiguracoesPage() {
  const { usuario } = await requireUserWithAgencia();
  const agencia = Array.isArray(usuario.agencias) ? usuario.agencias[0] : usuario.agencias;
  const inicial = usuario.nome.charAt(0).toUpperCase() || "U";

  return (
    <section className="mk-page">
      <div className="mk-page-head">
        <div className="mk-eyebrow">Conta</div>
        <h1 className="mk-page-title">Configurações</h1>
        <p className="mk-page-sub">Gerencie seu perfil, agência e preferências.</p>
      </div>

      <div className="grid-2">
        <div className="mk-card mk-card-lg">
          <h3 className="card-title">Perfil</h3>
          <p className="card-sub" style={{ marginBottom: 18 }}>Seu nome aparece nos relatórios.</p>
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: 14, background: "var(--mk-surface-2)", borderRadius: 11, marginBottom: 18 }}>
            <div style={{ width: 60, height: 60, borderRadius: "50%", background: "linear-gradient(135deg, #E8A87C, #8B6F47)", display: "flex", alignItems: "center", justifyContent: "center", color: "#FFFDF8", fontSize: 22, fontWeight: 600 }}>
              {inicial}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--mk-text)" }}>{usuario.nome}</div>
              <div style={{ fontSize: 11.5, color: "var(--mk-text-muted)" }}>{usuario.email}</div>
            </div>
          </div>
          <PerfilForm nome={usuario.nome} email={usuario.email} />
        </div>

        <div className="mk-card mk-card-lg">
          <h3 className="card-title">Agência</h3>
          <p className="card-sub" style={{ marginBottom: 18 }}>Dados da sua agência.</p>
          <AgenciaForm nome={agencia?.nome ?? ""} slug={agencia?.slug ?? ""} />
        </div>
      </div>

      <div className="mk-card mk-card-lg">
        <h3 className="card-title">Preferências</h3>
        <ConfigToggles />
      </div>
    </section>
  );
}
