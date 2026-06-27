"use client";

import { useState, useEffect, useMemo } from "react";
import { Balao } from "@/components/ui/Balao";
import {
  cobrarAgencia,
  marcarPagoAgencia,
  estenderVencimentoAgencia,
  atualizarCobrancaAgencia,
  atualizarCanaisAgencia,
  atualizarConfigCobranca,
} from "./_actions";

export interface AgenciaCobranca {
  id: string;
  nome: string;
  tipo_cliente: "autonomo" | "agencia" | null;
  valor_mensal: number | null;
  vencimento_em: string | null;
  ultimo_pagamento_em: string | null;
  whatsapp_cobranca: string | null;
  cobranca_ativa: boolean;
  acesso_bloqueado: boolean;
  trial_acaba_em: string | null;
  apagar_em: string | null;
  ultima_cobranca_status: "enviada" | "falha" | "pulada" | null;
  ultima_cobranca_em: string | null;
  canais_inclusos: number;
  canais_extras_pagos: number;
  canais_extras_cortesia: number;
  limite_canais: number;
  canais_usados: number;
}

export interface CanalOpcao {
  id: string;
  nome: string;
  numero_conectado: string | null;
  status: string;
}

interface Props {
  agencias: AgenciaCobranca[];
  config: {
    canal_id: string | null;
    horario: string;
    template_texto: string;
    ativo: boolean;
  };
  canais: CanalOpcao[];
}

/**
 * Controller global de abrir balão. Componente externo aciona via window.dispatchEvent.
 * 'all' = lista completa; agenciaId = filtra só essa agência.
 */
export function abrirBalaoCobrancas(filter: "all" | { agenciaId: string }) {
  window.dispatchEvent(new CustomEvent("cobrancas:open", { detail: filter }));
}

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function diasParaVencer(venc: string | null) {
  if (!venc) return null;
  const v = new Date(venc + "T00:00:00");
  const agora = new Date();
  agora.setHours(0, 0, 0, 0);
  return Math.ceil((v.getTime() - agora.getTime()) / 86_400_000);
}

function statusBadge(a: AgenciaCobranca) {
  if (a.acesso_bloqueado) return { label: "BLOQUEADO", cor: "#C97064" };
  if (!a.cobranca_ativa) return { label: "INATIVA", cor: "#94a3b8" };
  const d = diasParaVencer(a.vencimento_em);
  if (d === null) return { label: "SEM VENCIMENTO", cor: "#94a3b8" };
  if (d < 0) return { label: `${-d}d ATRASADO`, cor: "#C97064" };
  if (d === 0) return { label: "VENCE HOJE", cor: "#f59e0b" };
  if (d === 1) return { label: "VENCE AMANHÃ", cor: "#f59e0b" };
  if (d <= 7) return { label: `${d}d`, cor: "#f59e0b" };
  return { label: `${d}d`, cor: "#00E19A" };
}

