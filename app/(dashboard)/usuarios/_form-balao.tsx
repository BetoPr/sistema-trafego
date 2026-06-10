"use client";

import { useRouter } from "next/navigation";
import { Balao } from "@/components/ui/Balao";

/**
 * Envolve o form server-rendered de criar/editar usuário num Balao.
 * Fechar navega de volta pra /usuarios (limpa ?novo / ?editar).
 */
export function UsuarioFormBalao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  const router = useRouter();
  return (
    <Balao open onClose={() => router.push("/usuarios")} titulo={titulo} icone="ti-user-cog" largura={780} alturaVh={88}>
      {children}
    </Balao>
  );
}
