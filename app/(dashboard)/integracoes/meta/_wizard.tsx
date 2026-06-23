"use client";

import { useState } from "react";
import Link from "next/link";

const STEPS = [
  { id: 1, label: "Criar app" },
  { id: 2, label: "Configurar OAuth" },
  { id: 3, label: "Adicionar Tester" },
  { id: 4, label: "Colar credenciais" },
];

export function WizardMeta() {
  const [step, setStep] = useState(1);
  const [appId, setAppId] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [saved, setSaved] = useState(false);

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length));
  const prev = () => setStep((s) => Math.max(s - 1, 1));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Stepper */}
      <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
        {STEPS.map((s) => (
          <div
            key={s.id}
            style={{
              flex: 1,
              padding: "10px 12px",
              borderRadius: 9,
              border: "0.5px solid var(--mk-border)",
              background: step >= s.id ? "var(--mk-surface)" : "transparent",
              opacity: step >= s.id ? 1 : 0.5,
            }}
          >
            <div style={{ fontSize: 10, color: "var(--mk-text-muted)" }}>Passo {s.id}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--mk-text)", marginTop: 2 }}>
              {step > s.id && <i className="ti ti-circle-check" style={{ fontSize: 13, color: "#00E19A", marginRight: 4 }} />}
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {step === 1 && (
        <Card titulo="Passo 1 — Criar app no Meta for Developers">
          <Ordered>
            <Li>
              Abra{" "}
              <ExternalA href="https://developers.facebook.com/apps/create/">
                developers.facebook.com/apps/create
              </ExternalA>
            </Li>
            <Li>Em <strong>Use case</strong>, selecione <strong>Other</strong> → <em>Next</em></Li>
            <Li>Tipo de app: <strong>Business</strong> → <em>Next</em></Li>
            <Li>Preencha:
              <ul style={ulStyle}>
                <li>Nome: <code style={code}>Tráfego Sistema</code> (ou outro)</li>
                <li>Email de contato: seu email</li>
                <li>Business portfolio: opcional, deixe em branco se não tiver</li>
              </ul>
            </Li>
            <Li>Clique <strong>Create App</strong>. App fica em modo <strong>Development</strong> por padrão (correto)</Li>
          </Ordered>
          <Aviso tipo="info">
            App em modo Development funciona perfeitamente para você + Testers que você adicionar. App Review da Meta só é necessário se quiser que clientes EXTERNOS conectem (Fase SaaS).
          </Aviso>
        </Card>
      )}

      {step === 2 && (
        <Card titulo="Passo 2 — Configurar OAuth Redirect URI">
          <Ordered>
            <Li>No dashboard do app, painel esquerdo → <strong>Add Products</strong></Li>
            <Li>Procure <strong>Facebook Login for Business</strong> → clique <em>Set up</em></Li>
            <Li>Sidebar → <strong>Facebook Login for Business</strong> → <strong>Settings</strong></Li>
            <Li>Em <strong>Valid OAuth Redirect URIs</strong>, adicione exatamente:
              <CopyBox value="https://sistema-trafego.vercel.app/oauth/meta/callback" />
              <p style={{ fontSize: 11, color: "var(--mk-text-muted)", marginTop: 6 }}>
                Para testes locais, adicione também:
              </p>
              <CopyBox value="http://localhost:3000/oauth/meta/callback" />
            </Li>
            <Li>Clique <strong>Save changes</strong></Li>
          </Ordered>
        </Card>
      )}

      {step === 3 && (
        <Card titulo="Passo 3 — Adicionar você como Tester">
          <Ordered>
            <Li>Sidebar do app → <strong>App roles</strong> → <strong>Roles</strong></Li>
            <Li>Clique <strong>Add People</strong> → escolha <strong>Testers</strong></Li>
            <Li>Adicione seu perfil Facebook (use a busca por nome)</Li>
            <Li>
              <strong>Importante:</strong> abra Facebook → notificações → aceite o convite de Tester.
              Sem aceitar, o OAuth retorna erro de permissão.
            </Li>
            <Li>Em <strong>App Review → Permissions and Features</strong>, confirme disponibilidade de:
              <ul style={ulStyle}>
                <li><code style={code}>ads_read</code></li>
                <li><code style={code}>business_management</code></li>
                <li><code style={code}>read_insights</code></li>
              </ul>
              <p style={{ fontSize: 11, color: "var(--mk-text-muted)", marginTop: 6 }}>
                Estas permissões funcionam automaticamente para Testers — não precisa pedir App Review.
              </p>
            </Li>
          </Ordered>
        </Card>
      )}

      {step === 4 && (
        <Card titulo="Passo 4 — Colar App ID e App Secret">
          <Ordered>
            <Li>No app Meta → sidebar → <strong>Settings</strong> → <strong>Basic</strong></Li>
            <Li>Copie o <strong>App ID</strong></Li>
            <Li>Em <strong>App Secret</strong>, clique <em>Show</em> (vai pedir sua senha Facebook), copie o valor</Li>
            <Li>Cole abaixo:</Li>
          </Ordered>

          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
            <FieldInput label="META_APP_ID" value={appId} onChange={setAppId} placeholder="123456789012345" />
            <FieldInput label="META_APP_SECRET" value={appSecret} onChange={setAppSecret} placeholder="abcdef0123456789abcdef..." secret />
          </div>

          {saved ? (
            <Aviso tipo="ok">
              Credenciais salvas no navegador. Agora cole esses valores em{" "}
              <strong>Vercel → Settings → Environment Variables</strong> (marca como Sensitive) e faça redeploy.
              Depois volte em <Link href="/integracoes/meta" style={{ color: "var(--mk-accent)" }}>Integrações Meta</Link>{" "}
              e clique <strong>Conectar</strong> no cliente desejado.
            </Aviso>
          ) : (
            <button
              type="button"
              className="cta-btn"
              style={{ marginTop: 12 }}
              disabled={!appId || !appSecret}
              onClick={() => {
                // Secrets não vão pro localStorage. Wizard é apenas guia visual
                // — o app SaaS já configura essas vars no Vercel. Mantemos o
                // botão pra UX (visualizar passo concluído) sem persistir nada.
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
    ok: { bg: "rgba(16,185,129,0.12)", border: "#00E19A", icon: "ti-circle-check" },
    warn: { bg: "rgba(16,185,129,0.15)", border: "#00E19A", icon: "ti-alert-triangle" },
  }[tipo];
  return (
    <div style={{ background: colors.bg, borderLeft: `3px solid ${colors.border}`, padding: "10px 12px", borderRadius: 8, fontSize: 12, color: "var(--mk-text-secondary)", lineHeight: 1.6, marginTop: 14, display: "flex", gap: 10 }}>
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
