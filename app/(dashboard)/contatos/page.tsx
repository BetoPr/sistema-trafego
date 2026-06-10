import Link from "next/link";
import { requireAuth } from "@/lib/crm/permissions";
import { createServiceClient } from "@/lib/supabase/service";
import { estadoPorDDD } from "@/lib/br/ddd";
import { criarContato, atualizarContato } from "./_actions";

import { ContatosTabela, type LinhaContato } from "./_tabela";

interface PageProps {
  searchParams: Promise<{ ok?: string; erro?: string; msg?: string; editar?: string; novo?: string }>;
}

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

interface FechResumo {
  total: number;
  quantidade: number;
  fechamentos: number;
  servicos: Map<string, { qtd: number; valor: number }>;
  ultimo: string | null;
}

export default async function ContatosPage({ searchParams }: PageProps) {
  const ctx = await requireAuth();
  const sp = await searchParams;
  const sb = createServiceClient();

  const q = sb
    .from("contatos")
    .select("id, nome, whatsapp, foto_url, created_at, etiquetas:contato_etiquetas(etiqueta:etiquetas(id, nome, cor, categoria))")
    .eq("agencia_id", ctx.agenciaId)
    .is("deleted_at", null);

  const [{ data: contatos }, { data: fechRows }, { data: servicosRows }, { data: agRow }] = await Promise.all([
    q.order("nome").limit(500),
    sb
      .from("tickets")
      .select("contato_id, valor_fechado, fechado_em, metadata")
      .eq("agencia_id", ctx.agenciaId)
      .not("valor_fechado", "is", null),
    sb.from("servicos").select("id, nome").eq("agencia_id", ctx.agenciaId).eq("ativo", true).order("nome"),
    sb.from("agencias").select("servicos_habilitados").eq("id", ctx.agenciaId).single(),
  ]);
  const servicos = (servicosRows || []) as Array<{ id: string; nome: string }>;
  const servicosHabilitados = !!(agRow as { servicos_habilitados?: boolean } | null)?.servicos_habilitados;

  // Agrega fechamentos por contato
  const fechPorContato = new Map<string, FechResumo>();
  for (const t of fechRows || []) {
    const cid = t.contato_id as string;
    const valor = Number(t.valor_fechado || 0);
    const meta = (t.metadata || {}) as { servico?: string; quantidade?: number };
    const qtd = Number(meta.quantidade || 1);
    const serv = (meta.servico || "Sem serviço").trim() || "Sem serviço";

    let r = fechPorContato.get(cid);
    if (!r) {
      r = { total: 0, quantidade: 0, fechamentos: 0, servicos: new Map(), ultimo: null };
      fechPorContato.set(cid, r);
    }
    r.total += valor;
    r.quantidade += qtd;
    r.fechamentos += 1;
    const s = r.servicos.get(serv);
    if (s) { s.qtd += qtd; s.valor += valor; }
    else r.servicos.set(serv, { qtd, valor });
    if (t.fechado_em && (!r.ultimo || t.fechado_em > r.ultimo)) r.ultimo = t.fechado_em;
  }

  const editando = sp.editar ? contatos?.find((c) => c.id === sp.editar) : null;
  const mostrarForm = !!editando || sp.novo === "1";
  const fechEditando = editando ? fechPorContato.get(editando.id) : undefined;

  return (
    <section className="mk-page">
      <div className="mk-page-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div className="mk-eyebrow">Atendimento</div>
          <h1 className="mk-page-title">Contatos</h1>
          <p className="mk-page-sub">Base de contatos da agência com histórico de fechamentos.</p>
        </div>
        {!mostrarForm && <Link href="/contatos?novo=1" className="cta-btn"><i className="ti ti-plus" /> Adicionar contato</Link>}
      </div>

      {sp.ok && <Banner tipo="ok">{labelOk(sp.ok)}</Banner>}
      {sp.erro && <Banner tipo="erro">{labelErr(sp.erro)} {sp.msg && `— ${decodeURIComponent(sp.msg)}`}</Banner>}

      {mostrarForm && (
        <div className="mk-card mk-card-lg" style={{ marginBottom: 14 }}>
          <h3 className="card-title" style={{ marginBottom: 14 }}>{editando ? `Editar — ${editando.nome}` : "Novo contato"}</h3>
          <form action={editando ? atualizarContato : criarContato} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {editando && <input type="hidden" name="id" value={editando.id} />}
            <div style={grid2}>
              <Field label="Nome" name="nome" defaultValue={editando?.nome ?? ""} required />
              <Field label="WhatsApp" name="whatsapp" defaultValue={editando?.whatsapp ?? ""} placeholder="5511999999999" />
            </div>
            <div>
              <label style={lblMono}>Estado (DDD)</label>
              <div style={{ padding: "8px 12px", borderRadius: 8, border: "0.5px solid var(--mk-border)", background: "var(--mk-surface)", color: "var(--mk-text-secondary)", fontSize: 12.5 }}>
                <i className="ti ti-map-pin" style={{ marginRight: 6, color: "var(--mk-text-muted)" }} />
                {estadoPorDDD(editando?.whatsapp)} <span style={{ fontSize: 10.5, color: "var(--mk-text-muted)" }}>— detectado automaticamente pelo DDD do número</span>
              </div>
            </div>

            {/* Fechamento opcional ao criar (registro de venda feita por fora) */}
            {!editando && (
              <div style={{ borderTop: "0.5px solid var(--mk-border)", paddingTop: 12 }}>
                <label style={lblMono}>Fechamento (opcional) — registre uma venda feita por fora</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr 0.7fr", gap: 10 }}>
                  <Field label="Valor (R$)" name="fech_valor" placeholder="0,00" />
                  <div>
                    <label style={lblMono}>Serviço</label>
                    {servicosHabilitados ? (
                      <select name="fech_servico" defaultValue="" style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "0.5px solid var(--mk-border)", background: "var(--mk-surface-2)", color: "var(--mk-text)", fontSize: 12.5 }}>
                        <option value="">— Selecione —</option>
                        {servicos.map((s) => <option key={s.id} value={s.nome}>{s.nome}</option>)}
                      </select>
                    ) : (
                      <input type="text" name="fech_servico" placeholder="Ex: Ensaio Gestante" style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "0.5px solid var(--mk-border)", background: "var(--mk-surface-2)", color: "var(--mk-text)", fontSize: 12.5 }} />
                    )}
                  </div>
                  <Field label="Quantidade" name="fech_qtd" placeholder="1" />
                </div>
                <div style={{ fontSize: 10.5, color: "var(--mk-text-muted)", marginTop: 6 }}>
                  Preencheu o valor? Entra no Dashboard e no log de fechamentos. Deixou vazio? Cria só o contato.
                </div>
              </div>
            )}

            {/* Histórico de fechamentos do contato */}
            {editando && (
              <div style={{ borderTop: "0.5px solid var(--mk-border)", paddingTop: 12 }}>
                <label style={lblMono}>Fechamentos</label>
                {!fechEditando ? (
                  <div style={{ fontSize: 12, color: "var(--mk-text-muted)", padding: "6px 0" }}>
                    <i className="ti ti-receipt-off" style={{ marginRight: 6 }} />Nenhum fechamento com este contato ainda.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", gap: 18, flexWrap: "wrap", padding: "8px 12px", background: "rgba(107,142,78,0.10)", border: "0.5px solid rgba(107,142,78,0.4)", borderRadius: 8 }}>
                      <Stat label="TOTAL" valor={BRL.format(fechEditando.total)} cor="#6B8E4E" />
                      <Stat label="FECHAMENTOS" valor={String(fechEditando.fechamentos)} />
                      <Stat label="SERVIÇOS (QTD)" valor={String(fechEditando.quantidade)} />
                      {fechEditando.ultimo && <Stat label="ÚLTIMO" valor={new Date(fechEditando.ultimo).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })} />}
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {Array.from(fechEditando.servicos.entries()).map(([nome, s]) => (
                        <span key={nome} style={{ fontSize: 10.5, padding: "3px 9px", borderRadius: 10, background: "var(--mk-surface-2)", border: "0.5px solid var(--mk-border)", color: "var(--mk-text-secondary)" }}>
                          {nome} × {s.qtd} · <strong style={{ color: "#6B8E4E" }}>{BRL.format(s.valor)}</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" className="cta-btn"><i className="ti ti-device-floppy" /> {editando ? "Salvar" : "Criar"}</button>
              <Link href="/contatos" className="ghost-btn">Cancelar</Link>
            </div>
          </form>
        </div>
      )}

      <ContatosTabela
        linhas={(contatos || []).map((c): LinhaContato => {
          const tags = ((c.etiquetas as unknown as Array<{ etiqueta: { id: string; nome: string; cor: string } | { id: string; nome: string; cor: string }[] | null }> | null) || [])
            .map((e) => (Array.isArray(e.etiqueta) ? e.etiqueta[0] : e.etiqueta))
            .filter((e): e is { id: string; nome: string; cor: string } => !!e);
          const fech = fechPorContato.get(c.id);
          return {
            id: c.id,
            nome: c.nome,
            whatsapp: c.whatsapp,
            estado: estadoPorDDD(c.whatsapp),
            tags,
            fech: fech
              ? {
                  total: fech.total,
                  fechamentos: fech.fechamentos,
                  quantidade: fech.quantidade,
                  servicos: Array.from(fech.servicos.entries()).map(([nome, s]) => ({ nome, qtd: s.qtd, valor: s.valor })),
                }
              : null,
          };
        })}
      />
    </section>
  );
}

function Stat({ label, valor, cor }: { label: string; valor: string; cor?: string }) {
  return (
    <div>
      <div style={{ fontSize: 9.5, color: "var(--mk-text-muted)", letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: cor || "var(--mk-text)" }}>{valor}</div>
    </div>
  );
}

function labelOk(k: string) { return ({ criado: "Contato criado.", atualizado: "Atualizado.", deletado: "Removido." } as Record<string, string>)[k] || "OK."; }
function labelErr(k: string) { return ({ nome_vazio: "Nome obrigatório.", db: "Erro no banco." } as Record<string, string>)[k] || "Erro."; }

function Banner({ tipo, children }: { tipo: "ok" | "erro"; children: React.ReactNode }) {
  const cor = tipo === "ok" ? "#6B8E4E" : "#C97064";
  return <div style={{ background: tipo === "ok" ? "rgba(107,142,78,0.12)" : "rgba(201,112,100,0.12)", borderLeft: `3px solid ${cor}`, padding: "10px 14px", borderRadius: 8, fontSize: 12, color: "var(--mk-text-secondary)", marginBottom: 14 }}><i className={`ti ${tipo === "ok" ? "ti-circle-check" : "ti-alert-triangle"}`} style={{ marginRight: 8, color: cor }} />{children}</div>;
}

function Field({ label, name, defaultValue, placeholder, required, type = "text" }: { label: string; name: string; defaultValue?: string; placeholder?: string; required?: boolean; type?: string }) {
  return (
    <div>
      <label style={lblMono}>{label}{required && <span style={{ color: "#C97064" }}> *</span>}</label>
      <input type={type} name={name} defaultValue={defaultValue} placeholder={placeholder} required={required} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "0.5px solid var(--mk-border)", background: "var(--mk-surface-2)", color: "var(--mk-text)", fontSize: 12.5 }} />
    </div>
  );
}

const lblMono: React.CSSProperties = { display: "block", fontSize: 11, color: "var(--mk-text-muted)", marginBottom: 4, fontFamily: "monospace" };
const grid2: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 };

