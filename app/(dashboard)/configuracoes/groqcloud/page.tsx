import Link from "next/link";
import { requireAdmin } from "@/lib/crm/permissions";
import { createServiceClient } from "@/lib/supabase/service";
import { GroqCloudCard } from "./_client";

export default async function GroqCloudPage() {
  const ctx = await requireAdmin();
  const sb = createServiceClient();

  const { data: cfg } = await sb
    .from("configuracoes_agencia")
    .select("groq_key_encrypted, ia")
    .eq("agencia_id", ctx.agenciaId)
    .maybeSingle();

  const temChave = !!cfg?.groq_key_encrypted;
  const t = ((cfg?.ia as Record<string, unknown> | null)?.transcricao ?? {}) as { ativa?: boolean; idioma?: string };

  return (
    <section className="mk-page">
      <div className="mk-page-head">
        <Link href="/configuracoes" style={{ fontSize: 12, color: "var(--mk-accent)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
          <i className="ti ti-arrow-left" /> Voltar
        </Link>
        <div className="mk-eyebrow">Configuração · Integrações</div>
        <h1 className="mk-page-title">GroqCloud</h1>
        <p className="mk-page-sub">Configurações de integração com GroqCloud (transcrição de áudio).</p>
      </div>

      <GroqCloudCard temChave={temChave} inicial={{ ativa: t.ativa !== false, idioma: t.idioma || "pt" }} />
    </section>
  );
}
