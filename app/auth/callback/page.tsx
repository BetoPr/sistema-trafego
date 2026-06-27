"use client";

/**
 * /auth/callback (CLIENT)
 *
 * Recebe code do OAuth Google (Supabase) e faz o exchange NO BROWSER —
 * jeito certo pra fluxo PKCE (verifier fica no localStorage, server nao tem).
 *
 * Apos session criada:
 *  1. Confere se usuario ja existe em `usuarios` via /api/oauth-bootstrap
 *  2. Se nao existe, cria agencia + usuario com perfil da query (?perfil=)
 *  3. Redireciona pra ?next (default /dashboard)
 */

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const [msg, setMsg] = useState("Validando login com Google...");
  const [erroDetalhe, setErroDetalhe] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const next = url.searchParams.get("next") || "/dashboard";
      const perfil = url.searchParams.get("perfil") || "";

      if (!code) {
        setMsg("Sem código OAuth. Redirecionando...");
        window.location.replace("/login?erro=oauth_sem_code");
        return;
      }

      const sb = createClient();

      // Se ja existe sessao ativa (refresh com code velho), pula exchange e segue.
      const { data: { session: sessAtual } } = await sb.auth.getSession();
      if (!sessAtual) {
        const { error: errExchange } = await sb.auth.exchangeCodeForSession(code);
        if (errExchange) {
          console.error("exchange:", errExchange);
          const { data: { session: s2 } } = await sb.auth.getSession();
          if (!s2) {
            setMsg("Falha ao validar login com Google.");
            setErroDetalhe(`Exchange: ${errExchange.message}`);
            return;
          }
        }
      }

      setMsg("Sessão criada. Configurando sua conta...");

      const r = await fetch("/api/oauth-bootstrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ perfil }),
      });
      const j = await r.json().catch(() => ({} as Record<string, unknown>));
      if (!r.ok) {
        console.error("bootstrap:", j);
        const det = j as { error?: string; details?: string; code?: string; hint?: string; stage?: string };
        setMsg(`Erro ao configurar conta: ${det.error || "desconhecido"}`);
        const dump = [
          det.stage ? `Stage: ${det.stage}` : "",
          det.code ? `Code: ${det.code}` : "",
          det.details ? `Detalhes: ${det.details}` : "",
          det.hint ? `Hint: ${det.hint}` : "",
        ].filter(Boolean).join("\n");
        setErroDetalhe(dump || "Sem detalhes adicionais.");
        return;
      }
      if ((j as { acesso_bloqueado?: boolean })?.acesso_bloqueado) {
        await sb.auth.signOut();
        window.location.replace("/login?erro=acesso_bloqueado");
        return;
      }

      setMsg("Pronto! Entrando...");
      window.location.replace(next);
    })().catch((err) => {
      console.error("[auth/callback] fatal:", err);
      setMsg("Erro inesperado.");
      setErroDetalhe(String(err?.message ?? err));
    });
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#060A08",
        color: "#F0F5F2",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 18,
        fontFamily: "Inter, sans-serif",
        padding: 24,
      }}
    >
      {!erroDetalhe && (
        <div
          style={{
            width: 48,
            height: 48,
            border: "3px solid rgba(0,225,154,0.25)",
            borderTopColor: "#00E19A",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
      )}
      <div style={{ fontSize: 15, color: "#F0F5F2", textAlign: "center", fontWeight: 600 }}>{msg}</div>
      {erroDetalhe && (
        <>
          <pre style={{
            background: "#11181A",
            border: "1px solid #2A3530",
            borderRadius: 10,
            padding: 14,
            color: "#FF5C72",
            fontSize: 12,
            maxWidth: 520,
            width: "100%",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            margin: 0,
          }}>{erroDetalhe}</pre>
          <div style={{ display: "flex", gap: 10 }}>
            <a href="/cadastro" style={{
              background: "#00E19A",
              color: "#060A08",
              padding: "10px 18px",
              borderRadius: 9,
              fontWeight: 600,
              fontSize: 13,
              textDecoration: "none",
            }}>Voltar ao cadastro</a>
            <a href="/login" style={{
              background: "transparent",
              color: "#A6B0AC",
              border: "1.5px solid #2A3530",
              padding: "10px 18px",
              borderRadius: 9,
              fontWeight: 600,
              fontSize: 13,
              textDecoration: "none",
            }}>Ir pro login</a>
          </div>
        </>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}
