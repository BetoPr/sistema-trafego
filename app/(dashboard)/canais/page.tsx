import Link from "next/link";
import { requireAdmin } from "@/lib/crm/permissions";
import { createServiceClient } from "@/lib/supabase/service";
import {
  criarCanal,
  conectarCanal,
  atualizarStatusCanal,
  definirPadrao,
  revalidarWebhook,
  desconectarCanal,
  deletarCanal,
  importarCanalExistente,
} from "./_actions";
import { CanaisAutoRefresh } from "./_auto-refresh";
import { InstanciasDisponiveis } from "./_instancias";

interface PageProps {
  searchParams: Promise<{ ok?: string; erro?: string; msg?: string; qr?: string }>;
}

export default async function CanaisPage({ searchParams }: PageProps) {
  const ctx = await requireAdmin();
  const sp = await searchParams;
  const sb = createServiceClient();

  // SEM chamadas UAZAPI no load — busca de instâncias virou botão on-demand (InstanciasDisponiveis)
  const [{ data: canais }, { data: filas }, { data: usuarios }, { data: servidores }] = await Promise.all([
    sb
      .from("canais")
      .select("id, numero, nome, tipo, status, instance_id, numero_conectado, nome_perfil, foto_perfil_url, padrao, fila_id, usuario_id, qr_code_atual, qr_atualizado_em, updated_at")
      .eq("agencia_id", ctx.agenciaId)
      .order("numero"),
    sb.from("filas").select("id, nome, cor").eq("agencia_id", ctx.agenciaId).eq("ativa", true).order("nome"),
    sb.from("usuarios").select("id, nome").eq("agencia_id", ctx.agenciaId).is("deleted_at", null).order("nome"),
    sb.from("super_admin_servidores").select("id, nome").eq("ativo", true),
  ]);

  const filaById = new Map((filas || []).map((f) => [f.id, f]));
  const userById = new Map((usuarios || []).map((u) => [u.id, u]));
  const semServidor = !servidores || servidores.length === 0;
  const canalQrAberto = sp.qr ? canais?.find((c) => c.id === sp.qr) : null;
  const temPendente = (canais || []).some((c) => c.status === "pending_qr" || c.status === "connecting");

  return (
    <section className="mk-page">
      <CanaisAutoRefresh pollPending={temPendente} />
      <div className="mk-page-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div className="mk-eyebrow">Administração</div>
          <h1 className="mk-page-title">Canais</h1>
          <p className="mk-page-sub">Instâncias WhatsApp via UAZAPI. Conecte uma conta por canal.</p>
        </div>
        <Link href="#novo" className="cta-btn"><i className="ti ti-plus" /> Adicionar canal</Link>
      </div>

      {sp.ok && <Banner tipo="ok">{labelOk(sp.ok)}</Banner>}
      {sp.erro && <Banner tipo="erro">{labelErr(sp.erro)} {sp.msg && `— ${decodeURIComponent(sp.msg)}`}</Banner>}

      {semServidor && (
        <Banner tipo="warn">
          Nenhum servidor UAZAPI ativo. <Link href="/super-admin/servidores" style={{ color: "var(--mk-accent)", textDecoration: "underline" }}>Cadastre um servidor</Link> antes de criar canais (super_admin only).
        </Banner>
      )}

      {/* QR modal inline */}
      {canalQrAberto && (
        <div className="mk-card mk-card-lg" style={{ marginBottom: 14, borderLeft: "3px solid #C9A876" }}>
          <h3 className="card-title" style={{ marginBottom: 10 }}>
            QR Code — {canalQrAberto.nome}
          </h3>
          {canalQrAberto.qr_code_atual ? (
            <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={canalQrAberto.qr_code_atual.startsWith("data:") ? canalQrAberto.qr_code_atual : `data:image/png;base64,${canalQrAberto.qr_code_atual}`}
                alt="QR Code"
                style={{ width: 280, height: 280, borderRadius: 12, background: "#FFFDF8", padding: 14 }}
              />
              <div style={{ flex: 1 }}>
                <ol style={{ fontSize: 12, color: "var(--mk-text-secondary)", lineHeight: 1.8, paddingLeft: 22 }}>
                  <li>Abra WhatsApp no celular dedicado</li>
                  <li>Menu → <strong>Dispositivos conectados</strong></li>
                  <li>Toque em <strong>Conectar um aparelho</strong></li>
                  <li>Aponte a câmera para este QR</li>
                  <li>Aguarde alguns segundos</li>
                </ol>
                <form action={atualizarStatusCanal} style={{ marginTop: 10 }}>
                  <input type="hidden" name="id" value={canalQrAberto.id} />
                  <button type="submit" className="cta-btn"><i className="ti ti-refresh" /> Verificar conexão</button>
                </form>
                <div style={{ marginTop: 8, fontSize: 10.5, color: "var(--mk-text-muted)" }}>
                  QR atualizado: {canalQrAberto.qr_atualizado_em ? new Date(canalQrAberto.qr_atualizado_em).toLocaleString("pt-BR") : "—"}
                </div>
              </div>
              <Link href="/canais" className="ghost-btn"><i className="ti ti-x" /></Link>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "var(--mk-text-muted)" }}>QR Code não disponível. Clique em &quot;Ver QR Code&quot; no card do canal.</div>
          )}
        </div>
      )}

      {/* Lista cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12, marginBottom: 14 }}>
        {(!canais || canais.length === 0) && !semServidor && (
          <div className="mk-card mk-card-lg" style={{ gridColumn: "1/-1", textAlign: "center", padding: "32px 14px", color: "var(--mk-text-muted)", fontSize: 13 }}>
            Nenhum canal. Cadastre o primeiro abaixo.
          </div>
        )}
        {canais?.map((c) => {
          const conectado = c.status === "connected";
          return (
            <div key={c.id} className="mk-card mk-card-lg">
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg, #25D366, #128C7E)", display: "flex", alignItems: "center", justifyContent: "center", color: "#FFFDF8", fontSize: 18 }}>
                  <i className="ti ti-brand-whatsapp" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <h4 style={{ fontSize: 14, fontWeight: 600, color: "var(--mk-text)" }}>{c.nome}</h4>
                    {c.padrao && <i className="ti ti-star-filled" style={{ color: "#C9A876", fontSize: 13 }} />}
                  </div>
                  <div style={{ fontSize: 10.5, color: "var(--mk-text-muted)", fontFamily: "monospace" }}>
                    #{c.numero} · {c.tipo}
                  </div>
                </div>
                <span className={`mk-badge ${conectado ? "b-green" : c.status === "pending_qr" ? "b-orange" : "b-gray"}`}>
                  {conectado ? "CONNECTED" : c.status === "pending_qr" ? "QR Code" : c.status.toUpperCase()}
                </span>
              </div>

              {conectado ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderTop: "0.5px solid var(--mk-border)" }}>
                  {c.foto_perfil_url && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={c.foto_perfil_url} alt={c.nome_perfil || ""} style={{ width: 32, height: 32, borderRadius: "50%" }} />
                  )}
                  <div style={{ fontSize: 11.5, color: "var(--mk-text-secondary)" }}>
                    <div style={{ fontWeight: 500 }}>{c.nome_perfil || "—"}</div>
                    <div style={{ fontSize: 10.5, color: "var(--mk-text-muted)", fontFamily: "monospace" }}>{c.numero_conectado || c.instance_id}</div>
                  </div>
                </div>
              ) : (
                <div style={{ padding: "8px 0", borderTop: "0.5px solid var(--mk-border)", display: "flex", gap: 8 }}>
                  <form action={conectarCanal}>
                    <input type="hidden" name="id" value={c.id} />
                    <button type="submit" className="cta-btn" style={{ fontSize: 11 }}><i className="ti ti-qrcode" /> Ver QR Code</button>
                  </form>
                  <form action={atualizarStatusCanal}>
                    <input type="hidden" name="id" value={c.id} />
                    <button type="submit" className="ghost-btn" style={{ fontSize: 11 }}><i className="ti ti-refresh" /></button>
                  </form>
                </div>
              )}

              <div style={{ display: "flex", gap: 6, marginTop: 8, fontSize: 10.5, color: "var(--mk-text-muted)" }}>
                {c.fila_id && filaById.get(c.fila_id) && (
                  <span><i className="ti ti-list" style={{ color: filaById.get(c.fila_id)?.cor }} /> {filaById.get(c.fila_id)?.nome}</span>
                )}
                {c.usuario_id && userById.get(c.usuario_id) && (
                  <span><i className="ti ti-user" /> {userById.get(c.usuario_id)?.nome}</span>
                )}
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 10, paddingTop: 8, borderTop: "0.5px solid var(--mk-border)" }}>
                {!c.padrao && (
                  <form action={definirPadrao} style={{ display: "inline" }}>
                    <input type="hidden" name="id" value={c.id} />
                    <button type="submit" className="ghost-btn" style={menuBtn} title="Definir como padrão"><i className="ti ti-star" /></button>
                  </form>
                )}
                <form action={revalidarWebhook} style={{ display: "inline" }}>
                  <input type="hidden" name="id" value={c.id} />
                  <button type="submit" className="ghost-btn" style={menuBtn} title="Revalidar webhook UAZAPI"><i className="ti ti-webhook" /></button>
                </form>
                {conectado && (
                  <form action={desconectarCanal} style={{ display: "inline" }}>
                    <input type="hidden" name="id" value={c.id} />
                    <button type="submit" className="ghost-btn" style={menuBtn} title="Desconectar"><i className="ti ti-plug-off" /></button>
                  </form>
                )}
                <form action={deletarCanal} style={{ display: "inline", marginLeft: "auto" }}>
                  <input type="hidden" name="id" value={c.id} />
                  <button type="submit" className="ghost-btn" style={{ ...menuBtn, color: "#C97064" }} title="Excluir canal"><i className="ti ti-trash" /></button>
                </form>
              </div>
            </div>
          );
        })}
      </div>

      {/* Instâncias no servidor — busca on-demand (botão) */}
      {!semServidor && <InstanciasDisponiveis />}

      {/* Importar via Instance Token manual */}
      <div className="mk-card mk-card-lg" id="importar-token" style={{ marginBottom: 14 }}>
        <h3 className="card-title" style={{ marginBottom: 6 }}>
          <i className="ti ti-key" style={{ marginRight: 6, color: "var(--mk-accent)" }} />
          Importar instância via Instance Token
        </h3>
        <p style={{ fontSize: 11.5, color: "var(--mk-text-muted)", marginBottom: 12 }}>
          Se você já criou e conectou a instância no painel UAZAPI, cole aqui o <strong>Instance Token</strong>.
          O sistema busca o status, salva o canal e configura o webhook automaticamente.
        </p>
        <form action={importarCanalExistente} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Field label="Nome do canal" name="nome" placeholder="Interno Infinity" required />
          <Field label="Instance Token (UUID)" name="instance_token" placeholder="04a631c8-d7bf-420b-87c1-a4b09433944b" required />
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, color: "var(--mk-text-secondary)" }}>
            <input type="checkbox" name="padrao" /> Definir como canal padrão
          </label>
          <details>
            <summary style={{ fontSize: 12, fontWeight: 600, color: "var(--mk-text)", cursor: "pointer", padding: "6px 0" }}>Atribuições (opcional)</summary>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 6, paddingLeft: 14 }}>
              <Select label="Fila padrão" name="fila_id" options={[{ id: "", nome: "Nenhuma" }, ...(filas || [])]} />
              <Select label="Usuário padrão" name="usuario_id" options={[{ id: "", nome: "Nenhum" }, ...(usuarios || [])]} />
            </div>
          </details>
          <button type="submit" className="cta-btn" disabled={semServidor}>
            <i className="ti ti-download" /> Importar instância
          </button>
        </form>
      </div>

      {/* Form novo canal */}
      <div className="mk-card mk-card-lg" id="novo" style={{ borderLeft: "3px solid #25D366" }}>
        <h3 className="card-title" style={{ marginBottom: 6 }}>
          <i className="ti ti-qrcode" style={{ marginRight: 6, color: "#25D366" }} />
          Conectar novo número via QR Code
        </h3>
        <p style={{ fontSize: 11.5, color: "var(--mk-text-muted)", marginBottom: 12 }}>
          Cria instância nova no servidor UAZAPI e mostra o QR Code na hora pra você escanear com WhatsApp.
        </p>
        <div style={{ background: "rgba(91,139,166,0.10)", borderLeft: "3px solid #5B8BA6", padding: 10, borderRadius: 6, fontSize: 11, color: "var(--mk-text-secondary)", marginBottom: 14, lineHeight: 1.6 }}>
          <strong>Atenção:</strong> use uma conta WhatsApp dedicada. Não use o mesmo número em outros sistemas. Certifique-se que o celular tem internet estável.
        </div>
        <form action={criarCanal} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Field label="Nome do canal" name="nome" placeholder="Comercial SDR" required />
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, color: "var(--mk-text-secondary)" }}>
            <input type="checkbox" name="padrao" /> Definir como canal padrão
          </label>
          <details>
            <summary style={{ fontSize: 12, fontWeight: 600, color: "var(--mk-text)", cursor: "pointer", padding: "6px 0" }}>Atribuições</summary>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 6, paddingLeft: 14 }}>
              <Select label="Fila padrão" name="fila_id" options={[{ id: "", nome: "Nenhuma" }, ...(filas || [])]} />
              <Select label="Usuário padrão" name="usuario_id" options={[{ id: "", nome: "Nenhum" }, ...(usuarios || [])]} />
            </div>
          </details>
          <details>
            <summary style={{ fontSize: 12, fontWeight: 600, color: "var(--mk-text)", cursor: "pointer", padding: "6px 0" }}>Mensagem de despedida (opcional)</summary>
            <div style={{ marginTop: 6, paddingLeft: 14 }}>
              <textarea name="mensagem_despedida" rows={2} placeholder="Atendimento encerrado. Volte sempre!" style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "0.5px solid var(--mk-border)", background: "var(--mk-surface-2)", color: "var(--mk-text)", fontSize: 12 }} />
            </div>
          </details>
          <button type="submit" className="cta-btn" disabled={semServidor} style={{ marginTop: 6 }}>
            <i className="ti ti-plus" /> Criar canal
          </button>
        </form>
      </div>
    </section>
  );
}

