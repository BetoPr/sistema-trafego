"use client";

import { useState, useTransition } from "react";
import { Balao } from "@/components/ui/Balao";
import {
  criarAlertaMeta,
  atualizarAlertaMeta,
  toggleAlertaMeta,
  deletarAlertaMeta,
  testarAlertaMeta,
} from "./_actions";

export interface AlertaItem {
  id: string;
  nome: string;
  tipo: "gasto_dia" | "gasto_mes";
  limite_valor: number;
  destino_numero: string;
  integracao_id: string;
  cliente_id: string | null;
  canal_id: string | null;
  mensagem_template: string;
  ativo: boolean;
  ultimo_disparo_em: string | null;
  ultimo_valor_observado: number | null;
}
export interface IntegracaoOpt {
  id: string;
  account_id: string;
  account_name: string;
  cliente_id: string | null;
}
export interface CanalOpt {
  id: string;
  nome: string;
  status: string;
  padrao: boolean;
}
export interface ClienteOpt {
  id: string;
  nome: string;
}

function fmtBRL(n: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
}
function fmtData(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

interface Props {
  alertas: AlertaItem[];
  integracoes: IntegracaoOpt[];
  canais: CanalOpt[];
  clientes: ClienteOpt[];
}

export default function AlertasShell({ alertas, integracoes, canais, clientes }: Props) {
  const [formAberto, setFormAberto] = useState(false);
  const [editando, setEditando] = useState<AlertaItem | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const ativos = alertas.filter((a) => a.ativo).length;
  const disparados = alertas.filter((a) => a.ultimo_disparo_em).length;

  function abrirNovo() {
    setEditando(null);
    setErro(null);
    setFormAberto(true);
  }
  function abrirEditar(a: AlertaItem) {
    setEditando(a);
    setErro(null);
    setFormAberto(true);
  }
  function fechar() {
    setFormAberto(false);
    setEditando(null);
    setErro(null);
  }

  function onSubmit(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const r = editando ? await atualizarAlertaMeta(editando.id, formData) : await criarAlertaMeta(formData);
      if ("erro" in r && r.erro) setErro(r.erro);
      else fechar();
    });
  }

  function onToggle(a: AlertaItem) {
    startTransition(async () => {
      await toggleAlertaMeta(a.id, !a.ativo);
    });
  }
  function onDeletar(a: AlertaItem) {
    if (!confirm(`Deletar alerta "${a.nome}"?`)) return;
    startTransition(async () => {
      await deletarAlertaMeta(a.id);
    });
  }
  function onTestar(a: AlertaItem) {
    startTransition(async () => {
      const r = await testarAlertaMeta(a.id);
      if (!r.ok) alert("Falha ao testar. Veja os logs do cron.");
      else alert("Teste disparado. Cron processou — confira o WhatsApp e o histórico.");
    });
  }

  if (integracoes.length === 0) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "36px 18px",
          background: "var(--mk-surface)",
          border: "1px dashed var(--mk-border)",
          borderRadius: 14,
          color: "var(--mk-text-secondary)",
        }}
      >
        <i className="ti ti-plug-connected-x" style={{ fontSize: 36, color: "var(--mk-icon-amber)" }} />
        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--mk-text)", marginTop: 10 }}>
          Conecte uma conta Meta Ads primeiro
        </div>
        <div style={{ fontSize: 12.5, marginTop: 6, lineHeight: 1.5, maxWidth: 360, margin: "6px auto 0" }}>
          Sem uma integração ativa, não dá pra checar gasto. Vá em <strong>Integrações → Meta Ads</strong> e conecte
          uma conta.
        </div>
        <a
          href="/integracoes/meta"
          className="cta-btn"
          style={{
            display: "inline-block",
            marginTop: 16,
            padding: "10px 18px",
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          Conectar Meta Ads
        </a>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "10px 12px",
          background: "var(--mk-surface)",
          border: "1px solid var(--mk-border)",
          borderRadius: 14,
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: "rgba(0,225,154,.12)",
            border: ".5px solid rgba(0,225,154,.32)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <i className="ti ti-bell-ringing" style={{ fontSize: 18, color: "var(--mk-accent-2)" }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>Alertas configurados</div>
          <div style={{ fontSize: 11.5, color: "var(--mk-accent-2)", fontWeight: 600 }}>
            {ativos} {ativos === 1 ? "ativo" : "ativos"}
            {disparados > 0 ? ` · ${disparados} já disparou` : ""}
          </div>
        </div>
        <button
          className="cta-btn"
          onClick={abrirNovo}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 9 }}
        >
          <i className="ti ti-plus" style={{ fontSize: 14 }} />
          <span style={{ fontSize: 12.5, fontWeight: 700 }}>Novo</span>
        </button>
      </div>

      {alertas.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "32px 18px",
            background: "var(--mk-surface)",
            border: "1px dashed var(--mk-border)",
            borderRadius: 14,
            color: "var(--mk-text-secondary)",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "rgba(0,225,154,.10)",
              border: ".5px solid rgba(0,225,154,.28)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 12,
            }}
          >
            <i className="ti ti-bell-plus" style={{ fontSize: 26, color: "var(--mk-accent-2)" }} />
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--mk-text)" }}>Sem alertas ainda</div>
          <div style={{ fontSize: 12.5, marginTop: 6, lineHeight: 1.5, maxWidth: 340, margin: "6px auto 0" }}>
            Crie regras como “avise quando gasto do dia bater R$ 500” e o Sonar checa de hora em hora — quando bater,
            dispara WhatsApp pro número configurado.
          </div>
          <button
            className="cta-btn"
            onClick={abrirNovo}
            style={{ marginTop: 16, padding: "10px 18px", borderRadius: 10, fontSize: 13, fontWeight: 700 }}
          >
            <i className="ti ti-plus" style={{ marginRight: 6 }} /> Criar primeiro alerta
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {alertas.map((a) => {
            const integ = integracoes.find((i) => i.id === a.integracao_id);
            return (
              <div
                key={a.id}
                style={{
                  background: "var(--mk-surface)",
                  border: ".5px solid var(--mk-border)",
                  borderRadius: 12,
                  padding: 12,
                  opacity: a.ativo ? 1 : 0.55,
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <button
                    onClick={() => onToggle(a)}
                    aria-label={a.ativo ? "Desativar" : "Ativar"}
                    disabled={pending}
                    style={{
                      width: 36,
                      height: 20,
                      borderRadius: 11,
                      background: a.ativo ? "var(--mk-accent-2)" : "rgba(255,255,255,.15)",
                      position: "relative",
                      flex: "none",
                      marginTop: 3,
                      border: 0,
                      cursor: pending ? "wait" : "pointer",
                      padding: 0,
                    }}
                  >
                    <span
                      style={{
                        position: "absolute",
                        top: 2,
                        left: a.ativo ? "auto" : 2,
                        right: a.ativo ? 2 : "auto",
                        width: 16,
                        height: 16,
                        borderRadius: "50%",
                        background: a.ativo ? "#fff" : "#888",
                      }}
                    />
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700 }}>{a.nome}</div>
                    <div
                      style={{
                        fontSize: 11.5,
                        color: "var(--mk-text-secondary)",
                        marginTop: 3,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        flexWrap: "wrap",
                      }}
                    >
                      <i className="ti ti-coin" style={{ fontSize: 12, color: "var(--mk-accent-2)" }} />
                      Gasto {a.tipo === "gasto_dia" ? "do dia" : "do mês"} ≥ {fmtBRL(a.limite_valor)}
                      {" · "}
                      {integ ? integ.account_name : "conta removida"}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--mk-text-muted)", marginTop: 4 }}>
                      Envia pra <span style={{ color: "var(--mk-text)" }}>{a.destino_numero}</span>
                      {a.ultimo_disparo_em ? ` · último disparo ${fmtData(a.ultimo_disparo_em)}` : " · nunca disparou"}
                      {a.ultimo_valor_observado != null ? ` · observado: ${fmtBRL(a.ultimo_valor_observado)}` : ""}
                    </div>
                  </div>
                  <i
                    className="ti ti-brand-meta"
                    style={{ fontSize: 16, color: "#1877F2", flex: "none", marginTop: 4 }}
                  />
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                  <button className="ghost-btn" onClick={() => abrirEditar(a)} disabled={pending} style={btnSm}>
                    <i className="ti ti-edit" /> Editar
                  </button>
                  <button className="ghost-btn" onClick={() => onTestar(a)} disabled={pending} style={btnSm}>
                    <i className="ti ti-test-pipe" /> Testar agora
                  </button>
                  <button
                    className="ghost-btn"
                    onClick={() => onDeletar(a)}
                    disabled={pending}
                    style={{ ...btnSm, color: "var(--mk-icon-pink)" }}
                  >
                    <i className="ti ti-trash" /> Deletar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Balao
        open={formAberto}
        onClose={fechar}
        titulo={editando ? "Editar alerta" : "Novo alerta"}
        icone="ti-bell-plus"
        largura={520}
      >
        <form action={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Field label="Nome do alerta">
            <input
              name="nome"
              required
              defaultValue={editando?.nome || ""}
              placeholder="Ex.: Gasto diário Studios Festas"
              style={inputStyle}
            />
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Tipo">
              <select name="tipo" defaultValue={editando?.tipo || "gasto_dia"} style={inputStyle}>
                <option value="gasto_dia">Gasto do dia</option>
                <option value="gasto_mes">Gasto do mês</option>
              </select>
            </Field>
            <Field label="Limite (R$)">
              <input
                name="limite_valor"
                required
                inputMode="decimal"
                defaultValue={editando ? editando.limite_valor.toFixed(2).replace(".", ",") : ""}
                placeholder="500,00"
                style={inputStyle}
              />
            </Field>
          </div>

          <Field label="Conta Meta Ads">
            <select name="integracao_id" required defaultValue={editando?.integracao_id || ""} style={inputStyle}>
              <option value="">Selecione…</option>
              {integracoes.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.account_name} ({i.account_id})
                </option>
              ))}
            </select>
          </Field>

          {clientes.length > 0 && (
            <Field label="Cliente (opcional, pra organizar)">
              <select name="cliente_id" defaultValue={editando?.cliente_id || ""} style={inputStyle}>
                <option value="">—</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </Field>
          )}

          <Field label="WhatsApp destino (DDI+DDD+número)">
            <input
              name="destino_numero"
              required
              defaultValue={editando?.destino_numero || ""}
              placeholder="5511999990000"
              style={inputStyle}
            />
          </Field>

          {canais.length > 0 && (
            <Field label="Canal de envio (deixe em branco para usar o padrão)">
              <select name="canal_id" defaultValue={editando?.canal_id || ""} style={inputStyle}>
                <option value="">Canal padrão</option>
                {canais.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                    {c.padrao ? " (padrão)" : ""}
                  </option>
                ))}
              </select>
            </Field>
          )}

          <Field label="Mensagem (use {{conta}}, {{gasto}}, {{limite}}, {{tipo}})">
            <textarea
              name="mensagem_template"
              rows={4}
              defaultValue={
                editando?.mensagem_template ||
                "Olá! O gasto {{tipo}} da conta {{conta}} bateu {{gasto}} (limite {{limite}}). Considere ajustar o orçamento."
              }
              style={{ ...inputStyle, fontFamily: "inherit", resize: "vertical" }}
            />
          </Field>

          {erro && (
            <div
              style={{
                background: "rgba(225,29,72,.10)",
                border: ".5px solid rgba(225,29,72,.4)",
                borderRadius: 8,
                padding: 10,
                fontSize: 12.5,
                color: "var(--mk-icon-pink)",
              }}
            >
              {erro}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
            <button type="button" className="ghost-btn" onClick={fechar} disabled={pending} style={btnMd}>
              Cancelar
            </button>
            <button type="submit" className="cta-btn" disabled={pending} style={btnMd}>
              {pending ? "Salvando…" : editando ? "Salvar" : "Criar alerta"}
            </button>
          </div>
        </form>
      </Balao>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--mk-bg-deep)",
  border: ".5px solid var(--mk-border)",
  borderRadius: 9,
  padding: "10px 12px",
  color: "var(--mk-text)",
  fontSize: 13,
  outline: "none",
};
const btnSm: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 8,
  fontSize: 11.5,
  fontWeight: 600,
  border: ".5px solid var(--mk-border)",
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
};
const btnMd: React.CSSProperties = {
  padding: "9px 16px",
  borderRadius: 9,
  fontSize: 13,
  fontWeight: 700,
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: "var(--mk-text-secondary)", letterSpacing: ".3px" }}>
        {label}
      </span>
      {children}
    </label>
  );
}
