import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sonar — Demonstração do CRM WhatsApp + Ads",
  description: "Conheça o Sonar: CRM de atendimento, IA 24/7, follow-up automático, conciliação de leads Meta e mais. R$29/mês por conexão.",
  openGraph: {
    title: "Sonar — CRM WhatsApp com IA 24/7",
    description: "IA atende, qualifica e transfere. Concilia leads do Meta automaticamente. R$29/mês por conexão.",
    type: "website",
  },
};

export default function ApresentacaoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
