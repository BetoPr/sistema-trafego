"use client";

import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePlatform } from "@/components/providers/PlatformProvider";
import { PLATFORM_LIST, PLATFORMS, type Plataforma } from "@/lib/platform";

export function PlatformSelector() {
  const { ativa, setAtiva, conectadas } = usePlatform();
  const ativaInfo = ativa ? PLATFORMS[ativa] : null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="date-pill" style={{ cursor: "pointer" }}>
        {ativaInfo ? (
          <>
            <span
              style={{
                width: 18,
                height: 18,
                borderRadius: 5,
                background: ativaInfo.iconBg,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#FFFDF8",
              }}
            >
              <i className={`ti ${ativaInfo.icon}`} style={{ fontSize: 12 }} />
            </span>
            {ativaInfo.nome}
          </>
        ) : (
          <>
            <i className="ti ti-plug-off" style={{ fontSize: 14 }} />
            Sem integração
          </>
        )}
        <i className="ti ti-chevron-down" style={{ fontSize: 14 }} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Plataforma ativa</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {PLATFORM_LIST.map((p) => {
          const conectada = conectadas.includes(p.id as Plataforma);
          const isActive = ativa === p.id;
          return (
            <DropdownMenuItem
              key={p.id}
              onClick={() => {
                if (conectada) setAtiva(p.id as Plataforma);
              }}
              disabled={!conectada}
            >
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  background: p.iconBg,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#FFFDF8",
                  marginRight: 8,
                }}
              >
                <i className={`ti ${p.icon}`} style={{ fontSize: 13 }} />
              </span>
              <span style={{ flex: 1 }}>
                <span style={{ display: "block", fontWeight: 500 }}>{p.nome}</span>
                <span style={{ display: "block", fontSize: 10.5, color: "var(--mk-text-muted)" }}>
                  {conectada ? "Conectada" : "Não conectada"}
                </span>
              </span>
              {isActive && <i className="ti ti-check" style={{ fontSize: 14, color: "var(--mk-accent)" }} />}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          render={(props) => (
            <Link {...props} href="/integracoes" className={(props.className ?? "") + " w-full cursor-pointer"} />
          )}
        >
          <i className="ti ti-plug mr-2" style={{ fontSize: 14 }} />
          Gerenciar integrações
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
