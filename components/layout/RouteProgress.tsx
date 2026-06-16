"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function Bar() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 600);
    return () => clearTimeout(t);
  }, [pathname, search]);

  if (!visible) return null;
  return <div className="mk-route-progress" aria-hidden="true" />;
}

/**
 * Barra fina no topo que aparece quando o pathname muda — pista visual
 * pro usuario de que a navegacao esta em andamento. Auto-some apos ~600ms.
 */
export function RouteProgress() {
  return (
    <Suspense fallback={null}>
      <Bar />
    </Suspense>
  );
}
