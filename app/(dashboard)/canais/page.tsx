import Link from "next/link";
import { requireAdmin } from "@/lib/crm/permissions";
import { createServiceClient } from "@/lib/supabase/service";
import {
  atualizarStatusCanal,
  definirPadrao,
  revalidarWebhook,
  desconectarCanal,
  deletarCanal,
} from "./_actions";
import { CanaisAutoRefresh } from "./_auto-refresh";
import { NovoCanalBalao, VerQrButton } from "./_novo-canal";
import { SubmitIconBtn } from "./_submit-btn";

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
  const temPendente = (canais || []).some((c) => c.status === "pending_qr" || c.status === "connecting");

  return (
    <section className="mk-page">
      <CanaisAutoRefresh pollPending={temPendente} />
      <div className="mk-page-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div className="mk-eyebrow">Administração</div>
          <h1 className="mk-page-title">Canais</h1>
          <p className="mk-page-sub">Sessões WhatsApp. Conecte uma conta por canal.</p>
        </div>
        <NovoCanalBalao
          filas={(filas || []).map((f) => ({ id: f.id, nome: f.nome }))}
          usuarios={(usuarios || []).map((u) => ({ id: u.id, nome: u.nome }))}
          disabled={semServidor}
        />
      </div>

      {sp.ok && <Banner tipo="ok">{labelOk(sp.ok)}</Banner>}
      {sp.erro && <Banner tipo="erro">{labelErr(sp.erro)} {sp.msg && `— ${decodeURIComponent(sp.msg)}`}</Banner>}

      {semServidor && (
        <Banner tipo="warn">
          Nenhum servidor de WhatsApp ativo. <Link href="/super-admin/servidores" style={{ color: "var(--mk-accent)", textDecoration: "underline" }}>Cadastre um servidor</Link> antes de criar canais (super_admin only).
        </Banner>
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
                    #{c.numero} · {c.tipo === "uazapi" ? "whatsapp" : c.tipo}
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
                  <VerQrButton canalId={c.id} nome={c.nome} />
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
                    <SubmitIconBtn icon="ti-star" title="Definir como padrão" />
                  </form>
                )}
                <form action={revalidarWebhook} style={{ display: "inline" }}>
                  <input type="hidden" name="id" value={c.id} />
                  <SubmitIconBtn icon="ti-webhook" title="Revalidar webhook" />
                </form>
                {conectado && (
                  <form action={desconectarCanal} style={{ display: "inline" }}>
                    <input type="hidden" name="id" value={c.id} />
                    <SubmitIconBtn icon="ti-plug-off" title="Desconectar" confirmMsg={`Desconectar "${c.nome}"?`} />
                  </form>
                )}
                <form action={deletarCanal} style={{ display: "inline", marginLeft: "auto" }}>
                  <input type="hidden" name="id" value={c.id} />
                  <SubmitIconBtn icon="ti-trash" title="Excluir canal" color="#C97064" confirmMsg={`Excluir o canal "${c.nome}"? A instância no servidor também será removida.`} />
                </form>
              </div>
            </div>
          );
        })}
      </div>

    </section>
  );
}

const menuBtn: React.CSSProperties = { fontSize: 11, padding: "4px 8px" };

function labelOk(k: string) {
  return ({ criado: "Canal criado. Clique em 'Ver QR Code'.", importado: "Instância importada com dados do servidor.", atualizado: "Status atualizado.", padrao_definido: "Canal definido como padrão.", webhook_revalidado: "Webhook revalidado.", desconectado: "Canal desconectado.", deletado: "Canal removido." } as Record<string, string>)[k] || "OK.";
}
function labelErr(k: string) {
  return ({ nome_vazio: "Nome obrigatório.", campos_obrigatorios: "Preencha nome e instance token.", sem_servidor: "Sem servidor de WhatsApp ativo.", uazapi: "Erro chamando o servidor de WhatsApp.", db: "Erro no banco.", conectar: "Falha ao gerar QR.", webhook: "Falha ao configurar webhook.", nao_encontrado: "Canal não encontrado.", token_invalido: "Servidor não reconheceu o token. Cole o Instance Token (UUID) do painel do provedor.", ja_importado: "Essa instância já está no sistema." } as Record<string, string>)[k] || "Erro.";
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



const lblSt: React.CSSProperties = { display: "block", fontSize: 11, color: "var(--mk-text-muted)", marginBottom: 4, fontFamily: "monospace" };
const inpSt: React.CSSProperties = { width: "100%", padding: "8px 12px", borderRadius: 8, border: "0.5px solid var(--mk-border)", background: "var(--mk-surface-2)", color: "var(--mk-text)", fontSize: 12.5 };
