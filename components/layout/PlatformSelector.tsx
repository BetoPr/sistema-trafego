"use client";

import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePlatform } from "@/components/providers/PlatformProvider";
import { PLATFORM_LIST, PLATFORMS, type Plataforma } from "@/lib/platform";

function MetaInfinityIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg" aria-label="Meta">
      <defs>
        <linearGradient id="meta-grad-pselector" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0064E0" />
          <stop offset="50%" stopColor="#0082FB" />
          <stop offset="100%" stopColor="#00A1F6" />
        </linearGradient>
      </defs>
      <path
        fill="url(#meta-grad-pselector)"
        d="M9.5 8C5.36 8 2 12.03 2 17c0 4.97 3.36 9 7.5 9 2.66 0 4.66-1.45 6.43-3.51L13.6 19.7c-1.07 1.31-2.41 2.66-4.1 2.66-2.4 0-4.25-2.43-4.25-5.36 0-2.93 1.85-5.36 4.25-5.36 1.69 0 3.03 1.35 4.1 2.66l8.31 10.19C23.69 26.55 25.69 28 28.35 28c4.14 0 7.5-4.03 7.5-9s-3.36-9-7.5-9c-2.66 0-4.66 1.45-6.43 3.51l-2.32 2.83 2.32 2.83c1.07-1.31 2.41-2.66 4.1-2.66 2.4 0 4.25 2.43 4.25 5.36 0 2.93-1.85 5.36-4.25 5.36-1.69 0-3.03-1.35-4.1-2.66L13.6 14.21C12.16 12.45 10.16 11 9.5 11Z"
      />
    </svg>
  );
}

function PlatformIcon({ plataforma, size = 18 }: { plataforma: Plataforma; size?: number }) {
  if (plataforma === "meta_ads") {
    return (
      <span style={{ width: size, height: size, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <MetaInfinityIcon size={size} />
      </span>
    );
  }
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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icons/google-ads.webp"
        alt={PLATFORMS[plataforma].nome}
        width={size}
        height={size}
        style={{ objectFit: "contain", width: "100%", height: "100%" }}
      />
    </span>
  );
}

export function PlatformSelector() {
  const router = useRouter();
  const { ativa, setAtiva, conectadas } = usePlatform();
  const ativaInfo = ativa ? PLATFORMS[ativa] : null;

  const handleClick = (p: Plataforma) => {
    if (conectadas.includes(p)) {
      setAtiva(p);
    } else {
      router.push(`/integracoes/${p === "meta_ads" ? "meta" : "google"}`);
    }
  };

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
        <DropdownMenuGroup>
          <DropdownMenuLabel>Plataforma ativa</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {PLATFORM_LIST.map((p) => {
          const conectada = conectadas.includes(p.id as Plataforma);
          const isActive = ativa === p.id;
          return (
            <DropdownMenuItem
              key={p.id}
              onClick={() => handleClick(p.id as Plataforma)}
              style={{ opacity: conectada ? 1 : 0.7 }}
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
                  {conectada
                    ? isActive
                      ? "● Ativa agora"
                      : "● Conectada — clique para ativar"
                    : "○ Não conectada — clique para conectar"}
                </span>
              </span>
              {isActive && (
                <i className="ti ti-check" style={{ fontSize: 14, color: "var(--mk-accent)" }} />
              )}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/integracoes")}>
          <i className="ti ti-plug" style={{ fontSize: 14, marginRight: 8 }} />
          Gerenciar integrações
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
