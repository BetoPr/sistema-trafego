"use client";

import Link from "next/link";
import Image from "next/image";
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

const ICON_FILE: Record<Plataforma, string> = {
  meta_ads: "/icons/meta-ads.png",
  google_ads: "/icons/google-ads.webp",
};

function PlatformIcon({ plataforma, size = 18 }: { plataforma: Plataforma; size?: number }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: 5,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        background: "#FFFDF8",
        flexShrink: 0,
      }}
    >
      <Image
        src={ICON_FILE[plataforma]}
        alt={PLATFORMS[plataforma].nome}
        width={size}
        height={size}
        style={{ objectFit: "contain", width: "100%", height: "100%" }}
      />
    </span>
  );
}

export function PlatformSelector() {
  const { ativa, setAtiva, conectadas } = usePlatform();
  const ativaInfo = ativa ? PLATFORMS[ativa] : null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="date-pill" style={{ cursor: "pointer" }}>
        {ativaInfo ? (
          <>
            <PlatformIcon plataforma={ativaInfo.id} size={18} />
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
      <DropdownMenuContent align="end" className="w-72">
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
              style={{ opacity: conectada ? 1 : 0.55 }}
            >
              {conectada ? (
                <PlatformIcon plataforma={p.id as Plataforma} size={22} />
              ) : (
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    background: "var(--mk-surface-2)",
                    color: "var(--mk-text-muted)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <i className="ti ti-plug-off" style={{ fontSize: 12 }} />
                </span>
              )}
              <span style={{ flex: 1, marginLeft: 8 }}>
                <span style={{ display: "block", fontWeight: 500 }}>{p.nome}</span>
                <span
                  style={{
                    display: "block",
                    fontSize: 10.5,
                    color: conectada ? "#6B8E4E" : "var(--mk-text-muted)",
                  }}
                >
                  {conectada ? "● Conectada" : "○ Não conectada"}
                </span>
              </span>
              {isActive && (
                <i className="ti ti-check" style={{ fontSize: 14, color: "var(--mk-accent)" }} />
              )}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          render={(props) => (
            <Link
              {...props}
              href="/integracoes"
              className={(props.className ?? "") + " w-full cursor-pointer"}
            />
          )}
        >
          <i className="ti ti-plug" style={{ fontSize: 14, marginRight: 8 }} />
          Gerenciar integrações
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
