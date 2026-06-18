/**
 * Catálogo central de modelos de IA.
 *
 * Fonte ÚNICA da verdade sobre cada modelo: nome amigável, categoria, custo,
 * velocidade, contexto, o que suporta, pra que serve, quando evitar e qual o
 * fallback. A UI e o backend leem daqui — sem espalhar strings de modelo no código.
 *
 * Regra de fallback: SEMPRE dentro do mesmo provider (o perfil tem 1 chave só).
 *
 * Modelos marcados `experimental: true` (família GPT-5.x) podem ainda não estar
 * liberados na sua conta OpenAI. Se a API recusar, o executor cai no `fallback`
 * automaticamente — a IA nunca quebra por escolha de modelo.
 */

export type Provider = "anthropic" | "openai" | "groq";

export type CategoriaModelo =
  | "recomendado"
  | "economico"
  | "contexto_longo"
  | "avancado"
  | "legado";

export interface ModeloInfo {
  id: string;
  provider: Provider;
  /** Nome amigável (o usuário vê). */
  displayName: string;
  categoria: CategoriaModelo;
  /** Frase curta e simples do que ele é. */
  resumo: string;
  /** Selo curto (ex: "Recomendado p/ ferramentas"). */
  badge?: string;
  /** 1 = barato … 4 = caro. */
  custo: 1 | 2 | 3 | 4;
  /** 1 = rápido … 3 = lento. */
  velocidade: 1 | 2 | 3;
  /** Janela de contexto em tokens. */
  contexto: number;
  suporta: {
    ferramentas: boolean;
    raciocinio: boolean;
    visao: boolean;
    structuredOutputs: boolean;
  };
  /** Bullets simples de quando usar. */
  melhorPara: string[];
  /** Bullets simples de quando evitar. */
  evitar: string[];
  /** Id do modelo de fallback (mesmo provider) ou null. */
  fallback: string | null;
  /** Aparece no seletor? */
  selecionavel: boolean;
  /** Fica numa seção avançada, escondido por padrão. */
  avancadoEscondido?: boolean;
  /** Disponibilidade incerta (família nova) — pode não existir na conta. */
  experimental?: boolean;
  /** Legado — manter compatibilidade, evitar pra novos. */
  legado?: boolean;
}

function ctx(n: number) { return n; }

