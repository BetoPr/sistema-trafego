"use client";

import { useCollapse } from "./CollapseProvider";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { collapsed, mobileOpen, closeMobile } = useCollapse();
  return (
    <div className={`app-root${collapsed ? " collapsed" : ""}${mobileOpen ? " nav-open" : ""}`}>
      <div className="layout-grid">{children}</div>
      {mobileOpen && <div className="mk-nav-scrim" onClick={closeMobile} aria-hidden="true" />}
    </div>
  );
}
