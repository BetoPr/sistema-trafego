/**
 * Orquestrador do bot Suporte:
 * 1. Recebe pergunta do usuario + lista de areas FAQ
 * 2. LLM ligeiro (Llama 8B, ~300 tokens) responde JSON {area, motivo}
 * 3. Backend carrega so o KB da area
 * 4. Especialista (mesmo modelo) responde usando KB carregado
 *
 * Economia: cada area ~500 tokens KB vs 8000 monolitica. Tela do especialista
 * tem so o necessario, qualidade sobe e custo cai.
 */
import { AREAS, RESUMO_AREAS, buscarArea } from "./faq";

const MODELO = "llama-3.1-8b-instant";

export interface RotaSuporte { area: string; motivo: string }

export async function rotearPergunta(apiKey: string, pergunta: string, contextoCurto?: string): Promise<RotaSuporte> {
  const system = `Voce e um orquestrador. Recebe uma pergunta de usuario do CRM Sonar e decide qual area do FAQ tem a resposta.

AREAS DISPONIVEIS:
${RESUMO_AREAS}

REGRA:
- Responda APENAS um JSON valido no formato: {"area":"<id>","motivo":"<breve>"}
- "area" DEVE ser EXATAMENTE um dos ids listados acima.
- Se a pergunta for muito geral ou ambigua, use "sistema-ux".
- Nao explique, nao adicione texto fora do JSON.${contextoCurto ? `\n\nCONTEXTO DA CONVERSA:\n${contextoCurto}` : ""}`;

  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: MODELO,
      messages: [
        { role: "system", content: system },
        { role: "user", content: pergunta },
      ],
      temperature: 0.1,
      max_tokens: 80,
      response_format: { type: "json_object" },
    }),
  });
  const j = await r.json().catch(() => ({}));
  const txt = (j as { choices?: Array<{ message?: { content?: string } }> })?.choices?.[0]?.message?.content || "";
  let p: { area?: string; motivo?: string } = {};
  try { p = JSON.parse(txt); } catch {}
  const area = AREAS.some((a) => a.id === p.area) ? (p.area as string) : "sistema-ux";
  return { area, motivo: String(p.motivo || "default") };
}

export function buildSystemEspecialista(area: string): string {
  const a = buscarArea(area) || buscarArea("sistema-ux")!;
  return `Voce e o especialista de Suporte do Sonar CRM na area "${a.label}".

Use APENAS o conteudo abaixo pra responder. Se a pergunta sai do escopo, fala que precisa verificar com suporte humano (WhatsApp 558191594716).

REGRAS:
- Linguagem direta, pt-BR, curta.
- Use bullets (-) quando der.
- Negrito **assim** pra termos importantes.
- Codigo em \`backticks\`.
- Nao inventa funcionalidade. Se nao esta no conteudo, fala que nao tem certeza.
- Nao discute dados da conta — pra isso o usuario muda pra aba "Meus Dados".

CONTEUDO DA AREA "${a.label}":

${a.conteudo}`;
}