export function CobrancasBloco({ agencias, config, canais }: Props) {
  const [editando, setEditando] = useState<AgenciaCobranca | null>(null);
  const [confirmCobrar, setConfirmCobrar] = useState<AgenciaCobranca | null>(null);
  const [confirmPago, setConfirmPago] = useState<AgenciaCobranca | null>(null);
  const [configAberto, setConfigAberto] = useState(false);
  const [meses, setMeses] = useState(1);
  const [aberto, setAberto] = useState(false);
  const [filtroAgenciaId, setFiltroAgenciaId] = useState<string | null>(null);

  const canalAtivo = canais.find((c) => c.id === config.canal_id);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as "all" | { agenciaId: string };
      setFiltroAgenciaId(detail === "all" ? null : detail.agenciaId);
      setAberto(true);
    };
    window.addEventListener("cobrancas:open", handler as EventListener);
    return () => window.removeEventListener("cobrancas:open", handler as EventListener);
  }, []);

  const agenciasFiltradas = useMemo(() => {
    if (!filtroAgenciaId) return agencias;
    return agencias.filter((a) => a.id === filtroAgenciaId);
  }, [agencias, filtroAgenciaId]);

  const tituloBalao = filtroAgenciaId
    ? `Cobrança — ${agencias.find((a) => a.id === filtroAgenciaId)?.nome || ""}`
    : "Cobranças das agências";

  return (
    <Balao
      open={aberto}
      onClose={() => { setAberto(false); setFiltroAgenciaId(null); }}
      titulo={tituloBalao}
      icone="ti-coin"
      largura={980}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        <p style={{ fontSize: 11.5, color: "var(--mk-text-muted)", margin: 0, flex: 1 }}>
          Controle de mensalidades. Cobrança automática 1 dia antes do vencimento via WhatsApp.
          {canalAtivo ? (
            <> Canal: <strong style={{ color: "#00E19A" }}>{canalAtivo.nome}</strong> ({canalAtivo.numero_conectado || "—"}).</>
          ) : (
            <> <strong style={{ color: "#C97064" }}>⚠ Canal de envio não configurado.</strong></>
          )}
          {filtroAgenciaId && (
            <> · <button
              type="button"
              onClick={() => setFiltroAgenciaId(null)}
              style={{ background: "transparent", border: 0, color: "#00E19A", textDecoration: "underline", cursor: "pointer", fontSize: 11.5, padding: 0 }}
            >ver todas</button></>
          )}
        </p>
        <button type="button" onClick={() => setConfigAberto(true)} className="ghost-btn" style={{ fontSize: 12 }}>
          <i className="ti ti-settings" /> Config de envio
        </button>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 12.5 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "var(--mk-text-muted)", fontSize: 11 }}>
              <th style={th}>Agência</th>
              <th style={th}>Valor</th>
              <th style={th}>Vencimento</th>
              <th style={th}>Status</th>
              <th style={th}>Último pago</th>
              <th style={th}>Última cobrança</th>
              <th style={th}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {agenciasFiltradas.map((a) => {
              const st = statusBadge(a);
              return (
                <tr key={a.id} className="acesso-row" style={{ borderTop: "0.5px solid var(--mk-border)" }}>
                  <td style={td}>
                    <strong>{a.nome}</strong>
                    <div style={{ fontSize: 10.5, color: "var(--mk-text-muted)", fontFamily: "monospace", marginTop: 2 }}>
                      {a.whatsapp_cobranca || "sem whatsapp"}
                    </div>
                  </td>
                  <td style={td}>{a.valor_mensal ? BRL.format(a.valor_mensal) : "—"}</td>
                  <td style={td}>
                    {a.vencimento_em ? new Date(a.vencimento_em + "T00:00:00").toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—"}
                  </td>
                  <td style={td}>
                    <span style={{ fontSize: 10.5, padding: "3px 9px", borderRadius: 999, background: `${st.cor}22`, color: st.cor, border: `0.5px solid ${st.cor}`, fontWeight: 600, letterSpacing: 0.3 }}>
                      {st.label}
                    </span>
                  </td>
                  <td style={td}>
                    {a.ultimo_pagamento_em
                      ? new Date(a.ultimo_pagamento_em).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })
                      : <span style={{ color: "var(--mk-text-muted)" }}>nunca</span>}
                  </td>
                  <td style={td}>
                    {a.ultima_cobranca_em ? (
                      <div style={{ fontSize: 11 }}>
                        <span style={{ color: a.ultima_cobranca_status === "enviada" ? "#00E19A" : "#C97064" }}>
                          {a.ultima_cobranca_status}
                        </span>
                        <div style={{ fontSize: 10.5, color: "var(--mk-text-muted)" }}>
                          {new Date(a.ultima_cobranca_em).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                        </div>
                      </div>
                    ) : <span style={{ color: "var(--mk-text-muted)" }}>—</span>}
                  </td>
                  <td style={td}>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        onClick={() => setConfirmCobrar(a)}
                        className="ghost-btn acesso-icon-btn"
                        title="Enviar cobrança agora"
                        style={iconBtn}
                      >
                        <i className="ti ti-send" />
                      </button>
                      <button
                        type="button"
                        onClick={() => { setMeses(1); setConfirmPago(a); }}
                        className="ghost-btn acesso-icon-btn"
                        title="Marcar como pago"
                        style={{ ...iconBtn, color: "#00E19A" }}
                      >
                        <i className="ti ti-check" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditando(a)}
                        className="ghost-btn acesso-icon-btn"
                        title="Editar cobrança"
                        style={iconBtn}
                      >
                        <i className="ti ti-pencil" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {agenciasFiltradas.length === 0 && (
          <div style={{ padding: "32px 14px", textAlign: "center", color: "var(--mk-text-muted)", fontSize: 13 }}>
            {filtroAgenciaId ? "Agência não encontrada." : "Sem agências cadastradas."}
          </div>
        )}
      </div>

      {/* Balão: confirmar envio de cobrança */}
      <Balao
        open={!!confirmCobrar}
        onClose={() => setConfirmCobrar(null)}
        titulo="Enviar cobrança"
        icone="ti-send"
        largura={460}
        footer={
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" onClick={() => setConfirmCobrar(null)} className="ghost-btn" style={{ fontSize: 12 }}>Cancelar</button>
            <form action={cobrarAgencia} style={{ display: "inline" }}>
              <input type="hidden" name="agencia_id" value={confirmCobrar?.id || ""} />
              <button type="submit" className="cta-btn" style={{ fontSize: 12 }}>
                <i className="ti ti-send" /> Enviar agora
              </button>
            </form>
          </div>
        }
      >
        {confirmCobrar && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ fontSize: 13, margin: 0 }}>
              Enviar cobrança pra <strong>{confirmCobrar.nome}</strong>?
            </p>
            <div style={{ background: "var(--mk-surface)", border: "0.5px solid var(--mk-border)", borderRadius: 8, padding: "10px 14px", fontSize: 12, lineHeight: 1.6 }}>
              <div>WhatsApp destino: <code>{confirmCobrar.whatsapp_cobranca || "—"}</code></div>
              <div>Valor: <strong style={{ color: "#00E19A" }}>{confirmCobrar.valor_mensal ? BRL.format(confirmCobrar.valor_mensal) : "—"}</strong></div>
              <div>Canal de envio: <strong>{canalAtivo?.nome || "não configurado"}</strong></div>
            </div>
            <div style={{ fontSize: 11, color: "var(--mk-text-muted)" }}>
              <i className="ti ti-info-circle" style={{ marginRight: 4 }} />
              Usa o template configurado, com seu PIX <code>61054832000185</code> embutido.
            </div>
          </div>
        )}
      </Balao>

      {/* Balão: marcar pago */}
      <Balao
        open={!!confirmPago}
        onClose={() => setConfirmPago(null)}
        titulo="Marcar como pago"
        icone="ti-check"
        largura={420}
        footer={
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" onClick={() => setConfirmPago(null)} className="ghost-btn" style={{ fontSize: 12 }}>Cancelar</button>
            <form action={meses === 1 ? marcarPagoAgencia : estenderVencimentoAgencia} style={{ display: "inline" }}>
              <input type="hidden" name="agencia_id" value={confirmPago?.id || ""} />
              <input type="hidden" name="meses" value={String(meses)} />
              <button type="submit" className="cta-btn" style={{ fontSize: 12 }}>
                <i className="ti ti-check" /> Confirmar ({meses} {meses === 1 ? "mês" : "meses"})
              </button>
            </form>
          </div>
        }
      >
        {confirmPago && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ fontSize: 13, margin: 0 }}>
              Marcar pagamento de <strong>{confirmPago.nome}</strong>. Vencimento avança quantos meses?
            </p>
            <div style={{ display: "flex", gap: 6 }}>
              {[1, 2, 3, 6, 12].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setMeses(n)}
                  className={meses === n ? "cta-btn" : "ghost-btn"}
                  style={{ flex: 1, fontSize: 12 }}
                >
                  {n}m
                </button>
              ))}
            </div>
            <div style={{ fontSize: 11.5, color: "var(--mk-text-muted)", background: "var(--mk-surface)", border: "0.5px solid var(--mk-border)", borderRadius: 8, padding: "8px 12px" }}>
              Vencimento atual: <strong>{confirmPago.vencimento_em ? new Date(confirmPago.vencimento_em + "T00:00:00").toLocaleDateString("pt-BR") : "—"}</strong>
              <br />
              Acesso desbloqueia automaticamente após confirmar.
            </div>
          </div>
        )}
      </Balao>

      {/* Balão: editar cobrança da agência */}
      <Balao
        open={!!editando}
        onClose={() => setEditando(null)}
        titulo={`Editar cobrança — ${editando?.nome || ""}`}
        icone="ti-pencil"
        largura={520}
      >
        {editando && (
          <form action={atualizarCobrancaAgencia} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input type="hidden" name="agencia_id" value={editando.id} />
            <div style={grid2}>
              <div>
                <label style={lbl}>Valor mensal (R$)</label>
                <input name="valor_mensal" defaultValue={editando.valor_mensal ?? 29} type="number" step="0.01" min="0" style={inp} />
              </div>
              <div>
                <label style={lbl}>Vencimento</label>
                <input name="vencimento_em" defaultValue={editando.vencimento_em ?? ""} type="date" style={inp} />
              </div>
            </div>
            <div>
              <label style={lbl}>WhatsApp pra cobrança</label>
              <input name="whatsapp_cobranca" defaultValue={editando.whatsapp_cobranca ?? ""} placeholder="5511999999999" style={inp} />
            </div>
            <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12 }}>
              <input type="checkbox" name="cobranca_ativa" defaultChecked={editando.cobranca_ativa} />
              Cobrança ativa (cron automático)
            </label>
            <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, color: editando.acesso_bloqueado ? "#C97064" : "var(--mk-text-secondary)" }}>
              <input type="checkbox" name="acesso_bloqueado" defaultChecked={editando.acesso_bloqueado} />
              Acesso bloqueado (admins/atendentes não conseguem logar)
            </label>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
              <button type="button" onClick={() => setEditando(null)} className="ghost-btn" style={{ fontSize: 12 }}>Cancelar</button>
              <button type="submit" className="cta-btn" style={{ fontSize: 12 }}>Salvar</button>
            </div>
          </form>
        )}

        {editando && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--mk-border)" }}>
            <div style={{ fontSize: 12, color: "var(--mk-text-secondary)", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span><i className="ti ti-brand-whatsapp" style={{ color: "#00E19A", marginRight: 4 }} />Conexões de WhatsApp</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: editando.canais_usados >= editando.limite_canais ? "#C97064" : "#00E19A" }}>
                {editando.canais_usados}/{editando.limite_canais} em uso
              </span>
            </div>
            <form action={atualizarCanaisAgencia} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input type="hidden" name="agencia_id" value={editando.id} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                <div>
                  <label style={lbl}>Inclusas no plano</label>
                  <input name="canais_inclusos" defaultValue={editando.canais_inclusos} type="number" min="0" style={inp} />
                </div>
                <div>
                  <label style={lbl}>Extras pagas (R$19/mês cada)</label>
                  <input name="canais_extras_pagos" defaultValue={editando.canais_extras_pagos} type="number" min="0" style={inp} />
                </div>
                <div>
                  <label style={lbl}>Cortesia</label>
                  <input name="canais_extras_cortesia" defaultValue={editando.canais_extras_cortesia} type="number" min="0" style={inp} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button type="submit" className="cta-btn" style={{ fontSize: 12 }}>Atualizar conexões</button>
              </div>
            </form>
          </div>
        )}
      </Balao>

      {/* Balão: config de envio */}
      <Balao
        open={configAberto}
        onClose={() => setConfigAberto(false)}
        titulo="Config de cobrança (envio)"
        icone="ti-settings"
        largura={560}
      >
        <form action={atualizarConfigCobranca} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <label style={lbl}>Canal de envio (seu número Sonar)</label>
            <select name="canal_id" defaultValue={config.canal_id ?? ""} style={inp} required>
              <option value="">— Selecione —</option>
              {canais.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome} {c.numero_conectado ? `· ${c.numero_conectado}` : ""} {c.status !== "connected" ? "(desconectado)" : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={lbl}>Horário do disparo automático (BRT)</label>
            <input name="horario" defaultValue={config.horario.slice(0, 5)} type="time" style={inp} />
            <div style={{ fontSize: 10.5, color: "var(--mk-text-muted)", marginTop: 4 }}>
              Atualmente o cron roda 09:00 BRT. Mudar aqui não muda o cron — fale com dev pra ajustar pg_cron.
            </div>
          </div>
          <div>
            <label style={lbl}>Template da mensagem</label>
            <textarea name="template_texto" defaultValue={config.template_texto} rows={10} style={{ ...inp, fontFamily: "monospace", fontSize: 11.5 }} />
            <div style={{ fontSize: 10.5, color: "var(--mk-text-muted)", marginTop: 4, lineHeight: 1.5 }}>
              Variáveis: <code>{"{nome}"}</code> <code>{"{valor}"}</code> <code>{"{dia}"}</code> <code>{"{mes}"}</code> <code>{"{ano}"}</code> <code>{"{dia_vencimento}"}</code> <code>{"{dias_para_vencer}"}</code>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" onClick={() => setConfigAberto(false)} className="ghost-btn" style={{ fontSize: 12 }}>Cancelar</button>
            <button type="submit" className="cta-btn" style={{ fontSize: 12 }}>Salvar</button>
          </div>
        </form>
      </Balao>
    </Balao>
  );
}

const th: React.CSSProperties = { padding: "10px 14px", fontWeight: 600, letterSpacing: 0.3 };
const td: React.CSSProperties = { padding: "10px 14px" };
const iconBtn: React.CSSProperties = { width: 30, height: 30, padding: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 13 };
const lbl: React.CSSProperties = { display: "block", fontSize: 11, color: "var(--mk-text-muted)", marginBottom: 4, fontFamily: "monospace" };
const inp: React.CSSProperties = { width: "100%", padding: "8px 12px", borderRadius: 8, border: "0.5px solid var(--mk-border)", background: "var(--mk-surface-2)", color: "var(--mk-text)", fontSize: 12.5 };
const grid2: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 };
