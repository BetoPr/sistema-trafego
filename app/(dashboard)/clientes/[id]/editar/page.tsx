import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { ClienteForm } from "../../_components/ClienteForm";
import { atualizarClienteAction } from "../../actions";
import { requireUserWithAgencia } from "@/lib/auth";

export default async function EditarClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireUserWithAgencia();
  const { data: cliente } = await supabase
    .from("clientes")
    .select("nome, segmento, status, valor_mensal, data_inicio, contato_principal, observacoes")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!cliente) notFound();

  const bound = atualizarClienteAction.bind(null, id);

  return (
    <>
      <PageHeader title={`Editar: ${cliente.nome}`} />
      <ClienteForm action={bound} initial={cliente} submitLabel="Salvar alterações" />
    </>
  );
}
