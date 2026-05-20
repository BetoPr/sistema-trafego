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
import { atualizarPerfilAction, type ConfigState } from "../actions";

export function PerfilForm({ nome, email }: { nome: string; email: string }) {
  const [state, action, pending] = useActionState<ConfigState, FormData>(
    atualizarPerfilAction,
    undefined
  );

  useEffect(() => {
    if (state?.ok) toast.success("Perfil atualizado.");
    if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Perfil</CardTitle>
        <CardDescription>Suas informações pessoais.</CardDescription>
      </CardHeader>
      <form action={action}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="perfil-nome">Nome</Label>
            <Input id="perfil-nome" name="nome" defaultValue={nome} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="perfil-email">Email</Label>
            <Input id="perfil-email" defaultValue={email} disabled />
            <p className="text-xs text-muted-foreground">
              Email não pode ser alterado no MVP.
            </p>
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Salvando..." : "Salvar perfil"}
          </Button>
        </CardContent>
      </form>
    </Card>
  );
}
