import { AppSidebar } from "@/components/layout/AppSidebar";
import { Topbar } from "@/components/layout/Topbar";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { NotificacaoMensagens } from "@/components/layout/NotificacaoMensagens";
import { HeartbeatOnline } from "@/components/layout/HeartbeatOnline";
import { RouteProgress } from "@/components/layout/RouteProgress";
import { AudioGlobalProvider } from "@/components/providers/AudioGlobalProvider";
import { CollapseProvider } from "@/components/providers/CollapseProvider";
import { PlatformProvider } from "@/components/providers/PlatformProvider";
import { AppShell } from "@/components/providers/AppShell";
import { CrmOverlays } from "./_crm-overlays";
import { FiltroAtivoProvider } from "@/lib/filtro-ativo/context";
import { requireUserWithAgencia } from "@/lib/auth";
import type { Plataforma } from "@/lib/platform";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { supabase, usuario } = await requireUserWithAgencia();
  const agencia = Array.isArray(usuario.agencias) ? usuario.agencias[0] : usuario.agencias;

  // Busca plataformas com ao menos 1 integração ativa
  const { data: integs } = await supabase
    .from("integracoes")
    .select("plataforma")
    .eq("status", "ativa");

  const conectadasSet = new Set<Plataforma>();
  for (const i of integs || []) {
    if (i.plataforma === "meta_ads" || i.plataforma === "google_ads") {
      conectadasSet.add(i.plataforma);
    }
  }
  const conectadas = Array.from(conectadasSet);

  return (
    <CollapseProvider>
      <PlatformProvider initialConectadas={conectadas}>
        <FiltroAtivoProvider>
        <AudioGlobalProvider>
        <AppShell>
          <AppSidebar role={usuario.role} />
          <RouteProgress />
          <main className="mk-main">
            <Topbar
              userName={usuario.nome}
              userEmail={usuario.email}
              agencia={agencia?.nome ?? "—"}
              avatarUrl={(usuario as { avatar_url?: string | null }).avatar_url ?? null}
            />
            <CommandPalette role={usuario.role} />
            <NotificacaoMensagens agenciaId={usuario.agencia_id} />
            <HeartbeatOnline />
            <CrmOverlays>{children}</CrmOverlays>
          </main>
        </AppShell>
        </AudioGlobalProvider>
        </FiltroAtivoProvider>
      </PlatformProvider>
    </CollapseProvider>
  );
}
