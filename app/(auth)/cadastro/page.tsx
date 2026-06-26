"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Cadastro CRM — mesmo formato do modal LP.
 * Passo 1: Empreendedor / Agência / Autônomo
 * Passo 2: nome / email / whatsapp / senha
 * Passo 3: sucesso + redirect /login
 */
type Perfil = "empreendedor" | "agencia" | "autonomo";

export default function CadastroPage() {
  const router = useRouter();
  const [passo, setPasso] = useState<1 | 2 | 3>(1);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [whats, setWhats] = useState("");
  const [pass, setPass] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const trialDias: Record<Perfil, number> = {
    empreendedor: 14,
    agencia: 21,
    autonomo: 14,
  };
  const perfilLabel: Record<Perfil, string> = {
    empreendedor: "Empreendedor",
    agencia: "Agência",
    autonomo: "Autônomo",
  };

  function maskWhats(v: string) {
    let s = v.replace(/\D/g, "").slice(0, 11);
    if (s.length > 6) return `(${s.slice(0, 2)}) ${s.slice(2, 7)}-${s.slice(7)}`;
    if (s.length > 2) return `(${s.slice(0, 2)}) ${s.slice(2)}`;
    if (s.length > 0) return `(${s}`;
    return "";
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!perfil) return;
    if (!nome.trim() || !email.trim() || !whats.trim() || pass.length < 8) {
      setErro("Preencha tudo. Senha mínima 8 caracteres.");
      return;
    }
    setEnviando(true);
    try {
      const r = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, email, whatsapp: whats, password: pass, perfil }),
      });
      const j = await r.json();
      if (!r.ok) {
        setErro(j?.error ?? "Erro ao criar conta.");
        setEnviando(false);
        return;
      }
      setPasso(3);
      setTimeout(() => router.push("/login?signup=ok"), 3000);
    } catch {
      setErro("Falha de conexão. Tente novamente.");
      setEnviando(false);
    }
  }

  return (
    <div style={pageStyle}>
      <div style={modalStyle}>
        <div style={headStyle}>
          <div style={brandStyle}>
            <img src="/sonar-mark.png" alt="Sonar" style={brandLogoStyle} />
            <span style={brandWordmarkStyle}>
              sonar<span style={{ color: "#00E19A" }}>.</span>
            </span>
          </div>
          <h1 style={titleStyle}>Crie sua conta grátis</h1>
          <p style={subStyle}>14 dias de trial · sem cartão · cancela quando quiser.</p>
        </div>

        <div style={stepsStyle}>
          <span style={{ ...dotStyle, ...(passo >= 1 ? dotActive : {}) }} />
          <span style={{ ...dotStyle, ...(passo >= 2 ? dotActive : {}) }} />
          <span style={{ ...dotStyle, ...(passo >= 3 ? dotActive : {}) }} />
        </div>

        <div style={bodyStyle}>
          {/* PASSO 1 */}
          {passo === 1 && (
            <>
              <p style={miniLeadStyle}>
                Pra liberar o painel certo pra você, conta:
                <br />
                <strong style={{ color: "#F0F5F2" }}>Você é?</strong>
              </p>
              <div style={perfilGrid}>
                {(["empreendedor", "agencia", "autonomo"] as Perfil[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPerfil(p)}
                    style={{
                      ...perfilOpt,
                      ...(perfil === p ? perfilOptSelected : {}),
                    }}
                  >
                    <div style={perfilIco}>
                      <i className={`ti ${p === "empreendedor" ? "ti-user" : p === "agencia" ? "ti-building" : "ti-briefcase"}`} />
                    </div>
                    <div style={{ flex: 1, textAlign: "left" }}>
                      <div style={perfilName}>{perfilLabel[p]}</div>
                      <div style={perfilDesc}>
                        {p === "empreendedor"
                          ? "Vende sozinho ou com 1-2 ajudantes"
                          : p === "agencia"
                          ? "Atende múltiplos clientes + time comercial"
                          : "Profissional liberal, consultor"}
                      </div>
                    </div>
                    <div style={perfilTrial}>{trialDias[p]} dias</div>
                  </button>
                ))}
              </div>
              <button
                type="button"
                disabled={!perfil}
                onClick={() => setPasso(2)}
                style={{ ...btnPrimaryStyle, opacity: !perfil ? 0.55 : 1, cursor: !perfil ? "not-allowed" : "pointer", marginTop: 18, width: "100%" }}
              >
                Continuar <i className="ti ti-arrow-right" />
              </button>
            </>
          )}

          {/* PASSO 2 */}
          {passo === 2 && (
            <>
              <BtnGoogle texto="Continuar com Google" perfil={perfil!} />
              <div style={dividerWrap}>
                <span style={dividerLineCad} />
                <span style={dividerTxtCad}>ou com email</span>
                <span style={dividerLineCad} />
              </div>
            <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={fieldStyle}>
                <label style={labelStyle}>Nome completo</label>
                <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" style={inputStyle} required />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Email</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="voce@email.com" style={inputStyle} required />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>WhatsApp</label>
                <input
                  value={whats}
                  onChange={(e) => setWhats(maskWhats(e.target.value))}
                  type="tel"
                  placeholder="(81) 99999-9999"
                  style={inputStyle}
                  required
                />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Senha</label>
                <input
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  type="password"
                  placeholder="Mínimo 8 caracteres"
                  style={inputStyle}
                  required
                  minLength={8}
                />
              </div>

              {erro && (
                <p style={errorStyle} role="alert">
                  <i className="ti ti-alert-circle" style={{ marginRight: 6 }} /> {erro}
                </p>
              )}

              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" onClick={() => setPasso(1)} style={{ ...btnSecondaryStyle, flex: 1 }}>
                  <i className="ti ti-arrow-left" /> Voltar
                </button>
                <button type="submit" disabled={enviando} style={{ ...btnPrimaryStyle, flex: 1, opacity: enviando ? 0.6 : 1 }}>
                  {enviando ? "Criando..." : "Criar conta"} {!enviando && <i className="ti ti-arrow-right" />}
                </button>
              </div>

              <div style={tosStyle}>
                Ao criar conta, você concorda com nossos{" "}
                <a href="/termos" style={tosLink}>Termos</a> e{" "}
                <a href="/privacidade" style={tosLink}>Política de Privacidade</a> (LGPD).
              </div>
            </form>
            </>
          )}

          {/* PASSO 3 */}
          {passo === 3 && (
            <div style={{ textAlign: "center", padding: "20px 0 8px" }}>
              <div style={checkStyle}>
                <i className="ti ti-check" />
              </div>
              <h3 style={{ fontSize: 22, marginBottom: 8, color: "#F0F5F2" }}>Conta criada com sucesso!</h3>
              <p style={{ fontSize: 14, color: "#A6B0AC", marginBottom: 24 }}>
                Perfil <strong style={{ color: "#00E19A" }}>{perfil && perfilLabel[perfil]}</strong>.
                <br />
                Em 3 segundos você vai pra tela de login.
              </p>
              <a href="/login" style={{ ...btnPrimaryStyle, width: "100%", textDecoration: "none" }}>
                Ir pro login agora <i className="ti ti-arrow-right" />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- BtnGoogle ----------
function BtnGoogle({ texto, perfil }: { texto: string; perfil: Perfil }) {
  const [carregando, setCarregando] = useState(false);
  async function entrar() {
    setCarregando(true);
    const sb = createClient();
    const params = new URLSearchParams({ perfil, next: "/dashboard" });
    const redirectTo = `${window.location.origin}/auth/callback?${params.toString()}`;
    const { error } = await sb.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo, queryParams: { prompt: "select_account" } },
    });
    if (error) {
      alert("Erro Google: " + error.message);
      setCarregando(false);
    }
  }
  return (
    <button type="button" onClick={entrar} disabled={carregando} style={btnGoogleStyle}>
      <svg viewBox="0 0 18 18" width="18" height="18" aria-hidden="true">
        <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
        <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
        <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
        <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
      </svg>
      {carregando ? "Conectando…" : texto}
    </button>
  );
}

const btnGoogleStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  width: "100%",
  padding: "12px 16px",
  background: "#F0F5F2",
  color: "#1F1F1F",
  border: "1px solid #2A3530",
  borderRadius: 10,
  fontWeight: 600,
  fontSize: 14,
  cursor: "pointer",
  fontFamily: "inherit",
};
const dividerWrap: React.CSSProperties = { display: "flex", alignItems: "center", gap: 12, margin: "16px 0 8px" };
const dividerLineCad: React.CSSProperties = { flex: 1, height: 1, background: "#1F2926" };
const dividerTxtCad: React.CSSProperties = { color: "#6B7A75", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, fontWeight: 500 };

// ---------- Styles ----------
const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#060A08",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
};
const modalStyle: React.CSSProperties = {
  background: "#0D1311",
  border: "1px solid #2A3530",
  borderRadius: 22,
  maxWidth: 540,
  width: "100%",
  boxShadow: "0 24px 64px rgba(0,0,0,0.6), 0 0 80px rgba(0,225,154,0.10)",
  overflow: "hidden",
};
const headStyle: React.CSSProperties = { padding: "32px 32px 0", textAlign: "center" };
const brandStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 0,
  marginBottom: 18,
};
const brandLogoStyle: React.CSSProperties = {
  height: 56,
  width: "auto",
  marginRight: -8,
  filter: "drop-shadow(0 0 8px rgba(0,225,154,0.35))",
};
const brandWordmarkStyle: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 700,
  letterSpacing: "-1px",
  color: "#F0F5F2",
};
const titleStyle: React.CSSProperties = { fontSize: 24, fontWeight: 700, color: "#F0F5F2", marginBottom: 6 };
const subStyle: React.CSSProperties = { fontSize: 14, color: "#A6B0AC", marginBottom: 20 };
const stepsStyle: React.CSSProperties = { display: "flex", gap: 6, justifyContent: "center", padding: "0 32px", marginBottom: 24 };
const dotStyle: React.CSSProperties = { width: 32, height: 4, borderRadius: 2, background: "#11181A" };
const dotActive: React.CSSProperties = { background: "#00E19A" };
const bodyStyle: React.CSSProperties = { padding: "0 32px 32px" };
const miniLeadStyle: React.CSSProperties = { fontSize: 13, color: "#A6B0AC", textAlign: "center", marginBottom: 18 };
const perfilGrid: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr", gap: 10 };
const perfilOpt: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  padding: "16px 18px",
  background: "#11181A",
  border: "1.5px solid #1F2926",
  borderRadius: 14,
  cursor: "pointer",
  width: "100%",
  textAlign: "left",
  fontFamily: "inherit",
  color: "inherit",
};
const perfilOptSelected: React.CSSProperties = {
  borderColor: "#00E19A",
  background: "rgba(0,225,154,0.10)",
};
const perfilIco: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 11,
  background: "rgba(0,225,154,0.10)",
  border: "1px solid rgba(0,225,154,0.25)",
  color: "#00E19A",
  display: "grid",
  placeItems: "center",
  fontSize: 22,
  flexShrink: 0,
};
const perfilName: React.CSSProperties = { fontSize: 15, fontWeight: 600, color: "#F0F5F2" };
const perfilDesc: React.CSSProperties = { fontSize: 12, color: "#6B7A75", marginTop: 2 };
const perfilTrial: React.CSSProperties = {
  background: "#00E19A",
  color: "#060A08",
  padding: "3px 10px",
  borderRadius: 12,
  fontSize: 10,
  fontWeight: 700,
};
const fieldStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6 };
const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "#A6B0AC" };
const inputStyle: React.CSSProperties = {
  fontFamily: "inherit",
  fontSize: 14,
  padding: "12px 14px",
  background: "#11181A",
  border: "1.5px solid #1F2926",
  borderRadius: 10,
  color: "#F0F5F2",
  outline: "none",
};
const errorStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#FF5C72",
  background: "rgba(255,92,114,0.10)",
  border: "1px solid rgba(255,92,114,0.30)",
  padding: "10px 14px",
  borderRadius: 10,
  display: "flex",
  alignItems: "center",
};
const btnPrimaryStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  fontWeight: 600,
  fontSize: 14,
  padding: "13px 24px",
  background: "#00E19A",
  color: "#060A08",
  border: "1px solid #00E19A",
  borderRadius: 10,
  fontFamily: "inherit",
};
const btnSecondaryStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  fontWeight: 600,
  fontSize: 14,
  padding: "13px 24px",
  background: "transparent",
  color: "#A6B0AC",
  border: "1.5px solid #2A3530",
  borderRadius: 10,
  cursor: "pointer",
  fontFamily: "inherit",
};
const tosStyle: React.CSSProperties = { fontSize: 11, color: "#6B7A75", textAlign: "center", lineHeight: 1.5, marginTop: 4 };
const tosLink: React.CSSProperties = { color: "#00E19A", textDecoration: "underline" };
const checkStyle: React.CSSProperties = {
  width: 84,
  height: 84,
  margin: "0 auto 18px",
  borderRadius: "50%",
  background: "#00E19A",
  display: "grid",
  placeItems: "center",
  color: "#060A08",
  fontSize: 44,
  boxShadow: "0 0 96px rgba(0,225,154,0.30)",
};
