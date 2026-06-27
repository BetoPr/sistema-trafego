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
          // Se exchange falhou mas tem sessao agora (race condition), segue
          const { data: { session: s2 } } = await sb.auth.getSession();
          if (!s2) {
            setMsg("Falha ao validar login. Tente novamente.");
            setTimeout(() => window.location.replace("/login?erro=oauth_falhou"), 1500);
            return;
          }
        }
      }

      setMsg("Sessão criada. Configurando sua conta...");

      // Chama bootstrap pra criar agencia+usuario se primeiro acesso
      const r = await fetch("/api/oauth-bootstrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ perfil }),
      });
      const j = await r.json().catch(() => ({} as Record<string, unknown>));
      if (!r.ok) {
        console.error("bootstrap:", j);
        setMsg(`Erro ao configurar conta: ${(j as { error?: string })?.error || "desconhecido"}`);
        setTimeout(() => window.location.replace("/login?erro=signup_falhou"), 2500);
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
      setMsg("Erro inesperado. Voltando ao login...");
      setTimeout(() => window.location.replace("/login?erro=oauth_falhou"), 2000);
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
      <div style={{ fontSize: 15, color: "#A6B0AC", textAlign: "center" }}>{msg}</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}
