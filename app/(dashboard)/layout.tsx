import { AppSidebar } from "@/components/layout/AppSidebar";
import { Topbar } from "@/components/layout/Topbar";
import { CollapseProvider } from "@/components/providers/CollapseProvider";
import { PlatformProvider } from "@/components/providers/PlatformProvider";
import { AppShell } from "@/components/providers/AppShell";
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
        <AppShell>
          <AppSidebar role={usuario.role} />
          <main className="mk-main">
            <Topbar
              userName={usuario.nome}
              userEmail={usuario.email}
              agencia={agencia?.nome ?? "—"}
            />
            {children}
          </main>
        </AppShell>
      </PlatformProvider>
    </CollapseProvider>
  );
}
