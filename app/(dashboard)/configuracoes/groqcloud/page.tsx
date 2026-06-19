import { redirect } from "next/navigation";

/**
 * GroqCloud virou uma seção dentro de "Configurações de API (IA)".
 * Mantemos a rota só pra não quebrar links/bookmarks antigos → redireciona.
 */
export default function GroqCloudPage() {
  redirect("/configuracoes/ia");
}
