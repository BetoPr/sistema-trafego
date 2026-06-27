"use client";

import { useActionState, useRef, useState, useEffect } from "react";
import { loginAction, type LoginState } from "./actions";
import { createClient } from "@/lib/supabase/client";

/**
 * Login page — mesmo visual do modal de cadastro da LP (lp.sonarcrm.com.br).
 * Dark premium: card centralizado, logo + wordmark, inputs com focus verde,
 * slide-to-verify, botão verde Sonar.
 */
export default function LoginPage() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(loginAction, undefined);
  const [verificado, setVerificado] = useState(false);

  // Workaround: se Supabase mandou OAuth code pra /login em vez de /auth/callback,
  // redireciona internamente pra route handler correto. Acontece quando Redirect
  // URLs whitelist do Supabase Auth nao tem /auth/callback configurado.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    if (code) {
      const next = url.searchParams.get("next") || "/dashboard";
      const perfil = url.searchParams.get("perfil") || "";
      const target = `/auth/callback?code=${encodeURIComponent(code)}&next=${encodeURIComponent(next)}${perfil ? `&perfil=${encodeURIComponent(perfil)}` : ""}`;
      window.location.replace(target);
    }
  }, []);

  return (
    <div style={pageStyle}>
      <div style={modalStyle}>
        {/* HEAD */}
        <div style={headStyle}>
          <div style={brandStyle}>
            <img src="/sonar-mark.png" alt="Sonar" style={brandLogoStyle} />
            <span style={brandWordmarkStyle}>
              sonar<span style={{ color: "#00E19A" }}>.</span>
            </span>
          </div>
          <h1 style={titleStyle}>Faça seu login</h1>
          <p style={subStyle}>Entre com suas credenciais para acessar o sistema.</p>
        </div>

        {/* FORM */}
        <form action={formAction} style={bodyStyle}>
          <BtnGoogle texto="Entrar com Google" />
          <div style={dividerStyle}>
            <span style={dividerLine} />
            <span style={dividerTxt}>ou com email</span>
            <span style={dividerLine} />
          </div>
          <div style={fieldStyle}>
            <label htmlFor="email" style={labelStyle}>Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="voce@empresa.com"
              style={inputStyle}
              onFocus={(e) => { e.currentTarget.style.borderColor = "#00E19A"; e.currentTarget.style.background = "rgba(0,225,154,0.04)"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "#1F2926"; e.currentTarget.style.background = "#11181A"; }}
            />
          </div>

          <div style={fieldStyle}>
            <label htmlFor="password" style={labelStyle}>Senha</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="Sua senha"
              style={inputStyle}
              onFocus={(e) => { e.currentTarget.style.borderColor = "#00E19A"; e.currentTarget.style.background = "rgba(0,225,154,0.04)"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "#1F2926"; e.currentTarget.style.background = "#11181A"; }}
            />
          </div>

          <SlideToVerify verificado={verificado} onVerificar={() => setVerificado(true)} />

          {state?.error && (
            <p style={errorStyle} role="alert">
              <i className="ti ti-alert-circle" style={{ marginRight: 6 }} />
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending || !verificado}
            style={{
              ...btnPrimaryStyle,
              opacity: pending || !verificado ? 0.55 : 1,
              cursor: pending || !verificado ? "not-allowed" : "pointer",
            }}
          >
            {pending ? "Entrando..." : "Entrar"}
            {!pending && <i className="ti ti-arrow-right" style={{ marginLeft: 6 }} />}
          </button>

          <div style={footerStyle}>
            Ainda não tem conta?{" "}
            <a href="/cadastro" style={linkStyle}>
              Criar grátis →
            </a>
          </div>

          <div style={legalStyle}>
            Ao entrar, você concorda com nossos{" "}
            <a href="/termos" style={legalLinkStyle}>Termos</a> e{" "}
            <a href="/privacidade" style={legalLinkStyle}>Política de Privacidade</a> (LGPD).
          </div>
        </form>
      </div>
    </div>
  );
}

/* ---------------------- Styles inline (idênticos ao modal LP) ---------------------- */

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#060A08",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
  position: "relative",
  overflow: "hidden",
};

const modalStyle: React.CSSProperties = {
  background: "#0D1311",
  border: "1px solid #2A3530",
  borderRadius: 22,
  maxWidth: 460,
  width: "100%",
  boxShadow: "0 24px 64px rgba(0,0,0,0.6), 0 0 80px rgba(0,225,154,0.10)",
  overflow: "hidden",
};

const headStyle: React.CSSProperties = {
  padding: "32px 32px 8px",
  textAlign: "center",
};

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
  lineHeight: 1,
};

const titleStyle: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 700,
  letterSpacing: "-0.6px",
  color: "#F0F5F2",
  marginBottom: 6,
};

const subStyle: React.CSSProperties = {
  fontSize: 14,
  color: "#A6B0AC",
  marginBottom: 24,
};

const bodyStyle: React.CSSProperties = {
  padding: "0 32px 32px",
  display: "flex",
  flexDirection: "column",
  gap: 14,
};

const fieldStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "#A6B0AC",
  letterSpacing: "0.3px",
};

const inputStyle: React.CSSProperties = {
  fontFamily: "inherit",
  fontSize: 14,
  padding: "12px 14px",
  background: "#11181A",
  border: "1.5px solid #1F2926",
  borderRadius: 10,
  color: "#F0F5F2",
  outline: "none",
  transition: "border-color 200ms ease, background 200ms ease",
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
  lineHeight: 1.4,
};

const btnPrimaryStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  fontWeight: 600,
  fontSize: 15,
  padding: "13px 24px",
  background: "#00E19A",
  color: "#060A08",
  border: "1px solid #00E19A",
  borderRadius: 10,
  minHeight: 48,
  marginTop: 4,
  boxShadow: "0 4px 16px rgba(0,225,154,0.18)",
  transition: "all 200ms ease",
  fontFamily: "inherit",
};

const footerStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#6B7A75",
  textAlign: "center",
  marginTop: 10,
};

const linkStyle: React.CSSProperties = {
  color: "#00E19A",
  fontWeight: 600,
  textDecoration: "none",
};

const legalStyle: React.CSSProperties = {
  fontSize: 11,
  color: "#44504C",
  textAlign: "center",
  marginTop: 14,
  lineHeight: 1.5,
};

const legalLinkStyle: React.CSSProperties = {
  color: "#6B7A75",
  textDecoration: "underline",
};

/* ---------------------- Botão Google OAuth ---------------------- */
function BtnGoogle({ texto, perfil }: { texto: string; perfil?: "empreendedor" | "agencia" | "autonomo" }) {
  const [carregando, setCarregando] = useState(false);
  async function entrar() {
    setCarregando(true);
    const sb = createClient();
    const next = "/dashboard";
    const params = new URLSearchParams();
    if (perfil) params.set("perfil", perfil);
    params.set("next", next);
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
  transition: "background 200ms ease, transform 200ms ease",
};

const dividerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  margin: "18px 0 6px",
};

const dividerLine: React.CSSProperties = {
  flex: 1,
  height: 1,
  background: "#1F2926",
};

const dividerTxt: React.CSSProperties = {
  color: "#6B7A75",
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: 1,
  fontWeight: 500,
};

/* ---------------------- Slide-to-verify ---------------------- */

function SlideToVerify({ verificado, onVerificar }: { verificado: boolean; onVerificar: () => void }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const arrastando = useRef(false);
  const [x, setX] = useState(0);
  const HANDLE = 44;

  function maxX() {
    return Math.max(0, (trackRef.current?.clientWidth ?? 0) - HANDLE - 6);
  }
  function onDown(e: React.PointerEvent) {
    if (verificado) return;
    arrastando.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onMove(e: React.PointerEvent) {
    if (!arrastando.current || verificado || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    let nx = e.clientX - rect.left - HANDLE / 2;
    nx = Math.max(0, Math.min(nx, maxX()));
    setX(nx);
  }
  function onUp() {
    if (!arrastando.current) return;
    arrastando.current = false;
    if (x >= maxX() - 4) {
      setX(maxX());
      onVerificar();
    } else {
      setX(0);
    }
  }

  const preenchido = verificado ? "100%" : `${x + HANDLE}px`;

  return (
    <div style={{ marginTop: 4 }}>
      <p style={{ fontSize: 11, color: "#6B7A75", marginBottom: 8, letterSpacing: 0.2 }}>
        {verificado ? "Verificação concluída." : "Arraste o slider para liberar o login:"}
      </p>
      <div
        ref={trackRef}
        style={{
          position: "relative",
          height: 44,
          borderRadius: 10,
          background: "#11181A",
          border: "1.5px solid #1F2926",
          overflow: "hidden",
          userSelect: "none",
          touchAction: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            bottom: 0,
            width: preenchido,
            background: "rgba(0,225,154,0.18)",
            transition: arrastando.current ? "none" : "width 0.2s ease",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12.5,
            fontWeight: 600,
            color: verificado ? "#00E19A" : "#6B7A75",
            pointerEvents: "none",
            letterSpacing: 0.3,
          }}
        >
          {verificado ? (
            <span><i className="ti ti-check" style={{ marginRight: 6 }} />Verificado</span>
          ) : (
            "Deslize para verificar →"
          )}
        </div>
        <div
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          style={{
            position: "absolute",
            top: 3,
            left: 3,
            width: HANDLE - 6,
            height: HANDLE - 6,
            borderRadius: 8,
            background: "#00E19A",
            color: "#060A08",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: verificado ? "default" : "grab",
            transform: `translateX(${verificado ? maxX() : x}px)`,
            transition: arrastando.current ? "none" : "transform 0.2s ease",
            boxShadow: "0 2px 8px rgba(0,0,0,0.3), 0 0 12px rgba(0,225,154,0.4)",
            touchAction: "none",
          }}
        >
          <i className={`ti ${verificado ? "ti-check" : "ti-chevron-right"}`} style={{ fontSize: 18 }} />
        </div>
      </div>
    </div>
  );
}
