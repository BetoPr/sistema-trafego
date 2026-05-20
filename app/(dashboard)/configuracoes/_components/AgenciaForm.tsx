"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { atualizarAgenciaAction, type ConfigState } from "../actions";

export function AgenciaForm({ nome, slug }: { nome: string; slug: string }) {
  const [state, action, pending] = useActionState<ConfigState, FormData>(
    atualizarAgenciaAction,
    undefined
  );

  useEffect(() => {
    if (state?.ok) toast.success("Agência atualizada.");
    if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agência</CardTitle>
        <CardDescription>Dados da sua agência.</CardDescription>
      </CardHeader>
      <form action={action}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="agencia-nome">Nome da agência</Label>
            <Input id="agencia-nome" name="nome" defaultValue={nome} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="agencia-slug">Slug</Label>
            <Input id="agencia-slug" defaultValue={slug} disabled />
            <p className="text-xs text-muted-foreground">
              Slug é definido na criação e não pode mudar.
            </p>
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Salvando..." : "Salvar agência"}
          </Button>
        </CardContent>
      </form>
    </Card>
  );
}
