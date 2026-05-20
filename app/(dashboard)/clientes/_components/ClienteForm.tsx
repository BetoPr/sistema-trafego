"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ClienteFormState } from "../actions";

export interface ClienteFormValues {
  nome?: string;
  segmento?: string | null;
  status?: string;
  valor_mensal?: number | null;
  data_inicio?: string | null;
  contato_principal?: {
    nome?: string | null;
    email?: string | null;
    telefone?: string | null;
  } | null;
  observacoes?: string | null;
}

interface ClienteFormProps {
  action: (state: ClienteFormState, formData: FormData) => Promise<ClienteFormState>;
  initial?: ClienteFormValues;
  submitLabel: string;
}

export function ClienteForm({ action, initial, submitLabel }: ClienteFormProps) {
  const [state, formAction, pending] = useActionState<ClienteFormState, FormData>(
    action,
    undefined
  );
  const err = state?.fieldErrors ?? {};
  const contato = initial?.contato_principal ?? {};

  return (
    <form action={formAction}>
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Dados do cliente</CardTitle>
            <CardDescription>Informações básicas e financeiras.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input id="nome" name="nome" defaultValue={initial?.nome ?? ""} required />
              {err.nome && <p className="text-sm text-destructive">{err.nome}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="segmento">Segmento</Label>
              <Input
                id="segmento"
                name="segmento"
                defaultValue={initial?.segmento ?? ""}
                placeholder="Ex: e-commerce, infoproduto"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select name="status" defaultValue={initial?.status ?? "ativo"}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="pausado">Pausado</SelectItem>
                  <SelectItem value="encerrado">Encerrado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="valor_mensal">Valor mensal (R$)</Label>
              <Input
                id="valor_mensal"
                name="valor_mensal"
                type="text"
                inputMode="decimal"
                defaultValue={initial?.valor_mensal?.toString() ?? ""}
                placeholder="2500,00"
              />
              {err.valor_mensal && <p className="text-sm text-destructive">{err.valor_mensal}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="data_inicio">Data de início</Label>
              <Input
                id="data_inicio"
                name="data_inicio"
                type="date"
                defaultValue={initial?.data_inicio ?? ""}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contato principal</CardTitle>
            <CardDescription>Quem fala com você no dia a dia.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="contato_nome">Nome</Label>
              <Input id="contato_nome" name="contato_nome" defaultValue={contato.nome ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contato_email">Email</Label>
              <Input
                id="contato_email"
                name="contato_email"
                type="email"
                defaultValue={contato.email ?? ""}
              />
              {err.contato_email && (
                <p className="text-sm text-destructive">{err.contato_email}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="contato_telefone">Telefone</Label>
              <Input
                id="contato_telefone"
                name="contato_telefone"
                defaultValue={contato.telefone ?? ""}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              id="observacoes"
              name="observacoes"
              defaultValue={initial?.observacoes ?? ""}
              rows={4}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </CardContent>
        </Card>

        {state?.error && (
          <p className="text-sm text-destructive" role="alert">
            {state.error}
          </p>
        )}

        <div className="flex items-center gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Salvando..." : submitLabel}
          </Button>
          <Link href="/clientes" className={buttonVariants({ variant: "outline" })}>
            Cancelar
          </Link>
        </div>
      </div>
    </form>
  );
}
