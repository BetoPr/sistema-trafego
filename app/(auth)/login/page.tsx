"use client";

import { useActionState, useRef, useState } from "react";
import { loginAction, type LoginState } from "./actions";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(loginAction, undefined);
  const [verificado, setVerificado] = useState(false);

  return (
    <Card>
      <CardHeader>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, paddingTop: 6 }}>
          <LogoS />
          <div style={{ textAlign: "center" }}>
            <h1 style={{ fontSize: 22, fontWeight: 600, color: "var(--mk-text)", letterSpacing: "-0.3px" }}>Faça o seu login</h1>
            <p style={{ fontSize: 13, color: "var(--mk-text-secondary)", marginTop: 2 }}>
              Entre com suas credenciais para acessar o sistema
            </p>
          </div>
        </div>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="voce@empresa.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>

          <SlideToVerify verificado={verificado} onVerificar={() => setVerificado(true)} />

          {state?.error && (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          )}
        </CardContent>
        <CardFooter className="mt-4">
          <Button type="submit" className="w-full" disabled={pending || !verificado}>
            {pending ? "Entrando..." : "Entrar"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

/** Marca "S" — recriação vetorial (esmeralda). */
function LogoS() {
  return (
    <svg width="46" height="46" viewBox="0 0 100 100" fill="none" aria-label="Logo" role="img">
      <path
        d="M71 22 C45 18, 30 36, 47 50 C64 64, 50 84, 26 78"
        stroke="var(--mk-accent, #10b981)"
        strokeWidth="11"
        strokeLinecap="round"
        fill="none"
      />
      <path d="M30 30 L66 64" stroke="var(--mk-accent, #10b981)" strokeWidth="6" strokeLinecap="round" opacity="0.55" />
      <circle cx="80" cy="30" r="4" fill="var(--mk-accent, #10b981)" />
      <circle cx="86" cy="42" r="2.6" fill="var(--mk-accent, #10b981)" opacity="0.7" />
    </svg>
  );
}

/**
 * Slide-to-verify: arrasta o botão até o fim → preenche esmeralda → "Verificado".
 * Libera o botão Entrar. Pointer events (mouse + toque).
 */
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
    <div>
      <p style={{ fontSize: 11.5, color: "var(--mk-text-muted)", marginBottom: 6 }}>
        {verificado ? "Verificação concluída." : "Arraste o slider até o final para liberar o login:"}
      </p>
      <div
        ref={trackRef}
        style={{
          position: "relative",
          height: 44,
          borderRadius: 10,
          background: "var(--mk-surface-2)",
          border: "0.5px solid var(--mk-border)",
          overflow: "hidden",
          userSelect: "none",
          touchAction: "none",
        }}
      >
        {/* Preenchimento */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            bottom: 0,
            width: preenchido,
            background: "rgba(16,185,129,0.22)",
            transition: arrastando.current ? "none" : "width 0.2s ease",
          }}
        />
        {/* Texto central */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12.5,
            fontWeight: 600,
            color: verificado ? "var(--mk-accent)" : "var(--mk-text-muted)",
            pointerEvents: "none",
          }}
        >
          {verificado ? (
            <span><i className="ti ti-check" style={{ marginRight: 6 }} />Verificado</span>
          ) : (
            "Deslize para verificar →"
          )}
        </div>
        {/* Handle */}
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
            background: verificado ? "var(--mk-accent)" : "var(--mk-accent)",
            color: "#04140d",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: verificado ? "default" : "grab",
            transform: `translateX(${verificado ? maxX() : x}px)`,
            transition: arrastando.current ? "none" : "transform 0.2s ease",
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
            touchAction: "none",
          }}
        >
          <i className={`ti ${verificado ? "ti-check" : "ti-chevron-right"}`} style={{ fontSize: 18 }} />
        </div>
      </div>
    </div>
  );
}
