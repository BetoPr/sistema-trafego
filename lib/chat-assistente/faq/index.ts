/**
 * Catalogo de areas FAQ + KBs por area. Cada FAQ e curto/medio (~500-2000 tokens) pra
 * orquestrador rotear barato. Especialista carrega so o conteudo da area dele.
 */
import { DASHBOARD } from "./dashboard";
import { ATENDIMENTOS } from "./atendimentos";
import { FOLLOW_UP } from "./follow-up";
import { CONTATOS } from "./contatos";
import { CLIENTES } from "./clientes";
import { CAMPANHAS } from "./campanhas";
import { PIXEL_VENDAS } from "./pixel-vendas";
import { RELATORIOS } from "./relatorios";
import { ALERTAS } from "./alertas";
import { INTEGRACOES } from "./integracoes";
import { CONFIG_IA } from "./config-ia";
import { CONFIG_ETIQUETAS } from "./config-etiquetas";
import { CONFIG_MCP } from "./config-mcp";
import { CONFIG_ASAAS } from "./config-asaas";
import { CONFIG_MARCA } from "./config-marca";
import { CONTA_PERFIL } from "./conta-perfil";
import { PLANO } from "./plano";
import { IA_ATENDIMENTO } from "./ia-atendimento";
import { ENVIO_MASSA } from "./envio-massa";
import { MENSAGENS_RAPIDAS } from "./mensagens-rapidas";
import { GRUPOS } from "./grupos";
import { FILAS } from "./filas";
import { EQUIPES } from "./equipes";
import { USUARIOS } from "./usuarios";
import { SISTEMA_UX } from "./sistema-ux";

export interface AreaFAQ {
  id: string;
  label: string;
  keywords: string[];
  conteudo: string;
}

