import Link from "next/link";
import { requireAdmin } from "@/lib/crm/permissions";
import { createServiceClient } from "@/lib/supabase/service";
import { salvarPrompt, resetarParaDefault } from "./_actions";

interface PageProps {
  searchParams: Promise<{ ok?: string; erro?: string; msg?: string; chave?: string }>;
}

const CHAVES = [
  {
    id: "sentimento",
    titulo: "Análise de sentimento",
    descricao: "Classifica conversa em ruim/bom/muito_bom. Usado no painel direito do chat.",
  },
  {
    id: "resumo",
    titulo: "Resumo da conversa",
    descricao: "Resumo em bullets do ticket. Usado no botão Gerar resumo.",
  },
  {
    id: "sugestao_resposta",
    titulo: "Sugestão de resposta (futuro)",
    descricao: "Reservado para sugestões de resposta automática (não implementado ainda).",
  },
] as const;

export default async function IaPromptsPage({ searchParams }: PageProps) {
  const ctx = await requireAdmin();
  const sp = await searchParams;
  const sb = createServiceClient();

  const { data: prompts } = await sb
    .from("ia_prompts")
    .select("id, agencia_id, chave, nome, conteudo, modelo_default, ativo, updated_at");

  const byKey = new Map<string, { global?: typeof prompts extends Array<infer T> ? T : never; agencia?: typeof prompts extends Array<infer T> ? T : never }>();
  for (const p of prompts || []) {
    const k = p.chave;
    const slot = byKey.get(k) || {};
    if (p.agencia_id === null) slot.global = p as never;
    else if (p.agencia_id === ctx.agenciaId) slot.agencia = p as never;
    byKey.set(k, slot);
  }

  return (
    <section className="mk-page">
      <div className="mk-page-head">
        <Link href="/configuracoes" style={{ fontSize: 12, color: "var(--mk-accent)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
          <i className="ti ti-arrow-left" style={{ fontSize: 13 }} />
          Voltar para configurações
        </Link>
        <div className="mk-eyebrow">Configuração · IA</div>
        <h1 className="mk-page-title">Prompts de IA</h1>
        <p className="mk-page-sub">
          Edite os prompts usados pela IA. Cada prompt tem um <strong>default global</strong> (Super Admin) e
          pode ter um <strong>override por agência</strong> (Admin).
        </p>
      </div>

      {sp.ok && (
        <div style={banner("ok")}>
          <i className="ti ti-circle-check" style={{ marginRight: 8, color: "#00E19A" }} />
          {sp.ok === "salvo" ? "Prompt salvo." : sp.ok === "reset" ? "Override removido — voltou ao default global." : "OK."}
        </div>
      )}
      {sp.erro && (
        <div style={banner("erro")}>
          <i className="ti ti-alert-triangle" style={{ marginRight: 8, color: "#C97064" }} />
          {sp.erro === "permissao_negada"
            ? "Só Super Admin pode editar prompts globais."
            : sp.erro === "conteudo_vazio"
              ? "Conteúdo não pode ficar vazio."
              : "Erro."}
          {sp.msg && <div style={{ marginTop: 4, fontSize: 11, opacity: 0.8 }}>{sp.msg}</div>}
        </div>
      )}

      {CHAVES.map((c) => {
        const slot = byKey.get(c.id) || {};
        const global = (slot as { global?: { conteudo: string; modelo_default: string | null; updated_at: string } }).global;
        const agencia = (slot as { agencia?: { conteudo: string; modelo_default: string | null; updated_at: string } }).agencia;
        const efetivo = agencia || global;
        return (
          <div key={c.id} className="mk-card mk-card-lg" style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <h3 className="card-title">{c.titulo}</h3>
              <span className={`mk-badge ${agencia ? "b-purple" : "b-gray"}`} style={{ fontSize: 10 }}>
                {agencia ? "● Override por agência" : "○ Usando default global"}
              </span>
            </div>
            <p style={{ fontSize: 12, color: "var(--mk-text-muted)", marginBottom: 12 }}>{c.descricao}</p>

            <form action={salvarPrompt} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input type="hidden" name="chave" value={c.id} />

              <div>
                <label style={lbl}>Escopo</label>
                <select name="escopo" defaultValue={agencia ? "agencia" : "agencia"} style={input}>
                  <option value="agencia">Minha agência (override)</option>
                  {ctx.role === "super_admin" && <option value="global">Global (todos tenants — Super Admin)</option>}
                </select>
              </div>

              <div>
                <label style={lbl}>Modelo Groq (opcional)</label>
                <input
                  type="text"
                  name="modelo"
                  defaultValue={efetivo?.modelo_default || "llama-3.3-70b-versatile"}
                  placeholder="llama-3.3-70b-versatile"
                  style={input}
                />
              </div>

              <div>
                <label style={lbl}>Conteúdo do prompt</label>
                <textarea
                  name="conteudo"
                  defaultValue={efetivo?.conteudo || ""}
                  rows={12}
                  style={{ ...input, fontFamily: "monospace", fontSize: 11.5, resize: "vertical" }}
                />
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button type="submit" className="cta-btn" style={{ fontSize: 12 }}>
                  <i className="ti ti-device-floppy" style={{ fontSize: 13 }} /> Salvar
                </button>
                {agencia && (
                  <button
                    type="submit"
                    formAction={resetarParaDefault}
                    className="ghost-btn"
                    style={{ fontSize: 11, color: "#C97064" }}
                  >
                    <i className="ti ti-restore" /> Voltar ao default global
                  </button>
                )}
              </div>
              {efetivo?.updated_at && (
                <div style={{ fontSize: 10, color: "var(--mk-text-muted)" }}>
                  Última atualização: {new Date(efetivo.updated_at).toLocaleString("pt-BR")}
                </div>
              )}
            </form>
          </div>
        );
      })}
    </section>
  );
}

const lbl: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  color: "var(--mk-text-muted)",
  marginBottom: 4,
  fontFamily: "monospace",
  letterSpacing: 0.3,
};

const input: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  borderRadius: 8,
  border: "0.5px solid var(--mk-border)",
  background: "var(--mk-surface-2)",
  color: "var(--mk-text)",
  fontSize: 12.5,
};

function banner(tipo: "ok" | "erro"): React.CSSProperties {
  const cor = tipo === "ok" ? "#00E19A" : "#C97064";
  return {
    background: tipo === "ok" ? "rgba(16,185,129,0.12)" : "rgba(201,112,100,0.12)",
    borderLeft: `3px solid ${cor}`,
    padding: "10px 14px",
    borderRadius: 8,
    fontSize: 12,
    color: "var(--mk-text-secondary)",
    marginBottom: 14,
  };
}
