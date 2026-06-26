import type { Metadata } from "next";
import { LegalShell, Secao, P, Lista, Aviso, ContatoCard } from "@/components/legal/LegalShell";

export const metadata: Metadata = {
  title: "Termos de Uso — Sonar CRM",
  description: "Termos de uso do Sonar CRM.",
};

export default function TermosPage() {
  return (
    <LegalShell
      tag="Termos de Uso · v1.0"
      title="Termos de Uso"
      subtitle="<b>Sonar CRM</b> — atualizado em 26 de junho de 2026."
      outroLinkHref="/privacidade"
      outroLinkTexto="Política de Privacidade"
    >
      <P>
        Ao criar conta e usar o Sonar CRM, você concorda integralmente com estes Termos de Uso e com a nossa{" "}
        <a href="/privacidade" style={{ color: "#00E19A" }}>Política de Privacidade</a> (LGPD).
        Se discordar de qualquer cláusula, não utilize a plataforma.
      </P>

      <Secao titulo="1. Sobre o serviço">
        <P>
          O <b>Sonar CRM</b> é uma plataforma de gestão de atendimento via WhatsApp, IA conversacional,
          follow-up automático, funil comercial e integração com tráfego pago (Meta Ads, Google Ads).
          O serviço é prestado por <b>Roberto</b>, profissional autônomo sediado em Recife — PE.
        </P>
      </Secao>

      <Secao titulo="2. Cadastro e conta">
        <P>
          Para utilizar a plataforma é necessário criar uma conta informando dados verídicos. Você é
          responsável por manter as credenciais em sigilo e por todas as atividades realizadas com sua conta.
        </P>
        <P>Ao se cadastrar, você escolhe um dos três perfis disponíveis:</P>
        <Lista
          items={[
            <><b>Empreendedor</b> — 14 dias de trial gratuito</>,
            <><b>Autônomo</b> — 14 dias de trial gratuito</>,
            <><b>Agência</b> — 21 dias de trial gratuito</>,
          ]}
        />
        <P>O perfil escolhido define quais funcionalidades ficam disponíveis e o tempo de teste.</P>
      </Secao>

      <Secao titulo="3. Trial e cobrança">
        <Aviso tipo="info">
          O trial é <b>100% gratuito, sem cartão de crédito</b>. Ao final do prazo, é necessário contratar
          um plano pago para continuar usando.
        </Aviso>
        <P>Após o vencimento do trial:</P>
        <Lista
          items={[
            <>O <b>acesso é automaticamente desligado</b>, sem perda de dados</>,
            "Mensagens recebidas no WhatsApp continuam chegando e ficam armazenadas",
            "Para reativar, basta contratar um plano pago e fazer login novamente",
            <>Após <b>30 dias sem pagamento</b>, a conta e os dados são <b>excluídos automaticamente</b></>,
          ]}
        />
        <P>
          Os valores dos planos podem variar conforme a tabela vigente em{" "}
          <a href="https://sonarcrm.com.br#planos" style={{ color: "#00E19A" }}>sonarcrm.com.br/#planos</a>.
          Mudanças de preço são comunicadas com pelo menos 30 dias de antecedência.
        </P>
      </Secao>

      <Secao titulo="4. Uso permitido">
        <P>
          Você concorda em usar a plataforma <b>exclusivamente para fins lícitos</b>. É expressamente proibido:
        </P>
        <Lista
          items={[
            "Enviar spam, mensagens não solicitadas em massa ou conteúdo enganoso",
            "Violar a Lei do Marketing Direto (Lei nº 8.078/90 — CDC)",
            "Promover golpes, fraudes, pirâmides financeiras ou qualquer ilegalidade",
            "Distribuir conteúdo discriminatório, violento, sexual envolvendo menores, ou de ódio",
            "Utilizar a plataforma para atividades que violem os Termos do WhatsApp (Meta)",
            "Tentar burlar limites técnicos, fazer reverse-engineering ou comprometer a segurança",
          ]}
        />
        <P>
          O descumprimento desta cláusula resulta em <b>encerramento imediato da conta sem reembolso</b>,
          com possível comunicação às autoridades competentes.
        </P>
      </Secao>

      <Secao titulo="5. WhatsApp não oficial">
        <Aviso tipo="warning">
          A conexão atual via QR Code utiliza tecnologia <b>não oficial</b> do WhatsApp. Embora seja
          amplamente utilizada no mercado, há risco de <b>bloqueio temporário ou definitivo do número</b> pela Meta,
          sem aviso prévio.
        </Aviso>
        <P>Você assume os riscos do uso de WhatsApp não oficial. Recomenda-se:</P>
        <Lista
          items={[
            <>Usar números <b>dedicados ao atendimento</b>, não pessoais</>,
            "Evitar disparos em massa para contatos que não solicitaram receber mensagens",
            "Manter o número aquecido e respeitar as boas práticas de envio",
          ]}
        />
        <P>O Sonar CRM não se responsabiliza por bloqueios de números aplicados pela Meta.</P>
      </Secao>

      <Secao titulo="6. IA de atendimento">
        <P>
          A plataforma oferece IAs treináveis baseadas em modelos de terceiros (Groq, OpenAI, Anthropic).
          Você é responsável pelo conteúdo configurado em sua IA, pelas respostas geradas e pelo
          cumprimento de leis aplicáveis ao seu nicho de atuação.
        </P>
        <P>
          A IA pode cometer erros. Recomendamos <b>revisar respostas antes de liberar o modo automático</b>{" "}
          e manter supervisão humana em casos sensíveis (saúde, jurídico, financeiro).
        </P>
      </Secao>

      <Secao titulo="7. Disponibilidade do serviço">
        <P>
          Trabalhamos para manter a plataforma sempre disponível, mas não garantimos uptime de 100%.
          Podemos realizar manutenções programadas com aviso prévio quando possível.
        </P>
        <P>
          Em caso de instabilidade, atualizamos status em{" "}
          <a href="https://wa.me/5581991594716" style={{ color: "#00E19A" }}>WhatsApp de suporte</a>.
          O Sonar CRM não se responsabiliza por danos indiretos decorrentes de indisponibilidade momentânea.
        </P>
      </Secao>

      <Secao titulo="8. Cancelamento">
        <P>
          Você pode cancelar sua assinatura a qualquer momento por email ou WhatsApp. Após o cancelamento:
        </P>
        <Lista
          items={[
            "O acesso permanece ativo até o fim do ciclo já pago",
            "Os dados ficam preservados por 30 dias para possível retorno",
            "Após 30 dias, dados são excluídos definitivamente",
          ]}
        />
        <P>
          Conforme o <b>Código de Defesa do Consumidor (Art. 49)</b>, você tem direito a{" "}
          <b>7 dias de devolução incondicional</b> a contar do primeiro pagamento.
        </P>
      </Secao>

      <Secao titulo="9. Propriedade intelectual">
        <P>
          Marca, logo, código-fonte e identidade visual do Sonar CRM são de propriedade exclusiva do
          operador da plataforma. É vedada qualquer reprodução, venda ou exploração sem autorização
          expressa por escrito.
        </P>
        <P>
          O conteúdo que <b>você</b> cria dentro da plataforma (mensagens, IAs treinadas, contatos, etc.)
          permanece de sua propriedade.
        </P>
      </Secao>

      <Secao titulo="10. Limitação de responsabilidade">
        <P>O Sonar CRM é fornecido "como está". Apesar dos nossos melhores esforços, não nos responsabilizamos por:</P>
        <Lista
          items={[
            "Decisões comerciais tomadas com base em dados ou relatórios da plataforma",
            "Bloqueios de número aplicados pelo WhatsApp",
            "Falhas em integrações de terceiros (Meta, Google, Asaas, provedores de IA)",
            "Perdas indiretas, lucros cessantes ou danos morais",
          ]}
        />
        <P>
          Em qualquer hipótese, a responsabilidade máxima do Sonar CRM fica limitada aos valores
          efetivamente pagos pelo cliente nos últimos 3 meses.
        </P>
      </Secao>

      <Secao titulo="11. Alterações destes termos">
        <P>
          Estes termos podem ser atualizados periodicamente. Mudanças relevantes são comunicadas por
          email com pelo menos 15 dias de antecedência. O uso continuado da plataforma após a vigência
          implica aceitação tácita.
        </P>
      </Secao>

      <Secao titulo="12. Foro">
        <P>
          Fica eleito o foro da Comarca de <b>Recife — PE</b> para dirimir qualquer questão decorrente
          destes Termos, com renúncia expressa de qualquer outro, por mais privilegiado que seja.
        </P>
      </Secao>

      <Secao titulo="Contato">
        <ContatoCard />
      </Secao>
    </LegalShell>
  );
}