const menuBtn: React.CSSProperties = { fontSize: 11, padding: "4px 8px" };

function labelOk(k: string) {
  return ({ criado: "Canal criado. Clique em 'Ver QR Code'.", importado: "Instância importada com dados do servidor.", atualizado: "Status atualizado.", padrao_definido: "Canal definido como padrão.", webhook_revalidado: "Webhook revalidado na UAZAPI.", desconectado: "Canal desconectado.", deletado: "Canal removido." } as Record<string, string>)[k] || "OK.";
}
function labelErr(k: string) {
  return ({ nome_vazio: "Nome obrigatório.", campos_obrigatorios: "Preencha nome e instance token.", sem_servidor: "Sem servidor UAZAPI ativo.", uazapi: "Erro chamando UAZAPI.", db: "Erro no banco.", conectar: "Falha ao gerar QR.", webhook: "Falha ao configurar webhook.", nao_encontrado: "Canal não encontrado.", token_invalido: "Servidor não reconheceu o token. Cole o Instance Token (UUID) do painel UAZAPI.", ja_importado: "Essa instância já está no sistema." } as Record<string, string>)[k] || "Erro.";
}

function Banner({ tipo, children }: { tipo: "ok" | "erro" | "warn"; children: React.ReactNode }) {
  const cor = tipo === "ok" ? "#6B8E4E" : tipo === "warn" ? "#C9A876" : "#C97064";
  const bg = tipo === "ok" ? "rgba(107,142,78,0.12)" : tipo === "warn" ? "rgba(201,168,118,0.15)" : "rgba(201,112,100,0.12)";
  const icon = tipo === "ok" ? "ti-circle-check" : tipo === "warn" ? "ti-alert-triangle" : "ti-alert-triangle";
  return (
    <div style={{ background: bg, borderLeft: `3px solid ${cor}`, padding: "10px 14px", borderRadius: 8, fontSize: 12, color: "var(--mk-text-secondary)", marginBottom: 14 }}>
      <i className={`ti ${icon}`} style={{ marginRight: 8, color: cor }} />
      {children}
    </div>
  );
}

function Field({ label, name, defaultValue, placeholder, required, type = "text" }: { label: string; name: string; defaultValue?: string; placeholder?: string; required?: boolean; type?: string }) {
  return (
    <div>
      <label style={lblSt}>{label}{required && <span style={{ color: "#C97064" }}> *</span>}</label>
      <input type={type} name={name} defaultValue={defaultValue} placeholder={placeholder} required={required} style={inpSt} />
    </div>
  );
}

function Select({ label, name, options }: { label: string; name: string; options: Array<{ id: string; nome: string; cor?: string | null }> }) {
  return (
    <div>
      <label style={lblSt}>{label}</label>
      <select name={name} style={inpSt}>
        {options.map((o) => (
          <option key={o.id || "_"} value={o.id}>{o.nome}</option>
        ))}
      </select>
    </div>
  );
}

const lblSt: React.CSSProperties = { display: "block", fontSize: 11, color: "var(--mk-text-muted)", marginBottom: 4, fontFamily: "monospace" };
const inpSt: React.CSSProperties = { width: "100%", padding: "8px 12px", borderRadius: 8, border: "0.5px solid var(--mk-border)", background: "var(--mk-surface-2)", color: "var(--mk-text)", fontSize: 12.5 };
