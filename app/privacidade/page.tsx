import type { Metadata } from "next";
import { LegalShell, Secao, P, Lista, ContatoCard } from "@/components/legal/LegalShell";

export const metadata: Metadata = {
  title: "Política de Privacidade — Sonar CRM",
  description: "Política de privacidade do Sonar CRM em conformidade com a LGPD.",
};

export default function PrivacidadePage() {
  return (
    <LegalShell
      tag="LGPD · Lei nº 13.709/2018"
      title="Política de Privacidade"
      subtitle="<b>Sonar CRM</b> — atualizada em 26 de junho de 2026."
      outroLinkHref="/termos"
      outroLinkTexto="Termos de Uso"
    >
      <Secao titulo="Quem somos">
        <P>
          O <b>Sonar CRM</b> é uma plataforma de gestão de atendimento via WhatsApp, IA e tráfego pago,
          desenvolvida e operada por Roberto, profissional autônomo com endereço comercial na{" "}
          <b>R. Prof. Aloísio Pessoa de Araújo, 75 — Boa Viagem, Recife — PE, CEP 51021-410</b>.
          Esta política descreve como tratamos os dados pessoais coletados por meio do site{" "}
          <a href="https://sonarcrm.com.br" style={{ color: "#00E19A" }}>sonarcrm.com.br</a> e da aplicação CRM.
        </P>
      </Secao>

      <Secao titulo="Quais dados coletamos">
        <P>Ao criar conta na plataforma, coletamos:</P>
        <Lista
          items={[
            "Nome completo",
            "Email",
            "Número de WhatsApp",
            "Senha (armazenada criptografada via hash bcrypt)",
            "Perfil de uso (Empreendedor, Agência ou Autônomo)",
          ]}
        />
        <P>Durante o uso da plataforma, coletamos também:</P>
        <Lista
          items={[
            "Conversas trocadas via WhatsApp conectado ao CRM",
            "Contatos importados (telefones, nomes, etiquetas)",
            "Dados de campanhas integradas (Meta Ads, Google Ads)",
            "Dados de uso e navegação (IP, tipo de dispositivo, páginas visitadas, tempo de sessão)",
          ]}
        />
      </Secao>

      <Secao titulo="Para que usamos seus dados">
        <P>Os dados coletados são utilizados para:</P>
        <Lista
          items={[
            "Criar e manter sua conta no sistema",
            "Processar mensagens, enviar follow-ups e operar a IA de atendimento",
            "Sincronizar dados de campanhas e gerar relatórios de performance",
            "Enviar comunicações operacionais (cobrança, suporte, atualizações)",
            "Melhorar a experiência da plataforma por meio de análise de uso agregado",
            "Cumprir obrigações legais e fiscais",
          ]}
        />
      </Secao>

      <Secao titulo="Compartilhamento de dados">
        <P>Seus dados podem ser compartilhados com:</P>
        <Lista
          items={[
            <><b>Supabase</b> — armazenamento e autenticação (banco de dados)</>,
            <><b>Asaas</b> — processamento de pagamentos (Pix, cartão, boleto)</>,
            <><b>Groq Cloud / OpenAI / Anthropic</b> — provedores de IA usados nas respostas automatizadas</>,
            <><b>UAZAPI / WAHA</b> — integração com WhatsApp para envio e recebimento de mensagens</>,
            <><b>Meta (Facebook) e Google</b> — exclusivamente para mensuração de campanhas via Pixel/CAPI/Analytics</>,
          ]}
        />
        <P>
          <b>Não vendemos, alugamos ou cedemos seus dados a terceiros</b> para fins comerciais ou de marketing externo.
        </P>
      </Secao>

      <Secao titulo="Cookies e rastreamento">
        <P>
          Utilizamos cookies essenciais para manter sua sessão ativa e cookies analíticos (Google Analytics, Meta Pixel)
          para entender como o site e a plataforma são utilizados. Ao navegar, você concorda com o uso dessas tecnologias.
          Cookies de marketing podem ser desativados a qualquer momento nas configurações do seu navegador.
        </P>
      </Secao>

      <Secao titulo="Seus direitos (LGPD)">
        <P>
          Conforme a <b>Lei Geral de Proteção de Dados (Lei nº 13.709/2018)</b>, você tem direito a:
        </P>
        <Lista
          items={[
            "Confirmar a existência de tratamento dos seus dados",
            "Acessar, corrigir e atualizar seus dados",
            "Solicitar a anonimização, bloqueio ou eliminação de dados desnecessários",
            "Solicitar a portabilidade dos dados a outro fornecedor",
            "Revogar o consentimento a qualquer momento",
            "Solicitar a exclusão definitiva da conta e dos dados",
          ]}
        />
        <P>
          Para exercer qualquer direito, envie um email para{" "}
          <a href="mailto:jj.rroberto2010@gmail.com" style={{ color: "#00E19A" }}>jj.rroberto2010@gmail.com</a>{" "}
          com o assunto "LGPD — solicitação de direito". Responderemos em até <b>15 dias úteis</b>.
        </P>
      </Secao>

      <Secao titulo="Retenção e exclusão de dados">
        <P>Mantemos seus dados enquanto sua conta estiver ativa. Após o cancelamento:</P>
        <Lista
          items={[
            <><b>Trial expirado:</b> o acesso é desligado mas os dados ficam preservados por até 30 dias</>,
            <><b>Conta inativa sem pagamento por 30 dias:</b> dados são excluídos automaticamente do banco</>,
            <><b>Exclusão sob solicitação (LGPD):</b> processada em até 15 dias úteis</>,
          ]}
        />
        <P>Dados necessários para cumprir obrigações fiscais podem ser retidos pelo prazo legal mínimo.</P>
      </Secao>

      <Secao titulo="Segurança dos dados">
        <P>Adotamos medidas técnicas e organizacionais para proteger seus dados:</P>
        <Lista
          items={[
            "Criptografia em trânsito (HTTPS/TLS 1.3) e em repouso (AES-256-GCM para tokens OAuth)",
            "Isolamento multi-tenant (RLS no banco — cada cliente vê só seus próprios dados)",
            "Backup diário automatizado",
            "Senhas armazenadas com bcrypt (nunca em texto puro)",
            "Logs de auditoria de acesso e alterações",
          ]}
        />
      </Secao>

      <Secao titulo="Alterações desta política">
        <P>
          Esta política pode ser atualizada periodicamente. Mudanças relevantes serão comunicadas por email
          com pelo menos 15 dias de antecedência.
        </P>
      </Secao>

      <Secao titulo="Contato">
        <ContatoCard />
      </Secao>
    </LegalShell>
  );
}
