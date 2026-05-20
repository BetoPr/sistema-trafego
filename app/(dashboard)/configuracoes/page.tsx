import { requireUserWithAgencia } from "@/lib/auth";
import { ConfigToggles } from "./_components/ConfigToggles";

export default async function ConfiguracoesPage() {
  const { usuario } = await requireUserWithAgencia();
  const inicial = usuario.nome.charAt(0).toUpperCase() || "U";

  return (
    <section className="mk-page">
      <div className="mk-page-head">
        <div className="mk-eyebrow">Conta</div>
        <h1 className="mk-page-title">Configurações</h1>
        <p className="mk-page-sub">Gerencie sua agência, equipe e preferências.</p>
      </div>

      <div className="mk-card mk-card-lg">
        <h3 className="card-title">Informações do perfil</h3>
        <p className="card-sub" style={{ marginBottom: 18 }}>Dados que aparecem nos relatórios.</p>

        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: 14, background: "var(--mk-surface-2)", borderRadius: 11, marginBottom: 18 }}>
          <div style={{ width: 60, height: 60, borderRadius: "50%", background: "linear-gradient(135deg, #E8A87C, #8B6F47)", display: "flex", alignItems: "center", justifyContent: "center", color: "#FFFDF8", fontSize: 22, fontWeight: 600 }}>
            {inicial}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--mk-text)" }}>{usuario.nome}</div>
            <div style={{ fontSize: 11.5, color: "var(--mk-text-muted)" }}>{usuario.email}</div>
          </div>
          <button type="button" className="ghost-btn">Trocar foto</button>
        </div>

        <h3 className="card-title">Preferências</h3>
        <ConfigToggles />

        <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
          <button type="button" className="cta-btn">Salvar</button>
          <button type="button" className="ghost-btn">Cancelar</button>
        </div>
      </div>
    </section>
  );
}
