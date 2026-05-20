import { PageHeader } from "@/components/layout/PageHeader";
import { ClienteForm } from "../_components/ClienteForm";
import { criarClienteAction } from "../actions";

export default function NovoClientePage() {
  return (
    <>
      <PageHeader title="Novo cliente" description="Cadastre um novo cliente da agência." />
      <ClienteForm action={criarClienteAction} submitLabel="Criar cliente" />
    </>
  );
}
