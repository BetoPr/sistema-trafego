/**
 * Cápsulas modulares de conhecimento.
 * Cada cápsula é um bloco opt-in (FAQ, Produtos, Horários etc.) que o
 * orquestrador injeta no system prompt sob demanda — economiza tokens.
 */

import { createServiceClient } from "@/lib/supabase/service";

export interface Capsula {
  id: string;
  perfil_id: string;
  agencia_id: string;
  slug: string;
  nome: string;
  icone: string;
  cor: string;
  ativa: boolean;
  conteudo: string;
  keywords: string[];
  ordem: number;
}

export interface CapsulaTemplate {
  slug: string;
  nome: string;
  icone: string;
  cor: string;
  /** Hint placeholder/exemplo pro textarea de conteúdo. */
  placeholder: string;
  /** Keywords sugeridas (cliente pode editar). */
  keywords: string[];
}

/** Templates disponíveis pra usuário escolher quando adiciona cápsula. */
export const CAPSULA_TEMPLATES: CapsulaTemplate[] = [
  {
    slug: "faq",
    nome: "FAQ — Perguntas Frequentes",
    icone: "ti-help-circle",
    cor: "#6FA8DC",
    placeholder: "P: Vocês entregam em PE?\nR: Sim, entregamos em todo Pernambuco.\n\nP: Qual prazo médio?\nR: 3 a 5 dias úteis.",
    keywords: ["pergunta", "dúvida", "como funciona", "vocês", "faq"],
  },
  {
    slug: "produtos",
    nome: "Produtos / Catálogo",
    icone: "ti-package",
    cor: "#A584D6",
    placeholder: "Produto: Camiseta básica\nPreço: R$ 49,90\nTamanhos: P, M, G, GG\nCores: preto, branco, azul\n\nProduto: ...",
    keywords: ["produto", "preço", "valor", "quanto custa", "tamanho", "cor", "estoque", "tabela"],
  },
  {
    slug: "horarios",
    nome: "Horários de Atendimento",
    icone: "ti-clock-hour-4",
    cor: "#F4B860",
    placeholder: "Seg a Sex: 9h às 18h\nSáb: 9h às 13h\nDom e feriados: fechado",
    keywords: ["horário", "aberto", "fechado", "funcionamento", "atendimento"],
  },
  {
    slug: "politicas",
    nome: "Políticas — Troca/Devolução/Garantia",
    icone: "ti-shield-check",
    cor: "#7FB069",
    placeholder: "Troca: até 7 dias após compra com nota fiscal.\nDevolução: somente produtos lacrados.\nGarantia: 90 dias contra defeito de fabricação.",
    keywords: ["trocar", "devolver", "garantia", "defeito", "política", "reembolso"],
  },
  {
    slug: "enderecos",
    nome: "Endereço / Cobertura",
    icone: "ti-map-pin",
    cor: "#E07A5F",
    placeholder: "Loja física: Rua X, 123 — Recife/PE\nEntrega: todo PE + Alagoas + Paraíba\nFrete grátis acima de R$ 200",
    keywords: ["endereço", "onde", "fica", "entrega", "frete", "cobertura", "loja"],
  },
  {
    slug: "promocoes",
    nome: "Promoções Ativas",
    icone: "ti-discount-2",
    cor: "#D67878",
    placeholder: "Promo Junho: 20% OFF em produtos selecionados — cupom JUNHO20.\nFrete grátis acima de R$ 150.",
    keywords: ["promoção", "promo", "desconto", "cupom", "oferta", "frete grátis"],
  },
  {
    slug: "pagamento",
    nome: "Formas de Pagamento",
    icone: "ti-credit-card",
    cor: "#9B7DBF",
    placeholder: "Pix (5% off à vista)\nCartão até 6x sem juros\nBoleto\nDinheiro na entrega (na loja física)",
    keywords: ["pagamento", "pagar", "pix", "cartão", "boleto", "parcelar", "vista"],
  },
];

export async function listarCapsulasPorPerfil(perfilId: string): Promise<Capsula[]> {
  const sb = createServiceClient();
  const { data } = await sb
    .from("ia_atendimento_capsulas")
    .select("*")
    .eq("perfil_id", perfilId)
    .order("ordem", { ascending: true });
  return (data || []) as Capsula[];
}

/**
 * Match local de cápsulas via keywords (sem chamar LLM).
 * Retorna cápsulas cujas keywords aparecem na pergunta.
 * Token cost: 0.
 */
export function matchKeywordsLocal(pergunta: string, capsulas: Capsula[]): Capsula[] {
  const p = pergunta.toLowerCase();
  const matched: Array<{ cap: Capsula; score: number }> = [];
  for (const cap of capsulas) {
    if (!cap.ativa) continue;
    let score = 0;
    for (const kw of cap.keywords) {
      if (p.includes(kw.toLowerCase())) score++;
    }
    if (score > 0) matched.push({ cap, score });
  }
  matched.sort((a, b) => b.score - a.score);
  return matched.map((m) => m.cap);
}

/**
 * Monta o system prompt no modo modular:
 *   IDENTIDADE + OBJETIVO + REGRAS + (cápsulas relevantes)
 *
 * Se capsulasRelevantes vazio mas cápsulas existem → injeta nomes das cápsulas
 * (lista só, sem conteúdo) — fallback dignamente.
 */
export function montarPromptModular(opts: {
  identidade: string;
  objetivo: string;
  regrasGlobais: string;
  capsulasInjetadas: Capsula[];
  todasCapsulasAtivas: Capsula[];
}): string {
  const blocos: string[] = [];

  if (opts.identidade.trim()) {
    blocos.push(`## QUEM VOCÊ É\n${opts.identidade.trim()}`);
  }
  if (opts.objetivo.trim()) {
    blocos.push(`## OBJETIVO PRIMORDIAL\n${opts.objetivo.trim()}`);
  }
  if (opts.regrasGlobais.trim()) {
    blocos.push(`## REGRAS GLOBAIS\n${opts.regrasGlobais.trim()}`);
  }

  if (opts.capsulasInjetadas.length > 0) {
    for (const cap of opts.capsulasInjetadas) {
      blocos.push(`## ${cap.nome.toUpperCase()}\n${cap.conteudo.trim()}`);
    }
  } else if (opts.todasCapsulasAtivas.length > 0) {
    // Fallback: lista nomes das cápsulas pra IA saber que pode pedir mais info
    const lista = opts.todasCapsulasAtivas.map((c) => `- ${c.nome}`).join("\n");
    blocos.push(
      `## CONHECIMENTO DISPONÍVEL\nVocê tem acesso a:\n${lista}\n\nSe o cliente perguntar sobre um desses temas, peça pra reformular pra você buscar melhor.`,
    );
  }

  return blocos.join("\n\n");
}
