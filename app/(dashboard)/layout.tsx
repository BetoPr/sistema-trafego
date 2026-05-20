import { AppSidebar } from "@/components/layout/AppSidebar";
import { UserMenu } from "@/components/layout/UserMenu";
import { requireUserWithAgencia } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { usuario } = await requireUserWithAgencia();
  const agencia = Array.isArray(usuario.agencias) ? usuario.agencias[0] : usuario.agencias;

  return (
    <div className="flex flex-1">
      <AppSidebar />
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-end border-b bg-background px-6">
          <UserMenu
            nome={usuario.nome}
            email={usuario.email}
            agencia={agencia?.nome ?? "—"}
          />
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