export const CATALOGO_MODELOS: ModeloInfo[] = [
  // ============ OPENAI ============
  {
    id: "gpt-4o-mini", provider: "openai",
    displayName: "GPT-4o mini", categoria: "economico",
    resumo: "Rápido e barato pra atendimento simples.",
    badge: "Melhor p/ atendimento simples",
    custo: 1, velocidade: 1, contexto: ctx(128_000),
    suporta: { ferramentas: true, raciocinio: false, visao: true, structuredOutputs: true },
    melhorPara: ["FAQ e dúvidas comuns", "Qualificar lead, coletar nome/e-mail", "Respostas curtas", "1 ferramenta simples (ex: transferir p/ humano)"],
    evitar: ["Várias ferramentas dependentes", "Decisões complexas/ambíguas", "Ações críticas no CRM"],
    fallback: "gpt-4.1", selecionavel: true,
  },
  {
    id: "gpt-4.1", provider: "openai",
    displayName: "GPT-4.1", categoria: "recomendado",
    resumo: "Forte em seguir instruções e usar ferramentas. Contexto enorme.",
    badge: "Recomendado p/ ferramentas",
    custo: 3, velocidade: 2, contexto: ctx(1_000_000),
    suporta: { ferramentas: true, raciocinio: false, visao: true, structuredOutputs: true },
    melhorPara: ["Atendimento com ferramentas (consultar, etiquetar, transferir)", "Prompts longos e documentos grandes", "Comportamento previsível", "Galeria de fotos por situação"],
    evitar: ["Quando custo mínimo é prioridade (use o mini)"],
    fallback: "gpt-4o", selecionavel: true,
  },
  {
    id: "gpt-4o", provider: "openai",
    displayName: "GPT-4o", categoria: "recomendado",
    resumo: "Generalista equilibrado, bom com imagem.",
    custo: 2, velocidade: 2, contexto: ctx(128_000),
    suporta: { ferramentas: true, raciocinio: false, visao: true, structuredOutputs: true },
    melhorPara: ["Atendimento geral com ferramentas", "Conversas com imagem"],
    evitar: ["Contexto acima de 128 mil tokens (use o 4.1)"],
    fallback: "gpt-4o-mini", selecionavel: true,
  },
  {
    id: "gpt-4.1-mini", provider: "openai",
    displayName: "GPT-4.1 mini", categoria: "contexto_longo",
    resumo: "Previsível, rápido e com contexto gigante.",
    badge: "Previsível + contexto longo",
    custo: 2, velocidade: 1, contexto: ctx(1_000_000),
    suporta: { ferramentas: true, raciocinio: false, visao: true, structuredOutputs: true },
    melhorPara: ["Fluxos bem definidos com ferramentas", "Documentos muito grandes", "Baixa latência"],
    evitar: ["Decisões abertas/ambíguas", "Recuperar de erros complexos"],
    fallback: "gpt-4.1", selecionavel: true,
  },
  {
    id: "gpt-4.1-nano", provider: "openai",
    displayName: "GPT-4.1 nano", categoria: "economico",
    resumo: "Ultra rápido e barato pra tarefas simples em volume.",
    custo: 1, velocidade: 1, contexto: ctx(1_000_000),
    suporta: { ferramentas: true, raciocinio: false, visao: true, structuredOutputs: true },
    melhorPara: ["Classificar mensagem", "Extrair dados", "Categorizar contato"],
    evitar: ["Atendente principal", "Decisões delicadas"],
    fallback: "gpt-4.1-mini", selecionavel: true,
  },
  // Família GPT-5.x — NOVA, disponibilidade incerta. Não-padrão; cai no fallback se a API recusar.
  {
    id: "gpt-5.4-mini", provider: "openai",
    displayName: "GPT-5.4 mini", categoria: "recomendado",
    resumo: "Novo modelo agentic da OpenAI pra ferramentas. (Verifique disponibilidade)",
    badge: "Novo — ferramentas",
    custo: 2, velocidade: 2, contexto: ctx(400_000),
    suporta: { ferramentas: true, raciocinio: true, visao: true, structuredOutputs: true },
    melhorPara: ["Atendimento completo com várias ferramentas", "Passos dependentes", "Interpretar pedidos ambíguos"],
    evitar: ["FAQ simples em volume (use o 4o mini)"],
    fallback: "gpt-4.1", selecionavel: true, experimental: true,
  },
  {
    id: "gpt-5.4-nano", provider: "openai",
    displayName: "GPT-5.4 nano", categoria: "economico",
    resumo: "Novo modelo pequeno pra classificação/extração em volume. (Verifique disponibilidade)",
    badge: "Novo",
    custo: 1, velocidade: 1, contexto: ctx(400_000),
    suporta: { ferramentas: true, raciocinio: true, visao: true, structuredOutputs: true },
    melhorPara: ["Classificar intenção", "Extrair dados", "Roteamento interno"],
    evitar: ["Atendente principal", "Processos críticos"],
    fallback: "gpt-4.1-mini", selecionavel: true, experimental: true,
  },
  {
    id: "gpt-5.4", provider: "openai",
    displayName: "GPT-5.4", categoria: "avancado",
    resumo: "Novo modelo avançado, contexto longo + raciocínio. (Verifique disponibilidade)",
    badge: "Novo — avançado",
    custo: 3, velocidade: 3, contexto: ctx(1_000_000),
    suporta: { ferramentas: true, raciocinio: true, visao: true, structuredOutputs: true },
    melhorPara: ["Documentos extensos", "Muitas regras de negócio", "Processos com várias ferramentas"],
    evitar: ["Mensagens simples", "FAQ"],
    fallback: "gpt-4.1", selecionavel: true, experimental: true,
  },
  {
    id: "gpt-5.5", provider: "openai",
    displayName: "GPT-5.5", categoria: "avancado",
    resumo: "Modelo premium pra orquestração e máxima complexidade. (Verifique disponibilidade)",
    badge: "Novo — premium",
    custo: 4, velocidade: 3, contexto: ctx(1_000_000),
    suporta: { ferramentas: true, raciocinio: true, visao: true, structuredOutputs: true },
    melhorPara: ["Processos longos e complexos", "Muitas ferramentas e regras conflitantes", "Interpretar pedidos muito ambíguos"],
    evitar: ["Toda mensagem do WhatsApp", "FAQ e classificação básica"],
    fallback: "gpt-4.1", selecionavel: true, experimental: true,
  },
  {
    id: "gpt-5.5-pro", provider: "openai",
    displayName: "GPT-5.5 Pro", categoria: "avancado",
    resumo: "Especialista pra análise excepcional. Alto custo e latência. (Verifique disponibilidade)",
    badge: "Especialista — alto custo",
    custo: 4, velocidade: 3, contexto: ctx(1_000_000),
    suporta: { ferramentas: true, raciocinio: true, visao: true, structuredOutputs: true },
    melhorPara: ["Auditoria/análise manual excepcional", "Processamento assíncrono"],
    evitar: ["Chatbot do dia a dia", "Conversa síncrona de WhatsApp"],
    fallback: "gpt-4.1", selecionavel: true, avancadoEscondido: true, experimental: true,
  },
  { id: "o1", provider: "openai", displayName: "o1 (raciocínio)", categoria: "avancado", resumo: "Raciocínio profundo. Lento e caro.", custo: 4, velocidade: 3, contexto: ctx(200_000), suporta: { ferramentas: true, raciocinio: true, visao: true, structuredOutputs: true }, melhorPara: ["Problemas que exigem raciocínio passo a passo"], evitar: ["Atendimento rápido"], fallback: "gpt-4.1", selecionavel: true, avancadoEscondido: true },
  { id: "o3-mini", provider: "openai", displayName: "o3 mini (raciocínio)", categoria: "avancado", resumo: "Raciocínio mais barato.", custo: 2, velocidade: 2, contexto: ctx(200_000), suporta: { ferramentas: true, raciocinio: true, visao: false, structuredOutputs: true }, melhorPara: ["Raciocínio com custo menor"], evitar: ["Conversas com imagem"], fallback: "gpt-4.1", selecionavel: true, avancadoEscondido: true },

  // ============ ANTHROPIC ============
  { id: "claude-haiku-4-5-20251001", provider: "anthropic", displayName: "Claude Haiku 4.5", categoria: "economico", resumo: "Rápido e barato da Anthropic.", badge: "Econômico", custo: 1, velocidade: 1, contexto: ctx(200_000), suporta: { ferramentas: true, raciocinio: false, visao: true, structuredOutputs: false }, melhorPara: ["Atendimento simples", "Ferramentas básicas"], evitar: ["Tarefas muito complexas"], fallback: "claude-sonnet-4-6", selecionavel: true },
  { id: "claude-sonnet-4-6", provider: "anthropic", displayName: "Claude Sonnet 4.6", categoria: "recomendado", resumo: "Equilíbrio de qualidade e custo.", badge: "Recomendado", custo: 2, velocidade: 2, contexto: ctx(200_000), suporta: { ferramentas: true, raciocinio: false, visao: true, structuredOutputs: false }, melhorPara: ["Atendimento com ferramentas", "Conversas mais ricas"], evitar: ["Quando custo mínimo é prioridade"], fallback: "claude-haiku-4-5-20251001", selecionavel: true },
  { id: "claude-opus-4-8", provider: "anthropic", displayName: "Claude Opus 4.8", categoria: "avancado", resumo: "O mais inteligente da Anthropic.", badge: "Avançado", custo: 4, velocidade: 3, contexto: ctx(200_000), suporta: { ferramentas: true, raciocinio: false, visao: true, structuredOutputs: false }, melhorPara: ["Análise complexa", "Decisões difíceis"], evitar: ["Atendimento simples em volume"], fallback: "claude-sonnet-4-6", selecionavel: true },

  // ============ GROQ ============
  { id: "llama-3.3-70b-versatile", provider: "groq", displayName: "Llama 3.3 70B", categoria: "recomendado", resumo: "Open-source rápido e barato no Groq.", badge: "Rápido", custo: 1, velocidade: 1, contexto: ctx(128_000), suporta: { ferramentas: true, raciocinio: false, visao: false, structuredOutputs: false }, melhorPara: ["Atendimento simples e rápido", "Ferramentas básicas"], evitar: ["Conversas com imagem"], fallback: "llama-3.1-8b-instant", selecionavel: true },
  { id: "llama-3.1-8b-instant", provider: "groq", displayName: "Llama 3.1 8B", categoria: "economico", resumo: "Menor e ainda mais rápido.", custo: 1, velocidade: 1, contexto: ctx(128_000), suporta: { ferramentas: true, raciocinio: false, visao: false, structuredOutputs: false }, melhorPara: ["Classificação", "Respostas curtas"], evitar: ["Atendente principal"], fallback: null, selecionavel: true },
  { id: "deepseek-r1-distill-llama-70b", provider: "groq", displayName: "DeepSeek R1 Distill", categoria: "avancado", resumo: "Raciocínio open-source no Groq.", custo: 2, velocidade: 2, contexto: ctx(128_000), suporta: { ferramentas: false, raciocinio: true, visao: false, structuredOutputs: false }, melhorPara: ["Raciocínio passo a passo"], evitar: ["Quando precisa de ferramentas"], fallback: "llama-3.3-70b-versatile", selecionavel: true },
];

const PROR_ID = new Map(CATALOGO_MODELOS.map((m) => [m.id, m]));

export function getModelo(id: string): ModeloInfo | undefined {
  return PROR_ID.get(id);
}

export function modelosDoProvider(provider: Provider): ModeloInfo[] {
  return CATALOGO_MODELOS.filter((m) => m.provider === provider && m.selecionavel);
}

/** Id do fallback de um modelo (mesmo provider). null se não houver. */
export function fallbackDe(id: string): string | null {
  return PROR_ID.get(id)?.fallback ?? null;
}

/** Modelo padrão recomendado por provider (pra novos perfis). Sempre um modelo REAL. */
export const MODELO_PADRAO: Record<Provider, string> = {
  openai: "gpt-4.1",
  anthropic: "claude-sonnet-4-6",
  groq: "llama-3.3-70b-versatile",
};

export const ORDEM_CATEGORIAS: CategoriaModelo[] = ["recomendado", "economico", "contexto_longo", "avancado", "legado"];

export const LABEL_CATEGORIA: Record<CategoriaModelo, string> = {
  recomendado: "Recomendados",
  economico: "Econômicos",
  contexto_longo: "Contexto longo",
  avancado: "Avançados",
  legado: "Legados / compatibilidade",
};
