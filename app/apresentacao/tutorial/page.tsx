import type { Metadata } from "next";
import Tutorial from "./_tutorial";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Sonar — Tutorial em 7 passos",
  description: "Passo a passo pra ativar IA no WhatsApp em poucos minutos. Conecta canal, importa contatos, cria perfil IA, testa, vai pra produção.",
  openGraph: {
    title: "Sonar — Tutorial 7 passos",
    description: "IA atendendo seu WhatsApp em <15min. Veja como.",
    type: "website",
  },
};

export default function TutorialPage() {
  return <Tutorial />;
}
