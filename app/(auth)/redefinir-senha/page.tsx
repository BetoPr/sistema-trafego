"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ForcaSenha, validarSenhaForte } from "../_password-strength";

export default function RedefinirSenhaPage() {
  const [pass, setPass] = useState("");
  const [conf, setConf] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sessaoOk, setSessaoOk] = useState<boolean | null>(null);

  useEffect(() => {
    const sb = createClient();
    sb.auth.getSession().then(({ data: { session } }) => {
      setSessaoOk(!!session);
    });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    const check = validarSenhaForte(pass);
    if (!check.ok) {
      setErro("Senha não atende aos requisitos mínimos.");
      return;
    }
    if (pass !== conf) {
      setErro("As senhas não conferem.");
      return;
    }
    setEnviando(true);
    const sb = createClient();
    const { error } = await sb.auth.updateUser({ password: pass });
    setEnviando(false);
    if (error) {
      setErro(error.message);
      return;
    }
    setSucesso(true);
    setTimeout(() => (window.location.href = "/login?senha=ok"), 2000);
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
          <h1 style={titleStyle}>Nova senha</h1>
          <p style={subStyle}>Defina uma nova senha pra acessar sua conta.</p>
        </div>

        <div style={bodyStyle}>
          {sessaoOk === false && (
            <div style={errorStyle}>
              <i className="ti ti-alert-circle" style={{ marginRight: 6 }} />
              Link expirado ou inválido. <a href="/esqueci-senha" style={linkStyle}>Pedir novo link</a>
            </div>
          )}

          {sessaoOk && !sucesso && (
            <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={fieldStyle}>
                <label style={labelStyle}>Nova senha</label>
                <input
                  type="password"
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  style={inputStyle}
                  required
                />
              </div>

              <ForcaSenha senha={pass} />

              <div style={fieldStyle}>
                <label style={labelStyle}>Confirmar senha</label>
                <input
                  type="password"
                  value={conf}
                  onChange={(e) => setConf(e.target.value)}
                  placeholder="Digite a senha novamente"
                  style={{
                    ...inputStyle,
                    borderColor: conf && conf !== pass ? "#FF5C72" : "#1F2926",
                  }}
                  required
                />
                {conf && conf !== pass && (
                  <span style={{ fontSize: 11, color: "#FF5C72" }}>As senhas não conferem.</span>
                )}
              </div>

              {erro && (
                <p style={errorStyle}>
                  <i className="ti ti-alert-circle" style={{ marginRight: 6 }} /> {erro}
                </p>
              )}

              <button type="submit" disabled={enviando} style={{ ...btnPrimaryStyle, opacity: enviando ? 0.6 : 1 }}>
                {enviando ? "Salvando..." : "Salvar nova senha"}
              </button>
            </form>
          )}

          {sucesso && (
            <div style={{ textAlign: "center", padding: "14px 0" }}>
              <div style={checkStyle}>
                <i className="ti ti-check" />
              </div>
              <h3 style={{ fontSize: 17, color: "#F0F5F2", marginBottom: 6 }}>Senha alterada!</h3>
              <p style={{ fontSize: 13, color: "#A6B0AC" }}>Redirecionando pro login...</p>
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
  maxWidth: 400,
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
const linkStyle: React.CSSProperties = { color: "#00E19A", fontWeight: 600, textDecoration: "underline" };
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
