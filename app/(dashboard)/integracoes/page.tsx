import Link from "next/link";
import { Plug, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { requireUserWithAgencia } from "@/lib/auth";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function IntegracoesPage() {
  const { supabase } = await requireUserWithAgencia();
  const { data: clientes } = await supabase
    .from("clientes")
    .select("id, nome, slug, integracoes(id, plataforma, account_name, status)")
    .is("deleted_at", null)
    .order("nome");

  return (
    <>
      <PageHeader
        title="Integrações"
        description="Conecte as contas de cada cliente às plataformas de tráfego."
      >
        <Link href="/clientes/novo" className={buttonVariants()}>
          <Plus className="mr-2 h-4 w-4" /> Novo cliente
        </Link>
      </PageHeader>

      {!clientes || clientes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Plug className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">Nenhum cliente cadastrado ainda.</p>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Cadastre um cliente em <Link href="/clientes/novo" className="underline">Clientes</Link> antes de
              conectar uma plataforma.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {clientes.map((cliente) => (
            <Card key={cliente.id}>
              <CardHeader>
                <CardTitle>{cliente.nome}</CardTitle>
                <CardDescription>
                  {cliente.integracoes?.length
                    ? `${cliente.integracoes.length} integração(ões) ativa(s)`
                    : "Nenhuma plataforma conectada."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {cliente.integracoes?.map((i) => (
                  <div key={i.id} className="flex items-center justify-between text-sm">
                    <span>
                      {i.plataforma === "meta_ads" ? "Meta Ads" : i.plataforma}
                      <span className="text-muted-foreground"> · {i.account_name}</span>
                    </span>
                    <Badge variant={i.status === "ativa" ? "default" : "secondary"}>
                      {i.status}
                    </Badge>
                  </div>
                ))}
                <Button variant="outline" className="w-full" disabled title="Disponível na Fase 2">
                  Conectar com Meta — Fase 2
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
