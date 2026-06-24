import { requireAuth } from "@/lib/crm/permissions";
import { createServiceClient } from "@/lib/supabase/service";
import ChatTesteCliente from "./_cliente";

export const dynamic = "force-dynamic";

interface PerfilLista {
  id: string;
  nome: string;
  provider: string;
  modelo: string;
  modo_modular: boolean;
}

export default async function ChatTestePage() {
  const ctx = await requireAuth();
  const sb = createServiceClient();

  let q = sb
    .from("ia_atendimento_perfis")
    .select("id, nome, provider, modelo, modo_modular")
    .eq("agencia_id", ctx.agenciaId)
    .eq("eh_template", false)
    .eq("ativo", true)
    .order("nome");
  if (ctx.role !== "super_admin") q = q.eq("criado_por", ctx.userId);
  const { data } = await q;
  const perfis = (data || []) as PerfilLista[];

  return (
    <section className="mk-page">
      <div className="mk-page-head">
        <div className="mk-eyebrow">Atendimento</div>
        <h1 className="mk-page-title">Chat de Teste</h1>
        <p className="mk-page-sub">
          Testa sua IA em tempo real sem WhatsApp. Sem ferramentas, sem efeitos colaterais. Digite{" "}
          <code style={{ background: "rgba(0,225,154,.12)", color: "#00E19A", padding: "1px 6px", borderRadius: 4 }}>LIMPAR</code>{" "}
          pra zerar memória.
        </p>
      </div>

      {perfis.length === 0 ? (
        <div className="mk-card mk-card-lg" style={{ textAlign: "center", padding: 40 }}>
          <i className="ti ti-robot" style={{ fontSize: 36, color: "#9B7DBF", display: "block", marginBottom: 8 }} />
          <h3 style={{ fontSize: 16, marginBottom: 6 }}>Nenhuma IA ativa</h3>
          <p style={{ fontSize: 12.5, color: "var(--mk-text-muted)" }}>
            Crie e ative pelo menos um perfil em <a href="/ia-atendimento" style={{ color: "#00E19A" }}>IA de Atendimento</a> pra testar aqui.
          </p>
        </div>
      ) : (
        <ChatTesteCliente perfis={perfis} />
      )}
    </section>
  );
}
