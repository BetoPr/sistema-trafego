import { AppSidebar } from "@/components/layout/AppSidebar";
import { Topbar } from "@/components/layout/Topbar";
import { CollapseProvider } from "@/components/providers/CollapseProvider";
import { AppShell } from "@/components/providers/AppShell";
import { requireUserWithAgencia } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { usuario } = await requireUserWithAgencia();
  const agencia = Array.isArray(usuario.agencias) ? usuario.agencias[0] : usuario.agencias;

  return (
    <CollapseProvider>
      <AppShell>
        <AppSidebar />
        <main className="mk-main">
          <Topbar
            userName={usuario.nome}
            userEmail={usuario.email}
            agencia={agencia?.nome ?? "—"}
          />
          {children}
        </main>
      </AppShell>
    </CollapseProvider>
  );
}
