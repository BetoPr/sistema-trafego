import { requireAuth } from "@/lib/crm/permissions";
import { createServiceClient } from "@/lib/supabase/service";
import { salvarPerfilProprio, alterarSenha } from "./_actions";
import AvatarForm from "./_avatar-form";

interface PageProps {
  searchParams: Promise<{ ok?: string; erro?: string; msg?: string }>;
}

export default async function ContaPage({ searchParams }: PageProps) {
  const ctx = await requireAuth();
  const sp = await searchParams;
  const sb = createServiceClient();
  const { data: u } = await sb.from("usuarios").select("nome, email, telefone, role, avatar_url").eq("id", ctx.userId).single();

  return (
    <section className="mk-page">
      <div className="mk-page-head">
        <div className="mk-eyebrow">Conta</div>
        <h1 className="mk-page-title">Meu Perfil</h1>
        <p className="mk-page-sub">Suas informações pessoais.</p>
      </div>

      {sp.ok && <Banner tipo="ok">{labelOk(sp.ok)}</Banner>}
      {sp.erro && <Banner tipo="erro">{labelErr(sp.erro)} {sp.msg && `— ${decodeURIComponent(sp.msg)}`}</Banner>}

      <div className="mk-card mk-card-lg" style={{ marginBottom: 14 }}>
        <h3 className="card-title" style={{ marginBottom: 14 }}>Perfil</h3>
        <AvatarForm nome={u?.nome ?? "?"} avatarUrl={u?.avatar_url ?? null} />
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{u?.nome}</div>
          <div style={{ fontSize: 12, color: "var(--mk-text-muted)" }}>{u?.email}</div>
          <div style={{ marginTop: 4 }}>
            <span className={`mk-badge ${u?.role === "super_admin" ? "b-red" : u?.role === "admin" ? "b-purple" : "b-gray"}`}>
              {u?.role === "super_admin" ? "Super Admin" : u?.role === "admin" ? "Administrador" : "Atendente"}
            </span>
          </div>
        </div>
        <form action={salvarPerfilProprio} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Field label="Nome" name="nome" defaultValue={u?.nome ?? ""} required />
          <Field label="Telefone" name="telefone" defaultValue={u?.telefone ?? ""} placeholder="(00) 00000-0000" />
          <button type="submit" className="cta-btn"><i className="ti ti-device-floppy" /> Salvar perfil</button>
        </form>
      </div>

      <div className="mk-card mk-card-lg">
        <h3 className="card-title" style={{ marginBottom: 14 }}>Alterar senha</h3>
        <form action={alterarSenha} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Field label="Nova senha" name="nova" type="password" required placeholder="Mínimo 6 caracteres" />
          <Field label="Confirmar nova senha" name="confirma" type="password" required placeholder="Repita" />
          <button type="submit" className="cta-btn"><i className="ti ti-key" /> Trocar senha</button>
        </form>
      </div>
    </section>
  );
}

function labelOk(k: string) { return ({ perfil: "Perfil atualizado.", senha: "Senha alterada.", foto: "Foto de perfil atualizada.", foto_removida: "Foto removida." } as Record<string, string>)[k] || "OK."; }
function labelErr(k: string) { return ({ nome: "Nome obrigatório.", senha_curta: "Senha precisa de 6+ caracteres.", senha_diferente: "Senhas não coincidem.", auth: "Erro auth.", foto: "Selecione uma imagem.", foto_tipo: "Arquivo precisa ser imagem.", foto_grande: "Imagem muito grande (máx 5MB).", upload: "Falha ao subir a foto." } as Record<string, string>)[k] || "Erro."; }

function Banner({ tipo, children }: { tipo: "ok" | "erro"; children: React.ReactNode }) {
  const cor = tipo === "ok" ? "#10b981" : "#C97064";
  return <div style={{ background: tipo === "ok" ? "rgba(16,185,129,0.12)" : "rgba(201,112,100,0.12)", borderLeft: `3px solid ${cor}`, padding: "10px 14px", borderRadius: 8, fontSize: 12, color: "var(--mk-text-secondary)", marginBottom: 14 }}><i className={`ti ${tipo === "ok" ? "ti-circle-check" : "ti-alert-triangle"}`} style={{ marginRight: 8, color: cor }} />{children}</div>;
}

function Field({ label, name, defaultValue, placeholder, type = "text", required }: { label: string; name: string; defaultValue?: string; placeholder?: string; type?: string; required?: boolean }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 11, color: "var(--mk-text-muted)", marginBottom: 4, fontFamily: "monospace" }}>{label}{required && <span style={{ color: "#C97064" }}> *</span>}</label>
      <input type={type} name={name} defaultValue={defaultValue} placeholder={placeholder} required={required} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "0.5px solid var(--mk-border)", background: "var(--mk-surface-2)", color: "var(--mk-text)", fontSize: 12.5 }} />
    </div>
  );
}
