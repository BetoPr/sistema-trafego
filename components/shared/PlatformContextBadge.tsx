"use client";

import { usePlatform } from "@/components/providers/PlatformProvider";
import { PLATFORMS } from "@/lib/platform";

export function PlatformContextBadge() {
  const { ativa } = usePlatform();
  if (!ativa) return null;
  const info = PLATFORMS[ativa];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 10.5,
        fontWeight: 600,
        padding: "3px 10px",
        borderRadius: 14,
        background: info.iconBg,
        color: "#FFFDF8",
        marginLeft: 8,
      }}
    >
      <i className={`ti ${info.icon}`} style={{ fontSize: 11 }} />
      {info.nome}
    </span>
  );
}
