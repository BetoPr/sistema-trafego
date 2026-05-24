import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUserWithAgencia } from "@/lib/auth";
import { EditarClienteForm } from "./_form";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditarClientePage({ params }: Props) {
  const { id } = await params;
  const { supabase, usuario } = await requireUserWithAgencia();

  const { data: cliente } = await supabase
    .from("clientes")
    .select("id, nome, segmento, status, valor_mensal, observacoes")
    .eq("id", id)
    .eq("agencia_id", usuario.agencia_id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!cliente) notFound();

  return (
    <section className="mk-page">
      <div className="mk-page-head">
        <Link
          href={`/clientes/${id}`}
          style={{
            fontSize: 12,
            color: "var(--mk-accent)",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            marginBottom: 8,
          }}
        >
          <i className="ti ti-arrow-left" style={{ fontSize: 13 }} />
          Voltar para {cliente.nome}
        </Link>
        <div className="mk-eyebrow">CRM</div>
        <h1 className="mk-page-title">Editar cliente</h1>
        <p className="mk-page-sub">Atualize dados do cliente.</p>
      </div>
      <EditarClienteForm
        clienteId={id}
        defaults={{
          nome: cliente.nome,
          segmento: cliente.segmento,
          status: cliente.status,
          valor_mensal: cliente.valor_mensal != null ? Number(cliente.valor_mensal) : null,
          observacoes: cliente.observacoes,
        }}
      />
    </section>
  );
}
