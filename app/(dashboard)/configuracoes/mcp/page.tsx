import { requireUserWithAgencia } from "@/lib/auth";
import { criarTokenMCP, revogarTokenMCP } from "./_actions";

export default async function MCPPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const sp = await searchParams;
  const tokenRevelado = sp.token;
  const { supabase, usuario } = await requireUserWithAgencia();
  const { data: tokens } = await supabase
    .from("mcp_tokens")
    .select("id, nome, prefix, ativo, ultima_uso_em, expira_em, created_at")
    .eq("agencia_id", usuario.agencia_id)
    .order("created_at", { ascending: false });

  return (
    <section className="mk-page">
      <div className="mk-page-head">
        <div className="mk-eyebrow">Configurações</div>
        <h1 className="mk-page-title">MCP — Acesso programático</h1>
        <p className="mk-page-sub">
          Tokens para usar o Sonar dentro do Claude Desktop, Claude Code, Cursor ou qualquer cliente MCP. Cada token só vê dados da sua agência.
        </p>
      </div>

      {tokenRevelado && (
        <div className="mk-card mk-card-lg" style={{ borderLeft: "3px solid #00E19A", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <i className="ti ti-key" style={{ color: "#00E19A", fontSize: 18 }} />
            <h3 className="card-title" style={{ margin: 0 }}>Token criado — copie agora</h3>
          </div>
          <p style={{ fontSize: 12, color: "var(--mk-text-secondary)", marginBottom: 10 }}>
            Este token NÃO será mostrado de novo. Copia e cola no seu Claude Desktop / Code / Cursor.
          </p>
          <div style={{ background: "var(--mk-bg-deep)", border: ".5px solid var(--mk-border)", borderRadius: 8, padding: 12, fontFamily: "monospace", fontSize: 12, wordBreak: "break-all", color: "#00E19A" }}>
            {tokenRevelado}
          </div>
        </div>
      )}

      <div className="mk-card mk-card-lg" style={{ marginBottom: 14 }}>
        <h3 className="card-title">Criar novo token</h3>
        <form action={criarTokenMCP} style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          <input name="nome" placeholder="Ex.: Claude Code do PC" style={{ flex: 1, minWidth: 220, padding: "8px 12px", borderRadius: 8, border: ".5px solid var(--mk-border)", background: "var(--mk-surface-2)", color: "var(--mk-text)", fontSize: 12.5 }} required />
          <input name="expira_dias" type="number" min={0} max={3650} defaultValue={0} placeholder="0 = sem expiração" style={{ width: 160, padding: "8px 12px", borderRadius: 8, border: ".5px solid var(--mk-border)", background: "var(--mk-surface-2)", color: "var(--mk-text)", fontSize: 12.5 }} />
          <button type="submit" className="cta-btn" style={{ fontSize: 12.5, fontWeight: 700 }}>
            <i className="ti ti-plus" /> Gerar token
          </button>
        </form>
      </div>

      <div className="mk-card mk-card-lg">
        <h3 className="card-title" style={{ marginBottom: 10 }}>Tokens existentes</h3>
        {!tokens || tokens.length === 0 ? (
          <div style={{ padding: 16, textAlign: "center", color: "var(--mk-text-muted)", fontSize: 12.5 }}>Nenhum token ainda. Gere o primeiro acima.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: ".5px solid var(--mk-border)", fontSize: 10.5, color: "var(--mk-text-muted)", letterSpacing: ".5px" }}>
                <th style={{ textAlign: "left", padding: "8px 6px" }}>NOME</th>
                <th style={{ textAlign: "left", padding: "8px 6px" }}>PREFIXO</th>
                <th style={{ textAlign: "left", padding: "8px 6px" }}>ÚLTIMO USO</th>
                <th style={{ textAlign: "left", padding: "8px 6px" }}>EXPIRA</th>
                <th style={{ textAlign: "left", padding: "8px 6px" }}>STATUS</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {tokens.map((t) => (
                <tr key={t.id} style={{ borderBottom: ".5px solid var(--mk-border)", fontSize: 12 }}>
                  <td style={{ padding: "8px 6px", color: "var(--mk-text)", fontWeight: 600 }}>{t.nome}</td>
                  <td style={{ padding: "8px 6px", color: "var(--mk-text-muted)", fontFamily: "monospace" }}>{t.prefix}…</td>
                  <td style={{ padding: "8px 6px", color: "var(--mk-text-muted)" }}>{t.ultima_uso_em ? new Date(t.ultima_uso_em).toLocaleString("pt-BR") : "—"}</td>
                  <td style={{ padding: "8px 6px", color: "var(--mk-text-muted)" }}>{t.expira_em ? new Date(t.expira_em).toLocaleDateString("pt-BR") : "nunca"}</td>
                  <td style={{ padding: "8px 6px" }}>
                    <span style={{ fontSize: 10.5, padding: "2px 7px", borderRadius: 10, background: t.ativo ? "rgba(0,225,154,.14)" : "rgba(201,112,100,.12)", color: t.ativo ? "#00E19A" : "#C97064", fontWeight: 700 }}>
                      {t.ativo ? "ATIVO" : "REVOGADO"}
                    </span>
                  </td>
                  <td style={{ padding: "8px 6px", textAlign: "right" }}>
                    {t.ativo && (
                      <form action={revogarTokenMCP} style={{ display: "inline" }} onSubmit={(e) => { if (!confirm(`Revogar "${t.nome}"? O token deixa de funcionar imediatamente.`)) e.preventDefault(); }}>
                        <input type="hidden" name="id" value={t.id} />
                        <button type="submit" className="ghost-btn" style={{ fontSize: 11, color: "#C97064" }}>
                          <i className="ti ti-trash" /> Revogar
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mk-card mk-card-lg" style={{ marginTop: 14 }}>
        <h3 className="card-title">Como conectar</h3>
        <p style={{ fontSize: 12.5, color: "var(--mk-text-secondary)", lineHeight: 1.6 }}>
          <strong style={{ color: "#00E19A" }}>Claude Desktop</strong> — edita <code>claude_desktop_config.json</code>:
        </p>
        <pre style={{ background: "var(--mk-bg-deep)", border: ".5px solid var(--mk-border)", borderRadius: 8, padding: 12, fontSize: 11, overflowX: "auto" }}>{`{
  "mcpServers": {
    "sonar-crm": {
      "command": "npx",
      "args": ["-y", "@sonar/mcp-crm"],
      "env": {
        "SONAR_MCP_TOKEN": "sn_mcp_...",
        "SONAR_MCP_URL": "https://sonarcrm.com.br"
      }
    }
  }
}`}</pre>
        <p style={{ fontSize: 12, color: "var(--mk-text-secondary)", marginTop: 10 }}>
          <strong style={{ color: "#00E19A" }}>Claude Code</strong> — adiciona no <code>~/.config/claude-code/mcp.json</code> ou via <code>claude mcp add sonar-crm npx -y @sonar/mcp-crm</code>.
        </p>
        <p style={{ fontSize: 11.5, color: "var(--mk-text-muted)", marginTop: 10 }}>
          <i className="ti ti-info-circle" /> O server roda local no seu PC. Cada chamada bate em <code>{process.env.NEXT_PUBLIC_APP_URL || "https://sonarcrm.com.br"}/api/mcp/call</code> com o token. Só vê dados da agência dele.
        </p>
      </div>
    </section>
  );
}
