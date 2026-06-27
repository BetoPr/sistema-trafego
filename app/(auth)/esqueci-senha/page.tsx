"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!email.trim()) {
      setErro("Informe o email.");
      return;
    }
    setEnviando(true);
    const sb = createClient();
    const redirectTo = `${window.location.origin}/redefinir-senha`;
    const { error } = await sb.auth.resetPasswordForEmail(email.trim(), { redirectTo });
    setEnviando(false);
    if (error) {
      setErro(error.message);
      return;
    }
    setEnviado(true);
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
          <h1 style={titleStyle}>Recuperar senha</h1>
          <p style={subStyle}>Vamos te mandar um link por email pra criar uma nova senha.</p>
        </div>

        <div style={bodyStyle}>
          {!enviado ? (
            <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={fieldStyle}>
                <label style={labelStyle}>Email cadastrado</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@empresa.com"
                  style={inputStyle}
                  required
                />
              </div>
              {erro && (
                <p style={errorStyle}>
                  <i className="ti ti-alert-circle" style={{ marginRight: 6 }} /> {erro}
                </p>
              )}
              <button type="submit" disabled={enviando} style={{ ...btnPrimaryStyle, opacity: enviando ? 0.6 : 1 }}>
                {enviando ? "Enviando..." : "Enviar link"}
              </button>
              <div style={footerStyle}>
                Lembrou? <a href="/login" style={linkStyle}>Voltar pro login</a>
              </div>
            </form>
          ) : (
            <div style={{ textAlign: "center", padding: "14px 0" }}>
              <div style={checkStyle}>
                <i className="ti ti-mail-check" />
              </div>
              <h3 style={{ fontSize: 17, color: "#F0F5F2", marginBottom: 6 }}>Link enviado!</h3>
              <p style={{ fontSize: 13, color: "#A6B0AC", marginBottom: 16, lineHeight: 1.5 }}>
                Verifique sua caixa de entrada de <strong style={{ color: "#F0F5F2" }}>{email}</strong>.
                <br />
                O link expira em 60 minutos.
              </p>
              <a href="/login" style={{ ...btnPrimaryStyle, width: "100%", textDecoration: "none" }}>
                Voltar pro login
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

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
  borderRadius: 18,
  maxWidth: 380,
  width: "100%",
  boxShadow: "0 20px 48px rgba(0,0,0,0.6), 0 0 60px rgba(0,225,154,0.08)",
  overflow: "hidden",
};
const headStyle: React.CSSProperties = { padding: "22px 22px 6px", textAlign: "center" };
const brandStyle: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 0, marginBottom: 12 };
const brandLogoStyle: React.CSSProperties = {
  height: 40,
  width: "auto",
  marginRight: -6,
  filter: "drop-shadow(0 0 6px rgba(0,225,154,0.35))",
};
const brandWordmarkStyle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 700,
  letterSpacing: "-0.8px",
  color: "#F0F5F2",
};
const titleStyle: React.CSSProperties = { fontSize: 18, fontWeight: 700, color: "#F0F5F2", marginBottom: 4 };
const subStyle: React.CSSProperties = { fontSize: 12, color: "#A6B0AC", marginBottom: 16 };
const bodyStyle: React.CSSProperties = { padding: "0 22px 22px" };
const fieldStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4 };
const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: "#A6B0AC" };
const inputStyle: React.CSSProperties = {
  fontFamily: "inherit",
  fontSize: 13,
  padding: "9px 12px",
  background: "#11181A",
  border: "1.5px solid #1F2926",
  borderRadius: 9,
  color: "#F0F5F2",
  outline: "none",
};
const errorStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#FF5C72",
  background: "rgba(255,92,114,0.10)",
  border: "1px solid rgba(255,92,114,0.30)",
  padding: "8px 12px",
  borderRadius: 9,
  display: "flex",
  alignItems: "center",
};
const btnPrimaryStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  fontWeight: 600,
  fontSize: 13,
  padding: "10px 18px",
  background: "#00E19A",
  color: "#060A08",
  border: "1px solid #00E19A",
  borderRadius: 9,
  fontFamily: "inherit",
  cursor: "pointer",
};
const footerStyle: React.CSSProperties = { fontSize: 11, color: "#6B7A75", textAlign: "center", marginTop: 8 };
const linkStyle: React.CSSProperties = { color: "#00E19A", fontWeight: 600, textDecoration: "none" };
const checkStyle: React.CSSProperties = {
  width: 64,
  height: 64,
  margin: "0 auto 14px",
  borderRadius: "50%",
  background: "#00E19A",
  display: "grid",
  placeItems: "center",
  color: "#060A08",
  fontSize: 32,
  boxShadow: "0 0 60px rgba(0,225,154,0.30)",
};
