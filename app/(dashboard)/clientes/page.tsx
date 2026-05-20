import Link from "next/link";
import { Pencil, Plus, Trash2, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { requireUserWithAgencia } from "@/lib/auth";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { excluirClienteAction } from "./actions";

const fmtBRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default async function ClientesPage() {
  const { supabase } = await requireUserWithAgencia();
  const { data: clientes } = await supabase
    .from("clientes")
    .select("id, nome, slug, segmento, status, valor_mensal, data_inicio")
    .is("deleted_at", null)
    .order("nome");

  return (
    <>
      <PageHeader title="Clientes" description="Gerencie os clientes da sua agência.">
        <Link href="/clientes/novo" className={buttonVariants()}>
          <Plus className="mr-2 h-4 w-4" /> Novo cliente
        </Link>
      </PageHeader>

      {!clientes || clientes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">Nenhum cliente cadastrado.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Comece criando seu primeiro cliente.
            </p>
            <Link href="/clientes/novo" className={cn(buttonVariants(), "mt-6")}>
              <Plus className="mr-2 h-4 w-4" /> Novo cliente
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Segmento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Valor mensal</TableHead>
                <TableHead className="w-32 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientes.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nome}</TableCell>
                  <TableCell className="text-muted-foreground">{c.segmento ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={c.status === "ativo" ? "default" : "secondary"}>
                      {c.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {c.valor_mensal != null ? fmtBRL.format(Number(c.valor_mensal)) : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/clientes/${c.id}/editar`}
                        className={buttonVariants({ variant: "ghost", size: "sm" })}
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <form action={excluirClienteAction}>
                        <input type="hidden" name="id" value={c.id} />
                        <Button
                          type="submit"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </form>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </>
  );
}