export const AREAS: AreaFAQ[] = [
  { id: "dashboard", label: "Dashboard", keywords: ["dashboard","painel","kpi","metrica","grafico","resumo","visao geral","investido","faturamento","roas","cpl","cac","periodo","filtro periodo","atendimentos vs campanhas","top campanhas","criativos top","status donut","atendimentos live"], conteudo: DASHBOARD },
  { id: "atendimentos", label: "Atendimentos", keywords: ["atendimento","ticket","chat","whatsapp","mensagem","conversa","cliente respond","cliente mandou","cliente novo","abertos","pendentes","fechados","atender","encerrar","transferir ticket","espiar","painel direito","cobranca chat","sentimento","fechamento","emoji","anexo","audio msg","apagar mensagem","reagir mensagem","balao tools","nova conversa","log fechamento","som notificacao","ia pausa"], conteudo: ATENDIMENTOS },
  { id: "follow-up", label: "Follow-up", keywords: ["follow","follow-up","followup","reengaj","parado","sumiu","retomar","analisar","enviar mensagem ia","sequencia","janela envio","etapas"], conteudo: FOLLOW_UP },
  { id: "contatos", label: "Contatos", keywords: ["contato","numero","telefone","whatsapp do cliente","import","aniversario","aba contato","importar whatsapp","csv","excel","editar contato","etiqueta no contato","historico fechamento","follow-up avulso","sanitizar","lgpd"], conteudo: CONTATOS },
  { id: "clientes", label: "Clientes", keywords: ["cliente","clientes","cadastro de cliente","conta cliente","cliente_id"], conteudo: CLIENTES },
  { id: "campanhas", label: "Campanhas / Tabela Anuncios", keywords: ["campanha","anuncio","conjunto","meta ads","facebook","instagram","gasto","impressao","alcance","cliques"], conteudo: CAMPANHAS },
  { id: "pixel-vendas", label: "Pixel & Vendas", keywords: ["pixel","capi","conversao","lead","venda","fechamento","facebook pixel","atribuicao","ctwa","click-id","purchase","addtocart","refund","reenviar evento","etiqueta campanha","pasta campanha"], conteudo: PIXEL_VENDAS },
  { id: "relatorios", label: "Relatorios", keywords: ["relatorio","report","pdf","imagem do relatorio","agendar relatorio","semanal","mensal","diario","enviar relatorio","frequencia","periodo dias","formato pdf","formato imagem","formato texto"], conteudo: RELATORIOS },
  { id: "alertas", label: "Alertas", keywords: ["alerta","regra de alerta","aviso","gasto subiu","queda de lead","notificacao","gasto dia","gasto mes","limite r$","template alerta","testar alerta"], conteudo: ALERTAS },
  { id: "integracoes", label: "Integracoes (Canais Meta Google UAZAPI)", keywords: ["integracao","conectar meta","conectar google","oauth","uazapi","canal whatsapp","instancia","qr code","reconectar","desconectar","backfill midia","webhook","plataforma ios android","multi numero","conectar whatsapp","novo canal"], conteudo: INTEGRACOES },
  { id: "config-ia", label: "Configuracao de IA / Chaves API", keywords: ["chave groq","chave openai","chave anthropic","claude","api key","testar chave","rotacao chave","ia config","multi-chave","limite chave","prompts ia","sentimento prompt","resumo prompt","sugestao prompt"], conteudo: CONFIG_IA },
  { id: "config-etiquetas", label: "Etiquetas (Pasta / Etiqueta / Auto)", keywords: ["etiqueta","pasta","tag","gatilho","palavra chave","biscoito","heranca","pasta mae","etiqueta automatica","cor etiqueta","mensagem automatica"], conteudo: CONFIG_ETIQUETAS },
  { id: "config-mcp", label: "MCP / Token / Claude Desktop", keywords: ["mcp","claude desktop","claude code","token api","cursor","programatico","sn_mcp"], conteudo: CONFIG_MCP },
  { id: "config-asaas", label: "Asaas (Pagamento PIX/Cartao)", keywords: ["asaas","pix","cartao","cobranca","pagamento","cobrar cliente","sandbox asaas","qr code pix","copia cola","mensagem pos pagamento"], conteudo: CONFIG_ASAAS },
  { id: "config-marca", label: "Marca / Logo / Branding", keywords: ["marca","logo","branding","trocar logo","altura logo","texto agencia","horizontal vertical","upload logo","personalizar"], conteudo: CONFIG_MARCA },
  { id: "conta-perfil", label: "Meu Perfil / Conta", keywords: ["meu perfil","minha conta","trocar foto","avatar","trocar senha","alterar senha","nome usuario","esqueci senha","reset senha"], conteudo: CONTA_PERFIL },
  { id: "plano", label: "Plano Pro / Assinatura", keywords: ["plano","cobranca mensal","pagamento mensal","r$29","lite pro","cancelar plano","quanto custa","preco crm","assinatura"], conteudo: PLANO },
  { id: "ia-atendimento", label: "IA Atendimento (bot do WhatsApp)", keywords: ["ia atendente","bot whatsapp","ferramenta","tool","aplicar_etiqueta","biscoito","prompt","perfil ia","whitelist","modular","capsula","template ia","chat de teste","tokens","modelo ia","temperatura","debounce","max msg","follow-up sequencia","resumo grupo","etiqueta automatica ia","transferir humano","consultar data","galeria","biscoito tool"], conteudo: IA_ATENDIMENTO },
  { id: "envio-massa", label: "Envio em Massa", keywords: ["envio massa","disparo","broadcast","disparar lista","mensagem em massa","delays","limite diario","lite pro mensagens dia"], conteudo: ENVIO_MASSA },
  { id: "mensagens-rapidas", label: "Mensagens Rapidas (atalhos)", keywords: ["mensagens rapidas","atalho","snippet","comando","slash command","template rapido","global agencia"], conteudo: MENSAGENS_RAPIDAS },
  { id: "grupos", label: "Grupos WhatsApp", keywords: ["grupo","grupos","jid","participante","membro","exportar grupo","listar grupo","scraping"], conteudo: GRUPOS },
  { id: "filas", label: "Filas (Atendimento)", keywords: ["fila","criar fila","cor fila","fila fixa","ia atendendo","atendimento humano","cadeado fila","transferir fila"], conteudo: FILAS },
  { id: "equipes", label: "Equipes", keywords: ["equipe","time","grupo usuarios","criar equipe","atribuir equipe"], conteudo: EQUIPES },
  { id: "usuarios", label: "Usuarios do CRM", keywords: ["usuario","usuarios","admin","atendente","super admin","convidar","perfil usuario","role","permissao","horario atendimento","restrito","desativar usuario","resetar senha outro","online offline"], conteudo: USUARIOS },
  { id: "sistema-ux", label: "Geral do sistema (UX, filtros, atalhos)", keywords: ["filtro global","cross-aba","topbar","sidebar","atalho","cmd+k","tema","mobile","navegacao","menu","robo","assistente ia","pwa","offline","multi-agencia"], conteudo: SISTEMA_UX },
];

export function buscarArea(id: string): AreaFAQ | null {
  return AREAS.find((a) => a.id === id) ?? null;
}

export const RESUMO_AREAS = AREAS.map((a) => `- ${a.id}: ${a.label}`).join("\n");
