/**
 * Catalogo de areas FAQ + KBs por area. Cada FAQ e curto (~500 tokens) pra
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
import { IA_ATENDIMENTO } from "./ia-atendimento";
import { SISTEMA_UX } from "./sistema-ux";

export interface AreaFAQ {
  id: string;
  label: string;
  keywords: string[];
  conteudo: string;
}

export const AREAS: AreaFAQ[] = [
  { id: "dashboard", label: "Dashboard", keywords: ["dashboard","painel","kpi","metrica","grafico","resumo","visao geral","investido","faturamento","roas","cpl","cac"], conteudo: DASHBOARD },
  { id: "atendimentos", label: "Atendimentos", keywords: ["atendimento","ticket","chat","whatsapp","mensagem","conversa","cliente respond","cliente mandou","cliente novo"], conteudo: ATENDIMENTOS },
  { id: "follow-up", label: "Follow-up", keywords: ["follow","follow-up","followup","reengaj","parado","sumiu","retomar","analisar","enviar mensagem ia"], conteudo: FOLLOW_UP },
  { id: "contatos", label: "Contatos", keywords: ["contato","numero","telefone","whatsapp do cliente","import","aniversario","aba contato"], conteudo: CONTATOS },
  { id: "clientes", label: "Clientes", keywords: ["cliente","clientes","cadastro de cliente","conta cliente","cliente_id"], conteudo: CLIENTES },
  { id: "campanhas", label: "Campanhas / Tabela Anuncios", keywords: ["campanha","anuncio","conjunto","meta ads","facebook","instagram","gasto","impressao","alcance","cliques"], conteudo: CAMPANHAS },
  { id: "pixel-vendas", label: "Pixel & Vendas", keywords: ["pixel","capi","conversao","lead","venda","fechamento","facebook pixel","atribuicao"], conteudo: PIXEL_VENDAS },
  { id: "relatorios", label: "Relatorios", keywords: ["relatorio","report","pdf","imagem do relatorio","agendar relatorio","semanal","mensal","diario","enviar relatorio"], conteudo: RELATORIOS },
  { id: "alertas", label: "Alertas", keywords: ["alerta","regra de alerta","aviso","gasto subiu","queda de lead","notificacao"], conteudo: ALERTAS },
  { id: "integracoes", label: "Integracoes (Meta, Google, UAZAPI)", keywords: ["integracao","conectar meta","conectar google","oauth","uazapi","canal whatsapp","instancia"], conteudo: INTEGRACOES },
  { id: "config-ia", label: "Configuracao de IA / Chaves", keywords: ["chave groq","chave openai","chave anthropic","claude","api key","testar chave","rotacao chave","ia config"], conteudo: CONFIG_IA },
  { id: "config-etiquetas", label: "Etiquetas (Pasta / Etiqueta)", keywords: ["etiqueta","pasta","tag","gatilho","palavra chave","biscoito","heranca","pasta mae"], conteudo: CONFIG_ETIQUETAS },
  { id: "config-mcp", label: "MCP / Token / Claude Desktop", keywords: ["mcp","claude desktop","claude code","token api","cursor","programatico","sn_mcp"], conteudo: CONFIG_MCP },
  { id: "ia-atendimento", label: "IA Atendimento (bot do WhatsApp)", keywords: ["ia atendente","bot whatsapp","ferramenta","tool","aplicar_etiqueta","biscoito","prompt","perfil ia","whitelist"], conteudo: IA_ATENDIMENTO },
  { id: "sistema-ux", label: "Geral do sistema (UX, filtros, atalhos)", keywords: ["filtro global","cross-aba","topbar","sidebar","atalho","cmd+k","tema","mobile","navegacao","menu"], conteudo: SISTEMA_UX },
];

export function buscarArea(id: string): AreaFAQ | null {
  return AREAS.find((a) => a.id === id) ?? null;
}

export const RESUMO_AREAS = AREAS.map((a) => `- ${a.id}: ${a.label}`).join("\n");
