import Link from "next/link";
import { requireAuth } from "@/lib/crm/permissions";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export default async function IAAtendimentoPage() {
  const ctx = await requireAuth();
  const sb = createServiceClient();

  let perfis: Array<{ id: string; nome: string; ativo: boolean }> = [];
  let erroQuery: string | null = null;

  try {
    const { data, error } = await sb
      .from("ia_atendimento_perfis")
      .select("id, nome, ativo")
      .eq("agencia_id", ctx.agenciaId)
      .eq("eh_template", false)
      .order("nome");
    if (error) erroQuery = error.message;
    else perfis = (data || []) as typeof perfis;
  } catch (e) {
    erroQuery = e instanceof Error ? e.message : String(e);
  }

  return (
    <section className="mk-page">
      <div className="mk-page-head">
        <div className="mk-eyebrow">Atendimento</div>
        <h1 className="mk-page-title">IA de Atendimento</h1>
        <p className="mk-page-sub">Construção em andamento — versão mínima.</p>
      </div>

      {erroQuery && (
        <div style={{ background: "rgba(201,112,100,0.12)", borderLeft: "3px solid #C97064", padding: "12px 16px", borderRadius: 8, fontSize: 12, marginBottom: 14 }}>
          <strong>Erro no banco:</strong> {erroQuery}
        </div>
      )}

      <div className="mk-card mk-card-lg">
        <h3 className="card-title">Perfis ({perfis.length})</h3>
        {perfis.length === 0 ? (
          <p style={{ fontSize: 12, color: "var(--mk-text-muted)" }}>Sem perfis cadastrados.</p>
        ) : (
          <ul style={{ fontSize: 13, margin: 0, paddingLeft: 18 }}>
            {perfis.map((p) => (
              <li key={p.id}>
                {p.nome} {p.ativo ? "✓" : "○"}
              </li>
            ))}
          </ul>
        )}
        <Link href="/dashboard" className="ghost-btn" style={{ marginTop: 14, fontSize: 12, display: "inline-block" }}>
          ← Voltar
        </Link>
      </div>
    </section>
  );
}
