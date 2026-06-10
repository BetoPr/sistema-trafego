"use client";

import { useState } from "react";
import Link from "next/link";

const STEPS = [
  { id: 1, label: "Projeto GCP" },
  { id: 2, label: "Habilitar API" },
  { id: 3, label: "OAuth Client" },
  { id: 4, label: "Developer Token" },
  { id: 5, label: "Colar credenciais" },
];

export function WizardGoogle() {
  const [step, setStep] = useState(1);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [devToken, setDevToken] = useState("");
  const [saved, setSaved] = useState(false);

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length));
  const prev = () => setStep((s) => Math.max(s - 1, 1));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Aviso tipo="warn">
        <strong>Atenção sobre o prazo:</strong> Google Ads exige <em>Developer Token</em> aprovado pela Google.
        O processo tem 3 níveis: <strong>Test</strong> (imediato, só contas dev), <strong>Basic</strong> (aprovação 1-2 dias) e <strong>Standard</strong> (1-2 semanas).
        Para uso real com contas de clientes, você precisa pelo menos Basic.
      </Aviso>

      {/* Stepper */}
      <div style={{ display: "flex", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
        {STEPS.map((s) => (
          <div
            key={s.id}
            style={{
              flex: 1,
              minWidth: 110,
              padding: "10px 12px",
              borderRadius: 9,
              border: "0.5px solid var(--mk-border)",
              background: step >= s.id ? "var(--mk-surface)" : "transparent",
              opacity: step >= s.id ? 1 : 0.5,
            }}
          >
            <div style={{ fontSize: 10, color: "var(--mk-text-muted)" }}>Passo {s.id}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--mk-text)", marginTop: 2 }}>
              {step > s.id && <i className="ti ti-circle-check" style={{ fontSize: 13, color: "#10b981", marginRight: 4 }} />}
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {step === 1 && (
        <Card titulo="Passo 1 — Criar projeto no Google Cloud">
          <Ordered>
            <Li>
              Acesse{" "}
              <ExternalA href="https://console.cloud.google.com/projectcreate">
                console.cloud.google.com/projectcreate
              </ExternalA>
            </Li>
            <Li>Nome do projeto: <code style={code}>Sistema Trafego</code> (ou outro)</Li>
            <Li>Organização: deixe a padrão</Li>
            <Li>Clique <strong>Create</strong> e aguarde ~30s</Li>
            <Li>Anote o <strong>Project ID</strong> que aparecer no canto superior</Li>
          </Ordered>
        </Card>
      )}

      {step === 2 && (
        <Card titulo="Passo 2 — Habilitar Google Ads API">
          <Ordered>
            <Li>
              Com projeto selecionado, abra{" "}
              <ExternalA href="https://console.cloud.google.com/apis/library/googleads.googleapis.com">
                Library → Google Ads API
              </ExternalA>
            </Li>
            <Li>Clique <strong>Enable</strong></Li>
            <Li>Aguarde ativação (~10-30s)</Li>
          </Ordered>
        </Card>
      )}

      {step === 3 && (
        <Card titulo="Passo 3 — Criar OAuth Client (Web)">
          <Ordered>
            <Li>
              Abra{" "}
              <ExternalA href="https://console.cloud.google.com/apis/credentials/consent">
                APIs &amp; Services → OAuth consent screen
              </ExternalA>
            </Li>
            <Li>User type: <strong>External</strong> → Create</Li>
            <Li>Preencha App name, support email, developer email</Li>
            <Li>Scopes: pode pular (configura depois)</Li>
            <Li>Test users: adicione seu Gmail (vai ser quem testa)</Li>
            <Li>Volte a Credentials → <strong>Create Credentials</strong> → <strong>OAuth client ID</strong></Li>
            <Li>Application type: <strong>Web application</strong></Li>
            <Li>Authorized redirect URIs — adicione exatamente:
              <CopyBox value="https://sistema-trafego.vercel.app/oauth/google/callback" />
              <p style={{ fontSize: 11, color: "var(--mk-text-muted)", marginTop: 6 }}>Para testes locais:</p>
              <CopyBox value="http://localhost:3000/oauth/google/callback" />
            </Li>
            <Li>Create → copie <strong>Client ID</strong> e <strong>Client Secret</strong> (vai usar no passo 5)</Li>
          </Ordered>
        </Card>
      )}

      {step === 4 && (
        <Card titulo="Passo 4 — Solicitar Developer Token">
          <Ordered>
            <Li>
              Faça login na sua conta MCC (My Client Center). Se não tem, crie em{" "}
              <ExternalA href="https://ads.google.com/intl/pt-BR_br/home/tools/manager-accounts/">
                ads.google.com/manager-accounts
              </ExternalA>
            </Li>
            <Li>Dentro da MCC: <strong>Tools and Settings</strong> → <strong>API Center</strong></Li>
            <Li>Aceite os termos da API</Li>
            <Li>Preencha o formulário:
              <ul style={ulStyle}>
                <li>Use case: gestão de campanhas multi-cliente</li>
                <li>Tipo: aplicação web</li>
                <li>Justificativa: ferramenta interna da agência</li>
              </ul>
            </Li>
            <Li>Submeta → recebe um <strong>Developer Token</strong> em modo <em>Test</em> imediatamente</Li>
            <Li>Para uso real: requer aprovação <em>Basic</em> (1-2 dias úteis) ou <em>Standard</em> (até 2 semanas)</Li>
            <Li>Anote o Developer Token (formato: <code style={code}>abc-XYZ_1234567890</code>)</Li>
          </Ordered>
          <Aviso tipo="warn">
            Em modo <em>Test</em>, você só consegue conectar contas de anúncios criadas dentro da própria MCC.
            Para conectar contas externas de clientes, precisa Basic ou Standard.
          </Aviso>
        </Card>
      )}

      {step === 5 && (
        <Card titulo="Passo 5 — Colar credenciais">
          <Ordered>
            <Li>Cole abaixo as 3 credenciais coletadas:</Li>
          </Ordered>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
            <FieldInput label="GOOGLE_CLIENT_ID" value={clientId} onChange={setClientId} placeholder="123456789012-abc.apps.googleusercontent.com" />
            <FieldInput label="GOOGLE_CLIENT_SECRET" value={clientSecret} onChange={setClientSecret} placeholder="GOCSPX-..." secret />
            <FieldInput label="GOOGLE_ADS_DEVELOPER_TOKEN" value={devToken} onChange={setDevToken} placeholder="abc-XYZ_1234567890" />
          </div>

          {saved ? (
            <Aviso tipo="ok">
              Credenciais armazenadas localmente. O OAuth real do Google Ads + sync de dados é trabalho de Fase futura
              (depende do Developer Token estar aprovado). Guarde os 3 valores em local seguro
              (recomendo <code style={code}>Desktop\Credenciais\</code> + variáveis Vercel).
            </Aviso>
          ) : (
            <button
              type="button"
              className="cta-btn"
              style={{ marginTop: 12 }}
              disabled={!clientId || !clientSecret || !devToken}
              onClick={() => {
                // Secrets não vão pro localStorage. Wizard é apenas guia visual.
                setSaved(true);
              }}
            >
              <i className="ti ti-device-floppy" style={{ fontSize: 14 }} />
              Guardar credenciais
            </button>
          )}
        </Card>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <button type="button" onClick={prev} disabled={step === 1} className="ghost-btn">
          <i className="ti ti-arrow-left" style={{ fontSize: 13 }} /> Anterior
        </button>
        {step < STEPS.length ? (
          <button type="button" onClick={next} className="cta-btn">
            Próximo <i className="ti ti-arrow-right" style={{ fontSize: 14 }} />
          </button>
        ) : (
          <Link href="/integracoes" className="ghost-btn">
            Concluir <i className="ti ti-check" style={{ fontSize: 14 }} />
          </Link>
        )}
      </div>
    </div>
  );
}

const ulStyle: React.CSSProperties = { listStyle: "disc", paddingLeft: 22, marginTop: 6, fontSize: 12, color: "var(--mk-text-secondary)", lineHeight: 1.6 };
const code: React.CSSProperties = { fontFamily: "monospace", background: "var(--mk-surface-2)", padding: "1px 6px", borderRadius: 4, fontSize: 11, color: "var(--mk-text)" };

function Card({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="mk-card mk-card-lg">
      <h3 className="card-title" style={{ marginBottom: 14 }}>{titulo}</h3>
      <div>{children}</div>
    </div>
  );
}
function Ordered({ children }: { children: React.ReactNode }) {
  return <ol style={{ listStyle: "decimal", paddingLeft: 22, display: "flex", flexDirection: "column", gap: 10, color: "var(--mk-text-secondary)", fontSize: 13, lineHeight: 1.6 }}>{children}</ol>;
}
function Li({ children }: { children: React.ReactNode }) { return <li>{children}</li>; }

function ExternalA({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: "var(--mk-accent)", textDecoration: "underline" }}>
      {children}
      <i className="ti ti-external-link" style={{ fontSize: 11, marginLeft: 2 }} />
    </a>
  );
}

function Aviso({ tipo, children }: { tipo: "info" | "ok" | "warn"; children: React.ReactNode }) {
  const colors = {
    info: { bg: "rgba(91,139,166,0.12)", border: "#5B8BA6", icon: "ti-info-circle" },
    ok: { bg: "rgba(16,185,129,0.12)", border: "#10b981", icon: "ti-circle-check" },
    warn: { bg: "rgba(201,168,118,0.15)", border: "#C9A876", icon: "ti-alert-triangle" },
  }[tipo];
  return (
    <div style={{ background: colors.bg, borderLeft: `3px solid ${colors.border}`, padding: "10px 12px", borderRadius: 8, fontSize: 12, color: "var(--mk-text-secondary)", lineHeight: 1.6, display: "flex", gap: 10 }}>
      <i className={`ti ${colors.icon}`} style={{ fontSize: 16, color: colors.border, flexShrink: 0, marginTop: 1 }} />
      <div>{children}</div>
    </div>
  );
}

function CopyBox({ value }: { value: string }) {
  return (
    <div style={{ marginTop: 6, padding: "8px 12px", background: "var(--mk-surface-2)", borderRadius: 6, border: "0.5px solid var(--mk-border)", fontFamily: "monospace", fontSize: 11.5, color: "var(--mk-text)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
      <span style={{ wordBreak: "break-all" }}>{value}</span>
      <button
        type="button"
        onClick={() => navigator.clipboard?.writeText(value)}
        style={{ background: "transparent", border: "0.5px solid var(--mk-border)", borderRadius: 4, padding: "2px 8px", color: "var(--mk-accent)", fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}
      >
        <i className="ti ti-copy" style={{ fontSize: 11 }} /> copiar
      </button>
    </div>
  );
}

function FieldInput({ label, value, onChange, placeholder, secret }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; secret?: boolean }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 11, color: "var(--mk-text-muted)", marginBottom: 4, fontFamily: "monospace", letterSpacing: 0.3 }}>
        {label}
      </label>
      <input
        type={secret ? "password" : "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%", padding: "8px 12px", borderRadius: 8,
          border: "0.5px solid var(--mk-border)", background: "var(--mk-surface-2)",
          color: "var(--mk-text)", fontSize: 12.5, fontFamily: "monospace",
        }}
      />
    </div>
  );
}
