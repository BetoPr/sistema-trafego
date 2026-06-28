import type { Metadata } from "next";
import { LegalShell, Secao, P, Lista, Aviso, ContatoCard } from "@/components/legal/LegalShell";

export const metadata: Metadata = {
  title: "Termos de Uso — Sonar CRM",
  description: "Termos de uso do Sonar CRM.",
};

export default function TermosPage() {
  return (
    <LegalShell
      tag="Termos de Uso · v2.0"
      title="Termos de Uso"
      subtitle="<b>Sonar CRM</b> — vigentes desde 27 de junho de 2026."
      outroLinkHref="/privacidade"
      outroLinkTexto="Política de Privacidade"
    >
      <P>
        Estes Termos regulam o uso do <b>Sonar CRM</b> (a "Plataforma"). Ao criar conta, contratar plano
        ou utilizar a Plataforma de qualquer forma, você concorda integralmente com este documento e com a{" "}
        <a href="/privacidade" style={{ color: "#00E19A" }}>Política de Privacidade</a> (LGPD).
        Se discordar de qualquer cláusula, encerre o uso imediatamente.
      </P>

      <Secao titulo="1. Definições">
        <Lista
          items={[
            <><b>Sonar CRM</b> ou <b>Plataforma</b>: software de gestão de atendimento via WhatsApp, IA conversacional, follow-up automático, funil comercial e integração com plataformas de tráfego pago, operado em modelo SaaS hospedado.</>,
            <><b>Operador da Plataforma</b> ou <b>nós</b>: Roberto, profissional autônomo sediado em Recife — PE, contato jj.rroberto2010@gmail.com e WhatsApp +55 81 99159-4716.</>,
            <><b>Cliente</b> ou <b>você</b>: pessoa física ou jurídica que cria conta na Plataforma.</>,
            <><b>Contato Final</b>: pessoa que o Cliente atende pelo WhatsApp via Sonar CRM.</>,
            <><b>Trial</b>: período gratuito sem cartão para experimentação da Plataforma.</>,
            <><b>Plano</b>: assinatura mensal recorrente que dá acesso à Plataforma após o Trial.</>,
          ]}
        />
      </Secao>

      <Secao titulo="2. Sobre a Plataforma">
        <P>
          O Sonar CRM é entregue em modelo <b>SaaS (Software as a Service) hospedado em nuvem</b>: você acessa
          a Plataforma pelo navegador em <a href="https://sonarcrm.com.br" style={{ color: "#00E19A" }}>sonarcrm.com.br</a>,
          sem necessidade de instalar nada. Toda a infraestrutura, manutenção, atualizações e segurança são de
          responsabilidade do Operador da Plataforma.
        </P>
        <P>
          A Plataforma <b>não é vendida em modelo self-hosted, não é white-label e não permite revenda</b>.
          O acesso é pessoal e intransferível, vinculado à conta do Cliente.
        </P>
      </Secao>

      <Secao titulo="3. Cadastro e conta">
        <P>
          Para usar a Plataforma é necessário cadastro com dados verdadeiros, atuais e completos:
          nome, email, WhatsApp, senha e perfil de uso. Você é integralmente responsável por:
        </P>
        <Lista
          items={[
            "Manter suas credenciais em sigilo",
            "Todas as atividades realizadas com sua conta",
            "Manter cadastro atualizado",
            "Possuir idade mínima de 18 anos ou autorização de responsável legal",
          ]}
        />
        <P>No cadastro você escolhe um dos perfis disponíveis. O perfil define o Plano inicial e o tempo de Trial:</P>
        <Lista
          items={[
            <><b>Solo</b> (perfil Autônomo) — profissional liberal, MEI, empreendedor, pequeno negócio. <b>7 dias</b> de Trial.</>,
            <><b>Time / Agência / Studio</b> (perfil Agência) — quem atende múltiplos clientes finais ou possui equipe. <b>14 dias</b> de Trial.</>,
          ]}
        />
        <P>
          Os primeiros 10 (dez) Clientes de cada Plano participam da <b>Promoção de Lançamento</b>, que dá
          <b> trial dobrado</b> (Solo 14 dias, demais 28 dias), <b>30% de desconto vitalício</b> sobre a
          tabela cheia e entrada na comunidade fechada Onda Zero. As condições da promo são travadas no
          ato da assinatura e seguem para sempre, mesmo quando o Cliente fizer upgrade de Plano.
        </P>
        <P>
          O perfil escolhido pode ser alterado mediante solicitação, sujeito à revisão do prazo de trial e
          à confirmação do Operador da Plataforma.
        </P>
      </Secao>

      <Secao titulo="4. Trial gratuito">
        <Aviso tipo="info">
          O Trial é <b>100% gratuito e não exige cartão de crédito</b>. Durante o Trial você tem acesso
          a todas as funcionalidades do seu perfil, sem limite de uso.
        </Aviso>
        <P>Regras do Trial:</P>
        <Lista
          items={[
            "Cada Cliente tem direito a apenas 1 (um) Trial por CPF/CNPJ",
            "Trial não é renovável — só vale uma vez por conta",
            "Não é possível combinar Trial com outras promoções a menos que expressamente indicado",
            <>Ao final do Trial, sem pagamento, o acesso é <b>automaticamente desligado</b></>,
          ]}
        />
        <P>Se você não decidir pagar ao final do Trial:</P>
        <Lista
          items={[
            "Seu acesso fica suspenso — você não consegue mais entrar no painel",
            "Os dados (contatos, conversas, configurações) ficam preservados por 30 dias",
            "Você pode reativar nesse prazo simplesmente pagando o primeiro mês",
            <>Após <b>30 dias sem pagamento</b>, a conta e todos os dados são <b>excluídos definitivamente</b> e essa exclusão é irreversível</>,
          ]}
        />
      </Secao>

      <Secao titulo="5. Planos, pagamento e renovação">
        <P>
          Após o Trial, para continuar usando a Plataforma é necessário contratar um Plano. A tabela
          vigente está sempre publicada em{" "}
          <a href="https://sonarcrm.com.br#planos" style={{ color: "#00E19A" }}>sonarcrm.com.br/#planos</a>.
        </P>
        <P>Atualmente a Plataforma oferece 4 Planos com limites diferentes:</P>
        <Lista
          items={[
            <><b>Solo</b> — 1 conexão WhatsApp, 1 usuário, recursos completos do CRM.</>,
            <><b>Time</b> — 2 conexões, 4 usuários, multi-cliente até 3.</>,
            <><b>Agência</b> — 3 conexões, 8 usuários, multi-cliente até 8.</>,
            <><b>Studio</b> — 5 conexões, 15 usuários, multi-cliente ilimitado, atendimento dedicado.</>,
          ]}
        />
        <P>
          O Plano é uma <b>assinatura mensal recorrente</b>. A cobrança inclui o valor base do Plano,
          o valor adicional por cada conexão de WhatsApp ativa além das inclusas no Plano e o valor
          adicional por cada usuário ativo além dos inclusos. Os valores de extras seguem a tabela
          vigente publicada na LP.
        </P>
        <Aviso tipo="info">
          <b>Pagamento durante o Trial:</b> se você optar por pagar antes do fim do Trial, o pagamento
          é considerado adiantamento da <b>mensalidade seguinte ao fim do Trial</b> e não interrompe o
          período gratuito. O tempo restante de Trial continua válido, e o mês pago só começa a contar
          quando o Trial expira.
        </Aviso>
        <P>
          <b>Promoção de Lançamento — escala por adesão.</b> Os 10 (dez) primeiros Clientes de cada Plano
          travam o preço promocional de lançamento para sempre, mesmo após reajustes futuros. A partir da
          11ª adesão, o preço base do Plano sobe gradualmente conforme metas de número total de Clientes
          ativos da Plataforma (11-30, 31-50, 51-100, 100+), congelando definitivamente após a meta de 100
          Clientes. O preço de cada Cliente continua sendo aquele registrado no momento em que ele entrou
          (preço travado).
        </P>
        <P>Sobre cobrança:</P>
        <Lista
          items={[
            "A renovação é automática a cada ciclo mensal",
            "Falha no pagamento gera 7 dias de tolerância antes de suspender o acesso",
            "Após suspensão, vale o mesmo prazo da seção 4 — 30 dias e os dados são excluídos",
            <>Durante a suspensão, o painel fica <b>travado</b> com cadeado em todas as áreas, exceto na área de Pagamentos (onde é possível regularizar). A Licença aparece como <b>desativada</b>.</>,
            "Ao regularizar pagamento, a Licença volta a Ativa e os cadeados são removidos automaticamente",
            "Reajustes de preço são comunicados com no mínimo 30 dias de antecedência por email ou painel",
          ]}
        />
      </Secao>

      <Secao titulo="6. Cancelamento e ausência de reembolso após o Trial">
        <P>
          Você pode cancelar sua assinatura a qualquer momento por email ou WhatsApp, com efeito imediato
          para o próximo ciclo. O acesso permanece ativo até o fim do ciclo já pago.
        </P>
        <Aviso tipo="warning">
          <b>Não há reembolso após o término do Trial.</b> Como o Trial oferece 14 ou 21 dias com tudo
          liberado, sem cartão, para o Cliente avaliar a Plataforma antes de pagar, eventuais pagamentos
          feitos depois desse período <b>não geram direito a estorno ou devolução proporcional</b>, ressalvado
          apenas o direito de arrependimento do Código de Defesa do Consumidor para a primeira contratação
          (7 dias contados do primeiro pagamento, conforme Art. 49 do CDC).
        </Aviso>
        <P>
          Pagamentos antecipados feitos durante o Trial são considerados crédito de mensalidade futura,
          conforme seção 5, e seguem a mesma regra.
        </P>
      </Secao>

      <Secao titulo="7. Suporte">
        <P>O suporte é prestado diretamente pelo Operador da Plataforma:</P>
        <Lista
          items={[
            <>WhatsApp comercial: <a href="https://wa.me/5581991594716" style={{ color: "#00E19A" }}>+55 81 99159-4716</a> (segunda a sexta, horário comercial de Brasília)</>,
            <>Email: <a href="mailto:jj.rroberto2010@gmail.com" style={{ color: "#00E19A" }}>jj.rroberto2010@gmail.com</a></>,
            "Assistente IA com FAQ completo dentro do próprio CRM (24h)",
          ]}
        />
        <P>O suporte cobre:</P>
        <Lista
          items={[
            "Dúvidas de uso e configuração da Plataforma",
            "Bugs e falhas no funcionamento",
            "Orientação sobre as integrações suportadas",
          ]}
        />
        <P>O suporte <b>não cobre</b>:</P>
        <Lista
          items={[
            "Consultoria de negócios, marketing ou tráfego pago",
            "Treinamento aprofundado de IA — oferecido separadamente como Consultoria de IA paga (opcional)",
            "Suporte a sistemas de terceiros que você integrou voluntariamente",
            "Recuperação de dados de conta excluída por inadimplência ou cancelamento expirado",
          ]}
        />
      </Secao>

      <Secao titulo="8. Uso aceitável">
        <P>
          Você concorda em usar a Plataforma <b>exclusivamente para fins lícitos</b>. É expressamente
          proibido utilizar o Sonar CRM para:
        </P>
        <Lista
          items={[
            "Envio de spam ou mensagens em massa para contatos que não autorizaram receber comunicações",
            "Violação da LGPD, do Código de Defesa do Consumidor ou de qualquer legislação aplicável",
            "Promoção de golpes, fraudes, pirâmides financeiras ou esquemas ilegais",
            "Difusão de conteúdo discriminatório, violento, sexual envolvendo menores, ou de ódio",
            "Atividades que violem os Termos do WhatsApp (Meta Platforms, Inc.)",
            "Burlar limites técnicos, fazer engenharia reversa, ou tentar comprometer a segurança da Plataforma",
            "Compartilhar credenciais de acesso com terceiros não autorizados",
            "Revender, sublicenciar, alugar ou de qualquer forma comercializar acessos à Plataforma para terceiros",
          ]}
        />
        <P>
          O descumprimento desta cláusula resulta em <b>encerramento imediato da conta sem reembolso</b> e
          pode acarretar comunicação às autoridades competentes.
        </P>
      </Secao>

      <Secao titulo="9. Conexão com o WhatsApp">
        <Aviso tipo="warning">
          A conexão atual com o WhatsApp utiliza tecnologia <b>não oficial</b> (provedores como UAZAPI, WAHA
          e similares), via leitura de QR Code. Embora amplamente utilizada no mercado, há risco real de{" "}
          <b>bloqueio temporário ou definitivo do número</b> pela Meta, sem aviso prévio.
        </Aviso>
        <P>
          Você assume integralmente os riscos do uso de WhatsApp não oficial. Para reduzir esses riscos,
          recomendamos:
        </P>
        <Lista
          items={[
            "Usar números dedicados ao atendimento — não use seu WhatsApp pessoal",
            "Evitar disparos em massa para contatos que não solicitaram receber mensagens",
            "Manter o número aquecido com volume gradual",
            "Respeitar a Política de Comércio do WhatsApp e o Código de Defesa do Consumidor",
          ]}
        />
        <P>
          O Operador da Plataforma <b>não se responsabiliza</b> por bloqueios, banimentos ou penalidades
          aplicadas pela Meta sobre números conectados ao Sonar CRM. Quando a API Oficial da Meta (WABA)
          estiver disponível na Plataforma, esses riscos serão substancialmente reduzidos, mas custos
          adicionais cobrados pela Meta poderão ser repassados ao Cliente.
        </P>
      </Secao>

      <Secao titulo="10. Integrações de terceiros">
        <P>
          A Plataforma se integra a serviços de terceiros, ativados conforme a necessidade do Cliente.
          Cada serviço externo é regido pelos próprios termos de uso e política de privacidade, sobre os
          quais o Operador da Plataforma não tem ingerência:
        </P>
        <Lista
          items={[
            "Meta Platforms — Meta Ads, Pixel, CAPI, leads",
            "Provedores de IA — Groq, OpenAI, Ollama e outros que vierem a ser integrados",
            "Provedores de pagamento — Asaas e outros gateways",
            "Provedores de WhatsApp — UAZAPI, WAHA, API Oficial da Meta",
            "Outros conectores ativados pelo Cliente (n8n, webhooks customizados, etc.)",
          ]}
        />
        <P>
          Falhas, indisponibilidades, mudanças de política ou aumento de preço desses serviços não são
          responsabilidade do Operador da Plataforma e não geram direito a reembolso ou indenização.
          Custos de uso desses serviços (ex.: cobranças da Meta por mensagens template fora da janela
          de 24h, consumo de tokens de IA acima do incluso) podem ser de responsabilidade do Cliente
          quando aplicável e serão sempre comunicados com antecedência.
        </P>
      </Secao>

      <Secao titulo="11. IA de atendimento">
        <P>
          A Plataforma trabalha com IA em duas camadas distintas, com modelos de provedores de terceiros:
        </P>
        <Lista
          items={[
            <><b>IA de Suporte</b> (geração de resumo de conversa, análise de sentimento, sugestões de follow-up, automações leves do CRM): roda em <b>Groq</b> e está <b>inclusa no Plano sem custo adicional</b> pro Cliente. Limites de uso podem ser aplicados conforme política do provedor e da Plataforma.</>,
            <><b>IA de Atendimento</b> (motor que conversa diretamente com os Contatos Finais do Cliente): roda em <b>OpenAI</b> ou <b>Anthropic</b>. O Cliente paga o consumo dos tokens, seja usando chave própria do provedor ou via gateway da Plataforma com custo repassado pela tabela vigente no painel.</>,
            <><b>MCP (Model Context Protocol)</b> — recurso em <b>beta</b>, sem garantia de estabilidade nem cobertura de suporte enquanto não for promovido a release oficial.</>,
          ]}
        />
        <P>
          Você é responsável pelo conteúdo configurado em suas IAs, pelas respostas geradas pela IA de
          Atendimento e pelo cumprimento das leis aplicáveis ao seu nicho de atuação (saúde, jurídico,
          financeiro, educação etc.).
        </P>
        <P>
          Modelos de IA podem cometer erros, alucinar informações ou gerar respostas inadequadas.
          Recomendamos fortemente:
        </P>
        <Lista
          items={[
            "Revisar respostas antes de liberar o modo automático em massa",
            "Manter supervisão humana em conversas sensíveis",
            "Não usar a IA para fechar negócios irreversíveis sem confirmação humana",
            "Treinar a IA com exemplos reais do seu negócio",
          ]}
        />
        <P>
          O Operador da Plataforma não se responsabiliza por consequências comerciais, jurídicas ou
          reputacionais de respostas geradas pelas IAs do Cliente.
        </P>
      </Secao>

      <Secao titulo="12. Propriedade intelectual">
        <P>
          A marca <b>Sonar</b>, o nome <b>Sonar CRM</b>, o logotipo, a identidade visual, o código-fonte
          e a arquitetura da Plataforma são de propriedade exclusiva do Operador da Plataforma. É vedada
          a reprodução, venda, sublicenciamento ou qualquer exploração comercial sem autorização expressa
          por escrito.
        </P>
        <P>
          O conteúdo que <b>você cria</b> dentro da Plataforma — mensagens, contatos, IAs treinadas,
          configurações, mídia, relatórios — permanece de sua titularidade. Você concede ao Operador da
          Plataforma licença não exclusiva para armazenar e processar esse conteúdo apenas no necessário
          para executar o serviço contratado.
        </P>
      </Secao>

      <Secao titulo="13. Disponibilidade e limitação de responsabilidade">
        <P>
          Trabalhamos para manter a Plataforma sempre disponível, mas <b>não garantimos uptime de 100%</b>.
          Podemos realizar manutenções programadas com aviso prévio sempre que possível. Em caso de
          indisponibilidade não programada, comunicamos status pelo WhatsApp de suporte.
        </P>
        <P>O Sonar CRM é fornecido "como está". O Operador da Plataforma não se responsabiliza por:</P>
        <Lista
          items={[
            "Decisões comerciais tomadas com base em dados ou relatórios da Plataforma",
            "Bloqueios de números pelo WhatsApp",
            "Falhas em integrações de terceiros (Meta, IA, gateway de pagamento etc.)",
            "Conteúdo gerado pelas IAs configuradas pelo Cliente",
            "Perdas indiretas, lucros cessantes ou danos morais",
            "Inadequação da Plataforma para uso fora das funcionalidades descritas na LP",
          ]}
        />
        <P>
          Em qualquer hipótese, a responsabilidade máxima do Operador da Plataforma fica <b>limitada ao
          valor efetivamente pago pelo Cliente nos 3 (três) meses anteriores</b> ao evento que gerou a
          reclamação.
        </P>
      </Secao>

      <Secao titulo="14. Suspensão e rescisão">
        <P>O Operador da Plataforma pode suspender ou encerrar a conta nas hipóteses:</P>
        <Lista
          items={[
            "Inadimplência (7 dias de tolerância, depois suspensão automática)",
            "Violação da seção 8 (Uso aceitável)",
            "Uso comprovadamente fraudulento ou ilegal",
            "Ordem judicial ou administrativa",
            "Risco grave à segurança da Plataforma ou de outros Clientes",
          ]}
        />
        <P>
          Você pode encerrar sua conta a qualquer momento por solicitação no canal de suporte. Após o
          encerramento, os dados seguem o ciclo descrito na seção 4.
        </P>
      </Secao>

      <Secao titulo="15. Alterações destes Termos">
        <P>
          Estes Termos podem ser atualizados periodicamente para refletir mudanças de produto, legislação
          ou tecnologia. Alterações relevantes são comunicadas por email cadastrado e/ou aviso no painel
          com pelo menos <b>15 dias de antecedência</b>. O uso continuado da Plataforma após a vigência
          implica aceitação tácita da nova versão.
        </P>
        <P>
          A versão vigente está sempre disponível em{" "}
          <a href="https://sonarcrm.com.br/termos" style={{ color: "#00E19A" }}>sonarcrm.com.br/termos</a>.
        </P>
      </Secao>

      <Secao titulo="16. Foro e legislação">
        <P>
          Estes Termos são regidos pelas leis da República Federativa do Brasil, em especial Código Civil,
          Código de Defesa do Consumidor, Marco Civil da Internet (Lei 12.965/2014) e Lei Geral de Proteção
          de Dados (Lei 13.709/2018).
        </P>
        <P>
          Fica eleito o foro da Comarca de <b>Recife — PE</b> como o único competente para dirimir
          qualquer questão decorrente destes Termos, com renúncia expressa a qualquer outro, por mais
          privilegiado que seja ou venha a ser.
        </P>
      </Secao>

      <Secao titulo="Contato">
        <ContatoCard />
      </Secao>
    </LegalShell>
  );
}
