"use client";

import { useState } from "react";
import { Balao } from "@/components/ui/Balao";

type Alerta = {
  id: string;
  tipo: "saldo" | "roas" | "cpl" | "fadiga";
  titulo: string;
  condicao: string;
  ativo: boolean;
  plataforma: "meta" | "google";
  destinatario?: string;
  mensagem?: string;
  disparadoEm?: string;
  detalheSaldo?: { atual: number; minimo: number };
};

const SEED: Alerta[] = [];

const TIPOS = [
  { id: "saldo", nome: "Saldo baixo", icone: "ti-coin", desc: "Avisa quando crédito da conta cai abaixo de X" },
  { id: "roas", nome: "Queda de ROAS", icone: "ti-trending-down", desc: "Avisa quando ROAS fica abaixo de X" },
  { id: "cpl", nome: "CPL alto", icone: "ti-currency-real-down", desc: "Avisa quando CPL excede limite" },
  { id: "fadiga", nome: "Fadiga de criativo", icone: "ti-flame", desc: "Avisa quando frequência > X e CTR despenca" },
];

function fmtBRL(n: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
}

export default function AlertasShell() {
  const [alertas, setAlertas] = useState<Alerta[]>(SEED);
  const [novoAberto, setNovoAberto] = useState(false);
  const [tipoSelecionado, setTipoSelecionado] = useState<string | null>(null);

  const ativos = alertas.filter((a) => a.ativo).length;
  const disparadosHoje = alertas.filter((a) => a.disparadoEm).length;
  const disparado = alertas.find((a) => a.disparadoEm);

  function toggleAlerta(id: string) {
    setAlertas((arr) => arr.map((a) => (a.id === id ? { ...a, ativo: !a.ativo } : a)));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div
        className="alertas-head"
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
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--mk-text)" }}>Alertas</div>
          <div style={{ fontSize: 11.5, color: "var(--mk-accent-2)", fontWeight: 600 }}>
            {ativos} {ativos === 1 ? "ativo" : "ativos"}
            {disparadosHoje > 0 ? ` · ${disparadosHoje} disparado${disparadosHoje > 1 ? "s" : ""} hoje` : ""}
          </div>
        </div>
        <button
          className="cta-btn"
          onClick={() => setNovoAberto(true)}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 9 }}
        >
          <i className="ti ti-plus" style={{ fontSize: 14 }} />
          <span style={{ fontSize: 12.5, fontWeight: 700 }}>Novo</span>
        </button>
      </div>

      {disparado && disparado.detalheSaldo && (
        <div
          style={{
            background: "linear-gradient(135deg,rgba(0,225,154,.14),rgba(0,225,154,.04))",
            border: ".5px solid rgba(0,225,154,.4)",
            borderRadius: 14,
            padding: 14,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: "50%",
                background: "var(--mk-accent-2)",
                animation: "pulse 1.6s infinite",
              }}
            />
            <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".6px", color: "var(--mk-accent-2)" }}>
              ALERTA DE SALDO · DISPARADO
            </span>
            <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--mk-text-secondary)" }}>
              {disparado.disparadoEm}
            </span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{disparado.titulo}</div>
          <div style={{ fontSize: 12, color: "var(--mk-text-secondary)", marginTop: 3 }}>
            Saldo atual:{" "}
            <span style={{ color: "var(--mk-accent-2)", fontWeight: 700 }}>
              {fmtBRL(disparado.detalheSaldo.atual)}
            </span>
            {" · mínimo "}
            {fmtBRL(disparado.detalheSaldo.minimo)}
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 11 }}>
            <button
              className="cta-btn"
              style={{ flex: 1, padding: "9px 0", borderRadius: 9, fontSize: 12, fontWeight: 700 }}
            >
              Reabastecer
            </button>
            <button
              className="ghost-btn"
              style={{
                flex: 1,
                padding: "9px 0",
                borderRadius: 9,
                border: ".5px solid var(--mk-border)",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              Detalhes
            </button>
          </div>
        </div>
      )}

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
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--mk-text)" }}>Sem alertas configurados</div>
          <div style={{ fontSize: 12.5, marginTop: 6, lineHeight: 1.5, maxWidth: 340, margin: "6px auto 0" }}>
            Crie regras como “avise quando saldo &lt; R$ 100” ou “avise quando ROAS &lt; 2,0” e o Sonar dispara no
            WhatsApp de quem você escolher.
          </div>
          <button
            className="cta-btn"
            onClick={() => setNovoAberto(true)}
            style={{ marginTop: 16, padding: "10px 18px", borderRadius: 10, fontSize: 13, fontWeight: 700 }}
          >
            <i className="ti ti-plus" style={{ marginRight: 6 }} /> Criar primeiro alerta
          </button>
        </div>
      ) : (
        <>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: ".6px",
              color: "var(--mk-text-muted)",
              padding: "4px 4px 0",
            }}
          >
            CONFIGURADOS ({alertas.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {alertas.map((a) => (
              <div
                key={a.id}
                style={{
                  background: "var(--mk-surface)",
                  border: ".5px solid var(--mk-border)",
                  borderRadius: 12,
                  padding: 12,
                  opacity: a.ativo ? 1 : 0.6,
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <button
                    onClick={() => toggleAlerta(a.id)}
                    aria-label={a.ativo ? "Desativar" : "Ativar"}
                    style={{
                      width: 34,
                      height: 20,
                      borderRadius: 11,
                      background: a.ativo ? "var(--mk-accent-2)" : "rgba(255,255,255,.15)",
                      position: "relative",
                      flex: "none",
                      marginTop: 3,
                      border: 0,
                      cursor: "pointer",
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
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--mk-text)" }}>{a.titulo}</div>
                    <div
                      style={{
                        fontSize: 11.5,
                        color: "var(--mk-text-secondary)",
                        marginTop: 3,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <i className="ti ti-coin" style={{ fontSize: 12, color: "var(--mk-accent-2)" }} />
                      {a.condicao}
                      {a.destinatario ? ` · ${a.destinatario}` : ""}
                    </div>
                  </div>
                  <i
                    className={a.plataforma === "meta" ? "ti ti-brand-meta" : "ti ti-brand-google"}
                    style={{ fontSize: 16, color: a.plataforma === "meta" ? "#1877F2" : "#EA4335", flex: "none" }}
                  />
                </div>
                {a.mensagem && (
                  <div
                    style={{
                      marginTop: 10,
                      padding: "8px 11px",
                      background: "var(--mk-bg-deep)",
                      borderRadius: 8,
                      fontSize: 11.5,
                      color: "var(--mk-text-secondary)",
                      lineHeight: 1.4,
                      borderLeft: "2px solid var(--mk-accent-2)",
                    }}
                  >
                    “{a.mensagem}”
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <Balao
        open={novoAberto}
        onClose={() => {
          setNovoAberto(false);
          setTipoSelecionado(null);
        }}
        titulo="Novo alerta"
        icone="ti-bell-plus"
        largura={460}
      >
        {!tipoSelecionado ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 13, color: "var(--mk-text-secondary)", marginBottom: 6 }}>
              Escolha o tipo de regra que vai disparar o aviso.
            </div>
            {TIPOS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTipoSelecionado(t.id)}
                style={{
                  background: "var(--mk-surface)",
                  border: ".5px solid var(--mk-border)",
                  borderRadius: 11,
                  padding: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 11,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 9,
                    background: "rgba(0,225,154,.12)",
                    border: ".5px solid rgba(0,225,154,.32)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flex: "none",
                  }}
                >
                  <i className={`ti ${t.icone}`} style={{ fontSize: 18, color: "var(--mk-accent-2)" }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--mk-text)" }}>{t.nome}</div>
                  <div style={{ fontSize: 11.5, color: "var(--mk-text-secondary)", marginTop: 2 }}>{t.desc}</div>
                </div>
                <i className="ti ti-chevron-right" style={{ fontSize: 18, color: "var(--mk-text-muted)" }} />
              </button>
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div
              style={{
                padding: 12,
                background: "rgba(0,225,154,.08)",
                border: ".5px solid rgba(0,225,154,.28)",
                borderRadius: 10,
                fontSize: 12.5,
                color: "var(--mk-text)",
                lineHeight: 1.5,
              }}
            >
              <i className="ti ti-tools" style={{ marginRight: 6, color: "var(--mk-accent-2)" }} />
              Backend dos alertas (cron Meta Ads + sender WhatsApp) entra na próxima onda. Mantive a UI completa pra
              você visualizar como vai ficar. Quando ativar, todos os tipos acima já vão funcionar.
            </div>
            <button
              className="ghost-btn"
              onClick={() => setTipoSelecionado(null)}
              style={{ alignSelf: "flex-start", padding: "8px 14px", borderRadius: 9, fontSize: 12.5, fontWeight: 600 }}
            >
              <i className="ti ti-arrow-left" style={{ marginRight: 6 }} /> Voltar
            </button>
          </div>
        )}
      </Balao>
    </div>
  );
}
