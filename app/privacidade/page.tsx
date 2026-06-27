import type { Metadata } from "next";
import { LegalShell, Secao, P, Lista, Aviso, ContatoCard } from "@/components/legal/LegalShell";

export const metadata: Metadata = {
  title: "Política de Privacidade — Sonar CRM",
  description: "Política de privacidade do Sonar CRM em conformidade com a LGPD.",
};

export default function PrivacidadePage() {
  return (
    <LegalShell
      tag="LGPD · Lei nº 13.709/2018"
      title="Política de Privacidade"
      subtitle="<b>Sonar CRM</b> — vigente desde 27 de junho de 2026."
      outroLinkHref="/termos"
      outroLinkTexto="Termos de Uso"
    >
      <P>
        Esta Política descreve como o <b>Sonar CRM</b> trata dados pessoais. Ela integra os{" "}
        <a href="/termos" style={{ color: "#00E19A" }}>Termos de Uso</a> e se aplica a quem visita o site,
        cria conta, contrata Plano ou utiliza a Plataforma de qualquer forma.
      </P>

      <Secao titulo="1. Quem somos">
        <P>
          O Sonar CRM é operado por <b>Roberto</b>, profissional autônomo sediado em <b>Recife — PE</b>.
          Para fins desta Política, somos o <b>Operador da Plataforma</b>.
        </P>
        <Lista
          items={[
            <>Email para questões de privacidade: <a href="mailto:jj.rroberto2010@gmail.com" style={{ color: "#00E19A" }}>jj.rroberto2010@gmail.com</a></>,
            <>WhatsApp: <a href="https://wa.me/5581991594716" style={{ color: "#00E19A" }}>+55 81 99159-4716</a></>,
            "Endereço comercial: Recife — PE",
          ]}
        />
      </Secao>

      <Secao titulo="2. Definições">
        <Lista
          items={[
            <><b>LGPD</b>: Lei Geral de Proteção de Dados Pessoais — Lei nº 13.709/2018.</>,
            <><b>Titular</b>: pessoa natural a quem os dados pessoais se referem.</>,
            <><b>Controlador</b>: quem decide sobre o tratamento dos dados.</>,
            <><b>Operador</b>: quem trata dados em nome do Controlador.</>,
            <><b>Tratamento</b>: qualquer operação com dados pessoais — coleta, armazenamento, transmissão, eliminação etc.</>,
            <><b>Contato Final</b>: pessoa que o Cliente atende pelo WhatsApp via Sonar CRM.</>,
          ]}
        />
      </Secao>

      <Secao titulo="3. A quem esta Política se aplica">
        <P>Esta Política se aplica a:</P>
        <Lista
          items={[
            "Visitantes do site sonarcrm.com.br e da landing page lp.sonarcrm.com.br",
            "Clientes que criam conta ou contratam Plano",
            "Usuários autorizados pelos Clientes (atendentes, gestores, equipe)",
          ]}
        />
        <Aviso tipo="info">
          <b>Sobre os Contatos Finais</b> (clientes do nosso Cliente que recebem mensagens via Sonar CRM):
          o Cliente é o Controlador dos dados desses Contatos Finais. O Sonar CRM atua como Operador desses
          dados, tratando-os apenas para executar o serviço contratado. Cabe ao Cliente manter sua própria
          base legal para tratar esses contatos (consentimento, execução de contrato etc.) e responder
          às solicitações de exercício de direitos vindas deles.
        </Aviso>
      </Secao>

      <Secao titulo="4. Quais dados coletamos">
        <P><b>4.1. Dados que você fornece diretamente</b></P>
        <P>No cadastro e durante o uso da Plataforma, coletamos:</P>
        <Lista
          items={[
            "Nome completo",
            "Email",
            "Número de WhatsApp",
            "Senha (armazenada em hash bcrypt, nunca em texto puro)",
            "Perfil de uso (Autônomo ou Agência)",
            "Aceite de Termos e Política de Privacidade, com data, hora e IP",
            "Opt-in voluntário para receber comunicações de marketing, com data, hora e IP",
            "Dados de pagamento processados via gateway parceiro (não armazenamos número de cartão)",
          ]}
        />

        <P><b>4.2. Dados gerados durante o uso da Plataforma</b></P>
        <Lista
          items={[
            "Mensagens trocadas via WhatsApp conectado ao CRM",
            "Contatos importados ou capturados (telefones, nomes, etiquetas, histórico)",
            "Configurações de IA, follow-up, equipes, filas",
            "Dados de campanhas integradas (Meta Ads, Google Ads, leads)",
            "Eventos de venda enviados via Pixel/CAPI da Meta",
          ]}
        />

        <P><b>4.3. Dados técnicos coletados automaticamente</b></P>
        <Lista
          items={[
            "Endereço IP, data e hora das ações (logs do Marco Civil da Internet)",
            "Tipo de dispositivo, navegador, sistema operacional",
            "Páginas visitadas, tempo de sessão, origem de tráfego",
            "Identificadores de cookies (conforme seção sobre Cookies)",
          ]}
        />
      </Secao>

      <Secao titulo="5. Finalidades do tratamento">
        <P>Usamos seus dados para:</P>
        <Lista
          items={[
            "Criar e manter sua conta na Plataforma",
            "Executar o contrato — operar atendimento, IA, follow-up, relatórios e integrações",
            "Faturar, cobrar e gerenciar pagamentos",
            "Prestar suporte técnico e responder dúvidas",
            "Enviar comunicações operacionais (cobrança, suporte, manutenção, mudanças de Termos)",
            "Cumprir obrigações legais, fiscais e regulatórias",
            "Detectar fraudes, abuso e ameaças à segurança da Plataforma",
            "Melhorar produto e experiência via análise de uso agregado e anonimizado",
            "Enviar comunicações de marketing — somente para quem deu opt-in expresso",
          ]}
        />
      </Secao>

      <Secao titulo="6. Bases legais (LGPD)">
        <P>Cada finalidade é amparada por uma base legal da LGPD:</P>
        <Lista
          items={[
            <><b>Execução de contrato</b> (art. 7º, V): cadastro, operação da Plataforma, cobrança, suporte.</>,
            <><b>Cumprimento de obrigação legal</b> (art. 7º, II): retenção de logs (Marco Civil), obrigações fiscais.</>,
            <><b>Legítimo interesse</b> (art. 7º, IX): segurança, prevenção a fraudes, melhoria de produto via dados agregados.</>,
            <><b>Consentimento</b> (art. 7º, I): comunicações de marketing, cookies opcionais — sempre opt-in e revogável a qualquer momento.</>,
          ]}
        />
      </Secao>

      <Secao titulo="7. Marketing — opt-in e opt-out">
        <P>
          O Sonar CRM <b>não envia comunicações de marketing por padrão</b>. Você só recebe novidades,
          dicas de uso, ofertas e atualizações se tiver marcado expressamente o opt-in correspondente
          no cadastro ou em outro ponto de coleta.
        </P>
        <P>O opt-in de marketing cobre:</P>
        <Lista
          items={[
            "Email com novidades de produto e dicas de uso",
            "WhatsApp com avisos de novas funcionalidades, casos de uso e promoções",
            "Convites para eventos, comunidade fechada de usuários, calls e webinars",
          ]}
        />
        <P>Comunicações operacionais não dependem de opt-in e seguem sendo enviadas mesmo sem ele:</P>
        <Lista
          items={[
            "Confirmação de cadastro e recuperação de senha",
            "Cobranças, comprovantes e avisos de vencimento",
            "Suporte respondendo solicitações abertas pelo Cliente",
            "Avisos de manutenção, instabilidade ou alteração de Termos",
            "Notificações de segurança e proteção de conta",
          ]}
        />
        <P>
          Você pode <b>cancelar o opt-in a qualquer momento</b>: clicando no link de descadastro presente
          em todo email de marketing, respondendo "SAIR" em qualquer WhatsApp de marketing, ou enviando
          email para <a href="mailto:jj.rroberto2010@gmail.com" style={{ color: "#00E19A" }}>jj.rroberto2010@gmail.com</a>.
          O efeito é imediato.
        </P>
      </Secao>

      <Secao titulo="8. Com quem compartilhamos dados">
        <P>
          Compartilhamos dados apenas com terceiros indispensáveis à operação da Plataforma. Mantemos
          contratos de tratamento de dados sempre que possível e exigimos padrões de segurança compatíveis
          com a LGPD.
        </P>

        <P><b>8.1. Operadores que tratam dados sob nossas instruções</b></P>
        <Lista
          items={[
            <><b>Supabase</b> — armazenamento de dados, autenticação e banco de dados gerenciado.</>,
            <><b>Hostinger</b> — hospedagem da Plataforma e do site (VPS).</>,
            <><b>Asaas</b> e demais gateways de pagamento — processamento de cobrança.</>,
            <><b>UAZAPI, WAHA</b> e outros provedores de WhatsApp — envio e recebimento de mensagens.</>,
            <><b>Groq, OpenAI, Ollama</b> e outros provedores de IA — geração de respostas configuradas pelo Cliente.</>,
          ]}
        />

        <P><b>8.2. Controladores parceiros</b></P>
        <Lista
          items={[
            <><b>Meta Platforms</b> — Meta Ads, Pixel, CAPI, integração de leads (regida pelos termos da Meta).</>,
            <><b>Google</b> — Google Ads, Analytics e demais ferramentas de mensuração (regidas pelos termos do Google).</>,
            "Gateways de pagamento atuam como Controladores autônomos para fins fiscais e prevenção a fraudes.",
          ]}
        />

        <P><b>8.3. Ferramentas de mensuração do site</b></P>
        <P>
          O site usa cookies analíticos para entender tráfego e otimizar conversão. Esses cookies só são
          ativados após consentimento explícito no banner correspondente.
        </P>

        <P>
          <b>Não vendemos, alugamos nem cedemos seus dados</b> para terceiros com finalidade comercial
          ou publicitária externa. Compartilhamentos só ocorrem nas hipóteses acima ou por ordem judicial
          /administrativa expressa.
        </P>
      </Secao>

      <Secao titulo="9. Cookies">
        <P>Utilizamos dois tipos de cookies:</P>
        <Lista
          items={[
            <><b>Estritamente necessários</b> — mantêm sua sessão ativa, segurança e preferências básicas. Não dependem de consentimento (legítimo interesse + execução de contrato).</>,
            <><b>Opcionais</b> — estatísticos, de performance e de marketing. Só são ativados após consentimento explícito no banner do site.</>,
          ]}
        />
        <P>
          Você pode revisar ou revogar seu consentimento a qualquer momento via configurações do navegador
          ou pelo banner de cookies do site.
        </P>
      </Secao>

      <Secao titulo="10. Retenção e exclusão">
        <P>Mantemos seus dados pelo tempo necessário para cumprir as finalidades descritas nesta Política:</P>
        <Lista
          items={[
            <><b>Conta ativa</b>: enquanto durar a relação contratual.</>,
            <><b>Trial expirado sem pagamento</b>: acesso desligado, dados preservados por <b>30 dias</b> para possível retorno; após esse prazo, exclusão automática.</>,
            <><b>Conta cancelada</b>: dados preservados por <b>30 dias</b> após o fim do ciclo pago e então excluídos.</>,
            <><b>Exclusão por solicitação LGPD</b>: processada em até <b>15 dias úteis</b>, ressalvadas obrigações legais de retenção.</>,
            <><b>Logs de acesso</b>: mantidos por no mínimo <b>6 meses</b>, conforme art. 15 do Marco Civil da Internet.</>,
            <><b>Dados fiscais e contábeis</b>: pelos prazos legais aplicáveis (em geral até 5 anos).</>,
          ]}
        />
      </Secao>

      <Secao titulo="11. Segurança">
        <P>Adotamos medidas técnicas e organizacionais compatíveis com a LGPD:</P>
        <Lista
          items={[
            "Criptografia em trânsito (HTTPS / TLS 1.3)",
            "Criptografia em repouso para tokens OAuth (AES-256-GCM, app-level)",
            "Isolamento multi-tenant via RLS no banco de dados — cada Cliente só vê seus próprios dados",
            "Senhas armazenadas com hash bcrypt",
            "Backups diários automatizados",
            "Logs de auditoria de acesso e alterações relevantes",
            "Controle de acesso por função (RBAC) nos sistemas internos",
          ]}
        />
        <P>
          Apesar dos cuidados, nenhuma transmissão pela internet é 100% segura. Se identificar uma
          vulnerabilidade ou suspeita de incidente, comunique imediatamente em{" "}
          <a href="mailto:jj.rroberto2010@gmail.com" style={{ color: "#00E19A" }}>jj.rroberto2010@gmail.com</a>.
        </P>
      </Secao>

      <Secao titulo="12. Seus direitos como Titular (LGPD)">
        <P>A LGPD garante a você:</P>
        <Lista
          items={[
            "Confirmar a existência de tratamento dos seus dados",
            "Acessar seus dados",
            "Corrigir dados incompletos, inexatos ou desatualizados",
            "Anonimizar, bloquear ou eliminar dados desnecessários ou tratados em desconformidade com a LGPD",
            "Portabilidade dos dados a outro fornecedor, observado o segredo comercial",
            "Eliminação dos dados tratados com consentimento, ressalvadas hipóteses legais de conservação",
            "Saber com quem compartilhamos seus dados",
            "Revogar consentimentos a qualquer momento, de forma gratuita e facilitada",
            "Opor-se a tratamento realizado com base em legítimo interesse",
            "Pedir revisão de decisões automatizadas que afetem seus interesses",
            "Reclamar perante a ANPD (Autoridade Nacional de Proteção de Dados)",
          ]}
        />
        <P>
          Para exercer qualquer direito, envie email para{" "}
          <a href="mailto:jj.rroberto2010@gmail.com" style={{ color: "#00E19A" }}>jj.rroberto2010@gmail.com</a>{" "}
          com o assunto "LGPD — solicitação de direito". Pedimos comprovação de identidade para proteger
          sua conta. Respondemos em até <b>15 dias úteis</b>.
        </P>
        <P>
          Solicitações sobre dados de Contatos Finais (clientes do nosso Cliente) devem ser dirigidas
          diretamente ao Cliente — ele é o Controlador desses dados, conforme seção 3.
        </P>
      </Secao>

      <Secao titulo="13. Transferência internacional de dados">
        <P>
          Para operar a Plataforma, podemos transferir dados para fora do Brasil, especialmente para
          provedores em nuvem com servidores em outras regiões (Estados Unidos, União Europeia, América
          Latina). Essas transferências observam o art. 33 da LGPD e cláusulas-padrão de proteção
          adotadas pelos provedores.
        </P>
      </Secao>

      <Secao titulo="14. Crianças e adolescentes">
        <P>
          A Plataforma não é direcionada a menores de 18 anos. Não coletamos intencionalmente dados de
          crianças e adolescentes. Se identificar coleta indevida nesse sentido, comunique para que
          possamos excluir prontamente.
        </P>
      </Secao>

      <Secao titulo="15. Alterações desta Política">
        <P>
          Esta Política pode ser atualizada periodicamente para refletir mudanças de operação, tecnologia,
          legislação ou base de fornecedores. Mudanças relevantes são comunicadas por email cadastrado
          e/ou aviso no painel com pelo menos <b>15 dias de antecedência</b>.
        </P>
        <P>
          A versão vigente está sempre disponível em{" "}
          <a href="https://sonarcrm.com.br/privacidade" style={{ color: "#00E19A" }}>sonarcrm.com.br/privacidade</a>.
        </P>
      </Secao>

      <Secao titulo="16. Encarregado pela Proteção de Dados (DPO) e contato">
        <P>
          O Encarregado pelo tratamento de dados pessoais do Sonar CRM é <b>Roberto</b>. Você pode falar
          conosco pelos canais abaixo para qualquer questão de privacidade, exercício de direitos LGPD ou
          dúvida sobre esta Política.
        </P>
        <ContatoCard />
      </Secao>
    </LegalShell>
  );
}
