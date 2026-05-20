import { PageHeader } from "@/components/layout/PageHeader";
import { requireUserWithAgencia } from "@/lib/auth";
import { PerfilForm } from "./_components/PerfilForm";
import { AgenciaForm } from "./_components/AgenciaForm";

export default async function ConfiguracoesPage() {
  const { usuario } = await requireUserWithAgencia();
  const agencia = Array.isArray(usuario.agencias) ? usuario.agencias[0] : usuario.agencias;

  return (
    <>
      <PageHeader title="Configurações" description="Perfil e dados da agência." />
      <div className="grid gap-6 md:grid-cols-2">
        <PerfilForm nome={usuario.nome} email={usuario.email} />
        <AgenciaForm nome={agencia?.nome ?? ""} slug={agencia?.slug ?? ""} />
      </div>
    </>
  );
}
