"use client";

import { useCollapse } from "./CollapseProvider";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { collapsed } = useCollapse();
  return (
    <div className={`app-root${collapsed ? " collapsed" : ""}`}>
      <div className="layout-grid">{children}</div>
    </div>
  );
}
